import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const EditorDefaultsSchema = new Schema(
  {
    keybinding: { type: String, enum: ["default", "vim", "emacs"], default: "default" },
    theme: { type: String, default: "default" },
    fontSize: { type: Number, default: 14 },
    tabSize: { type: Number, default: 2 },
    autocomplete: { type: Boolean, default: true },
    wordWrap: { type: Boolean, default: true },
    lineNumbers: { type: Boolean, default: true },
    compilerPreference: { type: String, enum: ["prefer-local", "always-cloud", "ask-each-time"] },
  },
  { _id: false },
);

const LinkedAccountSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ["google", "orcid", "github", "dropbox", "google-drive", "zotero", "mendeley"],
      required: true,
    },
    connectedAt: { type: Date, required: true },
    externalId: { type: String, required: true },
    externalEmail: String,
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    /** Never sent to the client. Absent for OAuth-only accounts. */
    passwordHash: { type: String, select: false },
    avatarUrl: String,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    linkedAccounts: { type: [LinkedAccountSchema], default: [] },
    editorDefaults: { type: EditorDefaultsSchema, default: () => ({}) },
    planTier: { type: String, enum: ["free", "student", "pro", "team"], default: "free" },
    storageQuotaBytes: { type: Number, default: 1024 * 1024 * 1024 },
    storageUsedBytes: { type: Number, default: 0 },
    emailNotificationPrefs: {
      type: new Schema(
        {
          commentMentions: { type: Boolean, default: true },
          shareInvites: { type: Boolean, default: true },
          compileFailures: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    privacyPrefs: {
      type: new Schema(
        {
          indexPublicProjects: { type: Boolean, default: false },
          shareUsageAnalytics: { type: Boolean, default: true },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const UserModel: Model<UserDoc> = models.User ?? model<UserDoc>("User", UserSchema);
