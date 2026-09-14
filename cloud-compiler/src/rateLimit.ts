/**
 * Sliding-window per-caller compile rate limit, same shape as the login
 * rate limiter already in this codebase (lib/mock-api/auth.ts's
 * `loginAttempts` Map) — a bounded in-memory Map is enough at this service's
 * scale (single instance, restarts reset it, which is fine for a rate limit
 * whose only job is smoothing bursts, not enforcing a hard quota).
 */
interface Window {
  count: number;
  windowStartedAt: number;
}

const windows = new Map<string, Window>();

export function isRateLimited(callerId: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = windows.get(callerId);
  if (!entry || now - entry.windowStartedAt > windowMs) {
    windows.set(callerId, { count: 1, windowStartedAt: now });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}
