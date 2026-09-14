// Shared domain types. Mock API (lib/mock-api.ts) and real Phase 2 API share these shapes.

export type Role = "owner" | "editor" | "reviewer" | "viewer";

export type Theme = "light" | "dark" | "system";

export type Compiler = "pdflatex" | "xelatex" | "lualatex" | "latexdvips";

export type CompilerPreference = "prefer-local" | "always-cloud" | "ask-each-time";

export interface EditorDefaults {
  keybinding: "default" | "vim" | "emacs";
  theme: string;
  fontSize: number;
  tabSize: number;
  autocomplete: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  compilerPreference?: CompilerPreference;
}

export interface LinkedAccount {
  provider: "google" | "orcid" | "github" | "dropbox" | "google-drive" | "zotero" | "mendeley";
  connectedAt: string;
  externalId: string;
  externalEmail?: string;
}

export interface EmailNotificationPrefs {
  commentMentions: boolean;
  shareInvites: boolean;
  compileFailures: boolean;
}

export interface PrivacyPrefs {
  indexPublicProjects: boolean;
  shareUsageAnalytics: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  twoFactorEnabled: boolean;
  linkedAccounts: LinkedAccount[];
  editorDefaults: EditorDefaults;
  planTier: "free" | "student" | "pro" | "team";
  storageQuotaBytes: number;
  storageUsedBytes: number;
  emailNotificationPrefs?: EmailNotificationPrefs;
  privacyPrefs?: PrivacyPrefs;
}

export interface SessionInfo {
  id: string;
  userId: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  isCurrent: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export type ActivityLogAction =
  | "login"
  | "password_changed"
  | "two_factor_enabled"
  | "two_factor_disabled"
  | "session_revoked"
  | "linked_account_connected"
  | "linked_account_disconnected"
  | "data_exported"
  | "privacy_prefs_updated";

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: ActivityLogAction;
  detail: string;
  ipAddress: string;
  createdAt: string;
}

export interface Collaborator {
  userId: string;
  projectId: string;
  role: Role;
  invitedEmail?: string;
  addedAt: string;
}

export interface ProjectSettings {
  compiler: Compiler;
  texLiveVersion: string;
  mainFileId: string | null;
  spellCheckLanguage: string;
  autoCompile: boolean;
  compileTimeoutSeconds: number;
  draftMode: boolean;
  shellEscape: boolean;
  customCompileCommand?: string;
}

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  folderId: string | null;
  tags: string[];
  starred: boolean;
  archived: boolean;
  trashed: boolean;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  storageUsedBytes: number;
  visibility: "private" | "public";
  publicReadOnlyLink: string | null;
  sourceTemplateId?: string;
  sourceImport?: {
    kind: "zip" | "github" | "url" | "overleaf";
    origin: string;
  };
}

export interface ProjectFolder {
  id: string;
  projectId: string;
}

export type FileNodeType = "file" | "folder";

export interface ProjectFile {
  id: string;
  projectId: string;
  parentId: string | null;
  type: FileNodeType;
  name: string;
  path: string;
  isMain: boolean;
  isBinary: boolean;
  sizeBytes: number;
  mimeType?: string;
  thumbnailUrl?: string;
  linkedUrl?: string;
  createdAt: string;
  updatedAt: string;
  content?: string;
}

export interface CommentReply {
  id: string;
  commentId: string;
  authorId: string;
  text: string;
  createdAt: string;
  mentions: string[];
}

export interface Comment {
  id: string;
  projectId: string;
  fileId: string;
  authorId: string;
  anchorFrom: number;
  anchorTo: number;
  quotedText: string;
  text: string;
  createdAt: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  replies: CommentReply[];
  mentions: string[];
}

export type TrackedChangeType = "insertion" | "deletion";
export type TrackedChangeStatus = "pending" | "accepted" | "rejected";

export interface TrackedChange {
  id: string;
  projectId: string;
  fileId: string;
  authorId: string;
  type: TrackedChangeType;
  from: number;
  to: number;
  text: string;
  status: TrackedChangeStatus;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  authorId: string;
  text: string;
  createdAt: string;
  mentions: string[];
}

export interface FileSnapshot {
  fileId: string;
  path: string;
  content: string;
}

export interface Version {
  id: string;
  projectId: string;
  label: string | null;
  message: string | null;
  authorId: string;
  createdAt: string;
  isAutoSnapshot: boolean;
  fileSnapshots: FileSnapshot[];
}

export interface Template {
  id: string;
  name: string;
  category: "journal" | "thesis" | "resume" | "presentation" | "letter" | "other";
  publisher?: string;
  description: string;
  thumbnailUrl: string;
  sourceProjectId: string;
  isOwn: boolean;
  authorId?: string;
}

export type BibEntryType =
  | "article"
  | "book"
  | "inproceedings"
  | "misc"
  | "phdthesis"
  | "techreport";

export interface BibEntry {
  id: string;
  fileId: string;
  key: string;
  type: BibEntryType;
  fields: Record<string, string>;
  isDuplicateKey: boolean;
  /** Whether the DOI (if any) has been checked against a registry. Phase 1: seeded/heuristic. */
  doiVerified?: boolean;
  /** Whether required fields (author/title/year + venue) are all present. Phase 1: computed at seed time. */
  metadataVerified?: boolean;
}

// ---------------------------------------------------------------------------
// Research objects — papers, notes, open questions, claims (Research OS)
// ---------------------------------------------------------------------------

export interface SavedPaper {
  id: string;
  projectId: string;
  title: string;
  authors: string;
  venue: string;
  year: string;
  doi?: string;
  /** Set once the paper has been inserted as a \cite{} somewhere, or manually linked to one. */
  bibKey?: string;
  tags: string[];
  savedAt: string;
  /** Awaiting a first read/triage pass. */
  needsReview: boolean;
}

export interface ResearchNote {
  id: string;
  projectId: string;
  paperId: string | null;
  heading: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpenQuestion {
  id: string;
  projectId: string;
  text: string;
  resolved: boolean;
  linkedPaperId: string | null;
  linkedNoteId: string | null;
  linkedSection: string | null;
  createdAt: string;
}

export type EvidenceStatus = "supported" | "needs-more-evidence" | "contested";

export interface EvidenceClaim {
  id: string;
  projectId: string;
  claim: string;
  supportingPaperIds: string[];
  ownEvidence: string[];
  status: EvidenceStatus;
}

export type CompileStatus =
  | "queued"
  | "running"
  | "success"
  | "error"
  | "timeout"
  | "stopped";

export type LogSeverity = "info" | "warning" | "error";

export interface CompileLogEntry {
  id: string;
  severity: LogSeverity;
  message: string;
  fileId?: string;
  line?: number;
}

export type CompileSource = "local" | "cloud";

export interface CompileResult {
  id: string;
  projectId: string;
  status: CompileStatus;
  compiler: Compiler;
  draftMode: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  queuePosition: number | null;
  etaSeconds: number | null;
  pdfUrl: string | null;
  pageCount: number | null;
  log: CompileLogEntry[];
  synctex: SyncTexMapping[];
  source?: CompileSource;
  durationMs?: number;
}

export interface SyncTexMapping {
  fileId: string;
  line: number;
  page: number;
  x: number;
  y: number;
}

export type NotificationKind =
  | "comment_mention"
  | "chat_mention"
  | "share_invite"
  | "compile_failure"
  | "collaborator_joined";

export interface NotificationItem {
  id: string;
  userId: string;
  kind: NotificationKind;
  projectId?: string;
  actorId?: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface ApiKey {
  id: string;
  userId: string;
  label: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface Webhook {
  id: string;
  projectId: string;
  url: string;
  events: Array<"compile.completed" | "project.updated">;
  active: boolean;
  createdAt: string;
}

export interface PresenceInfo {
  userId: string;
  projectId: string;
  fileId: string | null;
  cursorLine: number | null;
  color: string;
  lastActiveAt: string;
}
