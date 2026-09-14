"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutTemplate } from "lucide-react";
import type { Template } from "@/lib/types";
import { listTemplates } from "@/lib/mock-api/templates";
import { TemplateCard } from "@/components/templates/template-card";
import { TemplateFilters, type TemplateCategoryFilter } from "@/components/templates/template-filters";
import { TemplatePreviewDialog } from "@/components/templates/template-preview-dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

interface TemplateGalleryProps {
  refreshKey?: number;
  onPickTemplate?: (template: Template) => void;
}

export function TemplateGallery({ refreshKey, onPickTemplate }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [category, setCategory] = useState<TemplateCategoryFilter>("all");
  const [publisher, setPublisher] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listTemplates().then((result) => {
      if (!cancelled) setTemplates(result);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const publishers = useMemo(() => {
    if (!templates) return [];
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.category === "journal" && t.publisher) set.add(t.publisher);
    });
    return Array.from(set).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (category === "journal" && publisher !== "all" && t.publisher !== publisher) return false;
      if (search.trim()) {
        const needle = search.trim().toLowerCase();
        const haystack = `${t.name} ${t.description} ${t.publisher ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [templates, category, publisher, search]);

  function handleCardClick(template: Template) {
    if (onPickTemplate) {
      onPickTemplate(template);
      return;
    }
    setPreviewTemplate(template);
    setPreviewOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <TemplateFilters
        category={category}
        onCategoryChange={(c) => {
          setCategory(c);
          setPublisher("all");
        }}
        publisher={publisher}
        onPublisherChange={setPublisher}
        publishers={publishers}
        search={search}
        onSearchChange={setSearch}
      />

      {templates === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutTemplate />
            </EmptyMedia>
            <EmptyTitle>No templates found</EmptyTitle>
            <EmptyDescription>Try a different category, publisher, or search term.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((template) => (
            <TemplateCard key={template.id} template={template} onClick={() => handleCardClick(template)} />
          ))}
        </div>
      )}

      {!onPickTemplate && (
        <TemplatePreviewDialog template={previewTemplate} open={previewOpen} onOpenChange={setPreviewOpen} />
      )}
    </div>
  );
}
