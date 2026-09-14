import { create } from "zustand";
import { toast } from "sonner";
import type { Compiler, CompileResult, ProjectFile } from "@/lib/types";
import type { CodeEditorHandle } from "@/components/editor/code-editor";
import {
  createFile,
  deleteFile,
  duplicateFile,
  getCurrentUser,
  getFileContent,
  id,
  listFiles,
  moveFile,
  renameFile,
  setFolderMainFile,
  setMainFile,
  updateFileContent,
  type CompileOptions,
  type CreateFileInput,
} from "@/lib/mock-api";
import { cancelSmart, compileSmart, detectLocal, resolveCompileSource } from "@/lib/local-compiler/compiler-service";
import type { LocalCompileFileInput } from "@/lib/local-compiler/types";
import { getCachedFileContent, setCachedFileContent } from "@/lib/local-cache/file-content-cache";

export type SidePanelId =
  | "outline"
  | "reference"
  | "papers"
  | "notes"
  | "comments"
  | "review"
  | "search"
  | "chat"
  | "log";
export type LayoutMode = "split" | "editor-only" | "pdf-only";

export type CursorContext = { type: "cite"; key: string } | null;

/** Chunked to avoid call-stack blowups from spreading a huge byte array
 * into String.fromCharCode (a real risk for multi-MB figures). */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
}

let compileRunId = 0;

interface WorkspaceState {
  projectId: string | null;
  files: ProjectFile[];
  isLoadingFiles: boolean;
  openFileIds: string[];
  activeFileId: string | null;
  fileContents: Record<string, string>;
  dirtyFileIds: Set<string>;
  compile: CompileResult | null;
  /** The mainFile path used for the current `compile` result — SyncTeX
   * queries need this exact string (it's how the PDF's own synctex data
   * addresses source files), so it's kept alongside the result rather than
   * re-derived later from `files`, which can change after the compile ran. */
  lastCompileMainFile: string | null;
  isCompiling: boolean;
  /** Per-project-open pick from CompilerChoiceDialog when the account's
   * compilerPreference is "ask-each-time" — deliberately session-only, not
   * persisted to the account (that's the point of "ask each time" as
   * opposed to "prefer-local"/"always-cloud", which are permanent). Reset
   * on every loadProject so a new project asks again. */
  sessionCompilerChoice: "local" | "cloud" | null;
  setSessionCompilerChoice: (choice: "local" | "cloud") => void;
  activeSidePanel: SidePanelId | null;
  setActiveSidePanel: (panel: SidePanelId | null) => void;
  /** Set by the user manually picking a rail icon — suppresses auto-switching until the cursor leaves the current context. */
  pinnedSidePanel: boolean;
  editorHandle: CodeEditorHandle | null;
  setEditorHandle: (handle: CodeEditorHandle | null) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  focusMode: boolean;
  setFocusMode: (on: boolean) => void;
  syncTargetLine: { fileId: string; line: number } | null;
  setSyncTargetLine: (target: { fileId: string; line: number } | null) => void;
  cursorContext: CursorContext;
  setCursorContext: (context: CursorContext) => void;
  citationPickerOpen: boolean;
  setCitationPickerOpen: (open: boolean) => void;

  loadProject: (projectId: string) => Promise<void>;
  openFile: (fileId: string) => Promise<void>;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  setFileContent: (fileId: string, content: string) => void;
  saveFileContent: (fileId: string) => Promise<void>;

  createFileNode: (input: CreateFileInput) => Promise<ProjectFile>;
  renameFileNode: (fileId: string, name: string) => Promise<void>;
  deleteFileNode: (fileId: string) => Promise<void>;
  moveFileNode: (fileId: string, newParentId: string | null) => Promise<void>;
  duplicateFileNode: (fileId: string) => Promise<void>;
  setMainFileNode: (fileId: string) => Promise<void>;
  setFolderMainFileNode: (folderId: string, fileId: string) => Promise<void>;

  runCompile: (options?: CompileOptions) => Promise<void>;
  cancelCompile: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  projectId: null,
  files: [],
  isLoadingFiles: false,
  openFileIds: [],
  activeFileId: null,
  fileContents: {},
  dirtyFileIds: new Set(),
  compile: null,
  lastCompileMainFile: null,
  isCompiling: false,
  sessionCompilerChoice: null,
  setSessionCompilerChoice: (choice) => set({ sessionCompilerChoice: choice }),
  activeSidePanel: null,
  setActiveSidePanel: (panel) =>
    set((state) => ({
      activeSidePanel: state.activeSidePanel === panel ? null : panel,
      pinnedSidePanel: state.activeSidePanel !== panel,
    })),
  pinnedSidePanel: false,
  editorHandle: null,
  setEditorHandle: (handle) => set({ editorHandle: handle }),
  layoutMode: "split",
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  focusMode: false,
  setFocusMode: (on) => set({ focusMode: on }),
  syncTargetLine: null,
  setSyncTargetLine: (target) => set({ syncTargetLine: target }),
  cursorContext: null,
  setCursorContext: (context) =>
    set((state) => {
      if (context?.type === "cite" && !state.pinnedSidePanel) {
        return { cursorContext: context, activeSidePanel: "reference" };
      }
      if (!context && state.activeSidePanel === "reference" && !state.pinnedSidePanel) {
        return { cursorContext: context, activeSidePanel: null };
      }
      return { cursorContext: context };
    }),
  citationPickerOpen: false,
  setCitationPickerOpen: (open) => set({ citationPickerOpen: open }),

  loadProject: async (projectId) => {
    // Reset every piece of per-project transient state, not just `files` —
    // this store is a singleton reused across client-side navigation between
    // two projects' editor pages (confirmed by this action depending on
    // `projectId` at all rather than running once on mount), so leaving the
    // old project's open tabs/contents/dirty-flags/compile result in place
    // meant a freshly-opened project could show the previous project's PDF
    // until a new compile ran.
    set({
      projectId,
      isLoadingFiles: true,
      openFileIds: [],
      activeFileId: null,
      fileContents: {},
      dirtyFileIds: new Set(),
      compile: null,
      lastCompileMainFile: null,
      isCompiling: false,
      sessionCompilerChoice: null,
    });
    const files = await listFiles(projectId);
    const main = files.find((f) => f.isMain) ?? files.find((f) => f.type === "file");
    set({ files, isLoadingFiles: false });
    if (main) {
      await get().openFile(main.id);
    }
  },

  openFile: async (fileId) => {
    const { openFileIds, fileContents, projectId } = get();
    if (!openFileIds.includes(fileId)) {
      set({ openFileIds: [...openFileIds, fileId] });
    }

    if (fileContents[fileId] !== undefined) {
      // Already loaded into this session's in-memory cache (which itself
      // stays populated across tab switches until loadProject resets it on
      // a project change) — nothing to fetch, just switch to it.
      set({ activeFileId: fileId });
      return;
    }

    // Not in the in-memory session cache — either never opened this
    // session, or the page was reloaded/reopened. Before doing the real,
    // authoritative fetch, check the persistent cross-session cache
    // (lib/local-cache/file-content-cache.ts, IndexedDB-backed) for what
    // this file looked like the last time it was seen on this device. This
    // exists ONLY to paint something instantly instead of a blank editor
    // for the length of a network round-trip — it is never a substitute for
    // the real fetch, which always still runs below and always wins once it
    // resolves, with one deliberate exception: see the dirtyFileIds check
    // after the fetch, which protects in-progress keystrokes.
    let shownOptimistically = false;
    if (projectId) {
      try {
        const cached = await getCachedFileContent(projectId, fileId);
        // Re-check after the await: openFile can be called again for the
        // same fileId (e.g. rapid tab clicks) while this lookup was
        // in flight, and a previous call's own fetch may have already
        // populated the real content — never stomp that with a stale read.
        if (cached !== null && get().fileContents[fileId] === undefined) {
          set((state) => ({ fileContents: { ...state.fileContents, [fileId]: cached } }));
          shownOptimistically = true;
        }
      } catch {
        // Cache is best-effort; any failure here just means no instant
        // preview this time, not a broken file open.
      }
    }
    if (shownOptimistically) {
      // Switch tabs right away so the (unconfirmed, possibly stale) cached
      // content is visible immediately. If there was no cache hit, fall
      // through unchanged to the pre-existing blocking-await behavior below
      // — there's nothing to show early for a file never seen on this
      // device, so there's no regression for that case.
      set({ activeFileId: fileId });
    }

    try {
      const content = await getFileContent(fileId);
      // Race: the user may have already started typing over the
      // optimistic/stale placeholder while this real fetch was in flight —
      // setFileContent (called on every editor keystroke) marks the file
      // dirty. This codebase has no real-time collab sync to merge against
      // yet (see lib/mock-api/collaboration.ts: no live writer exists for
      // that collection), so there is no principled way to reconcile "what
      // the user just typed" with "what the server had" here. The only safe
      // choice is to never let this "authoritative" fetch clobber
      // in-progress edits — leave fileContents[fileId] alone and let the
      // normal debounced saveFileContent flow (editor-workspace.tsx) persist
      // what the user actually typed. Silently overwriting keystrokes with
      // stale-relative-to-edit server content is exactly the class of bug
      // this feature must not reintroduce (see saveFileContent's own
      // accidental-wipe guard above for the same underlying concern).
      if (!get().dirtyFileIds.has(fileId)) {
        set((state) => ({ fileContents: { ...state.fileContents, [fileId]: content } }));
      }
      if (projectId) void setCachedFileContent(projectId, fileId, content);
      set({ activeFileId: fileId });
    } catch (err) {
      if (get().dirtyFileIds.has(fileId)) {
        // The user already started editing the optimistic placeholder
        // before the real fetch failed. Do NOT blank out their own
        // keystrokes — but they should know what's on screen was never
        // actually confirmed against the server.
        toast.error(
          "Couldn't confirm this file's latest content with the server — you're editing a locally cached copy."
        );
        set({ activeFileId: fileId });
        return;
      }
      // No edits in flight, so there's nothing worth protecting on screen.
      // Fall back to the pre-existing behavior of never leaving content
      // that couldn't be verified against the server sitting in
      // fileContents looking confirmed when it isn't — same reasoning as
      // the decrypt-failure handling this mirrors.
      if (shownOptimistically) {
        set((state) => {
          const next = { ...state.fileContents };
          delete next[fileId];
          return { fileContents: next };
        });
      }
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't load this file's content."
      );
      set({ activeFileId: fileId });
    }
  },

  closeFile: (fileId) => {
    const { openFileIds, activeFileId } = get();
    const remaining = openFileIds.filter((id) => id !== fileId);
    const nextActive =
      activeFileId === fileId ? (remaining[remaining.length - 1] ?? null) : activeFileId;
    set({ openFileIds: remaining, activeFileId: nextActive });
  },

  setActiveFile: (fileId) => set({ activeFileId: fileId }),

  setFileContent: (fileId, content) => {
    set((state) => ({
      fileContents: { ...state.fileContents, [fileId]: content },
      dirtyFileIds: new Set(state.dirtyFileIds).add(fileId),
    }));
  },

  saveFileContent: async (fileId) => {
    const content = get().fileContents[fileId];
    if (content === undefined) return;
    // Safety net against silently wiping real work: a debounced autosave or
    // the close-time bulk flush (flushDirtySaves in editor-workspace.tsx)
    // firing with stale/blank in-memory content — e.g. from a race during a
    // file or project switch — would otherwise persist empty content over
    // a file that's known to have had real content, with nothing to notice
    // or undo it. Confirmed this actually happened: several real files in
    // real projects were found with identical near-simultaneous
    // updatedAt timestamps, all emptied in one bulk-save burst. A file
    // that's *always* been empty (new/blank) still saves normally — this
    // only blocks the specific "had real content, now suddenly doesn't"
    // pattern, which is never a normal single keystroke.
    const file = get().files.find((f) => f.id === fileId);
    const looksLikeAccidentalWipe = content.trim().length === 0 && (file?.sizeBytes ?? 0) > 200;
    if (looksLikeAccidentalWipe) {
      console.error(
        `Refused to save empty content over "${file?.name}" (was ${file?.sizeBytes} bytes) — looks like an ` +
          `accidental wipe, not an intentional edit. Reload the project before editing this file further.`
      );
      return;
    }
    await updateFileContent(fileId, content);
    set((state) => {
      const next = new Set(state.dirtyFileIds);
      next.delete(fileId);
      return { dirtyFileIds: next };
    });
  },

  createFileNode: async (input) => {
    const { projectId } = get();
    if (!projectId) throw new Error("No project loaded");
    const file = await createFile(projectId, input);
    set((state) => ({ files: [...state.files, file] }));
    return file;
  },

  renameFileNode: async (fileId, name) => {
    const updated = await renameFile(fileId, name);
    set((state) => ({ files: state.files.map((f) => (f.id === fileId ? updated : f)) }));
  },

  deleteFileNode: async (fileId) => {
    await deleteFile(fileId);
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
      openFileIds: state.openFileIds.filter((id) => id !== fileId),
      activeFileId: state.activeFileId === fileId ? null : state.activeFileId,
    }));
  },

  moveFileNode: async (fileId, newParentId) => {
    const updated = await moveFile(fileId, newParentId);
    set((state) => ({ files: state.files.map((f) => (f.id === fileId ? updated : f)) }));
  },

  duplicateFileNode: async (fileId) => {
    const copy = await duplicateFile(fileId);
    set((state) => ({ files: [...state.files, copy] }));
  },

  setMainFileNode: async (fileId) => {
    const { projectId } = get();
    if (!projectId) return;
    await setMainFile(projectId, fileId);
    set((state) => ({
      files: state.files.map((f) => ({ ...f, isMain: f.id === fileId })),
    }));
  },

  setFolderMainFileNode: async (folderId, fileId) => {
    const { projectId } = get();
    if (!projectId) return;
    await setFolderMainFile(folderId, fileId);
    set((state) => ({
      files: state.files.map((f) => (f.id === folderId ? { ...f, folderMainFileId: fileId } : f)),
    }));
  },

  runCompile: async (options) => {
    const { projectId, files, fileContents, compile: inFlight, isCompiling } = get();
    if (!projectId) return;

    if (isCompiling && inFlight) {
      cancelSmart(inFlight).catch(() => {});
    }
    const myRunId = ++compileRunId;
    set({ isCompiling: true });

    const compiler: Compiler = options?.compiler ?? "pdflatex";
    const user = await getCurrentUser();
    const preference = user.editorDefaults.compilerPreference ?? "prefer-local";
    const agentInfo = preference === "always-cloud" ? null : await detectLocal();
    const source = resolveCompileSource(preference, agentInfo, compiler, get().sessionCompilerChoice);

    let smartFiles: LocalCompileFileInput[] = [];
    let mainFilePath = "main.tex";

    const applyIfCurrent = (partial: CompileResult) => {
      if (myRunId !== compileRunId) return;
      set({ compile: partial });
    };

    try {
      // Built for both local AND cloud compiles now — the mock cloud
      // renderer used to reach into a shared client-side store directly for
      // this, which broke once real project files moved to MongoDB (that
      // store is never populated for real projects anymore). Passing the
      // current live file contents explicitly works for both paths and
      // doesn't depend on where "the current files" happen to be stored.
      // If the file currently open in the editor is itself a standalone
      // compilable document (contains \documentclass), compile THAT one
      // instead of the project's designated main file — requested for
      // projects that bundle several independent papers as folders inside
      // one Inkwell project (each with its own \documentclass), where the
      // useful behavior is "compile whichever paper I'm looking at", not
      // always the one fixed main file. Doesn't touch the stored isMain
      // flag — a project that's genuinely one document with \input{}-ed
      // sections (where the open file usually ISN'T a \documentclass file)
      // keeps compiling its real main file exactly as before.
      const { activeFileId } = get();
      const activeFile = files.find((f) => f.id === activeFileId && f.type === "file" && !f.isBinary);
      const activeFileContent = activeFile ? fileContents[activeFile.id] : undefined;
      const activeFileIsStandalone =
        activeFile && activeFileContent !== undefined && activeFileContent.includes("\\documentclass");

      // Second priority, below "the open file is itself a \documentclass
      // file" and above the project's single global main file: the open
      // file's own parent folder may have a sticky "main file for this
      // folder" set (via "Set as main file for this folder" in the file
      // tree) — covers a section file that's \input{}-ed within one of
      // several independent papers bundled as folders, where the open file
      // itself never contains \documentclass but should still resolve to
      // that paper's real entry point, not the project's unrelated global
      // main file.
      const parentFolder = activeFile
        ? files.find((f) => f.id === activeFile.parentId && f.type === "folder")
        : undefined;
      const folderMainFile = parentFolder?.folderMainFileId
        ? files.find((f) => f.id === parentFolder.folderMainFileId && f.type === "file" && !f.isBinary)
        : undefined;

      const mainFile =
        activeFileIsStandalone
          ? activeFile
          : (folderMainFile ??
            files.find((f) => f.isMain) ??
            files.find((f) => f.type === "file" && f.name.endsWith(".tex")));
      mainFilePath = (mainFile?.path ?? "/main.tex").replace(/^\//, "");
      const textFiles = files.filter((f) => f.type === "file" && !f.isBinary);
      // Binary files (images/figures) used to be excluded entirely, which
      // is why \includegraphics always failed on a real compile — they
      // have real object storage now (see lib/storage/blob-storage.ts)
      // instead of never having their bytes stored anywhere at all. Fetched
      // via the authenticated proxy route, not a direct blob URL — the
      // blob store is private, so a raw blobPathname isn't fetchable on
      // its own anyway.
      const binaryFiles = files.filter((f) => f.type === "file" && f.isBinary && f.blobPathname);
      // This gathering step now lives inside the try/catch below: a
      // getFileContent() call here throws for a file whose stored content
      // can't be decrypted (see files.ts), and that must produce a visible
      // compile error instead of an uncaught rejection that leaves
      // isCompiling stuck true forever with the local-agent request never
      // even sent — which is also what protects a project's on-disk build
      // cache from being overwritten with empty content for an unreadable
      // file.
      const [textInputs, binaryInputs] = await Promise.all([
        Promise.all(
          textFiles.map(async (f) => ({
            path: f.path.replace(/^\//, ""),
            content: fileContents[f.id] ?? (await getFileContent(f.id)),
            id: f.id,
          }))
        ),
        Promise.all(
          binaryFiles.map(async (f) => {
            const res = await fetch(`/api/files/${f.id}/blob`);
            const buf = await res.arrayBuffer();
            return { path: f.path.replace(/^\//, ""), content: arrayBufferToBase64(buf), id: f.id, encoding: "base64" as const };
          })
        ),
      ]);
      smartFiles = [...textInputs, ...binaryInputs];

      const result = await compileSmart(
        {
          projectId,
          mainFile: mainFilePath,
          files: smartFiles,
          compiler,
          draftMode: options?.draftMode,
          shellEscape: options?.shellEscape,
          incremental: options?.incremental,
          customCommand: options?.customCommand,
          simulateTimeout: options?.simulateTimeout,
        },
        source,
        applyIfCurrent
      );

      if (myRunId === compileRunId) {
        set({ compile: result, lastCompileMainFile: mainFilePath, isCompiling: false });
      }
    } catch (err) {
      // Without this, any uncaught failure in compileSmart (both the local
      // and cloud paths call out to network services that can be down/
      // misconfigured) left isCompiling stuck true forever with no error
      // surfaced anywhere — indistinguishable from "compile silently does
      // nothing," which is exactly the symptom this closes.
      if (myRunId === compileRunId) {
        set({
          isCompiling: false,
          compile: {
            id: id("compile-error"),
            projectId,
            status: "error",
            compiler,
            draftMode: Boolean(options?.draftMode),
            startedAt: null,
            finishedAt: new Date().toISOString(),
            queuePosition: null,
            etaSeconds: null,
            pdfUrl: null,
            pageCount: null,
            log: [
              {
                id: id("log"),
                severity: "error",
                message: `Compile failed to start: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            synctex: [],
          },
        });
      }
    }
  },

  cancelCompile: async () => {
    const { compile } = get();
    if (!compile) return;
    await cancelSmart(compile);
    set({ isCompiling: false });
  },
}));
