import { create } from "zustand";
import type { LogSeverity } from "@/lib/types";

export type LogFilter = "all" | LogSeverity;

interface LogFilterState {
  filter: LogFilter;
  focusEntryId: string | null;
  setFilter: (filter: LogFilter) => void;
  focusEntry: (entryId: string, filter?: LogFilter) => void;
  clearFocus: () => void;
}

/**
 * Small local store (not the workspace store) shared between the compile log
 * panel and the PDF preview's error/warning markers, so clicking a marker can
 * open the log panel pre-filtered and scrolled to the matching entry.
 */
export const useLogFilterStore = create<LogFilterState>()((set) => ({
  filter: "all",
  focusEntryId: null,
  setFilter: (filter) => set({ filter }),
  focusEntry: (entryId, filter) => set({ focusEntryId: entryId, filter: filter ?? "all" }),
  clearFocus: () => set({ focusEntryId: null }),
}));
