"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { updateEmailNotificationPrefs } from "@/lib/mock-api/account";
import type { EmailNotificationPrefs, User } from "@/lib/types";

const DEFAULT_PREFS: EmailNotificationPrefs = {
  commentMentions: true,
  shareInvites: true,
  compileFailures: true,
};

const PREF_ITEMS: Array<{ key: keyof EmailNotificationPrefs; label: string; description: string }> = [
  {
    key: "commentMentions",
    label: "Comment mentions",
    description: "When someone @mentions you in a comment or reply.",
  },
  {
    key: "shareInvites",
    label: "Share invites",
    description: "When someone invites you to collaborate on a project.",
  },
  {
    key: "compileFailures",
    label: "Compile failures",
    description: "When a compile fails or times out on one of your projects.",
  },
];

interface NotificationPrefsFormProps {
  user: User;
  onUserChange: (user: User) => void;
}

export function NotificationPrefsForm({ user, onUserChange }: NotificationPrefsFormProps) {
  const [pendingKey, setPendingKey] = useState<keyof EmailNotificationPrefs | null>(null);
  const prefs = user.emailNotificationPrefs ?? DEFAULT_PREFS;

  async function handleToggle(key: keyof EmailNotificationPrefs, checked: boolean) {
    setPendingKey(key);
    try {
      const updated = await updateEmailNotificationPrefs({ ...prefs, [key]: checked });
      onUserChange({ ...user, emailNotificationPrefs: updated });
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email notifications</CardTitle>
        <CardDescription>Choose which activity sends you an email.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {PREF_ITEMS.map(({ key, label, description }) => (
          <label
            key={key}
            className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5"
          >
            <Checkbox
              checked={prefs[key]}
              disabled={pendingKey === key}
              onCheckedChange={(checked) => handleToggle(key, checked === true)}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">{description}</span>
            </span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
