"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { TemplateGallery } from "@/components/templates/template-gallery";
import { SaveAsTemplateDialog } from "@/components/templates/save-as-template-dialog";

export default function TemplatesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/projects"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" /> Back to dashboard
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
            <p className="text-sm text-muted-foreground">
              Browse journal, thesis, resume, presentation, and letter templates — or save one of your
              own projects as a reusable template.
            </p>
          </div>
          <SaveAsTemplateDialog onSaved={() => setRefreshKey((k) => k + 1)} />
        </div>
      </div>

      <TemplateGallery refreshKey={refreshKey} />
    </div>
  );
}
