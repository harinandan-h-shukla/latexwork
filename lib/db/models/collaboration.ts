import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CommentReplySchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    mentions: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

const CommentSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    fileId: { type: Schema.Types.ObjectId, ref: "ProjectFile", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    anchorFrom: { type: Number, required: true },
    anchorTo: { type: Number, required: true },
    quotedText: { type: String, required: true },
    text: { type: String, required: true },
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date,
    replies: { type: [CommentReplySchema], default: [] },
    mentions: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export type CommentDoc = InferSchemaType<typeof CommentSchema>;
export const CommentModel: Model<CommentDoc> = models.Comment ?? model<CommentDoc>("Comment", CommentSchema);

const TrackedChangeSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    fileId: { type: Schema.Types.ObjectId, ref: "ProjectFile", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["insertion", "deletion"], required: true },
    from: { type: Number, required: true },
    to: { type: Number, required: true },
    text: { type: String, required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export type TrackedChangeDoc = InferSchemaType<typeof TrackedChangeSchema>;
export const TrackedChangeModel: Model<TrackedChangeDoc> =
  models.TrackedChange ?? model<TrackedChangeDoc>("TrackedChange", TrackedChangeSchema);

const ChatMessageSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    mentions: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export type ChatMessageDoc = InferSchemaType<typeof ChatMessageSchema>;
export const ChatMessageModel: Model<ChatMessageDoc> =
  models.ChatMessage ?? model<ChatMessageDoc>("ChatMessage", ChatMessageSchema);

// Presence is short-lived and high-churn (a cursor position ping every few
// seconds); a real deploy should keep this in Redis/an ephemeral store, not
// Mongo. Modeled here for schema completeness / so a Phase-2-later swap has
// a clear seam, but not wired into the realtime path.
const PresenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    fileId: { type: Schema.Types.ObjectId, ref: "ProjectFile", default: null },
    cursorLine: { type: Number, default: null },
    color: { type: String, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: "lastActiveAt" } },
);

export type PresenceDoc = InferSchemaType<typeof PresenceSchema>;
export const PresenceModel: Model<PresenceDoc> =
  models.Presence ?? model<PresenceDoc>("Presence", PresenceSchema);
