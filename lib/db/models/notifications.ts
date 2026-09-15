import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: {
      type: String,
      enum: ["comment_mention", "chat_mention", "share_invite", "compile_failure", "collaborator_joined"],
      required: true,
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    /** Only set for kind "share_invite" — the role the invite would grant,
     * and whether the recipient has acted on it yet. Left undefined for
     * every other notification kind. */
    role: { type: String, enum: ["editor", "reviewer", "viewer"] },
    inviteStatus: { type: String, enum: ["pending", "accepted", "declined"] },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export type NotificationDoc = InferSchemaType<typeof NotificationSchema>;
export const NotificationModel: Model<NotificationDoc> =
  models.Notification ?? model<NotificationDoc>("Notification", NotificationSchema);

const ApiKeySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label: { type: String, required: true },
    /** Only the non-secret prefix is stored/shown; the real secret is hashed like a password would be. */
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true, select: false },
    lastUsedAt: { type: Date, default: null },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export type ApiKeyDoc = InferSchemaType<typeof ApiKeySchema>;
export const ApiKeyModel: Model<ApiKeyDoc> = models.ApiKey ?? model<ApiKeyDoc>("ApiKey", ApiKeySchema);

const WebhookSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    url: { type: String, required: true },
    events: { type: [String], enum: ["compile.completed", "project.updated"], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export type WebhookDoc = InferSchemaType<typeof WebhookSchema>;
export const WebhookModel: Model<WebhookDoc> = models.Webhook ?? model<WebhookDoc>("Webhook", WebhookSchema);
