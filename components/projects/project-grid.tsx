"use client";

import { useEffect, useState } from "react";

import type { Project } from "@/lib/types";
import { listProjectDashboardStats, type ProjectDashboardStats } from "@/lib/mock-api/dashboard";
import { ProjectCard } from "@/components/projects/project-card";

export function ProjectGrid({ projects }: { projects: Project[] }) {
  const [statsById, setStatsById] = useState<Record<string, ProjectDashboardStats>>({});
  const ids = projects.map((p) => p.id).join(",");

  useEffect(() => {
    if (!ids) return;
    listProjectDashboardStats(ids.split(","))
      .then(setStatsById)
      .catch(() => setStatsById({}));
  }, [ids]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} stats={statsById[project.id]} />
      ))}
    </div>
  );
}
