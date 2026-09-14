"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadFiles, type UploadFileInput } from "@/lib/mock-api/files";
import { useWorkspaceStore } from "@/store/workspace-store";
import { isLikelyBinaryUpload } from "@/components/file-tree/file-tree-utils";

export interface UploadEntry {
  id: string;
  name: string;
  sizeBytes: number;
  progress: number;
  done: boolean;
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsText(file);
  });
}

/** Base64, not raw bytes — readAsDataURL gives "data:<mime>;base64,<data>",
 * the part after the comma is what uploadFiles expects. */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

export function useFileUploads() {
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const counter = useRef(0);

  const enqueueFiles = useCallback((fileList: FileList | File[], parentId: string | null) => {
    const projectId = useWorkspaceStore.getState().projectId;
    if (!projectId) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    for (const file of files) {
      const uploadId = `upload_${Date.now()}_${counter.current++}`;
      setUploads((prev) => [
        ...prev,
        { id: uploadId, name: file.name, sizeBytes: file.size, progress: 0, done: false },
      ]);

      const duration = 900 + Math.random() * 700;
      const start = Date.now();

      const finish = async () => {
        const isBinary = isLikelyBinaryUpload(file.name, file.type);
        const content = isBinary ? await readAsBase64(file) : await readAsText(file);
        const input: UploadFileInput = {
          parentId,
          name: file.name,
          sizeBytes: file.size,
          mimeType: file.type || undefined,
          isBinary,
          content,
        };
        const created = await uploadFiles(projectId, [input]);
        useWorkspaceStore.setState((state) => ({ files: [...state.files, ...created] }));
        setUploads((prev) =>
          prev.map((u) => (u.id === uploadId ? { ...u, progress: 100, done: true } : u))
        );
        toast.success(`Uploaded ${file.name}`);
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        }, 1400);
      };

      const tick = () => {
        const elapsed = Date.now() - start;
        const pct = Math.min(95, Math.round((elapsed / duration) * 100));
        setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: pct } : u)));
        if (elapsed < duration) {
          requestAnimationFrame(tick);
        } else {
          finish();
        }
      };
      requestAnimationFrame(tick);
    }
  }, []);

  return { uploads, enqueueFiles };
}
