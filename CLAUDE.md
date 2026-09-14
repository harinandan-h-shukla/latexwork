# CLAUDE.md — instructions for Claude Code on this repo

## Before doing anything
Read `PROJECT_SPEC.md` and `TASKS.md` in the repo root. These define the full scope. Do not start work without checking current progress in `TASKS.md`.

For UI/UX/visual work specifically, also read `RESEARCH_OS_REDESIGN.md` — it's the binding design direction (a "Research OS," explicitly not an Overleaf-alike) and overrides ad-hoc visual choices made before it.

## What this project is
A browser-based, cloud-storage LaTeX editor with full Overleaf feature parity, built on a modern stack, with a redesigned UI and fixes for known Overleaf UX/performance drawbacks. See PROJECT_SPEC.md Sections 1-12 for required functions (must all ship) and Section 13 for additive design/UX features (build on top, never instead of).

## Build phases (binding order)
1. **Phase 0** (setup) — done once.
2. **Phase 1** — frontend only. Every feature in Sections 1-12 gets a real, clickable UI backed by a mock API layer (`lib/mock-api.ts`). No real backend, DB, auth, or compile server. Goal: the user can click every icon/button/panel and see correct-looking behavior.
3. **Phase 2** — backend, implemented one task at a time from the Phase 2 list in TASKS.md, in the proposed order, confirming with the user before starting each task. Each task replaces one mock function with a real implementation. Frontend call signatures must not change — component code should not need edits when a mock function is swapped for a real one.

## Stack
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Radix
- CodeMirror 6 for the LaTeX editor
- pdf.js for PDF preview
- Zustand or Jotai for client state
- KaTeX/MathJax for inline equation preview
- Phase 2: Postgres, Yjs (CRDT) + WebSocket for realtime, containerized TeX Live for compile, object storage for files

## Rules
- Never silently drop or descope a function listed in PROJECT_SPEC.md Sections 1-12. If something seems redundant or low-value, flag it to the user — don't just omit it.
- Section 13 items are additive. Implement them after/alongside the core function they enhance, never as a substitute.
- Every mock API function in `lib/mock-api.ts` must have a signature (params + return shape) that matches what the real Phase 2 implementation will use, so the swap is drop-in.
- Update checkboxes in `TASKS.md` as work completes. Don't mark something done until it's actually clickable/working, even with mock data.
- Keep components modular enough that a mock-to-real API swap touches `lib/mock-api.ts` (or its replacement) and not the component tree.
- Ask before jumping ahead to Phase 2 work while Phase 1 checkboxes remain unchecked.
- Ask before starting each individual Phase 2 backend task — don't chain them automatically.

## Design direction
- Modern, elegant UI: shadcn/ui components, Tailwind, dark/light/system theme, multiple editor color themes.
- Fix these known Overleaf pain points as part of the additive layer: dated/cramped UI, weak mobile experience, opaque compile queue, no AI assistance, clunky citation UX, basic symbol/table insertion, non-diff-friendly history UI, no offline support.
