"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Template } from "@/lib/types";
import { saveAsTemplate } from "@/lib/mock-api/templates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OWN_PROJECT_NAMES = [
  "PhD Thesis — Chapter 4",
  "NeurIPS 2026 Submission",
  "SERB Grant Proposal",
  "Academic CV",
];

const CATEGORIES: Array<{ value: Template["category"]; label: string }> = [
  { value: "journal", label: "Journal" },
  { value: "thesis", label: "Thesis" },
  { value: "resume", label: "Resume" },
  { value: "presentation", label: "Presentation" },
  { value: "letter", label: "Letter" },
  { value: "other", label: "Other" },
];

interface SaveAsTemplateDialogProps {
  onSaved?: (template: Template) => void;
  trigger?: React.ReactElement;
}

export function SaveAsTemplateDialog({
  onSaved,
  trigger = <Button variant="outline">Save one of your projects as a template</Button>,
}: SaveAsTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [sourceProjectName, setSourceProjectName] = useState(OWN_PROJECT_NAMES[0]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Template["category"]>("thesis");
  const [publisher, setPublisher] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setSourceProjectName(OWN_PROJECT_NAMES[0]);
    setName("");
    setCategory("thesis");
    setPublisher("");
    setDescription("");
    setSaving(false);
  }

  async function handleSave() {
    if (!name.trim() || !description.trim()) {
      toast.error("Name and description are required");
      return;
    }
    setSaving(true);
    try {
      const template = await saveAsTemplate({
        sourceProjectName,
        name,
        category,
        publisher: publisher || undefined,
        description,
      });
      toast.success("Template saved");
      onSaved?.(template);
      setOpen(false);
      reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save project as template</DialogTitle>
          <DialogDescription>
            Turn one of your projects into a reusable template that appears in your gallery.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sat-source">Project</Label>
            <Select value={sourceProjectName} onValueChange={(v) => setSourceProjectName(v as string)}>
              <SelectTrigger id="sat-source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OWN_PROJECT_NAMES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sat-name">Template name</Label>
            <Input
              id="sat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Thesis Starter"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sat-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Template["category"])}>
                <SelectTrigger id="sat-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sat-publisher">Publisher (optional)</Label>
              <Input
                id="sat-publisher"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="e.g. IEEE"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sat-description">Description</Label>
            <Textarea
              id="sat-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
