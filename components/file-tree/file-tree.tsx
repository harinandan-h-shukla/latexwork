"use client";

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  CheckSquare2Icon,
  DownloadIcon,
  FolderInputIcon,
  FolderPlusIcon,
  FilePlusIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  bulkDeleteFiles,
  bulkMoveFiles,
  downloadFile,
  downloadFiles,
  downloadProjectManifest,
} from "@/lib/mock-api/files";
import {
  buildTree,
  collectDescendantIds,
  triggerTextDownload,
} from "@/components/file-tree/file-tree-utils";
import { TreeRow } from "@/components/file-tree/tree-row";
import { CreateEntryDialog } from "@/components/file-tree/create-entry-dialog";
import { MoveToDialog } from "@/components/file-tree/move-to-dialog";
import { UploadQueue } from "@/components/file-tree/upload-queue";
import { useFileUploads } from "@/components/file-tree/use-file-uploads";
import { INTERNAL_DRAG_MIME, TreeContext, type TreeContextValue } from "@/components/file-tree/tree-context";

export function FileTree() {
  const files = useWorkspaceStore((s) => s.files);
  const isLoadingFiles = useWorkspaceStore((s) => s.isLoadingFiles);
  const projectId = useWorkspaceStore((s) => s.projectId);
  const deleteFileNode = useWorkspaceStore((s) => s.deleteFileNode);
  const moveFileNode = useWorkspaceStore((s) => s.moveFileNode);
  const tree = useMemo(() => buildTree(files), [files]);

  const [createDialog, setCreateDialog] = useState<
    { type: "file" | "folder"; parentId: string | null } | null
  >(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | "root" | null>(null);

  const { uploads, enqueueFiles } = useFileUploads();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function deleteWithDescendants(fileId: string) {
    const descendants = collectDescendantIds(files, fileId);
    await deleteFileNode(fileId);
    useWorkspaceStore.setState((state) => ({
      files: state.files.filter((f) => !descendants.has(f.id)),
      openFileIds: state.openFileIds.filter((id) => !descendants.has(id)),
      activeFileId: descendants.has(state.activeFileId ?? "") ? null : state.activeFileId,
    }));
  }

  async function handleDeleteNode(fileId: string) {
    const node = files.find((f) => f.id === fileId);
    await deleteWithDescendants(fileId);
    toast.success(`${node?.type === "folder" ? "Folder" : "File"} deleted`);
  }

  async function handleDownloadNode(fileId: string) {
    const { filename, content } = await downloadFile(fileId);
    triggerTextDownload(filename, content);
    toast.success(`Downloading ${filename}`);
  }

  async function handleMoveNode(fileId: string, newParentId: string | null) {
    if (fileId === newParentId) return;
    const descendants = collectDescendantIds(files, fileId);
    if (newParentId && descendants.has(newParentId)) {
      toast.error("Can't move a folder into itself");
      return;
    }
    const current = files.find((f) => f.id === fileId);
    if (current?.parentId === newParentId) return;
    await moveFileNode(fileId, newParentId);
    toast.success("Moved");
  }

  function handleFilesDroppedToFolder(fileList: FileList, parentId: string | null) {
    enqueueFiles(fileList, parentId);
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const deleted = new Set(await bulkDeleteFiles(ids));
    useWorkspaceStore.setState((state) => ({
      files: state.files.filter((f) => !deleted.has(f.id)),
      openFileIds: state.openFileIds.filter((id) => !deleted.has(id)),
      activeFileId: deleted.has(state.activeFileId ?? "") ? null : state.activeFileId,
    }));
    toast.success(`Deleted ${ids.length} item${ids.length > 1 ? "s" : ""}`);
    exitSelectMode();
  }

  async function handleBulkMove(targetFolderId: string | null) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const invalid = ids.some((id) => {
      if (id === targetFolderId) return true;
      const descendants = collectDescendantIds(files, id);
      return targetFolderId ? descendants.has(targetFolderId) : false;
    });
    if (invalid) {
      toast.error("Can't move a folder into itself");
      return;
    }
    const moved = await bulkMoveFiles(ids, targetFolderId);
    const movedMap = new Map(moved.map((f) => [f.id, f]));
    useWorkspaceStore.setState((state) => ({
      files: state.files.map((f) => movedMap.get(f.id) ?? f),
    }));
    toast.success(`Moved ${ids.length} item${ids.length > 1 ? "s" : ""}`);
    exitSelectMode();
  }

  async function handleBulkDownload() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { filename, content } = await downloadFiles(ids);
    triggerTextDownload(filename, content);
    toast.success(`Downloading ${ids.length} item${ids.length > 1 ? "s" : ""}`);
  }

  async function handleDownloadProject() {
    if (!projectId) return;
    const { filename, content } = await downloadProjectManifest(projectId);
    triggerTextDownload(filename, content);
    toast.success(`Downloading ${filename}`);
  }

  function handleBrowseFiles(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      enqueueFiles(e.target.files, null);
    }
    e.target.value = "";
  }

  function handleRootDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes("Files") ? "copy" : "move";
    setDropTargetId("root");
  }

  function handleRootDragLeave(e: DragEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropTargetId(null);
  }

  function handleRootDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      enqueueFiles(e.dataTransfer.files, null);
    } else {
      const draggedId = e.dataTransfer.getData(INTERNAL_DRAG_MIME) || e.dataTransfer.getData("text/plain");
      if (draggedId) handleMoveNode(draggedId, null);
    }
    setDropTargetId(null);
    setDraggingId(null);
  }

  const ctxValue: TreeContextValue = {
    selectMode,
    selectedIds,
    toggleSelected,
    draggingId,
    setDraggingId,
    dropTargetId,
    setDropTargetId,
    onMoveNode: handleMoveNode,
    onFilesDroppedToFolder: handleFilesDroppedToFolder,
    onDeleteNode: handleDeleteNode,
    onDownloadNode: handleDownloadNode,
    onCreateEntry: (type, parentId) => setCreateDialog({ type, parentId }),
  };

  return (
    <TreeContext.Provider value={ctxValue}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-2 py-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Files
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              title="New file"
              onClick={() => setCreateDialog({ type: "file", parentId: null })}
            >
              <FilePlusIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              title="New folder"
              onClick={() => setCreateDialog({ type: "folder", parentId: null })}
            >
              <FolderPlusIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              title="Upload files"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              title="Download project"
              onClick={handleDownloadProject}
            >
              <DownloadIcon className="size-3.5" />
            </Button>
            <Button
              variant={selectMode ? "secondary" : "ghost"}
              size="icon"
              className="size-6"
              title="Select files"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            >
              <CheckSquare2Icon className="size-3.5" />
            </Button>
          </div>
        </div>

        {selectMode && (
          <div className="flex items-center gap-1 border-b bg-muted/40 px-2 py-1.5">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-xs"
                disabled={selectedIds.size === 0}
                onClick={handleBulkDownload}
              >
                <DownloadIcon className="size-3.5" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-xs"
                disabled={selectedIds.size === 0}
                onClick={() => setMoveDialogOpen(true)}
              >
                <FolderInputIcon className="size-3.5" />
                Move
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                disabled={selectedIds.size === 0}
                onClick={handleBulkDelete}
              >
                <Trash2Icon className="size-3.5" />
                Delete
              </Button>
              <Button variant="ghost" size="icon" className="size-6" onClick={exitSelectMode}>
                <XIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div
          className={cn(
            "flex-1 overflow-auto p-1",
            dropTargetId === "root" && "bg-primary/5 outline-dashed outline-1 outline-primary -outline-offset-2"
          )}
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
        >
          {isLoadingFiles ? (
            <div className="p-3 text-sm text-muted-foreground">Loading files…</div>
          ) : tree.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center text-xs text-muted-foreground">
              <UploadIcon className="size-5" />
              Drag files here or use the buttons above
            </div>
          ) : (
            tree.map((node) => <TreeRow key={node.id} node={node} depth={0} />)
          )}
        </div>

        <UploadQueue uploads={uploads} />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleBrowseFiles}
        />

        {createDialog && (
          <CreateEntryDialog
            open
            onOpenChange={(open) => !open && setCreateDialog(null)}
            type={createDialog.type}
            parentId={createDialog.parentId}
          />
        )}

        <MoveToDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          files={files}
          excludeIds={selectedIds}
          onConfirm={handleBulkMove}
        />
      </div>
    </TreeContext.Provider>
  );
}
