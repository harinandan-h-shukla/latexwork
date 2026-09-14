"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/lib/types";

const MENTION_PATTERN = /(?:^|\s)@([a-zA-Z]*)$/;

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  users: User[];
  placeholder?: string;
  rows?: number;
  className?: string;
  /** If provided, plain Enter (no Shift) triggers this instead of inserting a newline. */
  onSubmitShortcut?: () => void;
}

export function MentionTextarea({
  value,
  onChange,
  users,
  placeholder,
  rows = 3,
  className,
  onSubmitShortcut,
}: MentionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [query, setQuery] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    if (query === null) return [];
    return users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  }, [query, users]);

  function matchAt(text: string, cursor: number) {
    return text.slice(0, cursor).match(MENTION_PATTERN);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    onChange(next);
    const cursor = e.target.selectionStart ?? next.length;
    const match = matchAt(next, cursor);
    setQuery(match ? match[1] : null);
  }

  function insertMention(user: User) {
    const el = ref.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const match = matchAt(value, cursor);
    if (!match) return;
    const leading = match[0].startsWith(" ") ? 1 : 0;
    const startIdx = cursor - match[0].length + leading;
    const firstName = user.name.split(" ")[0];
    const next = `${value.slice(0, startIdx)}@${firstName} ${value.slice(cursor)}`;
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = startIdx + firstName.length + 2;
      el.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (query !== null && suggestions.length > 0 && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault();
      insertMention(suggestions[0]);
      return;
    }
    if (e.key === "Escape") {
      setQuery(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && query === null && onSubmitShortcut) {
      e.preventDefault();
      onSubmitShortcut();
    }
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {query !== null && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 flex flex-col gap-0.5 rounded-lg border bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10">
          {suggestions.map((u) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(u);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
            >
              <span className="font-medium">{u.name}</span>
              <span className="text-xs text-muted-foreground">{u.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
