"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { StarIcon } from "lucide-react";

import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CURRENT_USER_ID, mockDb } from "@/lib/mock-api/db";
import { useProjectsStore } from "@/store/projects-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectActionsMenu } from "@/components/projects/project-actions-menu";

function ownerLabel(project: Project): string {
  if (project.ownerId === CURRENT_USER_ID) return "You";
  return mockDb.users.find((u) => u.id === project.ownerId)?.name ?? "Unknown";
}

export function ProjectList({ projects }: { projects: Project[] }) {
  const toggleStar = useProjectsStore((s) => s.toggleStar);

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-9" />
            <TableHead>Name</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-9" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
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
              </TableCell>
              <TableCell className="max-w-72 whitespace-normal">
                <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                  {project.name}
                </Link>
                {project.archived && (
                  <Badge variant="secondary" className="ml-2">
                    Archived
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{ownerLabel(project)}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <ProjectActionsMenu project={project} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
