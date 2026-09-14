"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CopyIcon, CrownIcon, Share2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/collaboration/user-avatar";
import {
  inviteCollaborator,
  listCollaborators,
  removeCollaborator,
  setProjectVisibility,
  transferOwnership,
  updateCollaboratorRole,
} from "@/lib/mock-api/collaboration";
import { CURRENT_USER_ID, mockDb } from "@/lib/mock-api/db";
import type { Collaborator, Role, User } from "@/lib/types";

type CollaboratorRow = Collaborator & { user: User };

export function ShareButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Share2Icon className="size-3.5 text-fuchsia-500" />
        Share
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {open && <ShareDialogBody projectId={projectId} />}
      </DialogContent>
    </Dialog>
  );
}

function ShareDialogBody({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [inviting, setInviting] = useState(false);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [publicLink, setPublicLink] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const rows = await listCollaborators(projectId);
    setCollaborators(rows);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    (async () => {
      const project = mockDb.projects.find((p) => p.id === projectId);
      setVisibility(project?.visibility ?? "private");
      setPublicLink(project?.publicReadOnlyLink ?? null);
      await refresh();
    })();
  }, [projectId, refresh]);

  const inviteLink = `https://inkwell.app/join/${projectId}`;
  const isOwner = collaborators.find((c) => c.userId === CURRENT_USER_ID)?.role === "owner";

  async function handleInvite() {
    if (!email.trim()) {
      toast.error("Enter an email address");
      return;
    }
    setInviting(true);
    try {
      await inviteCollaborator(projectId, email.trim(), role);
      toast.success(`Invited ${email.trim()} as ${role}`);
      setEmail("");
      await refresh();
    } finally {
      setInviting(false);
    }
  }

  async function handleCopy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Couldn't copy — copy it manually");
    }
  }

  async function handleRoleChange(userId: string, nextRole: Role) {
    await updateCollaboratorRole(projectId, userId, nextRole);
    toast.success("Role updated");
    await refresh();
  }

  async function handleRemove(userId: string) {
    await removeCollaborator(projectId, userId);
    toast.success("Collaborator removed");
    await refresh();
  }

  async function handleTransfer(userId: string, name: string) {
    await transferOwnership(projectId, userId);
    toast.success(`Ownership transferred to ${name}`);
    await refresh();
  }

  async function handleVisibilityChange(checked: boolean) {
    const next = checked ? "public" : "private";
    setVisibility(next);
    const result = await setProjectVisibility(projectId, next);
    setPublicLink(result.publicReadOnlyLink);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Share project</DialogTitle>
        <DialogDescription>Invite collaborators and manage who can access this project.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@university.edu"
            className="flex-1"
          />
          <div className="flex gap-2">
            <Select value={role} onValueChange={(v) => v && setRole(v as Role)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={inviting} className="shrink-0">
              Invite
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border p-1.5">
          <Input
            readOnly
            value={inviteLink}
            className="h-7 flex-1 border-none bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0"
          />
          <Button variant="ghost" size="icon-sm" onClick={() => handleCopy(inviteLink, "Invite link")}>
            <CopyIcon className="size-3.5" />
          </Button>
        </div>

        <div className="rounded-lg border p-2.5">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span className="font-medium">Public access</span>
              <span className="block text-xs text-muted-foreground">
                Anyone with the link can view a read-only copy.
              </span>
            </span>
            <Switch checked={visibility === "public"} onCheckedChange={handleVisibilityChange} />
          </label>
          {visibility === "public" && publicLink && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border bg-muted/30 p-1.5">
              <Input
                readOnly
                value={publicLink}
                className="h-7 flex-1 border-none bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0"
              />
              <Button variant="ghost" size="icon-sm" onClick={() => handleCopy(publicLink, "Public link")}>
                <CopyIcon className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Collaborators</p>
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
              {collaborators.map((c) => (
                <li key={c.userId} className="flex items-center gap-2 rounded-lg border p-2">
                  <UserAvatar user={c.user} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {c.user.name}
                      {c.userId === CURRENT_USER_ID ? " (you)" : ""}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{c.user.email}</p>
                  </div>
                  {c.role === "owner" ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                      <CrownIcon className="size-3.5" /> Owner
                    </span>
                  ) : (
                    <Select value={c.role} onValueChange={(v) => v && handleRoleChange(c.userId, v as Role)}>
                      <SelectTrigger size="sm" className="w-24 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="reviewer">Reviewer</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {isOwner && c.role !== "owner" && (
                    <div className="flex shrink-0 gap-0.5">
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" title="Transfer ownership" />}>
                          <CrownIcon className="size-3.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Transfer ownership to {c.user.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {c.user.name} will become the project owner and you&apos;ll be moved to the editor
                              role.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleTransfer(c.userId, c.user.name)}>
                              Transfer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(c.userId)}
                        title="Remove collaborator"
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <DialogFooter showCloseButton />
    </>
  );
}
