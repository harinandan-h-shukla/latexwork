"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PresenceStrip } from "@/components/collaboration/presence-strip";
import { UserAvatar } from "@/components/collaboration/user-avatar";
import { MentionTextarea } from "@/components/collaboration/mention-textarea";
import { extractMentionIds, formatRelativeTime } from "@/components/collaboration/collab-utils";
import { listChatMessages, sendChatMessage } from "@/lib/mock-api/collaboration";
import { CURRENT_USER_ID, mockDb } from "@/lib/mock-api/db";
import type { ChatMessage } from "@/lib/types";

export function ChatPanel({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const list = await listChatMessages(projectId);
    setMessages(list);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function handleSend() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const mentions = extractMentionIds(draft, mockDb.users);
      await sendChatMessage(projectId, draft.trim(), mentions);
      if (mentions.length > 0) {
        toast(`Notified ${mentions.length} mentioned collaborator${mentions.length > 1 ? "s" : ""}`);
      }
      setDraft("");
      await refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PresenceStrip projectId={projectId} />
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet — say hello to your collaborators.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => {
              const author = mockDb.users.find((u) => u.id === m.authorId);
              if (!author) return null;
              const isMe = m.authorId === CURRENT_USER_ID;
              return (
                <li key={m.id} className="flex items-start gap-2">
                  <UserAvatar user={author} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">
                      {isMe ? "You" : author.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {formatRelativeTime(m.createdAt)}
                      </span>
                    </p>
                    <p className="text-sm break-words whitespace-pre-wrap">{m.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex flex-col gap-2 border-t p-3">
        <MentionTextarea
          value={draft}
          onChange={setDraft}
          users={mockDb.users}
          placeholder="Message the project… use @ to mention (Enter to send)"
          rows={2}
          onSubmitShortcut={handleSend}
        />
        <Button size="sm" className="w-full gap-1.5" onClick={handleSend} disabled={sending || !draft.trim()}>
          <SendIcon className="size-3.5" /> Send
        </Button>
      </div>
    </div>
  );
}
