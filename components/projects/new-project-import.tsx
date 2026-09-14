"use client";

import { useState } from "react";
import { GitBranchIcon, Loader2, LinkIcon } from "lucide-react";
import { createProject } from "@/lib/mock-api/projects-create";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewProjectImportProps {
  kind: "url" | "github";
  onCreated: (projectId: string) => void;
}

const COPY = {
  url: {
    icon: LinkIcon,
    label: "Source URL",
    placeholder: "https://example.com/project.zip",
    busyLabel: "Importing…",
    submitLabel: "Import project",
    help: "Provide a direct link to a .zip archive or a Git repository to import.",
  },
  github: {
    icon: GitBranchIcon,
    label: "GitHub repository",
    placeholder: "owner/repo",
    busyLabel: "Cloning…",
    submitLabel: "Clone & create project",
    help: "Provide a GitHub repository in owner/repo form. Inkwell will clone its default branch.",
  },
} as const;

export function NewProjectImport({ kind, onCreated }: NewProjectImportProps) {
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const copy = COPY[kind];
  const Icon = copy.icon;

  async function handleCreate() {
    if (!name.trim() || !source.trim()) return;
    setBusy(true);
    try {
      const project = await createProject(
        kind === "url"
          ? { name, method: "url", sourceUrl: source.trim() }
          : { name, method: "github", githubRepo: source.trim() },
      );
      onCreated(project.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{copy.help}</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`import-${kind}-source`}>{copy.label}</Label>
        <div className="relative">
          <Icon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`import-${kind}-source`}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={copy.placeholder}
            className="pl-8"
            disabled={busy}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`import-${kind}-name`}>Project name</Label>
        <Input
          id={`import-${kind}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Imported Project"
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) handleCreate();
          }}
        />
      </div>

      <div>
        <Button onClick={handleCreate} disabled={!name.trim() || !source.trim() || busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          {busy ? copy.busyLabel : copy.submitLabel}
        </Button>
      </div>
    </div>
  );
}
