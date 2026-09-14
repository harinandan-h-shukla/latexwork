// Research objects: saved papers, notes, open questions, evidence/claims.
// New in the Research OS redesign (RESEARCH_OS_REDESIGN.md phase 5) — this
// entire module was greenfield before this pass.

import type { EvidenceClaim, OpenQuestion, ResearchNote, SavedPaper } from "@/lib/types";
import { delay, id, mockDb } from "@/lib/mock-api/db";

const RICH_DEMO_PROJECT_ID = "proj_thesis";

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

// Used to unconditionally redirect ANY project with no papers yet to the
// demo project's data — which, since a real project never has papers on
// its first visit, meant every real account's dashboard/inbox showed the
// same seeded demo papers ("36 papers saved" on a brand-new account). Now
// every project (real or demo) only ever sees its own data; the demo
// project's rich seed content still shows correctly under its own id.
function resolveProjectId(projectId: string): string {
  return projectId;
}

let seeded = false;

function seedResearchData(): void {
  if (seeded) return;
  seeded = true;
  // Defense in depth: the `seeded` flag lives in this module's in-memory
  // state, which a dev-server hot-reload can reset independently of the
  // shared mockDb singleton — without this check that would silently
  // re-push a second copy of every seeded paper/note/question on the next
  // call instead of skipping (this exact bug produced a dashboard showing
  // "36 papers saved" for a brand-new account — 2x the real seed count).
  if (mockDb.savedPapers.some((p) => p.projectId === RICH_DEMO_PROJECT_ID)) return;
  seeded = true;

  const papers: Array<Omit<SavedPaper, "id">> = [
    { projectId: RICH_DEMO_PROJECT_ID, title: "Distribution Alignment for Long-Tailed Regression", authors: "Yang, C. et al.", venue: "NeurIPS", year: "2024", doi: "10.5555/neurips24-dalr", bibKey: "lee2021", tags: ["long-tail", "regression"], savedAt: daysAgo(3), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Spectral Structure in Neural Regression", authors: "Kumar, A. et al.", venue: "ICLR", year: "2025", doi: "10.5555/iclr25-ssnr", tags: ["spectral-bias"], savedAt: daysAgo(4), needsReview: true },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Computing Machinery and Intelligence", authors: "Turing, A. M.", venue: "Mind", year: "1950", bibKey: "turing1950", tags: ["foundational"], savedAt: daysAgo(180), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Scalable Evaluation Methodologies for Systems Research", authors: "Smith, J.", venue: "J. Systems Research", year: "2020", bibKey: "smith2020", tags: ["methodology"], savedAt: daysAgo(120), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Experimental Setups for Reproducible Benchmarks", authors: "Jones, M.", venue: "ICS", year: "2019", bibKey: "jones2019", tags: ["methodology", "benchmarks"], savedAt: daysAgo(110), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Distributed Systems at Scale", authors: "Lee, H.", venue: "ACM TOCS", year: "2021", bibKey: "lee2021", tags: ["systems"], savedAt: daysAgo(90), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "The TeXbook", authors: "Knuth, D. E.", venue: "Addison-Wesley", year: "1984", bibKey: "knuth1984", tags: ["reference"], savedAt: daysAgo(200), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Representation Collapse in Early Training Dynamics", authors: "Ferreira, A. and Wong, D.", venue: "ICML", year: "2023", doi: "10.5555/icml23-rced", tags: ["representation", "dynamics"], savedAt: daysAgo(6), needsReview: true },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Loss Reweighting Revisited for Imbalanced Data", authors: "Ivanova, S. and Dubois, P.", venue: "AISTATS", year: "2023", tags: ["loss", "imbalance"], savedAt: daysAgo(9), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Initialization Effects on Spectral Imbalance", authors: "Kapoor, A. and Rossi, F.", venue: "arXiv", year: "2024", tags: ["initialization"], savedAt: daysAgo(11), needsReview: true },
    { projectId: RICH_DEMO_PROJECT_ID, title: "A Survey of Long-Tailed Learning", authors: "Garcia, M. and Patel, R.", venue: "ACM Computing Surveys", year: "2022", tags: ["survey", "long-tail"], savedAt: daysAgo(60), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Curriculum Effects in Minority-Class Learning", authors: "Nakamura, Y. and Fischer, K.", venue: "NeurIPS Workshop", year: "2023", tags: ["curriculum"], savedAt: daysAgo(20), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "On the Foundations of Robust Regression", authors: "Chen, L. and Okafor, N.", venue: "JMLR", year: "2022", tags: ["robustness"], savedAt: daysAgo(75), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Towards Calibrated Predictions under Distribution Shift", authors: "Moreau, E. and Lindqvist, A.", venue: "UAI", year: "2023", tags: ["calibration"], savedAt: daysAgo(30), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Does L1 Loss Preserve Minority Signal?", authors: "Volkov, D.", venue: "arXiv", year: "2024", tags: ["loss"], savedAt: daysAgo(2), needsReview: true },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Feature Geometry of Overparameterized Networks", authors: "Suzuki, H. and Park, J.", venue: "COLT", year: "2022", tags: ["geometry"], savedAt: daysAgo(85), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Reweighting vs. Resampling: An Empirical Comparison", authors: "Novak, P.", venue: "ECML", year: "2021", tags: ["empirical"], savedAt: daysAgo(150), needsReview: false },
    { projectId: RICH_DEMO_PROJECT_ID, title: "Early-Training Dynamics of Deep Regression Models", authors: "Haddad, R.", venue: "arXiv", year: "2024", tags: ["dynamics", "regression"], savedAt: daysAgo(5), needsReview: true },
  ];
  mockDb.savedPapers.push(...papers.map((p) => ({ ...p, id: id("paper") })));

  const byTitle = (t: string) => mockDb.savedPapers.find((p) => p.title === t)!;

  const notes: Array<Omit<ResearchNote, "id">> = [
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Distribution Alignment for Long-Tailed Regression").id, heading: "Main contribution", body: "Aligns the feature distribution of minority and majority classes via an auxiliary moment-matching loss.", createdAt: daysAgo(3), updatedAt: daysAgo(3) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Distribution Alignment for Long-Tailed Regression").id, heading: "Important limitation", body: "Does not address representation collapse — assumes features are already well-formed before alignment kicks in.", createdAt: daysAgo(3), updatedAt: daysAgo(2) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Distribution Alignment for Long-Tailed Regression").id, heading: "Possible connection", body: "Connects to our early-training hypothesis — alignment might work better if applied before representation collapse happens, not after.", createdAt: daysAgo(2), updatedAt: daysAgo(2) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Distribution Alignment for Long-Tailed Regression").id, heading: "Relevant section", body: "Section 4.2 — ablation on alignment timing during training.", createdAt: daysAgo(2), updatedAt: daysAgo(2) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Representation Collapse in Early Training Dynamics").id, heading: "Key idea", body: "Minority-class representations collapse toward the majority manifold within the first ~5% of training steps.", createdAt: daysAgo(6), updatedAt: daysAgo(5) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Representation Collapse in Early Training Dynamics").id, heading: "Useful for our work", body: "Directly supports Claim 1 in our draft — cite alongside Figure 4.", createdAt: daysAgo(5), updatedAt: daysAgo(5) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Spectral Structure in Neural Regression").id, heading: "Key idea", body: "Spectral bias toward low-frequency components explains part of the imbalance gap.", createdAt: daysAgo(4), updatedAt: daysAgo(4) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Spectral Structure in Neural Regression").id, heading: "Limitation", body: "Only tested on synthetic regression tasks — unclear if it transfers to real long-tailed benchmarks.", createdAt: daysAgo(4), updatedAt: daysAgo(4) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Initialization Effects on Spectral Imbalance").id, heading: "Key idea", body: "Initialization scale changes how quickly spectral imbalance emerges — larger init, faster collapse.", createdAt: daysAgo(11), updatedAt: daysAgo(10) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Loss Reweighting Revisited for Imbalanced Data").id, heading: "Key idea", body: "Reweighting helps final accuracy but does not change early-training representation dynamics.", createdAt: daysAgo(9), updatedAt: daysAgo(9) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Does L1 Loss Preserve Minority Signal?").id, heading: "Key idea", body: "L1 loss is more robust to majority-sample dominance early in training than L2.", createdAt: daysAgo(2), updatedAt: daysAgo(1) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("A Survey of Long-Tailed Learning").id, heading: "Useful for our work", body: "Good related-work skeleton — Table 2 categorizes methods by reweighting/resampling/representation-level.", createdAt: daysAgo(58), updatedAt: daysAgo(58) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: byTitle("Curriculum Effects in Minority-Class Learning").id, heading: "Possible connection", body: "Curriculum ordering could be an alternative lever to representation collapse — worth a footnote.", createdAt: daysAgo(19), updatedAt: daysAgo(19) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: null, heading: "Overall framing", body: "The thesis should position early-training representation collapse as the common cause behind both the loss-reweighting and distribution-alignment literatures.", createdAt: daysAgo(15), updatedAt: daysAgo(1) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: null, heading: "Experiment idea", body: "Track per-class feature-norm trajectories for the first 500 steps, compare minority vs. majority.", createdAt: daysAgo(14), updatedAt: daysAgo(14) },
    { projectId: RICH_DEMO_PROJECT_ID, paperId: null, heading: "Reviewer concern (anticipated)", body: "Someone will ask whether this holds under class-balanced sampling — pre-empt with an appendix ablation.", createdAt: daysAgo(8), updatedAt: daysAgo(8) },
  ];
  // Pad to a rounder, still-meaningful count of research notes without inventing new claims —
  // short methodology/logistics notes that a research process genuinely accumulates.
  const paddingNotes = [
    "Re-read Related Work section after adding the two new 2024 citations — flow feels disjointed.",
    "Ask Aditi whether the ICLR'25 spectral paper's code is public — check before citing their exact numbers.",
    "Double-check Figure 4 caption matches the updated axis labels.",
    "Table 2 needs a row for the L1-loss baseline once results are in.",
    "Notation clash: paper uses both z and h for the hidden representation — pick one before submission.",
    "Follow up: does the ICML'23 collapse paper release per-class trajectories, or only aggregates?",
    "Draft note: frame contribution as bridging reweighting and representation-level explanations.",
    "Check SERB grant report for any overlapping figures we can reuse here.",
    "Open item: confirm whether committee wants a theory section or purely empirical framing.",
    "Style: keep citation density in the introduction under ~1 per sentence, currently higher.",
    "Marco flagged the appendix ablation table is missing standard deviations.",
    "Revisit the L1-vs-L2 note after this week's additional runs finish.",
  ];
  for (const [i, body] of paddingNotes.entries()) {
    notes.push({
      projectId: RICH_DEMO_PROJECT_ID,
      paperId: null,
      heading: "Note",
      body,
      createdAt: daysAgo(25 - i),
      updatedAt: daysAgo(25 - i),
    });
  }
  mockDb.researchNotes.push(...notes.map((n) => ({ ...n, id: id("note") })));

  const distAlignPaper = byTitle("Distribution Alignment for Long-Tailed Regression");
  const repCollapsePaper = byTitle("Representation Collapse in Early Training Dynamics");
  const questions: Array<Omit<OpenQuestion, "id">> = [
    { projectId: RICH_DEMO_PROJECT_ID, text: "Why does the minority representation collapse early?", resolved: false, linkedPaperId: repCollapsePaper.id, linkedNoteId: null, linkedSection: "Introduction", createdAt: daysAgo(6) },
    { projectId: RICH_DEMO_PROJECT_ID, text: "Does initialization scale alter spectral imbalance?", resolved: false, linkedPaperId: byTitle("Initialization Effects on Spectral Imbalance").id, linkedNoteId: null, linkedSection: "Method", createdAt: daysAgo(11) },
    { projectId: RICH_DEMO_PROJECT_ID, text: "Can distribution alignment happen before representation formation?", resolved: false, linkedPaperId: distAlignPaper.id, linkedNoteId: null, linkedSection: "Method", createdAt: daysAgo(3) },
    { projectId: RICH_DEMO_PROJECT_ID, text: "Does the effect survive under L1 loss?", resolved: false, linkedPaperId: byTitle("Does L1 Loss Preserve Minority Signal?").id, linkedNoteId: null, linkedSection: "Experiments", createdAt: daysAgo(2) },
  ];
  mockDb.openQuestions.push(...questions.map((q) => ({ ...q, id: id("q") })));

  const claims: Array<Omit<EvidenceClaim, "id">> = [
    {
      projectId: RICH_DEMO_PROJECT_ID,
      claim: "Early training is dominated by majority-class samples.",
      supportingPaperIds: [repCollapsePaper.id, distAlignPaper.id, byTitle("Loss Reweighting Revisited for Imbalanced Data").id],
      ownEvidence: ["Figure 4", "Table 2"],
      status: "needs-more-evidence",
    },
    {
      projectId: RICH_DEMO_PROJECT_ID,
      claim: "Distribution alignment is more effective when applied before representation collapse.",
      supportingPaperIds: [distAlignPaper.id],
      ownEvidence: ["Table 3 (planned)"],
      status: "contested",
    },
    {
      projectId: RICH_DEMO_PROJECT_ID,
      claim: "Spectral bias contributes to, but does not fully explain, the imbalance gap.",
      supportingPaperIds: [byTitle("Spectral Structure in Neural Regression").id],
      ownEvidence: ["Figure 2"],
      status: "supported",
    },
  ];
  mockDb.evidenceClaims.push(...claims.map((c) => ({ ...c, id: id("claim") })));
}

// ---------------------------------------------------------------------------
// Saved papers
// ---------------------------------------------------------------------------

export async function listSavedPapers(projectId: string): Promise<SavedPaper[]> {
  seedResearchData();
  await delay(20);
  const resolved = resolveProjectId(projectId);
  return mockDb.savedPapers
    .filter((p) => p.projectId === resolved)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export interface SavePaperInput {
  title: string;
  authors: string;
  venue: string;
  year: string;
  doi?: string;
}

export async function savePaper(projectId: string, input: SavePaperInput): Promise<SavedPaper> {
  seedResearchData();
  await delay(400);
  const paper: SavedPaper = {
    id: id("paper"),
    projectId,
    ...input,
    tags: [],
    savedAt: new Date().toISOString(),
    needsReview: true,
  };
  mockDb.savedPapers.push(paper);
  return paper;
}

export async function markPaperReviewed(paperId: string): Promise<void> {
  await delay(200);
  const paper = mockDb.savedPapers.find((p) => p.id === paperId);
  if (paper) paper.needsReview = false;
}

export async function linkPaperToBibKey(paperId: string, bibKey: string): Promise<void> {
  await delay(200);
  const paper = mockDb.savedPapers.find((p) => p.id === paperId);
  if (paper) paper.bibKey = bibKey;
}

/** Returns true (with the matching paper) when a paper of the same title is already saved. */
export async function findDuplicatePaper(
  projectId: string,
  title: string,
): Promise<SavedPaper | null> {
  seedResearchData();
  const resolved = resolveProjectId(projectId);
  const normalized = title.trim().toLowerCase();
  return (
    mockDb.savedPapers.find(
      (p) => p.projectId === resolved && p.title.trim().toLowerCase() === normalized,
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Research notes
// ---------------------------------------------------------------------------

export async function listNotes(projectId: string, paperId?: string | null): Promise<ResearchNote[]> {
  seedResearchData();
  await delay();
  const resolved = resolveProjectId(projectId);
  return mockDb.researchNotes
    .filter((n) => n.projectId === resolved && (paperId === undefined || n.paperId === paperId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function addNote(
  projectId: string,
  input: { paperId: string | null; heading: string; body: string },
): Promise<ResearchNote> {
  seedResearchData();
  await delay(300);
  const now = new Date().toISOString();
  const note: ResearchNote = { id: id("note"), projectId, createdAt: now, updatedAt: now, ...input };
  mockDb.researchNotes.push(note);
  return note;
}

export async function updateNote(noteId: string, body: string): Promise<ResearchNote> {
  await delay(250);
  const note = mockDb.researchNotes.find((n) => n.id === noteId);
  if (!note) throw new Error("Note not found");
  note.body = body;
  note.updatedAt = new Date().toISOString();
  return note;
}

export async function deleteNote(noteId: string): Promise<void> {
  await delay(200);
  const idx = mockDb.researchNotes.findIndex((n) => n.id === noteId);
  if (idx !== -1) mockDb.researchNotes.splice(idx, 1);
}

// ---------------------------------------------------------------------------
// Open questions
// ---------------------------------------------------------------------------

export async function listOpenQuestions(projectId: string): Promise<OpenQuestion[]> {
  seedResearchData();
  await delay();
  const resolved = resolveProjectId(projectId);
  return mockDb.openQuestions
    .filter((q) => q.projectId === resolved)
    .sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.createdAt.localeCompare(a.createdAt));
}

export async function addOpenQuestion(projectId: string, text: string): Promise<OpenQuestion> {
  seedResearchData();
  await delay(300);
  const question: OpenQuestion = {
    id: id("q"),
    projectId,
    text,
    resolved: false,
    linkedPaperId: null,
    linkedNoteId: null,
    linkedSection: null,
    createdAt: new Date().toISOString(),
  };
  mockDb.openQuestions.push(question);
  return question;
}

export async function toggleOpenQuestion(questionId: string): Promise<OpenQuestion> {
  await delay(200);
  const question = mockDb.openQuestions.find((q) => q.id === questionId);
  if (!question) throw new Error("Question not found");
  question.resolved = !question.resolved;
  return question;
}

export async function linkOpenQuestion(
  questionId: string,
  link: { paperId?: string | null; noteId?: string | null; section?: string | null },
): Promise<OpenQuestion> {
  await delay(200);
  const question = mockDb.openQuestions.find((q) => q.id === questionId);
  if (!question) throw new Error("Question not found");
  if (link.paperId !== undefined) question.linkedPaperId = link.paperId;
  if (link.noteId !== undefined) question.linkedNoteId = link.noteId;
  if (link.section !== undefined) question.linkedSection = link.section;
  return question;
}

// ---------------------------------------------------------------------------
// Evidence / claims (explicitly dummy per the product spec — never presented
// as AI-verified fact, just a structured place to track claim -> evidence links)
// ---------------------------------------------------------------------------

export async function listEvidenceClaims(projectId: string): Promise<EvidenceClaim[]> {
  seedResearchData();
  await delay();
  const resolved = resolveProjectId(projectId);
  return mockDb.evidenceClaims.filter((c) => c.projectId === resolved);
}
