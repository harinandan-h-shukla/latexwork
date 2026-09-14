"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  FileTextIcon,
  FolderPlusIcon,
  LayoutTemplateIcon,
  SettingsIcon,
  SunMoonIcon,
  Trash2Icon,
} from "lucide-react";

import type { Project } from "@/lib/types";
import { listProjects } from "@/lib/mock-api/projects";
import { useUiStore } from "@/store/ui-store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!useUiStore.getState().commandPaletteOpen);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listProjects().then((result) => {
      if (!cancelled) setProjects(result);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Palette"
      description="Jump to a project or run a command"
    >
      <CommandInput placeholder="Search projects or run a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem value="New Project" onSelect={() => navigate("/projects/new")}>
            <FolderPlusIcon />
            New Project
          </CommandItem>
          <CommandItem value="Templates" onSelect={() => navigate("/templates")}>
            <LayoutTemplateIcon />
            Templates
          </CommandItem>
          <CommandItem value="Trash" onSelect={() => navigate("/trash")}>
            <Trash2Icon />
            Trash
          </CommandItem>
          <CommandItem value="Settings" onSelect={() => navigate("/settings")}>
            <SettingsIcon />
            Settings
          </CommandItem>
          <CommandItem
            value="Toggle theme"
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              setOpen(false);
            }}
          >
            <SunMoonIcon />
            Toggle theme
          </CommandItem>
        </CommandGroup>
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => navigate(`/projects/${project.id}`)}
                >
                  <FileTextIcon />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
