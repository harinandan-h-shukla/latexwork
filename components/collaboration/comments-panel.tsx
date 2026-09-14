"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SendIcon } from "lucide-react";
import type { EditorView } from "codemirror";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PresenceStrip } from "@/components/collaboration/presence-strip";
import { CommentThread } from "@/components/collaboration/comment-thread";
import { MentionTextarea } from "@/components/collaboration/mention-textarea";
import { TrackChangesTab } from "@/components/collaboration/track-changes-tab";
import { extractMentionIds } from "@/components/collaboration/collab-utils";
import { createComment, listComments } from "@/lib/mock-api/collaboration";
import { useProjectUsers } from "@/components/collaboration/use-project-users";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { Comment } from "@/lib/types";

export function CommentsPanel({ projectId }: { projectId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const { users } = useProjectUsers(projectId);

  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const files = useWorkspaceStore((s) => s.files);
  const editorHandle = useWorkspaceStore((s) => s.editorHandle);
  const activeFile = files.find((f) => f.id === activeFileId);

  const refresh = useCallback(async () => {
    const list = await listComments(projectId);
    setComments(list);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  async function handlePost() {
    if (!activeFileId) {
      toast.error("Open a file to add a comment");
      return;
    }
    if (!draft.trim()) return;
    setPosting(true);
    try {
      const view: EditorView | null | undefined = editorHandle?.getView();
      const selection = view?.state.selection.main;
      const hasSelection = Boolean(selection && selection.from !== selection.to);
      const anchorFrom = hasSelection ? selection!.from : 0;
      const anchorTo = hasSelection ? selection!.to : 0;
      const quotedText = hasSelection ? view!.state.sliceDoc(selection!.from, selection!.to).slice(0, 200) : "";

      const mentions = extractMentionIds(draft, users);
      await createComment(projectId, activeFileId, {
        anchorFrom,
        anchorTo,
        quotedText,
        text: draft.trim(),
        mentions,
      });
      if (mentions.length > 0) {
        toast(`Notified ${mentions.length} mentioned collaborator${mentions.length > 1 ? "s" : ""}`);
      }
      setDraft("");
      await refresh();
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PresenceStrip projectId={projectId} />
      <Tabs defaultValue="comments" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-2 w-auto self-start">
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="changes">Track changes</TabsTrigger>
        </TabsList>

        <TabsContent value="comments" className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-2 border-b p-3">
            <MentionTextarea
              value={draft}
              onChange={setDraft}
              users={users}
              placeholder={activeFile ? `Comment on ${activeFile.name}… use @ to mention` : "Open a file to comment"}
              rows={2}
            />
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={handlePost}
              disabled={posting || !draft.trim() || !activeFileId}
            >
              <SendIcon className="size-3.5" /> Comment
            </Button>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : comments.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No comments yet — start the conversation.</p>
          ) : (
            <ul className="flex flex-1 flex-col gap-2 overflow-auto p-3">
              {comments.map((c) => (
                <li key={c.id}>
                  <CommentThread comment={c} onChanged={refresh} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="changes" className="flex min-h-0 flex-1 flex-col">
          <TrackChangesTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
