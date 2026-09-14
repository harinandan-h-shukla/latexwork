"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/lib/mock-api/account";
import type { User } from "@/lib/types";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

interface AccountFormProps {
  user: User;
  onUserChange: (user: User) => void;
}

export function AccountForm({ user, onUserChange }: AccountFormProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");

  function startEditing() {
    setName(user.name);
    setEmail(user.email);
    setAvatarUrl(user.avatarUrl ?? "");
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: name.trim() || user.name,
        email: email.trim() || user.email,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      onUserChange(updated);
      setEditing(false);
      toast.success("Profile updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Profile</CardTitle>
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEditing}>
            <PencilIcon />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <FieldGroup>
            <div className="flex items-center gap-4">
              <Avatar size="lg">
                <AvatarImage src={avatarUrl || undefined} alt={name} />
                <AvatarFallback>{initials(name || user.name)}</AvatarFallback>
              </Avatar>
              <Field className="flex-1">
                <FieldLabel htmlFor="avatarUrl">Avatar URL</FieldLabel>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  placeholder="https://…"
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </FieldGroup>
        ) : (
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
