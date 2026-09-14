"use client";

import { useEffect, useMemo, useRef } from "react";
import { AlertCircleIcon, AlertTriangleIcon, InfoIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CompileLogEntry, LogSeverity } from "@/lib/types";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useLogFilterStore, type LogFilter } from "@/components/compile/log-filter-store";

const SEVERITY_ICON: Record<LogSeverity, React.ComponentType<{ className?: string }>> = {
  info: InfoIcon,
  warning: AlertTriangleIcon,
  error: AlertCircleIcon,
};

const SEVERITY_CLASS: Record<LogSeverity, string> = {
  info: "text-muted-foreground",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-destructive",
};

function jumpToEntry(entry: CompileLogEntry) {
  if (!entry.fileId || entry.line === undefined) return;
  const { openFile } = useWorkspaceStore.getState();
  void openFile(entry.fileId).then(() => {
    setTimeout(() => {
      useWorkspaceStore.getState().editorHandle?.scrollToLine(entry.line!);
    }, 60);
  });
}

export function CompileLogPanel({ projectId }: { projectId: string }) {
  const compile = useWorkspaceStore((s) => s.compile);
  const filter = useLogFilterStore((s) => s.filter);
  const setFilter = useLogFilterStore((s) => s.setFilter);
  const focusEntryId = useLogFilterStore((s) => s.focusEntryId);
  const clearFocus = useLogFilterStore((s) => s.clearFocus);
  const focusRef = useRef<HTMLDivElement | null>(null);

  const log = useMemo(() => compile?.log ?? [], [compile]);
  const counts = useMemo(
    () => ({
      all: log.length,
      error: log.filter((e) => e.severity === "error").length,
      warning: log.filter((e) => e.severity === "warning").length,
      info: log.filter((e) => e.severity === "info").length,
    }),
    [log]
  );

  const visible = useMemo(
    () => (filter === "all" ? log : log.filter((e) => e.severity === filter)),
    [log, filter]
  );

  useEffect(() => {
    if (focusEntryId && focusRef.current) {
      focusRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [focusEntryId]);

  if (!compile) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        No compile log yet for this project. Run a compile to see output here.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-project-id={projectId}>
      {compile.status === "timeout" && (
        <div className="border-b bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Compile timed out before finishing.
        </div>
      )}
      <div className="border-b p-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as LogFilter)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="gap-1">
              All
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {counts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="error" className="gap-1">
              Errors
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {counts.error}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="warning" className="gap-1">
              Warnings
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {counts.warning}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-auto p-2 font-mono text-xs">
        {visible.length === 0 && (
          <p className="p-2 text-muted-foreground">No {filter === "all" ? "log" : filter} entries.</p>
        )}
        {visible.map((entry) => {
          const Icon = SEVERITY_ICON[entry.severity];
          const clickable = entry.fileId !== undefined && entry.line !== undefined;
          const focused = entry.id === focusEntryId;
          return (
            <div
              key={entry.id}
              ref={focused ? focusRef : undefined}
              onClick={() => {
                if (clickable) jumpToEntry(entry);
                clearFocus();
              }}
              className={cn(
                "flex items-start gap-1.5 rounded px-1.5 py-1",
                clickable && "cursor-pointer hover:bg-muted",
                focused && "bg-primary/10 ring-1 ring-primary/40"
              )}
            >
              <Icon className={cn("mt-0.5 size-3 shrink-0", SEVERITY_CLASS[entry.severity])} />
              <div className="min-w-0">
                <p className={cn("whitespace-pre-wrap break-words", SEVERITY_CLASS[entry.severity])}>
                  {entry.message}
                </p>
                {clickable && (
                  <p className="text-[10px] text-muted-foreground">
                    line {entry.line} — click to jump to source
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
