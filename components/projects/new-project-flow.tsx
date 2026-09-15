"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FilePlus2Icon, GitBranchIcon, LayoutTemplateIcon, LinkIcon, UploadCloudIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewProjectBlank } from "@/components/projects/new-project-blank";
import { NewProjectTemplatePicker } from "@/components/projects/new-project-template-picker";
import { NewProjectUpload } from "@/components/projects/new-project-upload";
import { NewProjectImport } from "@/components/projects/new-project-import";

export function NewProjectFlow() {
  const router = useRouter();

  function handleCreated(projectId: string) {
    toast.success("Project created");
    router.push(`/projects/${projectId}`);
  }

  return (
    <Tabs defaultValue="blank">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="blank">
          <FilePlus2Icon /> Blank
        </TabsTrigger>
        <TabsTrigger value="template">
          <LayoutTemplateIcon /> From template
        </TabsTrigger>
        <TabsTrigger value="zip">
          <UploadCloudIcon /> Upload zip
        </TabsTrigger>
        <TabsTrigger value="url">
          <LinkIcon /> Import URL
        </TabsTrigger>
        <TabsTrigger value="github">
          <GitBranchIcon /> Import GitHub
        </TabsTrigger>
      </TabsList>

      <Card className="mt-4">
        <CardContent>
          <TabsContent value="blank">
            <NewProjectBlank onCreated={handleCreated} />
          </TabsContent>
          <TabsContent value="template">
            <NewProjectTemplatePicker onCreated={handleCreated} />
          </TabsContent>
          <TabsContent value="zip">
            <NewProjectUpload onCreated={handleCreated} />
          </TabsContent>
          <TabsContent value="url">
            <NewProjectImport kind="url" onCreated={handleCreated} />
          </TabsContent>
          <TabsContent value="github">
            <NewProjectImport kind="github" onCreated={handleCreated} />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
