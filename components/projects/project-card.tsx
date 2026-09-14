"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CameraIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  StarIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { Project, User } from "@/lib/types";
import type { ProjectDashboardStats } from "@/lib/mock-api/dashboard";
import { getCurrentUser } from "@/lib/mock-api/auth";
import { setProjectThumbnail } from "@/lib/mock-api/projects";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/collaboration/user-avatar";
import { useProjectsStore } from "@/store/projects-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectActionsMenu } from "@/components/projects/project-actions-menu";

interface ProjectCardProps {
  project: Project;
  stats?: ProjectDashboardStats;
}

/** Base64, not raw bytes — same convention as
 * components/file-tree/use-file-uploads.ts's readAsBase64. */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ProjectCard({ project, stats }: ProjectCardProps) {
  const toggleStar = useProjectsStore((s) => s.toggleStar);
  const [owner, setOwner] = useState<User | null>(null);
  const [customThumb, setCustomThumb] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((u) => {
        if (!cancelled) setOwner(u);
      })
      .catch(() => {
        if (!cancelled) setOwner(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleThumbnailPicked(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file for the thumbnail");
      return;
    }
    setUploadingThumb(true);
    try {
      const base64 = await readAsBase64(file);
      await setProjectThumbnail(project.id, base64, file.type);
      setCustomThumb(URL.createObjectURL(file));
      toast.success("Thumbnail updated");
    } catch {
      toast.error("Couldn't update thumbnail");
    } finally {
      setUploadingThumb(false);
    }
  }

  const thumbnailUrl = customThumb ?? stats?.thumbnailUrl;

  return (
    <Card className="group/project-card gap-3 overflow-hidden border-border transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <div className="group/thumb relative flex h-28 items-center justify-center border-b border-border-strong bg-gradient-to-br from-accent to-muted/60">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-uploaded content, not a known-dimension local asset
          <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <FileTextIcon className="size-9 text-primary/40" />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleThumbnailPicked(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          title="Set custom thumbnail"
          aria-label="Set custom thumbnail"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingThumb}
          className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100 focus-visible:opacity-100"
        >
          {uploadingThumb ? (
            <Loader2Icon className="size-5 animate-spin" />
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <CameraIcon className="size-4" />
              Change thumbnail
            </span>
          )}
        </button>
      </div>

      <CardHeader className="flex-row items-start justify-between gap-2">
        <Link href={`/projects/${project.id}`} className="flex min-w-0 flex-1 items-center gap-2">
          {owner && <UserAvatar user={owner} size="sm" />}
          <p className="truncate font-heading text-base font-semibold hover:underline">
            {project.name}
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={project.starred ? "Unstar project" : "Star project"}
            onClick={() => void toggleStar(project.id)}
          >
            <StarIcon
              className={cn(
                "size-4",
                project.starred && "fill-amber-400 text-amber-400",
              )}
            />
          </Button>
          <ProjectActionsMenu project={project} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {(project.tags.length > 0 || project.archived) && (
          <div className="flex min-h-5 flex-wrap items-center gap-1.5">
            {project.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
            {project.archived && <Badge variant="secondary">Archived</Badge>}
          </div>
        )}

        {stats ? (
          <>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-text-secondary">
              <span className="flex items-center gap-1" title="References">
                <BookOpenIcon className="size-3.5" />
                {stats.referenceCount}
              </span>
              <span className="flex items-center gap-1" title="Figures">
                <ImageIcon className="size-3.5" />
                {stats.figureCount}
              </span>
              <span className="flex items-center gap-1" title="Collaborators">
                <UsersIcon className="size-3.5" />
                {stats.collaboratorCount}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>Progress</span>
                <span className="font-medium tabular-nums text-foreground">
                  {stats.progressPercent}%
                </span>
              </div>
              <Progress value={stats.progressPercent} />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-end">
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={`/projects/${project.id}`} />}
        >
          Open Workspace
          <ArrowRightIcon />
        </Button>
      </CardFooter>
    </Card>
  );
}
