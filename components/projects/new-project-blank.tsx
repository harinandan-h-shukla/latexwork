"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createProject } from "@/lib/mock-api/projects-create";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewProjectBlankProps {
  onCreated: (projectId: string) => void;
}

export function NewProjectBlank({ onCreated }: NewProjectBlankProps) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const project = await createProject({ name, method: "blank" });
      onCreated(project.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Start from an empty project with a single <code className="text-xs">main.tex</code> file.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="blank-project-name">Project name</Label>
        <Input
          id="blank-project-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Untitled Project"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !creating) handleCreate();
          }}
        />
      </div>
      <div>
        <Button onClick={handleCreate} disabled={!name.trim() || creating}>
          {creating ? <Loader2 className="animate-spin" /> : null}
          Create project
        </Button>
      </div>
    </div>
  );
}
