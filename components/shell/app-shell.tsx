"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  LogOutIcon,
  PanelLeftIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";
import { getCurrentUser, logOut } from "@/lib/mock-api/auth";
import { listNotifications } from "@/lib/mock-api/notifications";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { InkwellLogo } from "@/components/shell/inkwell-logo";

const NAV_ITEMS = [
  { href: "/projects", label: "Home", icon: LayoutDashboardIcon },
  { href: "/templates", label: "Templates", icon: LayoutTemplateIcon },
  { href: "/trash", label: "Trash", icon: Trash2Icon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const [user, setUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setUser(u);
        const notifications = await listNotifications(u.id);
        setUnreadCount(notifications.filter((n) => !n.read).length);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  async function handleLogOut() {
    await logOut();
    toast.success("Logged out");
    router.push("/login");
  }

  const isCollapsed = collapsed;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="glass-surface sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Link href="/projects" className="flex shrink-0 items-center">
          <InkwellLogo />
        </Link>

        <Button
          variant="outline"
          size="sm"
          className="ml-2 hidden w-64 justify-start text-muted-foreground sm:flex"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <SearchIcon className="size-4" />
          Search...
          <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {"⌘"}K
          </kbd>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="sm:hidden"
          aria-label="Search"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <SearchIcon />
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            nativeButton={false}
            render={<Link href="/notifications" />}
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex size-2 items-center justify-center rounded-full bg-destructive ring-2 ring-background" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Account menu"
                  className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              }
            >
              <Avatar size="sm">
                <AvatarImage src={user?.avatarUrl} alt={user?.name ?? "Account"} />
                <AvatarFallback>{user ? initials(user.name) : "?"}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">{user?.name ?? "Loading..."}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem nativeButton={false} render={<Link href="/settings" />}>
                <SettingsIcon />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogOut}>
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={cn(
            "sticky top-14 flex h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-border-strong bg-surface-secondary transition-[width] duration-150",
            isCollapsed ? "w-14" : "w-56",
          )}
        >
          <nav className="flex flex-1 flex-col gap-1 p-2.5">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                    isCollapsed && "justify-center px-0",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <item.icon className="size-5 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="p-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed(!collapsed)}
            >
              <PanelLeftIcon className={cn("transition-transform", isCollapsed && "rotate-180")} />
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
