"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateEditorDefaults } from "@/lib/mock-api/account";
import type { EditorDefaults, User } from "@/lib/types";

const EDITOR_THEMES = [
  { value: "default", label: "Inkwell Default" },
  { value: "dracula", label: "Dracula" },
  { value: "monokai", label: "Monokai" },
  { value: "solarized-dark", label: "Solarized Dark" },
  { value: "solarized-light", label: "Solarized Light" },
  { value: "nord", label: "Nord" },
  { value: "one-dark", label: "One Dark" },
];

interface EditorDefaultsFormProps {
  user: User;
  onUserChange: (user: User) => void;
}

export function EditorDefaultsForm({ user, onUserChange }: EditorDefaultsFormProps) {
  const [defaults, setDefaults] = useState<EditorDefaults>(user.editorDefaults);
  const [saving, setSaving] = useState(false);

  function patch<K extends keyof EditorDefaults>(key: K, value: EditorDefaults[K]) {
    setDefaults((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateEditorDefaults(defaults);
      onUserChange({ ...user, editorDefaults: updated });
      toast.success("Editor defaults saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editor defaults</CardTitle>
        <CardDescription>Applied to new editor sessions across all your projects.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="keybinding">Keybinding</FieldLabel>
              <Select
                value={defaults.keybinding}
                onValueChange={(value) => patch("keybinding", value as EditorDefaults["keybinding"])}
              >
                <SelectTrigger id="keybinding" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="vim">Vim</SelectItem>
                  <SelectItem value="emacs">Emacs</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="editor-theme">Editor theme</FieldLabel>
              <Select
                value={defaults.theme}
                onValueChange={(value) => value && patch("theme", value)}
              >
                <SelectTrigger id="editor-theme" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDITOR_THEMES.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="fontSize">Font size (px)</FieldLabel>
              <Input
                id="fontSize"
                type="number"
                min={10}
                max={24}
                value={defaults.fontSize}
                onChange={(e) => patch("fontSize", Number(e.target.value) || defaults.fontSize)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tabSize">Tab size</FieldLabel>
              <Select
                value={String(defaults.tabSize)}
                onValueChange={(value) => patch("tabSize", Number(value))}
              >
                <SelectTrigger id="tabSize" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 spaces</SelectItem>
                  <SelectItem value="4">4 spaces</SelectItem>
                  <SelectItem value="8">8 spaces</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
              Autocomplete
              <Switch
                checked={defaults.autocomplete}
                onCheckedChange={(checked) => patch("autocomplete", checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
              Word wrap
              <Switch
                checked={defaults.wordWrap}
                onCheckedChange={(checked) => patch("wordWrap", checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
              Line numbers
              <Switch
                checked={defaults.lineNumbers}
                onCheckedChange={(checked) => patch("lineNumbers", checked)}
              />
            </label>
          </div>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save editor defaults"}
        </Button>
      </CardFooter>
    </Card>
  );
}
