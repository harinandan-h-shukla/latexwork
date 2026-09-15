"use client";

import { useEffect, useState } from "react";

/**
 * True only when this page is running inside the Tauri desktop shell
 * (desktop/), false for every ordinary browser tab against the Vercel-hosted
 * site — including during the brief `null` window before this resolves.
 *
 * Per the confirmed Phase 3 scope (~/.claude/plans/cozy-spinning-toucan.md):
 * the website is view-only (login, file list, PDF/zip download, chat,
 * read-only comments/history) and the desktop app is the only place that
 * actually edits/compiles .tex files. This hook is the single switch that
 * decides which of those two experiences a given page renders — callers
 * should treat `null` (not yet determined) as "assume web/view-only," never
 * as "assume desktop," since the website is the safe/expected default and a
 * flash of the full editor before downgrading to view-only would be a worse
 * UX than a one-tick delay before the (rarer) desktop editor appears.
 *
 * Uses the same official `isTauri()` detection as
 * lib/local-compiler/tauri-fetch-adapter.ts (not a hand-rolled
 * window.__TAURI_INTERNALS__ check) — see that file's comment for why.
 */
export function useIsDesktopApp(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@tauri-apps/api/core")
      .then(({ isTauri }) => {
        if (!cancelled) setIsDesktop(isTauri());
      })
      .catch(() => {
        if (!cancelled) setIsDesktop(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return isDesktop;
}
