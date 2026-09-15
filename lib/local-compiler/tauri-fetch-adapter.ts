/**
 * A page loaded from ANY origin inside a Tauri webview (WebKitGTK on Linux,
 * and for equivalent reasons on WebView2/WKWebView) cannot have its own JS
 * directly fetch() localhost — this is mixed-content/Private-Network-Access
 * -style blocking enforced by the browser engine itself, not a Tauri
 * setting, and there is no config bypass. Confirmed via Tauri's own
 * maintainer discussion: github.com/tauri-apps/tauri/discussions/11970.
 *
 * The official workaround is @tauri-apps/plugin-http: it performs the HTTP
 * request from the Rust side (not subject to the webview's own fetch
 * restrictions) and returns the result to JS over invoke(), scoped to an
 * explicit allowed-URL pattern declared in src-tauri/capabilities/*.json
 * (see desktop/src-tauri/capabilities/default.json,
 * "http://localhost:47823/*"). This is a drop-in-signature replacement for
 * the global fetch, so this adapter is the only thing that needs to know
 * Tauri exists — callers (local-compiler-client.ts) are unchanged.
 *
 * Outside Tauri (a normal browser tab against the Vercel-hosted app),
 * isTauri() (the official detection function, not a hand-rolled
 * window.__TAURI_INTERNALS__ property check — see
 * v2.tauri.app/reference/javascript/api/namespacecore/#istauri) returns
 * false and this delegates to the real global fetch — zero behavior change
 * for the existing web app.
 */

export async function localFetch(
  input: string,
  init?: RequestInit & { signal?: AbortSignal }
): Promise<Response> {
  if (typeof window !== "undefined") {
    const { isTauri } = await import("@tauri-apps/api/core");
    if (isTauri()) {
      // @tauri-apps/plugin-http is a dependency of THIS (root) package.json,
      // not desktop/'s — the JS bundle the Tauri webview loads is the exact
      // same Next.js build served to ordinary browser tabs (the whole point
      // of "load the live URL, don't bundle a second frontend"), so the
      // plugin's JS binding has to ship inside that one bundle. Only its
      // Rust-side half (the `tauri-plugin-http` crate, which does the
      // actual request and enforces the capability-scoped allowed-URL
      // pattern) lives in desktop/src-tauri/Cargo.toml.
      const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
      return tauriFetch(input, init);
    }
  }
  return fetch(input, init);
}
