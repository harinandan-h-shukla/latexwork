"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CopyIcon,
  DownloadIcon,
  PencilIcon,
  TagIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import type { Project } from "@/lib/types";
import { useProjectsStore } from "@/store/projects-store";
import { exportProject } from "@/lib/mock-api/export";
import { triggerDownload } from "@/lib/download-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ProjectActionsMenuProps {
  project: Project;
}

export function ProjectActionsMenu({ project }: ProjectActionsMenuProps) {
  const rename = useProjectsStore((s) => s.rename);
  const setTags = useProjectsStore((s) => s.setTags);
  const softDelete = useProjectsStore((s) => s.softDelete);
  const restore = useProjectsStore((s) => s.restore);
  const toggleArchive = useProjectsStore((s) => s.toggleArchive);
  const duplicate = useProjectsStore((s) => s.duplicate);

  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(project.name);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const tagsTriggerRef = useRef<HTMLButtonElement>(null);

  function openRename() {
    setNameDraft(project.name);
    setTimeout(() => setRenameOpen(true), 0);
  }

  function openTagsEditor() {
    setTimeout(() => tagsTriggerRef.current?.click(), 0);
  }

  async function handleRenameSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === project.name) {
      setRenameOpen(false);
      return;
    }
    await rename(project.id, trimmed);
    toast.success("Project renamed");
    setRenameOpen(false);
  }

  async function handleDelete() {
    await softDelete(project.id);
    toast.success(`"${project.name}" moved to trash`, {
      action: { label: "Undo", onClick: () => void restore(project.id) },
    });
  }

  async function handleDuplicate() {
    const copy = await duplicate(project.id);
    toast.success(`Duplicated as "${copy.name}"`);
  }

  async function handleDownloadZip() {
    const result = await exportProject(project.id, "zip");
    triggerDownload(result.filename, result.content, "application/zip", result.encoding);
    toast.success("Download started");
  }

  async function handleToggleArchive() {
    await toggleArchive(project.id, !project.archived);
    toast.success(
      project.archived ? `"${project.name}" unarchived` : `"${project.name}" archived`,
    );
  }

  async function addTag() {
    const value = tagDraft.trim();
    setTagDraft("");
    if (!value || project.tags.includes(value)) return;
    await setTags(project.id, [...project.tags, value]);
  }

  async function removeTag(tag: string) {
    await setTags(
      project.id,
      project.tags.filter((t) => t !== tag),
    );
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      void addTag();
    }
  }

  return (
    <>
      <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
        <PopoverTrigger
          render={
            <button
              ref={tagsTriggerRef}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
          }
        />
        <PopoverContent align="end" className="w-64">
          <p className="text-sm font-medium">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {project.tags.length === 0 && (
              <span className="text-xs text-muted-foreground">No tags yet.</span>
            )}
            {project.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => void removeTag(tag)}
                  className="ml-0.5 rounded-full hover:text-destructive"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Input
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add a tag..."
              className="h-7 text-sm"
            />
            <Button size="sm" variant="secondary" onClick={() => void addTag()}>
              Add
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form onSubmit={handleRenameSubmit}>
            <DialogHeader>
              <DialogTitle>Rename project</DialogTitle>
              <DialogDescription>
                Choose a new name for &ldquo;{project.name}&rdquo;.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              className="mt-4"
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Direct one-click icon buttons instead of a "..." menu hiding them —
          same actions/handlers as before, just not tucked behind an extra
          click. */}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon-sm" title="Rename" aria-label="Rename" onClick={openRename}>
          <PencilIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Edit tags" aria-label="Edit tags" onClick={openTagsEditor}>
          <TagIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Duplicate" aria-label="Duplicate" onClick={() => void handleDuplicate()}>
          <CopyIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Download zip" aria-label="Download zip" onClick={() => void handleDownloadZip()}>
          <DownloadIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title={project.archived ? "Unarchive" : "Archive"}
          aria-label={project.archived ? "Unarchive" : "Archive"}
          onClick={() => void handleToggleArchive()}
        >
          {project.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Delete"
          aria-label="Delete"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => void handleDelete()}
        >
          <Trash2Icon />
        </Button>
      </div>
    </>
  );
}
