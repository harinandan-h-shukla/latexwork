"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckIcon, CornerDownRightIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/collaboration/user-avatar";
import { MentionTextarea } from "@/components/collaboration/mention-textarea";
import { extractMentionIds, formatRelativeTime } from "@/components/collaboration/collab-utils";
import { replyToComment, resolveComment, reopenComment } from "@/lib/mock-api/collaboration";
import { useProjectUsers } from "@/components/collaboration/use-project-users";
import type { Comment } from "@/lib/types";

interface CommentThreadProps {
  comment: Comment;
  onChanged: () => void;
}

export function CommentThread({ comment, onChanged }: CommentThreadProps) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const { users, byId } = useProjectUsers(comment.projectId);
  const author = byId[comment.authorId];

  async function handleReply() {
    if (!replyText.trim()) return;
    setBusy(true);
    try {
      const mentions = extractMentionIds(replyText, users);
      await replyToComment(comment.id, replyText.trim(), mentions);
      if (mentions.length > 0) {
        toast(`Notified ${mentions.length} mentioned collaborator${mentions.length > 1 ? "s" : ""}`);
      }
      setReplyText("");
      setReplying(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleResolve() {
    setBusy(true);
    try {
      if (comment.resolved) {
        await reopenComment(comment.id);
        toast.success("Comment reopened");
      } else {
        await resolveComment(comment.id);
        toast.success("Comment resolved");
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  // Falls back to a placeholder rather than hiding the comment entirely —
  // author resolution depends on the project's current collaborator list
  // (useProjectUsers), so someone who commented and was later removed from
  // the project would otherwise make their own past comment vanish.
  const displayAuthor = author ?? { id: comment.authorId, name: "Unknown" };

  return (
    <div className={cn("rounded-lg border p-2.5", comment.resolved && "bg-muted/20 opacity-70")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserAvatar user={displayAuthor} size="sm" />
          <div>
            <p className="text-sm leading-tight font-medium">{displayAuthor.name}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleToggleResolve}
          disabled={busy}
          title={comment.resolved ? "Reopen" : "Resolve"}
        >
          {comment.resolved ? <RotateCcwIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
        </Button>
      </div>

      {comment.quotedText && (
        <blockquote className="mt-2 rounded-md border-l-2 border-primary/40 bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
          &ldquo;{comment.quotedText}&rdquo;
        </blockquote>
      )}

      <p className="mt-2 text-sm">{comment.text}</p>
      {comment.resolved && <p className="mt-1 text-xs text-muted-foreground">Resolved</p>}

      {comment.replies.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-l pl-3">
          {comment.replies.map((r) => {
            const replyAuthor = byId[r.authorId];
            return (
              <div key={r.id} className="flex items-start gap-2">
                <UserAvatar user={replyAuthor ?? displayAuthor} size="sm" />
                <div>
                  <p className="text-xs font-medium">
                    {replyAuthor?.name ?? "Unknown"}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {formatRelativeTime(r.createdAt)}
                    </span>
                  </p>
                  <p className="text-sm">{r.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {replying ? (
        <div className="mt-2 flex flex-col gap-2">
          <MentionTextarea
            value={replyText}
            onChange={setReplyText}
            users={users}
            placeholder="Reply… use @ to mention"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReplying(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleReply} disabled={busy || !replyText.trim()}>
              Reply
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="mt-2 gap-1" onClick={() => setReplying(true)}>
          <CornerDownRightIcon className="size-3.5" /> Reply
        </Button>
      )}
    </div>
  );
}
