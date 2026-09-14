"use client";

import { useState } from "react";
import { XIcon, SpellCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export function SpellcheckDictionaryPopover({
  enabled,
  onEnabledChange,
  dictionary,
  onAdd,
  onRemove,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  dictionary: string[];
  onAdd: (word: string) => void;
  onRemove: (word: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" title="Spell-check settings">
            <SpellCheckIcon />
          </Button>
        }
      />
      <PopoverContent className="w-64">
        <PopoverHeader>
          <PopoverTitle>Spell-check</PopoverTitle>
          <PopoverDescription>Squiggle-underline flagged words and manage your dictionary.</PopoverDescription>
        </PopoverHeader>
        <label className="flex items-center justify-between text-sm">
          Enable spell-check
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </label>
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!value.trim()) return;
            onAdd(value.trim());
            setValue("");
          }}
        >
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add word" className="h-7 text-xs" />
          <Button type="submit" size="xs">
            Add
          </Button>
        </form>
        <div className="flex max-h-32 flex-wrap gap-1 overflow-auto">
          {dictionary.length === 0 && <span className="text-xs text-muted-foreground">No custom words yet.</span>}
          {dictionary.map((word) => (
            <Badge key={word} variant="secondary" className="gap-1 pr-1">
              {word}
              <button type="button" onClick={() => onRemove(word)} aria-label={`Remove ${word}`}>
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
