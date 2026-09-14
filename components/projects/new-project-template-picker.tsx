"use client";

import { useState } from "react";
import { ArrowLeftIcon, Loader2 } from "lucide-react";
import type { Template } from "@/lib/types";
import { useTemplate as applyTemplate } from "@/lib/mock-api/templates";
import { TemplateGallery } from "@/components/templates/template-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewProjectTemplatePickerProps {
  onCreated: (projectId: string) => void;
}

export function NewProjectTemplatePicker({ onCreated }: NewProjectTemplatePickerProps) {
  const [selected, setSelected] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!selected) return;
    const projectName = name.trim() || selected.name;
    setCreating(true);
    try {
      const project = await applyTemplate(selected.id, projectName);
      onCreated(project.id);
    } finally {
      setCreating(false);
    }
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => setSelected(null)}>
          <ArrowLeftIcon /> Choose a different template
        </Button>

        <div className="flex items-center gap-2 rounded-lg border p-3">
          <div className="flex-1">
            <p className="text-sm font-medium">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{selected.description}</p>
          </div>
          {selected.publisher && <Badge variant="secondary">{selected.publisher}</Badge>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="template-project-name">Project name</Label>
          <Input
            id="template-project-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={selected.name}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !creating) handleCreate();
            }}
          />
        </div>

        <div>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="animate-spin" /> : null}
            Create project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Pick a template to start your project from.</p>
      <TemplateGallery onPickTemplate={setSelected} />
    </div>
  );
}
