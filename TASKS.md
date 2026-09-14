# TASKS — LaTeX Cloud Editor

Read PROJECT_SPEC.md before starting any work. Check off tasks as completed.
Do not remove or descope any task without explicit confirmation from the user.

---

## PHASE 0 — Setup
- [x] Init Next.js (App Router) + TypeScript + Tailwind + shadcn/ui repo
- [x] Add CLAUDE.md with stack/conventions
- [x] Add PROJECT_SPEC.md, TASKS.md to repo root
- [x] Set up folder structure: `app/`, `components/`, `lib/mock-api.ts`, `lib/types.ts`, `store/`
- [x] Define shared TypeScript types for: Project, File, User, Comment, Version, Template, CompileResult

## PHASE 1 — Frontend, mock data, fully clickable

### 1.1 Shell & navigation
- [x] App shell: top nav, sidebar, theme toggle (dark/light/system)
- [x] Auth screens (UI only): sign up, login, OAuth buttons, SSO, ORCID — mock success
- [x] Project dashboard: grid/list view, search, filter, sort, star/favorite
- [x] Project card: rename, delete, archive, tags, clone/duplicate (mock actions)
- [x] Trash view: restore / permanent delete (mock)
- [x] Command palette (Cmd+K) shell with fuzzy search over mock actions/files

### 1.2 Project creation & templates
- [x] "New project" flow: blank / from template / upload zip / import URL / import GitHub (mock)
- [x] Template gallery UI: categories, publisher filter, preview, "use template" (mock data set)
- [x] "Save as template" action (mock)

### 1.3 File tree
- [x] Tree component: folders/files, create/rename/delete/move/duplicate
- [x] Drag-drop upload UI (mock upload progress)
- [x] Multi-select (bulk delete/move/download mock)
- [x] Set main file indicator
- [x] Binary file thumbnail preview (image files)
- [x] Download project zip / single file (mock trigger)

### 1.4 Editor core
- [x] Integrate CodeMirror 6 with LaTeX syntax highlighting
- [x] Line numbers, word wrap, zoom/font size, whitespace toggle
- [x] Undo/redo, cut/copy/paste
- [x] Find & replace (in-file + project-wide UI), regex/case/whole-word toggles
- [x] Go to line
- [x] Multi-cursor / multi-select
- [x] Line ops: duplicate/delete/move up-down/join
- [x] Indent/outdent, auto-indent
- [x] Comment/uncomment toggle
- [x] Code folding
- [x] Bracket/environment auto-match + auto-close
- [x] Split-pane (two files side by side)
- [x] Vim/Emacs keybinding mode toggle
- [x] Spell-check UI (inline squiggle, mock suggestions, custom dictionary UI)

### 1.5 LaTeX-specific editing
- [x] Autocomplete UI: commands, environments, \ref/\eqref, \cite, file paths, packages (mock symbol table)
- [x] Snippet expansion (beg+Tab etc.)
- [x] Pre-compile error underlining (mock static analysis)
- [x] Jump-to-definition (Ctrl+click, mock resolution)
- [x] Rename symbol across project (mock)
- [x] Equation hover preview (render via KaTeX/MathJax)
- [x] Visual table generator -> tabular code
- [x] Math symbol palette (click-to-insert)
- [x] Citation key autocomplete (mock .bib parsing)
- [x] Outline/structure sidebar
- [x] Word/char count (with exclude-comments toggle)
- [x] Quick-format toolbar

### 1.6 Compile & PDF preview
- [x] Compile button + auto-compile toggle (mock delay + mock PDF result)
- [x] Compiler/TeX Live version selector (UI)
- [x] Compile log panel: full/errors/warnings filter, click-to-jump (mock log data)
- [x] Draft mode toggle, stop compile button, timeout message (mock)
- [x] Compile queue status indicator (mock position/ETA)
- [x] PDF viewer via pdf.js: zoom, fit-width/page, page nav, search-in-pdf
- [x] SyncTeX bidirectional click mapping (mock line<->page mapping) — PDF→source click-to-jump works; source→PDF highlight is a known one-way gap (no "current cursor line" state to drive it yet)
- [x] Error/warning markers on PDF thumbnails (mock)
- [x] Continuous vs single-page toggle
- [ ] Resizable split editor|PDF, stacked mobile layout — resizable split done; mobile stacked layout deferred to 1.12's responsive pass
- [x] Fullscreen/presentation PDF view

### 1.7 Collaboration (mocked)
- [x] Fake live cursors + presence avatars (simulate 1-2 mock collaborators)
- [x] Comment thread UI: add/reply/resolve/reopen
- [x] Track changes UI: inline diff, accept/reject (single + bulk), per-user filter
- [x] Review mode toggle
- [x] Project chat panel (mock messages)
- [x] @mentions with mock notification popup
- [x] Share modal: invite by email, link generation, role selector (mock)
- [x] Collaborator permissions list UI (mock)
- [x] Public/private + read-only link toggle (mock)

### 1.8 Version history
- [x] History timeline UI (mock snapshots)
- [x] Label/save version with message (mock)
- [x] Diff view between two versions (mock diff render)
- [x] Restore/rollback action (mock)
- [x] Filter history by user
- [x] Download historical version (mock)

### 1.9 References
- [x] .bib structured editor (form view) + raw editor toggle
- [x] Import citation UI: Zotero/Mendeley/DOI/CrossRef search (mock results)
- [x] Duplicate key detection (mock)
- [x] Broken reference detection panel (mock)

### 1.10 Export/integration UI
- [x] Export menu: PDF / source zip / single inlined .tex (mock trigger)
- [x] Import menu: zip / GitHub / URL / Overleaf migration (mock flow)
- [x] Git sync panel (mock connect + push/pull buttons)
- [x] Dropbox/Drive connect buttons (mock)
- [x] API keys settings page (mock generate/revoke)
- [x] Webhook settings UI (mock)

### 1.11 Notifications & account
- [x] Notification center dropdown (mock items)
- [x] Account settings: profile, password, 2FA, linked accounts, editor defaults
- [x] Storage usage dashboard (mock quota bar)
- [x] Plan/subscription page (mock tiers)
- [x] Security & privacy settings (gap identified 2026-09-10, added to PROJECT_SPEC.md §12): active sessions/devices list with revoke, data export, account deletion, privacy preferences, activity/audit log
- [x] Unread-count badge on the notification bell icon in the app shell
- [x] Remove leftover dev/test copy from password-form.tsx
- [x] Make the 2FA setup panel feel less obviously fake (per-session generated secret + real scannable QR)

### 1.12 Additive design/UX (Section 13 — build after core is clickable)
- [x] Brand identity pass: real accent color (was pure grayscale), InkwellLogo component (LaTeX-logo-styled tagline) used consistently across shell/login/signup/marketing, brand-mark icons for Google/GitHub/ORCID
- [ ] Editor theme picker (multiple themes, not just 2)
- [ ] Zen/focus mode
- [ ] Draggable/resizable panel layout + saved presets
- [ ] Minimap
- [ ] Section breadcrumb on scroll
- [ ] Mobile-responsive pass on all screens
- [ ] AI ghost-text autocomplete UI (mock suggestions)
- [ ] "Explain this error" button (mock AI response)
- [ ] AI table/figure generator from pasted data (mock)
- [ ] NL -> LaTeX snippet box (mock)
- [ ] Offline banner + local queue indicator (mock)
- [ ] Activity feed panel (mock)
- [ ] Cursor follow-mode toggle (mock)
- [ ] Drag-drop image -> auto \includegraphics (functional in mock file tree)
- [ ] Paste Excel table -> LaTeX table conversion (functional, client-side)
- [ ] Equation OCR upload UI (mock result)

**End of Phase 1 checkpoint: every screen/icon/button is clickable and visually correct with mock data. User reviews and approves before Phase 2 begins.**

---

## PHASE 2 — Backend, one task at a time (order proposed, confirm before starting each)

- [ ] 2.1 Auth: real email/password + Google OAuth (DB: users table)
- [ ] 2.2 Project CRUD + file tree backed by real DB + object storage
- [ ] 2.3 File upload/download real (object storage, quota enforcement)
- [ ] 2.4 Compile pipeline: containerized TeX Live service, job queue, real logs
- [ ] 2.5 PDF serving + SyncTeX real mapping
- [ ] 2.6 Real-time collab: Yjs CRDT + WebSocket server, live cursors/presence
- [ ] 2.7 Comments + track changes persisted
- [ ] 2.8 Version history: real snapshot/diff storage
- [ ] 2.9 Sharing/permissions: real role-based access control
- [ ] 2.10 References: real .bib parsing, Zotero/Mendeley/CrossRef API integration
- [ ] 2.11 Templates: real template storage + gallery data
- [ ] 2.12 Export/import: real zip generation, GitHub two-way sync, Overleaf migration parser
- [ ] 2.13 Notifications: email service + in-app notification persistence
- [ ] 2.14 API access: public REST API + key management
- [ ] 2.15 AI features: wire real model calls (autocomplete, error explain, NL->LaTeX, OCR)
- [ ] 2.16 Offline mode: local-first sync with CRDT reconciliation
- [ ] 2.17 Performance: incremental compile caching, autoscaling compile workers
- [x] 2.18 Local-first compile: standalone `local-agent/` service (real pdfLaTeX/XeLaTeX/LuaLaTeX/latexmk/BibTeX/Biber via a restricted local HTTP+WS API), browser-side `CompilerService` that prefers it and falls back to the cloud/mock pipeline — done ahead of the rest of Phase 2 at the user's explicit request; complements 2.4 rather than replacing it

Each Phase 2 task: implement backend, then swap the corresponding `lib/mock-api.ts` function for a real API call — frontend components should not need changes if interfaces match.

### 2.18 detail — Local-first compile
- [x] `local-agent/`: standalone Node/TypeScript service, own package.json/tsconfig, never bundled by Next.js
- [x] Compiler discovery (pdflatex/xelatex/lualatex/latexmk/bibtex/biber via `execFile --version`, cached)
- [x] Restricted API: `GET /version`, `POST /compile`, `GET /status/:buildId`, `POST /cancel/:buildId`, `GET /builds/:buildId/output.pdf`, `DELETE /project/:projectId`, WS `/events` — no arbitrary shell execution, compiler is always resolved from a fixed allowlist
- [x] Security: path traversal guards, project-slug validation, size/file-count limits, CORS origin allowlist, compile timeout with process-tree kill (`tree-kill`), SIGINT/SIGTERM cleanup of running builds
- [x] latexmk as build orchestrator (auto-drives bibtex/biber passes), incremental builds reuse the per-project work directory
- [x] Single active build per project; new compiles cancel a still-running one for the same project
- [x] Real log parsing (file/line-aware errors and warnings) from latexmk/pdflatex output
- [x] Verified end-to-end on this machine: real PDF output, broken-doc error parsing with line numbers, cancellation kills the real process tree, single-build-per-project supersede, all security rejections (path traversal, disallowed compiler, oversized payload, bad CORS origin), live WebSocket build-update stream
- [x] Frontend: `lib/local-compiler/` client (detection, compile/status/cancel, WS subscribe) + `CompilerService` (local vs. cloud selection by user preference, automatic fallback if a detected agent becomes unreachable mid-compile)
- [x] `store/workspace-store.ts`'s `runCompile`/`cancelCompile` route through `CompilerService` instead of the mock cloud path directly; build-id generation guard supersedes stale results instead of letting them overwrite a newer compile
- [x] Status indicator in the compile toolbar (local vs. cloud, live agent detection, discovered compiler versions, measured duration)
- [x] Install flow: explains what the local agent can access, cosmetic install animation (a browser can't install native software) followed by an honest real re-check — never fakes a successful connection
- [x] Settings → Local compiler: connection status, prefer-local/always-cloud/ask-each-time preference, disable action
- [x] Known gaps: source→PDF SyncTeX highlight not implemented for local builds (no real `.synctex.gz` parsing yet, only the cloud/mock path fabricates synctex data); "ask-each-time" behaves like "prefer-local" for the compile decision itself rather than a hard per-compile blocking prompt (a status-badge nudge instead, to avoid blocking the UI per the feature's own UX requirement)
