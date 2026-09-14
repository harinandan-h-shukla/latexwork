"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const;

function subscribeNoop() {
  return () => {};
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // next-themes actually resolves the stored theme from localStorage
  // synchronously on the client's first render (not after, despite what it
  // might look like from `theme` being typed as possibly-undefined) — so
  // gating on `theme` alone still mismatches the server's render whenever a
  // user has a saved "light"/"dark" preference. useSyncExternalStore's
  // server/client snapshot split is the purpose-built tool for exactly this
  // "value differs between server and client" case — it reports `false`
  // (matching the server) for the render that hydrates, then `true` after,
  // without a manual effect+setState (which this repo's stricter purity
  // lint flags, and which needlessly cascades an extra render anyway).
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const ActiveIcon = mounted ? (OPTIONS.find((o) => o.value === theme)?.icon ?? MonitorIcon) : MonitorIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Toggle theme" />}
      >
        <ActiveIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(theme === option.value && "bg-accent text-accent-foreground")}
          >
            <option.icon />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
