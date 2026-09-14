"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, UploadCloudIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useFileUploads } from "@/components/file-tree/use-file-uploads";
import type { CodeEditorHandle } from "@/components/editor/code-editor";

interface FigureInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editorHandle: CodeEditorHandle | null;
}

const PLACEMENTS = ["htbp", "h", "t", "b", "p"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function FigureInsertDialog({ open, onOpenChange, editorHandle }: FigureInsertDialogProps) {
  const files = useWorkspaceStore((s) => s.files);
  const { uploads, enqueueFiles } = useFileUploads();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [labelSuffix, setLabelSuffix] = useState("");
  const [placement, setPlacement] = useState("htbp");

  const images = files.filter(
    (f) => f.type === "file" && f.isBinary && (f.mimeType?.startsWith("image/") ?? false),
  );

  function handleInsert() {
    if (!selectedPath) {
      toast.error("Choose or upload an image first.");
      return;
    }
    const path = selectedPath.replace(/^\//, "");
    const label = `fig:${labelSuffix.trim() ? slugify(labelSuffix) : slugify(path)}`;
    const latex = `\\begin{figure}[${placement}]
  \\centering
  \\includegraphics[width=0.8\\linewidth]{${path}}
  \\caption{${caption.trim() || "Caption goes here."}}
  \\label{${label}}
\\end{figure}
`;
    if (editorHandle) {
      editorHandle.insertAtCursor(latex);
      toast.success("Figure inserted");
    } else {
      navigator.clipboard?.writeText(latex).catch(() => {});
      toast.success("Figure code copied — open a manuscript file and paste it in.");
    }
    onOpenChange(false);
    setSelectedPath(null);
    setCaption("");
    setLabelSuffix("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Insert figure</DialogTitle>
          <DialogDescription>
            Upload an image or pick one already in the project — the figure block is generated for you.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing">
          <TabsList className="w-full">
            <TabsTrigger value="existing" className="flex-1">
              Choose existing
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing">
            {images.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No images in this project yet — switch to Upload.
              </p>
            ) : (
              <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto p-0.5">
                {images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedPath(img.path)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-2 text-center hover:bg-accent",
                      selectedPath === img.path ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    {img.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.thumbnailUrl} alt={img.name} className="h-12 w-full rounded object-cover" />
                    ) : (
                      <div className="flex h-12 w-full items-center justify-center rounded bg-muted">
                        <ImageIcon className="size-5 text-muted-foreground" />
                      </div>
                    )}
                    <span className="w-full truncate text-[11px]">{img.name}</span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground hover:border-border-strong hover:bg-accent"
            >
              <UploadCloudIcon className="size-5" />
              Click to choose an image, or drag it here
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) enqueueFiles(e.target.files, null);
                e.target.value = "";
              }}
            />
            {uploads.map((u) => (
              <div key={u.id} className="flex items-center gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate">{u.name}</span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${u.progress}%` }} />
                </div>
              </div>
            ))}
            {images.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Uploaded images also appear under &ldquo;Choose existing.&rdquo;
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="fig-caption">Caption</Label>
            <Input
              id="fig-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="System architecture overview."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fig-label">Label suffix</Label>
            <Input
              id="fig-label"
              value={labelSuffix}
              onChange={(e) => setLabelSuffix(e.target.value)}
              placeholder="architecture"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Placement</Label>
            <Select value={placement} onValueChange={(v) => setPlacement(v ?? "htbp")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLACEMENTS.map((p) => (
                  <SelectItem key={p} value={p}>
                    [{p}]
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsert}>
            {editorHandle ? "Insert figure" : "Copy figure code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
