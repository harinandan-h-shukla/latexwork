export interface ServiceConfig {
  port: number;
  sharedSecret: string;
}

const DEFAULT_PORT = 8080;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(): ServiceConfig {
  const sharedSecret = process.env.REALTIME_HUB_SHARED_SECRET;
  if (!sharedSecret) {
    throw new Error(
      "REALTIME_HUB_SHARED_SECRET is not set. This service authenticates its server-to-server " +
        "caller (the Next.js server's POST /broadcast) with a shared bearer token, and uses the " +
        "same secret as the HMAC key for short-lived client subscribe tokens — refusing to start " +
        "without one rather than accepting unauthenticated broadcasts or unverifiable tokens."
    );
  }

  return {
    port: envNumber("PORT", DEFAULT_PORT),
    sharedSecret,
  };
}
