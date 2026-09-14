"use client";

import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { RotateCcwIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { useProjectsStore } from "@/store/projects-store";
import { AppShell } from "@/components/shell/app-shell";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TrashPage() {
  const projects = useProjectsStore((s) => s.projects);
  const isLoading = useProjectsStore((s) => s.isLoading);
  const fetchProjects = useProjectsStore((s) => s.fetchProjects);
  const restore = useProjectsStore((s) => s.restore);
  const permanentlyDelete = useProjectsStore((s) => s.permanentlyDelete);

  useEffect(() => {
    void fetchProjects({ trashed: true, sort: "updatedAt", order: "desc" });
  }, [fetchProjects]);

  async function handleRestore(id: string, name: string) {
    await restore(id);
    toast.success(`"${name}" restored`);
  }

  async function handleDelete(id: string, name: string) {
    await permanentlyDelete(id);
    toast.success(`"${name}" permanently deleted`);
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Trash</h1>
          <p className="text-sm text-muted-foreground">
            Trashed projects are kept here until you permanently delete them.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <p className="font-medium">Trash is empty</p>
            <p className="text-sm text-muted-foreground">Deleted projects will show up here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead>Permanently deleted</TableHead>
                  <TableHead className="w-56 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  // A pure function of trashedAt alone — date-fns compares
                  // it against "now" internally (same as the "Deleted"
                  // column's formatDistanceToNow call), so nothing here
                  // reads Date.now() directly during render.
                  const deletionDeadline = project.trashedAt
                    ? new Date(new Date(project.trashedAt).getTime() + 30 * 24 * 60 * 60 * 1000)
                    : null;
                  return (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium whitespace-normal">
                      {project.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.trashedAt
                        ? formatDistanceToNow(new Date(project.trashedAt), { addSuffix: true })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {deletionDeadline ? formatDistanceToNow(deletionDeadline, { addSuffix: true }) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRestore(project.id, project.name)}
                        >
                          <RotateCcwIcon />
                          Restore
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                            <Trash2Icon />
                            Delete forever
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently delete project?</AlertDialogTitle>
                              <AlertDialogDescription>
                                &ldquo;{project.name}&rdquo; and all of its files will be deleted
                                permanently. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => void handleDelete(project.id, project.name)}
                              >
                                Delete permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
