"use client";

// Client-safe auth hint. The real session lives in an httpOnly, encrypted
// cookie (see lib/session.ts) that JS can't read by design — this reads a
// separate, non-sensitive "has a session" cookie set alongside it purely so
// client components can branch on logged-in-vs-not for UI purposes. Never
// treat this as authorization; every real data access is checked server-side
// against the real session.

const HAS_SESSION_COOKIE = "inkwell_has_session";

export function isAuthenticated(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${HAS_SESSION_COOKIE}=1`);
}
