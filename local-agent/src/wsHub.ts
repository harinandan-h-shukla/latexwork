import { WebSocket, WebSocketServer } from "ws";
import type { Server as HttpServer } from "node:http";
import { BuildUpdateEvent } from "./types";

interface SubscribedSocket {
  socket: WebSocket;
  projectIds: Set<string>;
}

export class WsHub {
  private wss: WebSocketServer;
  private sockets = new Set<SubscribedSocket>();

  constructor(server: HttpServer, path: string) {
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
        if (
          msg &&
          typeof msg === "object" &&
          (msg as any).type === "subscribe" &&
          typeof (msg as any).projectId === "string"
        ) {
          entry.projectIds.add((msg as any).projectId);
        }
      });

      socket.on("close", () => {
        this.sockets.delete(entry);
      });
      socket.on("error", () => {
        this.sockets.delete(entry);
      });
    });
  }

  broadcast(projectId: string, event: BuildUpdateEvent): void {
    const payload = JSON.stringify(event);
    for (const entry of this.sockets) {
      if (entry.projectIds.has(projectId) && entry.socket.readyState === WebSocket.OPEN) {
        entry.socket.send(payload);
      }
    }
  }
}
