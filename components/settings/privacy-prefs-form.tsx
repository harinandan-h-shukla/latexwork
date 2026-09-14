"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updatePrivacyPrefs } from "@/lib/mock-api/security";
import type { PrivacyPrefs, User } from "@/lib/types";

interface PrivacyPrefsFormProps {
  user: User;
  onUserChange: (user: User) => void;
}

const DEFAULT_PREFS: PrivacyPrefs = { indexPublicProjects: false, shareUsageAnalytics: true };

export function PrivacyPrefsForm({ user, onUserChange }: PrivacyPrefsFormProps) {
  const [saving, setSaving] = useState<keyof PrivacyPrefs | null>(null);
  const prefs = user.privacyPrefs ?? DEFAULT_PREFS;

  async function handleToggle<K extends keyof PrivacyPrefs>(key: K, checked: boolean) {
    setSaving(key);
    try {
      const updated = await updatePrivacyPrefs({ [key]: checked } as Partial<PrivacyPrefs>);
      onUserChange({ ...user, privacyPrefs: updated });
      toast.success("Privacy preferences updated.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy</CardTitle>
        <CardDescription>Control what Inkwell shares about your activity and public projects.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
          <span>
            <span className="block font-medium">Allow search engines to index public projects</span>
            <span className="block text-xs text-muted-foreground">
              Projects you&apos;ve set to public can appear in search results.
            </span>
          </span>
          <Switch
            checked={prefs.indexPublicProjects}
            disabled={saving === "indexPublicProjects"}
            onCheckedChange={(checked) => handleToggle("indexPublicProjects", checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
          <span>
            <span className="block font-medium">Share anonymous usage analytics</span>
            <span className="block text-xs text-muted-foreground">
              Helps us improve Inkwell. Never includes your document content.
            </span>
          </span>
          <Switch
            checked={prefs.shareUsageAnalytics}
            disabled={saving === "shareUsageAnalytics"}
            onCheckedChange={(checked) => handleToggle("shareUsageAnalytics", checked)}
          />
        </label>
      </CardContent>
    </Card>
  );
}
