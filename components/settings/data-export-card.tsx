"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DownloadIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteAccount, exportUserData } from "@/lib/mock-api/security";
import { logOut } from "@/lib/mock-api/auth";

export function DataExportCard() {
  const [exporting, setExporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  async function handleExport() {
    setExporting(true);
    try {
      const { filename, content } = await exportUserData();
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data export has downloaded.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(confirmText);
      await logOut();
      toast.success("Account deletion requested. You've been signed out.");
      setDialogOpen(false);
      router.push("/login");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete account.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>Export a copy of your account data, or permanently delete your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Download my data</p>
            <p className="text-xs text-muted-foreground">
              A JSON file with your profile, settings, and project metadata.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={exporting}>
            <DownloadIcon className="size-3.5" />
            {exporting ? "Preparing…" : "Export"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-destructive">Delete account</p>
            <p className="text-xs text-muted-foreground">
              Permanently removes your account, projects, and collaborator access.
            </p>
          </div>
          <AlertDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setConfirmText("");
                setDeleteError(null);
              }
            }}
          >
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" className="gap-1.5" />}>
              <Trash2Icon className="size-3.5" />
              Delete account
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This can&apos;t be undone. All your projects, files, and settings will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Field>
                <FieldLabel htmlFor="confirm-delete">
                  Type <span className="font-mono font-semibold">DELETE</span> to confirm
                </FieldLabel>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                />
                {deleteError && <FieldError>{deleteError}</FieldError>}
                <FieldDescription>You&apos;ll be signed out immediately.</FieldDescription>
              </Field>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={deleting || confirmText !== "DELETE"}
                  onClick={handleDelete}
                >
                  {deleting ? "Deleting…" : "Delete account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
