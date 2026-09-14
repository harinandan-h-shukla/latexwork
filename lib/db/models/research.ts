import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SavedPaperSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true },
    authors: { type: String, required: true },
    venue: { type: String, required: true },
    year: { type: String, required: true },
    doi: String,
    bibKey: String,
    tags: { type: [String], default: [] },
    needsReview: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "savedAt", updatedAt: false } },
);

export type SavedPaperDoc = InferSchemaType<typeof SavedPaperSchema>;
export const SavedPaperModel: Model<SavedPaperDoc> =
  models.SavedPaper ?? model<SavedPaperDoc>("SavedPaper", SavedPaperSchema);

const ResearchNoteSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    paperId: { type: Schema.Types.ObjectId, ref: "SavedPaper", default: null },
    heading: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

export type ResearchNoteDoc = InferSchemaType<typeof ResearchNoteSchema>;
export const ResearchNoteModel: Model<ResearchNoteDoc> =
  models.ResearchNote ?? model<ResearchNoteDoc>("ResearchNote", ResearchNoteSchema);

const OpenQuestionSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    text: { type: String, required: true },
    resolved: { type: Boolean, default: false },
    linkedPaperId: { type: Schema.Types.ObjectId, ref: "SavedPaper", default: null },
    linkedNoteId: { type: Schema.Types.ObjectId, ref: "ResearchNote", default: null },
    linkedSection: { type: String, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export type OpenQuestionDoc = InferSchemaType<typeof OpenQuestionSchema>;
export const OpenQuestionModel: Model<OpenQuestionDoc> =
  models.OpenQuestion ?? model<OpenQuestionDoc>("OpenQuestion", OpenQuestionSchema);

const EvidenceClaimSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    claim: { type: String, required: true },
    supportingPaperIds: { type: [Schema.Types.ObjectId], ref: "SavedPaper", default: [] },
    ownEvidence: { type: [String], default: [] },
    status: { type: String, enum: ["supported", "needs-more-evidence", "contested"], default: "needs-more-evidence" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

export type EvidenceClaimDoc = InferSchemaType<typeof EvidenceClaimSchema>;
export const EvidenceClaimModel: Model<EvidenceClaimDoc> =
  models.EvidenceClaim ?? model<EvidenceClaimDoc>("EvidenceClaim", EvidenceClaimSchema);
