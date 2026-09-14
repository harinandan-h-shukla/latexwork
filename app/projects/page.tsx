"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownAZIcon,
  ArrowUpAZIcon,
  FlaskConicalIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";

import { listProjects, type ProjectSortField, type SortOrder } from "@/lib/mock-api/projects";
import { useProjectsStore } from "@/store/projects-store";
import { AppShell } from "@/components/shell/app-shell";
import { DashboardHeader } from "@/components/projects/dashboard-header";
import { RecentActivityPanel } from "@/components/projects/recent-activity-panel";
import { ResearchInboxPanel } from "@/components/projects/research-inbox-panel";
import { ProjectGrid } from "@/components/projects/project-grid";
import { ProjectList } from "@/components/projects/project-list";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const SORT_OPTIONS: { value: ProjectSortField; label: string }[] = [
  { value: "updatedAt", label: "Date modified" },
  { value: "name", label: "Name" },
  { value: "createdAt", label: "Date created" },
  { value: "owner", label: "Owner" },
];

export default function ProjectsPage() {
  const projects = useProjectsStore((s) => s.projects);
  const isLoading = useProjectsStore((s) => s.isLoading);
  const fetchProjects = useProjectsStore((s) => s.fetchProjects);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<ProjectSortField>("updatedAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [showArchived, setShowArchived] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [totalActiveProjects, setTotalActiveProjects] = useState<number | null>(null);

  useEffect(() => {
    listProjects().then((all) => {
      const tags = new Set<string>();
      all.forEach((project) => project.tags.forEach((t) => tags.add(t)));
      setAvailableTags([...tags].sort());
      setTotalActiveProjects(all.length);
    });
  }, []);

  useEffect(() => {
    const handle = setTimeout(
      () => {
        void fetchProjects({
          search: search || undefined,
          tag: tag === "all" ? undefined : tag,
          sort,
          order,
          archived: showArchived,
        });
      },
      search ? 250 : 0,
    );
    return () => clearTimeout(handle);
  }, [search, tag, sort, order, showArchived, fetchProjects]);

  const ViewComponent = view === "grid" ? ProjectGrid : ProjectList;
  const isFilteredEmpty = projects.length === 0 && !isLoading;
  const isWorkspaceEmpty =
    isFilteredEmpty &&
    totalActiveProjects === 0 &&
    !search &&
    tag === "all" &&
    !showArchived;

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 sm:p-6">
        <DashboardHeader />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RecentActivityPanel />
          </div>
          <div className="lg:col-span-2">
            <ResearchInboxPanel />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              {showArchived ? "Archived projects" : "Your projects"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/projects/new" />}>
            <PlusIcon />
            New Project
          </Button>
        </div>

        {isWorkspaceEmpty ? (
          <Empty className="border border-dashed py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FlaskConicalIcon />
              </EmptyMedia>
              <EmptyTitle>Your research workspace is empty</EmptyTitle>
              <EmptyDescription>
                Start with a template, import an existing paper, or create a blank project to
                begin your first piece of research.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button nativeButton={false} render={<Link href="/templates" />}>
                  <LayoutTemplateIcon />
                  Start with a template
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/projects/new" />}
                >
                  <PlusIcon />
                  Import a paper
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects..."
              className="pl-8"
            />
          </div>

          <Select value={tag} onValueChange={(value) => setTag(value as string)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {availableTags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sort}
            onValueChange={(value) => setSort(value as ProjectSortField)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            aria-label={order === "asc" ? "Sort descending" : "Sort ascending"}
            onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
          >
            {order === "asc" ? <ArrowUpAZIcon /> : <ArrowDownAZIcon />}
          </Button>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(checked)}
              />
              <Label htmlFor="show-archived" className="text-sm text-muted-foreground">
                Show archived
              </Label>
            </div>

            <div className="flex overflow-hidden rounded-lg border">
              <Button
                variant={view === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-none"
                aria-label="Grid view"
                onClick={() => setView("grid")}
              >
                <LayoutGridIcon />
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-none"
                aria-label="List view"
                onClick={() => setView("list")}
              >
                <ListIcon />
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <p className="font-medium">No projects found</p>
            <p className="text-sm text-muted-foreground">
              {search || tag !== "all"
                ? "Try adjusting your search or filters."
                : showArchived
                  ? "You haven't archived any projects yet."
                  : "Create your first project to get started."}
            </p>
          </div>
        ) : (
          <ViewComponent projects={projects} />
        )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
