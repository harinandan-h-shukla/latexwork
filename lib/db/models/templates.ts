import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const TemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ["journal", "thesis", "resume", "presentation", "letter", "other"],
      required: true,
    },
    publisher: String,
    description: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    sourceProjectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    isOwn: { type: Boolean, default: false },
    authorId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export type TemplateDoc = InferSchemaType<typeof TemplateSchema>;
export const TemplateModel: Model<TemplateDoc> = models.Template ?? model<TemplateDoc>("Template", TemplateSchema);
