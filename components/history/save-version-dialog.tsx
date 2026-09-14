"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveVersion } from "@/lib/mock-api/history";

export function SaveVersionDialog({ projectId, onSaved }: { projectId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!label.trim()) {
      toast.error("Give this version a name");
      return;
    }
    setSaving(true);
    try {
      await saveVersion(projectId, label.trim(), message.trim() || undefined);
      toast.success(`Saved version "${label.trim()}"`);
      setLabel("");
      setMessage("");
      setOpen(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <SaveIcon className="size-3.5" /> Save version
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save a labeled version</DialogTitle>
          <DialogDescription>
            Snapshot the current project state with a name and an optional note.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="version-label">Name</Label>
            <Input
              id="version-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Submitted to reviewers"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="version-message">Message (optional)</Label>
            <Textarea
              id="version-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What changed?"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
