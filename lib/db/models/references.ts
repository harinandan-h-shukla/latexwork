import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const BibEntrySchema = new Schema(
  {
    fileId: { type: Schema.Types.ObjectId, ref: "ProjectFile", required: true, index: true },
    key: { type: String, required: true },
    type: {
      type: String,
      enum: ["article", "book", "inproceedings", "misc", "phdthesis", "techreport"],
      required: true,
    },
    fields: { type: Map, of: String, default: {} },
    doiVerified: { type: Boolean, default: false },
    metadataVerified: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);
// Duplicate-key detection is a query (count by key), not a stored flag, once
// this is real — lib/mock-api/references.ts recomputes isDuplicateKey on
// every mutation for the same reason a real implementation would use an
// aggregation instead of a denormalized boolean.
BibEntrySchema.index({ fileId: 1, key: 1 });

export type BibEntryDoc = InferSchemaType<typeof BibEntrySchema>;
export const BibEntryModel: Model<BibEntryDoc> = models.BibEntry ?? model<BibEntryDoc>("BibEntry", BibEntrySchema);
