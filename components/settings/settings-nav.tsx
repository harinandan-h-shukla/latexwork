"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SETTINGS_LINKS = [
  { href: "/settings", label: "Account" },
  { href: "/settings/security", label: "Security & Privacy" },
  { href: "/settings/storage", label: "Storage" },
  { href: "/settings/plan", label: "Plan" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-border">
      {SETTINGS_LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "relative px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "text-foreground"
            )}
          >
            {link.label}
            {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-foreground" />}
          </Link>
        );
      })}
    </nav>
  );
}
