"use client";

import { useEffect, useRef } from "react";
import { mintRealtimeToken } from "@/lib/realtime/actions";

/** A few seconds, per the task spec's "simple backoff" ask — this is a
 * single fixed delay, not exponential, which is enough for a dev/demo hub
 * that occasionally restarts; revisit if reconnect storms become a real
 * problem against a production hub. */
const RECONNECT_DELAY_MS = 3000;

/**
 * Subscribes to realtime-hub's per-project WebSocket feed and calls
 * `onChange` whenever a non-"presence" message arrives — the fixed protocol
 * treats any such message as "something changed for this project," with no
 * data payload of its own, so the caller is expected to just re-run its own
 * existing refetch (e.g. ChatPanel's `refresh()`).
 *
 * Mints its own short-lived subscribe token via the mintRealtimeToken Server
 * Action on mount (and again on every reconnect, since tokens expire after
 * 5 minutes). Fails silently and simply doesn't connect when:
 * - realtime-hub isn't configured (no NEXT_PUBLIC_REALTIME_HUB_URL — see the
 *   note below on why this is a *separate* env var from the server-side
 *   REALTIME_HUB_URL that lib/realtime/broadcast.ts uses),
 * - `projectId` is a legacy mock/demo project, or
 * - the caller has no access to `projectId`
 * (mintRealtimeToken throws in all three cases). This is intentional:
 * collaboration features (chat) must keep working with zero realtime-hub
 * deployed — this hook is pure live-update sugar on top of an
 * already-functional refetch-on-send flow, never a hard dependency.
 *
 * NOTE on env vars: the task's fixed protocol names one env var,
 * REALTIME_HUB_URL, used server-side (lib/realtime/broadcast.ts, and to
 * derive the mint token's signature). That var is invisible to browser code
 * in Next.js unless prefixed NEXT_PUBLIC_ (build-time inlined), which this
 * WebSocket connection — made directly from the browser, per the protocol's
 * own `new WebSocket(...)` client step — needs. So this hook reads
 * NEXT_PUBLIC_REALTIME_HUB_URL instead; set it to the same value as
 * REALTIME_HUB_URL in .env.local. This doesn't change the wire protocol
 * itself (URL, headers, message shapes all match exactly), only which env
 * var name the browser half of this Next.js app reads it from.
 */
export function useRealtimeProject(projectId: string, onChange: () => void): void {
  // Ref so the effect below doesn't need to reconnect every time the
  // caller's onChange identity changes (ChatPanel's `refresh` is a
  // useCallback, but this avoids depending on callers to memoize correctly).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const hubUrl = process.env.NEXT_PUBLIC_REALTIME_HUB_URL;
    if (!projectId || !hubUrl) return;

    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect(): Promise<void> {
      let token: string;
      try {
        token = await mintRealtimeToken(projectId);
      } catch {
        // No hub configured, no access, or a legacy mock project — give up
        // quietly, see the function doc comment above.
        return;
      }
      if (cancelled) return;

      socket = new WebSocket(`${hubUrl!.replace(/^http/, "ws")}/events`);

      socket.addEventListener("open", () => {
        socket?.send(JSON.stringify({ type: "subscribe", projectId, token }));
      });

      socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "presence") return; // presence counts are out of scope here
          onChangeRef.current();
        } catch {
          // ignore malformed messages
        }
      });

      socket.addEventListener("close", () => {
        if (cancelled) return;
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [projectId]);
}
