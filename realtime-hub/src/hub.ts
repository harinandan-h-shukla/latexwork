import { WebSocket, WebSocketServer } from "ws";
import type { Server as HttpServer } from "node:http";
import { verifySubscribeToken } from "./auth";

/** A generic "something changed" event — the passthrough shape /broadcast
 * forwards verbatim, plus the hub's own {type:"presence",...} events. */
export interface HubEvent {
  type: string;
  [key: string]: unknown;
}

interface SubscribedSocket {
  socket: WebSocket;
  projectIds: Set<string>;
}

// WebSocket close codes 4000-4999 are reserved for private/application use
// per RFC 6455 — 4001 signals "subscribe was rejected" to any client smart
// enough to inspect the close code, in addition to the JSON error frame sent
// just before closing.
const CLOSE_SUBSCRIBE_REJECTED = 4001;

/**
 * Adapted from local-agent/src/wsHub.ts's WsHub, with one deliberate
 * difference: local-agent's subscribe takes a bare projectId with zero auth,
 * which is safe there only because the sole caller is the machine's own
 * user. This service is public-internet-facing, so subscribe requires a
 * signed token (see auth.ts) proving the client's issuer actually vouched
 * for that (projectId, userId) pair. It also adds the presence mechanism:
 * every successful subscribe/unsubscribe/disconnect re-broadcasts the
 * project's current subscriber count to that project's remaining
 * subscribers, since (per the plan) presence here is served from this
 * in-memory roster, not Mongo.
 */
export class Hub {
  private wss: WebSocketServer;
  private sockets = new Set<SubscribedSocket>();

  constructor(server: HttpServer, path: string, private sharedSecret: string) {
    this.wss = new WebSocketServer({ server, path });
    this.wss.on("connection", (socket) => {
      const entry: SubscribedSocket = { socket, projectIds: new Set() };
      this.sockets.add(entry);

      socket.on("message", (raw) => {
        let msg: unknown;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (!msg || typeof msg !== "object") return;
        const type = (msg as Record<string, unknown>).type;

        if (type === "subscribe") {
          this.handleSubscribe(entry, msg as Record<string, unknown>);
          return;
        }

        if (type === "unsubscribe") {
          const projectId = (msg as Record<string, unknown>).projectId;
          if (typeof projectId === "string" && entry.projectIds.delete(projectId)) {
            this.broadcastPresence(projectId);
          }
          return;
        }
      });

      socket.on("close", () => this.handleGone(entry));
      socket.on("error", () => this.handleGone(entry));
    });
  }

  private handleSubscribe(entry: SubscribedSocket, msg: Record<string, unknown>): void {
    const projectId = msg.projectId;
    const token = msg.token;
    if (typeof projectId !== "string" || typeof token !== "string") {
      this.rejectSubscribe(entry.socket, typeof projectId === "string" ? projectId : undefined, "malformed");
      return;
    }

    const result = verifySubscribeToken(token, projectId, this.sharedSecret);
    if (!result.ok) {
      this.rejectSubscribe(entry.socket, projectId, result.reason);
      return;
    }

    entry.projectIds.add(projectId);
    this.broadcastPresence(projectId);
  }

  private handleGone(entry: SubscribedSocket): void {
    this.sockets.delete(entry);
    for (const projectId of entry.projectIds) {
      this.broadcastPresence(projectId);
    }
  }

  private rejectSubscribe(socket: WebSocket, projectId: string | undefined, reason: string): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "subscribe-error", projectId, reason }));
    }
    socket.close(CLOSE_SUBSCRIBE_REJECTED, "subscribe rejected");
  }

  private subscriberCount(projectId: string): number {
    let count = 0;
    for (const entry of this.sockets) {
      if (entry.projectIds.has(projectId)) count++;
    }
    return count;
  }

  private broadcastPresence(projectId: string): void {
    this.broadcast(projectId, { type: "presence", projectId, count: this.subscriberCount(projectId) });
  }

  /** Sends `event`, JSON-serialized as-is, to every socket currently
   * subscribed to `projectId`. Used both for the hub's own presence events
   * and as the passthrough target for POST /broadcast. */
  broadcast(projectId: string, event: HubEvent): void {
    const payload = JSON.stringify(event);
    for (const entry of this.sockets) {
      if (entry.projectIds.has(projectId) && entry.socket.readyState === WebSocket.OPEN) {
        entry.socket.send(payload);
      }
    }
  }
}
