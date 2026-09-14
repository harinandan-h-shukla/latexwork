"use client";

import { createContext, useContext } from "react";

export const INTERNAL_DRAG_MIME = "application/x-inkwell-file-id";

export interface TreeContextValue {
  selectMode: boolean;
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  dropTargetId: string | "root" | null;
  setDropTargetId: (id: string | "root" | null) => void;
  onMoveNode: (fileId: string, newParentId: string | null) => void;
  onFilesDroppedToFolder: (fileList: FileList, parentId: string | null) => void;
  onDeleteNode: (fileId: string) => void;
  onDownloadNode: (fileId: string) => void;
  onCreateEntry: (type: "file" | "folder", parentId: string | null) => void;
}

export const TreeContext = createContext<TreeContextValue | null>(null);

export function useTreeContext(): TreeContextValue {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error("useTreeContext must be used within TreeContext.Provider");
  return ctx;
}
