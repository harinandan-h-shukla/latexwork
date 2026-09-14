"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, FileText, GraduationCap, Loader2, Mail, Presentation } from "lucide-react";
import type { Template } from "@/lib/types";
import { useTemplate as applyTemplate } from "@/lib/mock-api/templates";
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
import { Label } from "@/components/ui/label";

const CATEGORY_ICON: Record<Template["category"], React.ComponentType<{ className?: string }>> = {
  journal: BookOpen,
  thesis: GraduationCap,
  resume: FileText,
  presentation: Presentation,
  letter: Mail,
  other: FileText,
};

interface TemplatePreviewDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatePreviewDialog({ template, open, onOpenChange }: TemplatePreviewDialogProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  if (!template) return null;
  const Icon = CATEGORY_ICON[template.category];

  function reset() {
    setConfirming(false);
    setProjectName("");
    setCreating(false);
  }

  async function handleUseTemplate() {
    if (!template) return;
    const name = projectName.trim() || template.name;
    setCreating(true);
    try {
      await applyTemplate(template.id, name);
      toast.success("Project created");
      onOpenChange(false);
      reset();
      router.push("/projects");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>
            {template.publisher ? `${template.publisher} · ` : ""}
            {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-32 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-10 text-muted-foreground" />
        </div>

        <p className="text-sm text-muted-foreground">{template.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {template.isOwn && <Badge>Yours</Badge>}
          {template.publisher && <Badge variant="secondary">{template.publisher}</Badge>}
        </div>

        {confirming ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-project-name">Project name</Label>
            <Input
              id="template-project-name"
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={template.name}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating) handleUseTemplate();
              }}
            />
          </div>
        ) : null}

        <DialogFooter>
          {confirming ? (
            <>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={creating}>
                Back
              </Button>
              <Button onClick={handleUseTemplate} disabled={creating}>
                {creating ? <Loader2 className="animate-spin" /> : null}
                Create project
              </Button>
            </>
          ) : (
            <Button onClick={() => setConfirming(true)}>Use this template</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
