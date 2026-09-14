import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const FileSnapshotSchema = new Schema(
  {
    fileId: { type: Schema.Types.ObjectId, ref: "ProjectFile", required: true },
    path: { type: String, required: true },
    content: { type: String, required: true },
  },
  { _id: false },
);

const VersionSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    label: { type: String, default: null },
    message: { type: String, default: null },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isAutoSnapshot: { type: Boolean, default: true },
    fileSnapshots: { type: [FileSnapshotSchema], default: [] },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export type VersionDoc = InferSchemaType<typeof VersionSchema>;
export const VersionModel: Model<VersionDoc> = models.Version ?? model<VersionDoc>("Version", VersionSchema);
