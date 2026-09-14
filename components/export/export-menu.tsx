"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DownloadIcon, FileArchiveIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportProject } from "@/lib/mock-api/export";
import { triggerDownload } from "@/lib/download-utils";

type ExportFormat = "pdf" | "zip" | "inlined-tex";

const MIME: Record<ExportFormat, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  "inlined-tex": "text/x-tex;charset=utf-8",
};

export function ExportMenu({ projectId }: { projectId: string }) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    setExporting(format);
    try {
      const { filename, content, encoding } = await exportProject(projectId, format);
      triggerDownload(filename, content, MIME[format], encoding);
      toast.success(`Exported ${filename}`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <DownloadIcon className="size-3.5" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Export project</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={exporting !== null}>
          <FileTextIcon /> Compiled PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("zip")} disabled={exporting !== null}>
          <FileArchiveIcon /> Full source (.zip)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("inlined-tex")} disabled={exporting !== null}>
          <FileTextIcon /> Single inlined .tex
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
