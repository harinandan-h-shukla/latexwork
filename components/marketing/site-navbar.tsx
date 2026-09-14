"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { InkwellLogo } from "@/components/shell/inkwell-logo";
import { isAuthenticated } from "@/lib/client-session";

const NAV_LINKS = [
  { href: "#features", label: "Overview" },
  { href: "#discovery", label: "Discovery" },
  { href: "#writing", label: "Writing" },
  { href: "#collaboration", label: "Collaboration" },
  { href: "#plans", label: "Plans" },
  { href: "#about", label: "About" },
];

export function SiteNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    (() => setAuthed(isAuthenticated()))();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-transparent transition-colors duration-300",
        scrolled
          ? "border-border/80 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/70"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <InkwellLogo />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {authed ? (
            <Button nativeButton={false} render={<Link href="/projects" />}>
              Go to dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
                Log in
              </Button>
              <Button nativeButton={false} render={<Link href="/signup" />}>
                Get started
              </Button>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 lg:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <Button
              variant="outline"
              size="icon"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <MenuIcon />
            </Button>
            <SheetContent side="right" className="w-72 p-4">
              <SheetHeader className="px-0">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <InkwellLogo />
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <SheetClose
                    key={link.href}
                    nativeButton={false}
                    render={
                      <a
                        href={link.href}
                        className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
                      />
                    }
                  >
                    {link.label}
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {authed ? (
                  <Button nativeButton={false} render={<Link href="/projects" />}>
                    Go to dashboard
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
                      Log in
                    </Button>
                    <Button nativeButton={false} render={<Link href="/signup" />}>
                      Get started — free
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
