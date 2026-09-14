import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";
import { encryptFileContent, decryptFileContent } from "@/lib/crypto/file-encryption";

const ProjectSettingsSchema = new Schema(
  {
    compiler: { type: String, enum: ["pdflatex", "xelatex", "lualatex", "latexdvips"], default: "pdflatex" },
    texLiveVersion: { type: String, default: "2025" },
    mainFileId: { type: Schema.Types.ObjectId, ref: "ProjectFile", default: null },
    spellCheckLanguage: { type: String, default: "en-US" },
    autoCompile: { type: Boolean, default: true },
    compileTimeoutSeconds: { type: Number, default: 90 },
    draftMode: { type: Boolean, default: false },
    shellEscape: { type: Boolean, default: false },
    customCompileCommand: String,
  },
  { _id: false },
);

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    folderId: { type: Schema.Types.ObjectId, ref: "ProjectFolder", default: null },
    tags: { type: [String], default: [] },
    starred: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
    settings: { type: ProjectSettingsSchema, default: () => ({}) },
    storageUsedBytes: { type: Number, default: 0 },
    /** A user-chosen cover image, distinct from the auto-picked "first
     * figure in the project" thumbnail dashboard.ts falls back to when
     * this isn't set. See lib/storage/blob-storage.ts. */
    thumbnailBlobPathname: { type: String, default: null },
    visibility: { type: String, enum: ["private", "public"], default: "private" },
    publicReadOnlyLink: { type: String, default: null },
    // Plain string, not an ObjectId ref: templates still live in the Phase 1
    // mock store (lib/mock-api/seed.ts), not a real Template collection yet.
    sourceTemplateId: { type: String },
    sourceImport: {
      type: new Schema(
        {
          kind: { type: String, enum: ["zip", "github", "url", "overleaf"] },
          origin: String,
        },
        { _id: false },
      ),
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

export type ProjectDoc = InferSchemaType<typeof ProjectSchema>;
export const ProjectModel: Model<ProjectDoc> = models.Project ?? model<ProjectDoc>("Project", ProjectSchema);

// A project owner always has implicit "owner" access; rows here are for
// everyone ELSE who has been granted access (mirrors lib/types.ts Collaborator,
// which likewise doesn't carry an explicit row for the owner in the mock layer).
const CollaboratorSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    role: { type: String, enum: ["owner", "editor", "reviewer", "viewer"], required: true },
    invitedEmail: String,
  },
  { timestamps: { createdAt: "addedAt", updatedAt: false } },
);
CollaboratorSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export type CollaboratorDoc = InferSchemaType<typeof CollaboratorSchema>;
export const CollaboratorModel: Model<CollaboratorDoc> =
  models.Collaborator ?? model<CollaboratorDoc>("Collaborator", CollaboratorSchema);

const ProjectFileSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "ProjectFile", default: null },
    type: { type: String, enum: ["file", "folder"], required: true },
    name: { type: String, required: true },
    path: { type: String, required: true },
    isMain: { type: Boolean, default: false },
    /** Only meaningful on a folder doc: which of its direct child files
     * compiles when the currently-open file is inside this folder but isn't
     * itself a standalone document (no \documentclass) — e.g. a section
     * file being \input{}-ed. Lets a project that bundles several
     * independent papers as folders (see runCompile in workspace-store.ts)
     * have each folder remember its own entry point, set once via "Set as
     * main file for this folder" rather than needing every open file to
     * itself contain \documentclass. */
    folderMainFileId: { type: Schema.Types.ObjectId, ref: "ProjectFile", default: null },
    isBinary: { type: Boolean, default: false },
    sizeBytes: { type: Number, default: 0 },
    mimeType: String,
    thumbnailUrl: String,
    linkedUrl: String,
    /** Vercel Blob pathname (private access — see lib/storage/blob-storage.ts)
     * for a binary file's actual bytes. Binary files never had their
     * content stored anywhere before this field existed. Not a public URL:
     * retrieval always goes through the authenticated
     * app/api/files/[fileId]/blob route. */
    blobPathname: String,
    /**
     * Text file source. Binary file bytes live in object storage in a real
     * deploy — see storage.ts. Encrypted at rest (AES-256-GCM) via these
     * schema-level transforms: set() runs on every write path (create,
     * document.save(), updateOne() with a plain content field all cast
     * through this), get() runs on every document property access and on
     * toObject({getters: true})/toJSON({getters: true}) — see
     * files.ts's toProjectFile(), which already passes getters: true.
     */
    content: {
      type: String,
      set: (v?: string) => (v == null ? v : encryptFileContent(v)),
      // Bulk/listing reads (reference scanning, citation usage, dashboard
      // stats) go through this getter on every file in a project and must
      // keep degrading gracefully for one corrupted row instead of taking
      // the whole page down — same as they already tolerate a genuinely
      // empty file. The one call site that actually needs to tell "empty"
      // and "corrupted" apart — getFileContent, used for editing/compiling/
      // saving — bypasses this getter (a .lean() query) and calls
      // decryptFileContent directly so it can throw. See files.ts.
      get: (v?: string) => {
        if (v == null) return v;
        try {
          return decryptFileContent(v);
        } catch {
          return "";
        }
      },
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);
ProjectFileSchema.index({ projectId: 1, path: 1 }, { unique: true });

export type ProjectFileDoc = InferSchemaType<typeof ProjectFileSchema>;
export const ProjectFileModel: Model<ProjectFileDoc> =
  models.ProjectFile ?? model<ProjectFileDoc>("ProjectFile", ProjectFileSchema);

export { Types };
