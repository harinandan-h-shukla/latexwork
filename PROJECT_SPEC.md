# PROJECT SPEC — LaTeX Cloud Editor (Overleaf-equivalent, modern stack)

## Goal
Build a browser-based, cloud-storage LaTeX editor with feature parity to Overleaf, on a modern tech stack, with a redesigned UI and fixes for Overleaf's known drawbacks. **No function listed below may be dropped.** Additive design/UX features (Section 13) are optional enhancements layered on top — never a replacement for a listed function.

## Build order (binding)
1. **Phase 0** — this spec + TASKS.md checked into repo, read by Claude Code every session.
2. **Phase 1** — full frontend, all features clickable, backed by mock data / fake API layer with real-looking behavior. No real auth, DB, or compile server yet.
3. **Phase 2** — backend implemented task-by-task from TASKS.md, each task swaps one mock function for a real implementation without changing frontend call signatures.

## Target stack (Phase 1 default — confirm before deviating)
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Radix
- CodeMirror 6 (LaTeX editor core)
- pdf.js (PDF preview)
- Zustand or Jotai (client state)
- Mock API layer: `lib/mock-api.ts`, function signatures match eventual real backend exactly

## Phase 2 backend targets (to be finalized when reached)
- Auth: email/password + OAuth (Google) + institutional SSO + ORCID
- DB: Postgres
- Realtime collab: CRDT (Yjs) over WebSocket
- Compile service: containerized TeX Live, queued jobs
- Storage: object storage for project files/assets
- Version history: snapshot + diff storage

---

## 1. PROJECT & ACCOUNT OPERATIONS
- Sign up / login (email, Google, ORCID, institutional SSO)
- Create project (blank, from template, upload zip, import from Git/GitHub, import from URL)
- Clone/copy/fork a project (own or public)
- Delete / trash / restore project (soft delete, retention window)
- Archive project
- Rename project
- Project tags/labels, folders for organization
- Project search/filter/sort (name, date modified, owner, tag)
- Star/favorite projects
- Transfer project ownership
- Project settings: compiler (pdflatex/xelatex/lualatex), TeX Live version, main file, spell-check language, auto-compile on/off, compile timeout
- Storage quota tracking per user/project
- Trash / recently-deleted view with permanent-delete

## 2. FILE & PROJECT-TREE OPERATIONS
- File tree: create file, create folder, rename, delete, move (drag-drop), duplicate
- Upload file(s): drag-drop, browse, paste image from clipboard
- Bulk upload (zip extraction into tree)
- Supported types: .tex, .bib, .cls, .sty, .bst, images (png/jpg/eps/pdf), data files (csv), fonts
- Download single file
- Download entire project as zip
- Download compiled PDF
- Set "main" .tex file (compile entry point)
- Linked files (URL/external-provider-linked assets, refreshable)
- File size limits & per-file quota indicator
- Binary file preview (image thumbnail in tree)
- Move file via cut/paste or drag
- Multi-select files (bulk delete/move/download)

## 3. EDITOR — TEXT EDITING OPERATIONS
- Cut/copy/paste, undo/redo (infinite, session-persistent)
- Find & replace (in-file + project-wide), regex toggle, case-sensitive toggle, whole-word toggle
- Go to line number
- Multi-cursor editing / multi-select (Ctrl+click, select-next-occurrence)
- Line ops: duplicate, delete, move up/down, join lines
- Indent/outdent (Tab/Shift+Tab), auto-indent on newline
- Comment/uncomment selection (% toggle)
- Code folding (by section/environment/braces)
- Bracket/brace/environment auto-matching + highlighting
- Auto-close brackets, quotes, \begin{}...\end{} pairs
- Word wrap toggle
- Zoom / font size control
- Line numbers toggle
- Whitespace/invisible character toggle
- Split-pane editing (two files side by side)
- Drag-select, keyboard-select (Shift+arrows, Shift+Ctrl+arrows)
- Vim/Emacs keybinding modes
- Spell-check: inline underline, right-click suggestions, custom dictionary
- Trailing whitespace trim option

## 4. LATEX-SPECIFIC EDITING FEATURES
- Syntax highlighting (commands, math mode, comments, braces, environments)
- Autocomplete: commands, environment names, label refs (\ref, \eqref), citation keys (\cite), file paths (\include, \includegraphics), package names
- Snippet expansion (e.g. "beg" + Tab -> \begin{}...\end{})
- Real-time syntax error underlining (unmatched braces, undefined refs) pre-compile
- Jump-to-definition for labels/commands (Ctrl+click)
- Rename symbol/label across project
- Equation preview on hover (inline render while typing)
- Table generator/editor (visual grid -> \begin{tabular} code)
- Math symbol palette / equation editor (visual, click-to-insert)
- BibTeX/citation key autocomplete from .bib files
- Package-aware autocomplete (only commands from included packages)
- Outline/structure view (sidebar of sections/subsections, click to jump)
- Word count / character count (option to exclude comments/commands)
- Quick-format toolbar (bold, italic, section levels) over raw LaTeX

## 5. COMPILATION
- Compile button (manual) + auto-compile on save (debounced)
- Compiler choice: pdfLaTeX, XeLaTeX, LuaLaTeX, latex+dvips+ps2pdf
- TeX Live version pinning per project
- Compile log panel: full log, errors-only filter, warnings-only filter
- Click error in log -> jump to source line
- Compile timeout handling, clear message
- Draft mode (faster compile, no images) toggle
- Stop compile button
- Compile queue status indicator (position, ETA)
- Incremental/partial compilation for large docs (addition over Overleaf)
- Custom compile command override (advanced)
- Shell-escape toggle (for packages like minted, svg)

## 6. PDF PREVIEW / VIEWER
- Live rendered PDF pane
- SyncTeX bidirectional: PDF click -> source line highlight; source line -> PDF scroll/highlight
- Zoom in/out, fit-to-width, fit-to-page
- Page navigation (next/prev, jump to page number)
- Search within compiled PDF
- Highlight compile errors/warnings as markers on PDF page thumbnails
- Continuous scroll vs single-page toggle
- Split view (resizable divider) or stacked (mobile)
- Download PDF, print PDF
- Presentation/fullscreen PDF view

## 7. COLLABORATION
- Real-time multi-user editing, live cursors (name-tagged, colored)
- Presence indicators (who's viewing/editing which file)
- Comments: select text -> comment, threaded replies, resolve/reopen
- Track changes: inline additions/deletions, accept/reject individually or bulk, accept/reject by user
- Review mode toggle
- Project chat panel (separate from comments)
- @mentions in comments/chat with notifications
- Share project: invite by email, shareable link, role selection (owner/editor/reviewer/viewer)
- Permission management UI (collaborator list, change/revoke role, transfer ownership)
- Public/private toggle, publish read-only link

## 8. VERSION HISTORY
- Full revision history (auto-saved snapshots)
- Labeled versions (manual "save as version" with name/message)
- Diff view between any two versions (line-level, color-coded)
- Restore/rollback (whole project or single file)
- History filtered by user
- Download specific historical version

## 9. REFERENCES / BIBLIOGRAPHY
- .bib file editor (structured form view + raw editor)
- Citation key autocomplete in source
- Import citations: Zotero, Mendeley, DOI lookup, BibTeX search (CrossRef/PubMed)
- Bibliography style preview
- Duplicate citation key detection
- Broken/missing reference detection (undefined \cite/\ref)

## 10. TEMPLATES
- Template gallery (journal, thesis, resume, presentation, letter categories)
- Filter by publisher/journal (IEEE, ACM, Springer, etc.)
- "Use this template" -> clone into new project
- Save own project as reusable template
- Institution/journal-specific submission templates

## 11. EXPORT / INTEGRATION
- Export: PDF, full source zip, single .tex file with inlined includes
- Import: zip upload, GitHub repo (clone + push-back sync), URL import, Overleaf migration import
- Git integration: full two-way sync (not paywalled — fixes Overleaf gap)
- Dropbox/Google Drive sync
- API access (REST API for programmatic project/file ops)
- Webhook on compile complete / project update (addition)

## 12. NOTIFICATIONS / ACCOUNT MGMT
- Email notifications: comment mentions, share invites, compile failures (optional)
- In-app notification center
- Account settings: password, 2FA, linked accounts, email prefs, editor defaults (keybinding, theme, font, tab size, autocomplete on/off)
- Subscription/plan management, storage usage dashboard
- **Security & privacy** (identified gap, added 2026-09-10): active sessions / connected devices list with per-session revoke, "download my data" export, account deletion (with confirmation + grace period), privacy preferences (public-project search-engine indexing, anonymous usage analytics opt-in/out), account activity/audit log (logins, password changes, 2FA changes, session revocations)

---

## 13. ADDITIVE DESIGN/UX FEATURES (new — never replaces a function above)

### Visual/UI
- Modern component system (shadcn/ui + Radix + Tailwind), dark/light/system theme, multiple editor color themes
- Command palette (Cmd+K): fuzzy jump-to-file, run action, toggle setting, insert snippet
- Distraction-free / focus / zen mode
- Customizable layout: draggable/resizable panels, saved layout presets, floating PDF window
- Minimap for large files
- Breadcrumb of current section/subsection while scrolling
- Smooth animated transitions
- True responsive mobile UI: simplified toolbar, swipe between source/PDF

### AI-assisted (additive)
- Inline AI autocomplete (ghost-text) for LaTeX/prose
- "Explain this compile error" button in log
- AI-assisted table/figure generation from pasted data or image
- AI rewrite/grammar pass on prose (opt-in, non-destructive diff)
- Natural language -> LaTeX snippet generation

### Performance/infra (fixes to known Overleaf drawbacks)
- Sub-second incremental compile via unchanged-chunk caching
- Offline mode: local edit queue, sync on reconnect (PWA/local-first, CRDT-based)
- Instant cold start for small/medium docs
- Transparent compile-server autoscaling status

### Collaboration extras
- Voice/video call widget docked in project (optional/deferrable)
- Cursor "follow mode" (follow a collaborator's viewport)
- Activity feed / project timeline

### Editing extras
- Split-diff visual for track-changes (side-by-side)
- Drag-and-drop image -> auto \includegraphics + asset upload
- Paste table from Excel/Sheets -> auto-converts to LaTeX table
- Equation OCR (photo of equation -> LaTeX)

---

## Non-negotiable constraints
- Every item in Sections 1–12 must ship. None may be silently dropped or descoped without explicit confirmation.
- Section 13 items are additive only — implement after/alongside core functions, never instead of them.
- Phase 1 mock API function signatures must match what Phase 2 real backend will implement, so swaps are drop-in.
