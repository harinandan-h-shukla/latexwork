"use client";

import { SearchIcon } from "lucide-react";
import type { Template } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TemplateCategoryFilter = Template["category"] | "all";

const CATEGORIES: Array<{ value: TemplateCategoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "journal", label: "Journal" },
  { value: "thesis", label: "Thesis" },
  { value: "resume", label: "Resume" },
  { value: "presentation", label: "Presentation" },
  { value: "letter", label: "Letter" },
];

interface TemplateFiltersProps {
  category: TemplateCategoryFilter;
  onCategoryChange: (category: TemplateCategoryFilter) => void;
  publisher: string | "all";
  onPublisherChange: (publisher: string | "all") => void;
  publishers: string[];
  search: string;
  onSearchChange: (search: string) => void;
}

export function TemplateFilters({
  category,
  onCategoryChange,
  publisher,
  onPublisherChange,
  publishers,
  search,
  onSearchChange,
}: TemplateFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={category}
          onValueChange={(value) => onCategoryChange(value as TemplateCategoryFilter)}
        >
          <TabsList>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search templates…"
            className="pl-8"
          />
        </div>
      </div>

      {category === "journal" && publishers.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Publisher</span>
          <Select
            value={publisher}
            onValueChange={(value) => onPublisherChange(value as string)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="All publishers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All publishers</SelectItem>
              {publishers.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
