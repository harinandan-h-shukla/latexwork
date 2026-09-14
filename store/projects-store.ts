import { create } from "zustand";

import type { Project } from "@/lib/types";
import {
  archiveProject,
  duplicateProject,
  listProjects,
  permanentlyDeleteProject,
  restoreProject,
  softDeleteProject,
  updateProject,
  type ListProjectsQuery,
} from "@/lib/mock-api/projects";

interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  lastQuery: ListProjectsQuery;
  fetchProjects: (query?: ListProjectsQuery) => Promise<void>;
  refresh: () => Promise<void>;
  rename: (projectId: string, name: string) => Promise<void>;
  setTags: (projectId: string, tags: string[]) => Promise<void>;
  toggleStar: (projectId: string) => Promise<void>;
  softDelete: (projectId: string) => Promise<void>;
  restore: (projectId: string) => Promise<void>;
  permanentlyDelete: (projectId: string) => Promise<void>;
  toggleArchive: (projectId: string, archived: boolean) => Promise<void>;
  duplicate: (projectId: string) => Promise<Project>;
}

export const useProjectsStore = create<ProjectsState>()((set, get) => ({
  projects: [],
  isLoading: false,
  lastQuery: {},

  fetchProjects: async (query = {}) => {
    set({ isLoading: true, lastQuery: query });
    const projects = await listProjects(query);
    set({ projects, isLoading: false });
  },

  refresh: async () => {
    await get().fetchProjects(get().lastQuery);
  },

  rename: async (projectId, name) => {
    await updateProject(projectId, { name });
    await get().refresh();
  },

  setTags: async (projectId, tags) => {
    await updateProject(projectId, { tags });
    await get().refresh();
  },

  toggleStar: async (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    await updateProject(projectId, { starred: !project.starred });
    await get().refresh();
  },

  softDelete: async (projectId) => {
    await softDeleteProject(projectId);
    await get().refresh();
  },

  restore: async (projectId) => {
    await restoreProject(projectId);
    await get().refresh();
  },

  permanentlyDelete: async (projectId) => {
    await permanentlyDeleteProject(projectId);
    await get().refresh();
  },

  toggleArchive: async (projectId, archived) => {
    await archiveProject(projectId, archived);
    await get().refresh();
  },

  duplicate: async (projectId) => {
    const copy = await duplicateProject(projectId);
    await get().refresh();
    return copy;
  },
}));
