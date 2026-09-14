import type {
  ApiKey,
  BibEntry,
  ChatMessage,
  Collaborator,
  Comment,
  CompileResult,
  EvidenceClaim,
  NotificationItem,
  OpenQuestion,
  PresenceInfo,
  Project,
  ProjectFile,
  ResearchNote,
  SavedPaper,
  Template,
  TrackedChange,
  User,
  Version,
  Webhook,
} from "@/lib/types";

export function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface MockDb {
  users: User[];
  projects: Project[];
  collaborators: Collaborator[];
  files: ProjectFile[];
  comments: Comment[];
  trackedChanges: TrackedChange[];
  chatMessages: ChatMessage[];
  versions: Version[];
  templates: Template[];
  bibEntries: BibEntry[];
  compiles: CompileResult[];
  notifications: NotificationItem[];
  apiKeys: ApiKey[];
  webhooks: Webhook[];
  presence: PresenceInfo[];
  savedPapers: SavedPaper[];
  researchNotes: ResearchNote[];
  openQuestions: OpenQuestion[];
  evidenceClaims: EvidenceClaim[];
}

export const mockDb: MockDb = {
  users: [],
  projects: [],
  collaborators: [],
  files: [],
  comments: [],
  trackedChanges: [],
  chatMessages: [],
  versions: [],
  templates: [],
  bibEntries: [],
  compiles: [],
  notifications: [],
  apiKeys: [],
  webhooks: [],
  presence: [],
  savedPapers: [],
  researchNotes: [],
  openQuestions: [],
  evidenceClaims: [],
};

export const CURRENT_USER_ID = "user_current";
