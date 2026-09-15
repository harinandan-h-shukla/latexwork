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
  listCollaborators,
  removeCollaborator,
  sendCollaborationInvite,
  setProjectVisibility,
  transferOwnership,
  updateCollaboratorRole,
} from "@/lib/mock-api/collaboration";
import { searchUsers } from "@/lib/mock-api/users";
import { getProject } from "@/lib/mock-api/projects";
import { getCurrentUser } from "@/lib/mock-api/auth";
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
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("editor");
  const [inviting, setInviting] = useState(false);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const rows = await listCollaborators(projectId);
    setCollaborators(rows);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    (async () => {
      const [project, user] = await Promise.all([
        getProject(projectId).catch(() => null),
        getCurrentUser().catch(() => null),
      ]);
      setVisibility(project?.visibility ?? "private");
      setPublicLink(project?.publicReadOnlyLink ?? null);
      setCurrentUserId(user?.id ?? null);
      await refresh();
    })();
  }, [projectId, refresh]);

  // There's no separate "pending invite" flow — inviteCollaborator() grants
  // real access the moment the invited email signs up/logs in (see its own
  // comment in collaboration.ts), so the useful link to share is just the
  // real project itself, not a /join/ URL that never actually existed as a
  // route (was previously hardcoded to a domain — inkwell.app — this app
  // has never been deployed to).
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteLink = `${origin}/projects/${projectId}`;
  // publicReadOnlyLink is stored as a path (setProjectVisibility never
  // hardcodes a domain server-side); resolve it against the real origin
  // here, same reasoning as inviteLink above.
  const publicLinkUrl = publicLink ? `${origin}${publicLink}` : null;
  const isOwner = collaborators.find((c) => c.userId === currentUserId)?.role === "owner";

  // Debounced search-as-you-type, only while no one is selected yet — once
  // selectedUser is set, the input shows their name and typing again clears
  // the selection (see the onChange handler in the input below).
  useEffect(() => {
    if (selectedUser) return;
    const trimmed = query.trim();
    let cancelled = false;
    // The <2-char "clear results" case is also deferred into the timer
    // (rather than set synchronously here) so nothing calls setState
    // directly in the effect body itself.
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (trimmed.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      searchUsers(projectId, trimmed)
        .then((results) => {
          if (!cancelled) setSearchResults(results);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, projectId, selectedUser]);

  async function handleInvite() {
    if (!selectedUser) {
      toast.error("Search for a person by name or email, then select them");
      return;
    }
    setInviting(true);
    try {
      await sendCollaborationInvite(projectId, selectedUser.id, role);
      toast.success(`Invite sent to ${selectedUser.name} — they'll see it in their notifications.`);
      setQuery("");
      setSelectedUser(null);
      setSearchResults([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invite");
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
        {isOwner && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              {selectedUser ? (
                <div className="flex flex-1 items-center gap-2 rounded-lg border bg-muted/30 px-2 py-1.5">
                  <UserAvatar user={selectedUser} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{selectedUser.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setSelectedUser(null);
                      setQuery("");
                    }}
                    title="Search for someone else"
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or email…"
                  className="flex-1"
                />
              )}
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
                <Button onClick={handleInvite} disabled={inviting || !selectedUser} className="shrink-0">
                  Invite
                </Button>
              </div>
            </div>
            {!selectedUser && query.trim().length >= 2 && (
              <div className="rounded-lg border">
                {searching ? (
                  <div className="flex flex-col gap-1 p-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="p-2.5 text-xs text-muted-foreground">
                    No one found by that name or email — they may not have an account yet.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {searchResults.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setSearchResults([]);
                          }}
                          className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-muted"
                        >
                          <UserAvatar user={u} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{u.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

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
            {isOwner ? (
              <Switch checked={visibility === "public"} onCheckedChange={handleVisibilityChange} />
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                {visibility === "public" ? "On" : "Off"}
              </span>
            )}
          </label>
          {visibility === "public" && publicLinkUrl && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border bg-muted/30 p-1.5">
              <Input
                readOnly
                value={publicLinkUrl}
                className="h-7 flex-1 border-none bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0"
              />
              <Button variant="ghost" size="icon-sm" onClick={() => handleCopy(publicLinkUrl, "Public link")}>
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
                      {c.userId === currentUserId ? " (you)" : ""}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{c.user.email}</p>
                  </div>
                  {c.role === "owner" ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                      <CrownIcon className="size-3.5" /> Owner
                    </span>
                  ) : isOwner ? (
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
                  ) : (
                    // Only the owner may change anyone's role (server-enforced in
                    // updateCollaboratorRole) — every other viewer of this dialog
                    // gets a plain read-only label instead of the control.
                    <span className="shrink-0 text-xs font-medium text-muted-foreground capitalize">{c.role}</span>
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
