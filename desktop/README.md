# Inkwell Desktop

A native desktop shell for Inkwell — loads the real, same Inkwell web app you
already use in the browser, but gives it two extra local capabilities: talking
to `local-agent` (real TeX Live compiling on your own machine) and, later,
direct local file access. Nothing about the web app itself changes — this is
an additional way to run the exact same product, not a different one.

**Status: early/experimental** (a validated spike, not a polished release).
Linux only for now. Windows/macOS are not built yet.

---

## Install & run (Linux)

You need three things on your machine: system libraries Tauri needs to draw
its window, the Rust toolchain (to build it), and Node (already required for
the rest of Inkwell).

```bash
# 1. System libraries (one-time, needs sudo)
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev pkg-config

# 2. Rust toolchain (one-time, no sudo needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# 3. Install and run
cd desktop
npm install
npm run tauri dev
```

That's it — a native window opens, loads the real Inkwell app, and you sign
in/use it exactly as in a browser. `local-agent` still needs to be running
separately for local compiling to work (see the main repo's
`app/settings/local-compiler-setup` guide) — the desktop app doesn't manage
its lifecycle yet (see "Known gaps" below).

By default this points at `http://localhost:3000` (your local dev server).
To point it at the real deployed site instead, edit
`src-tauri/tauri.conf.json`'s `build.devUrl` and `app.windows[0].url`.

### If `libwebkit2gtk-4.1-dev` isn't available for your distro

Ubuntu 22.04+ / Debian 12+ / Fedora 36+ have it under this name (or the Fedora
equivalent, `webkit2gtk4.1-devel`). Older distros may only have
`libwebkit2gtk-4.0-dev`, which won't work with Tauri v2 — you'll need a newer
base system, or see Tauri's own prerequisites page for distro-specific
package names: https://v2.tauri.app/start/prerequisites/

---

## What's actually built so far

- A real Tauri v2 window loading the live Inkwell frontend — same login,
  same dashboard, same editor, same PDF viewer, nothing reimplemented.
- A native bridge (`@tauri-apps/plugin-http`, scoped to
  `http://localhost:47823/*`) that lets the app's existing
  `detectLocalAgent()`/compile calls (`lib/local-compiler/local-compiler-client.ts`)
  reach `local-agent` on your machine even when the page itself is loaded
  from a remote origin — see "The native bridge" below for why this exists.
- Confirmed working end-to-end: real signup, login-cookie persistence across
  a full app restart, a real compile through `local-agent` producing a real
  PDF in the existing viewer, and a live WebSocket connection to
  `realtime-hub` for chat/collaboration.

## Known gaps (not done yet, not silently skipped)

- **local-agent isn't managed by the app.** You still start it yourself
  (`npm start` in `local-agent/`, per the main setup guide). Planned:
  spawn/stop it automatically as a child process tied to the app's own
  lifecycle (via `tauri-plugin-shell` or a raw process spawn in
  `src-tauri/src/lib.rs`).
- **The build-status WebSocket (`local-agent`'s live compile-log streaming)
  goes through a plain browser `WebSocket`, not the native bridge.** This
  works today because the dev setup has no HTTPS (see "The native bridge"
  below for why that matters), but pointed at a real HTTPS deployment it
  will need the same kind of native-bridge treatment as the HTTP calls —
  real new Rust work (a `tokio-tungstenite` client + Tauri's event system),
  not started yet.
- **No local file workspace yet.** The app doesn't materialize project files
  to disk — everything still goes through the same server actions the
  browser uses. Local-first file storage/sync is separate, later work.
- **No local-agent version has been packaged.** You still need TeX Live
  (TinyTeX recommended) installed separately — see the main compiler setup
  guide.
- Windows/macOS builds: not attempted.

## The native bridge — why it exists

A page loaded inside a Tauri webview can't have its own JavaScript directly
`fetch()`/`WebSocket()` to `localhost` — this is enforced by the underlying
browser engine itself (mixed-content / Private-Network-Access-style
blocking), the same protection that stops any public website from quietly
reaching into services on your machine. There's no config flag that turns
this off. The fix is `@tauri-apps/plugin-http`: it makes the actual HTTP
request from the native (Rust) side, outside the webview's browser sandbox,
and hands the result back to the page's JS — scoped to exactly
`http://localhost:47823/*` so nothing else gets a blanket network bypass.

**One caveat confirmed while building this**: in local dev (`http://`, no
TLS), a plain *un-bridged* `fetch()` also reached `local-agent` successfully
— the blocking above is specifically an HTTPS-page protection, and dev has
no HTTPS anywhere. The bridge itself was independently confirmed working
(not just "untested but assumed fine") via a real round trip:
`detectLocalAgent()` returning real compiler info
(`pdflatex,xelatex,lualatex,latexmk,bibtex,biber`) through the plugin. Once
this app points at the real HTTPS-deployed site, re-verify whether the
un-bridged path still works or whether the blocking kicks in as expected —
don't assume either way without checking.

## Multi-user / role testing checklist

Same idea as the browser-based testing already done for Inkwell generally —
worth re-running specifically through this desktop shell before trusting it:

1. Real signup through the desktop window (not a mock account).
2. Open a real project, confirm the same file tree/editor/PDF viewer render
   as they do in a browser tab.
3. Compile via `local-agent` — confirm the toolbar shows "My computer" as
   the source and a real PDF appears.
4. Set the account's compiler preference (Settings → compile options) and
   confirm it's respected the same way it is in a browser session — the
   desktop app reads the same account settings, there's no separate
   desktop-only preference store.
5. Invite a second account (owner + collaborator), confirm role-based
   access (who can share/invite/change roles) behaves identically to the
   browser — this app doesn't have its own permission model, it's the same
   server-enforced checks.
6. With a real second session (a browser tab, a different account) open on
   the same project, send a chat message from one side and confirm it
   appears live on the other without a manual reload — exercises
   `realtime-hub` through the desktop shell specifically.

## Development / architecture notes

- `src-tauri/src/lib.rs` registers `tauri_plugin_http::init()`.
- `src-tauri/capabilities/default.json` scopes that plugin to
  `http://localhost:47823/*`.
- `lib/local-compiler/tauri-fetch-adapter.ts` (in the *main* Inkwell repo,
  not this directory — the webview loads the main app's own JS bundle) is
  the only file that knows Tauri exists at all: it checks `isTauri()` from
  `@tauri-apps/api/core` and routes through the plugin's `fetch()` when
  true, otherwise delegates straight to the real global `fetch`.
  `local-compiler-client.ts` calls this adapter instead of `fetch()`
  directly — a 2-line change, nothing else in the app needed to change.
- No bundled Next.js/Node server: `tauri.conf.json`'s `build.devUrl` /
  `app.windows[0].url` point at the live app's own URL, so Server Actions,
  auth cookies, everything else runs exactly as it does for a browser tab.
  This was a deliberate choice — see `~/.claude/plans/cozy-spinning-toucan.md`
  ("Phase 2 detailed design") for the full reasoning (~135 Server Action
  functions make bundling a second Node runtime a much larger, riskier
  undertaking than reusing the deployed one).
