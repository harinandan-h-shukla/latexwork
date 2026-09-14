# Research OS Redesign — design & product spec

Added 2026-09-10. This supersedes ad-hoc visual choices made before it (including an earlier
indigo/glassmorphism pass inspired by a reference screenshot) as the authoritative direction for
Inkwell's UI/UX. It repositions the product from "an online LaTeX editor" to a **Research OS**:
a workspace for discovering, understanding, collecting, citing, writing, verifying, compiling,
collaborating on, and preparing research papers. LaTeX is an underlying capability, not the
product's identity.

**Binding rule**: do not implement UI that would read as Overleaf, Google Docs, Notion, Linear,
VS Code-in-a-browser, or "generic purple SaaS dashboard" with the logo removed. Every surface
should make a researcher think "this is where I do my research work," not "this is another
Overleaf."

Full section-by-section detail (design tokens, IA, landing page narrative, dashboard, editor
shell, reference workspace, citation picker, research shelf, paper notes, paper health/review,
template gallery, new-paper flow, command palette, PDF experience, build status, empty states,
micro-interactions, responsive rules) is preserved in git history in the conversation that
introduced it. This file tracks **implementation status** against the plan; see `TASKS.md` for
the section 1.x-equivalent checklist entries as each phase lands.

## Implementation phases (binding order, as specified)
1. Design system (colors, typography, spacing/radius) — **in progress**
2. Landing page
3. Dashboard / Research Workspace
4. Editor shell (Paper/Research/Collaboration/Project navigation replacing the plain File/Editor/PDF model)
5. Reference workspace (paper cards, detail panel, research shelf, paper notes)
6. Citation picker (`\cite{` triggers a paper search/insert UI)
7. Paper template gallery (conferences/journals/research-types/thesis categories)
8. Review / Paper Health panel
9. Local compilation status (already substantially covered by Phase 2.18's real local-agent work — revisit for the new visual treatment only, not the underlying mechanism)
10. Micro-interactions and polish

## Design system (Phase 1)

### Color tokens
Exact hex values as specified by the user, mapped onto both shadcn's required token set
(so existing components keep working unmodified) and new semantic tokens for the extra surface/
text tiers the spec calls for (`--surface-secondary`, `--surface-elevated`, `--text-secondary`,
`--text-tertiary`, `--border-strong`, `--primary-hover`, `--primary-soft`, `--secondary-accent`,
`--secondary-soft`, `--success`/`--success-soft`, `--warning`/`--warning-soft`,
`--error-soft`, `--info`/`--info-soft`). See `app/globals.css` for the implementation.

**Explicit constraint from the spec**: do not turn everything purple/accent-colored. The primary
accent is reserved for primary actions, active navigation, important research states, and
selected objects. Most of the UI stays neutral (the new secondary/muted/surface tokens exist
specifically to keep large surface areas neutral while the accent stays purposeful).

### Typography
- UI: Geist (already in use, and explicitly spec-approved as an alternative to Inter — not changed).
- Code/LaTeX: JetBrains Mono (added; previously Geist Mono was used for all monospace contexts,
  now reserved specifically for the editor/code surfaces per the spec).

### Radius
Spec range (8-14px general, 12-16px cards, 8-10px buttons/inputs) — the existing
`--radius: 0.625rem` (10px) base, combined with the existing `--radius-sm/md/lg/xl` multiplier
scale in `app/globals.css`, already lands inside this range without changes.

## Status
- [x] Phase 1 color tokens (light + dark)
- [x] Phase 1 typography (JetBrains Mono for code)
- [x] Phase 2 landing page (copy rebuilt around the Research OS narrative; hero visual
      replaced with the Research Library → Reference → Manuscript → Evidence → Review →
      PDF pipeline diagram — no longer a LaTeX-editor screenshot)
- [x] Phase 3 dashboard / Research Workspace (continue-writing card, research-object
      project cards, research inbox)
- [x] Phase 4 editor shell navigation — project topbar is now Overview / Manuscript /
      Research / References / Figures / Review / Versions, replacing the plain
      File/Editor/PDF model. Integrations demoted to a link from Overview rather than a
      top-level tab (route unchanged, still fully functional).
- [x] Phase 4b contextual right panel — the side panel now switches to a live Reference
      detail view (verified badges, citation count + per-section usage) when the cursor
      is inside a \cite{}, alongside manual Outline/Papers/Notes/Comments/Chat/Log modes.
- [x] Phase 5 reference workspace — new research-object data model (SavedPaper,
      ResearchNote, OpenQuestion, EvidenceClaim; lib/mock-api/research.ts) backing a
      Research tab (papers/notes/open questions/evidence) and a Reference Library view
      (search, All/Cited/Uncited/Needs-review filters, per-reference citation usage) that
      is now the default view on the References tab, with the raw .bib editor kept as a
      secondary "Raw .bib" toggle.
- [x] Phase 6 citation picker — verified/DOI badges on results; searching for a paper
      that matches an already-saved one now offers "Cite existing" vs. "Create separate
      record" instead of silently creating a duplicate bib entry.
- [x] Phase 8 (partial) Paper Health — real computed score (citations resolved,
      metadata/DOI verified, unused references, figures/tables referenced) surfaced on
      both Overview and the References tab; a dedicated Review tab shows paper-level
      comment/track-change status instead of only the narrow editor side panel.
- [x] Phase 9 local compilation status — unchanged from the existing 2.18 implementation
      (already matched the target visual treatment).
- [ ] Phase 7 paper template gallery richer taxonomy (conference/journal/research-type/
      thesis categories) — not yet done, current categories are still the original
      generic set (Journal/Thesis/Resume/Presentation/Letter).
- [ ] Phase 10 micro-interactions/polish pass, and a dedicated mobile-responsive pass on
      the new project topbar (7 tabs is tight below ~900px) — not yet done.
- [ ] Global primary nav (Home/Research/Papers/Write/References/Review/History) is only
      partially reflected — app shell's sidebar item was renamed Dashboard→Home; the
      other five are project-scoped only (Research, References, Review already exist per
      project), no cross-project aggregation pages exist yet.
