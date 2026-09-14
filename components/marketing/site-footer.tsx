import Link from "next/link";

import { ThemeToggle } from "@/components/shell/theme-toggle";
import { InkwellLogo } from "@/components/shell/inkwell-logo";

interface FooterLink {
  label: string;
  href?: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

// Links without an `href` point to a page that doesn't exist yet — rendered
// as plain (non-clickable) text so the footer reads as complete without
// pretending those destinations are live.
const COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "#features" },
      { label: "Paper structure", href: "#structure" },
      { label: "Writing", href: "#writing" },
      { label: "Local compile", href: "#compile" },
      { label: "Collaboration", href: "#collaboration" },
      { label: "Projects", href: "/projects" },
    ],
  },
  {
    title: "Research",
    links: [
      { label: "Discovery", href: "#discovery" },
      { label: "Citations", href: "#citations" },
      { label: "Paper health", href: "#review" },
      { label: "Templates", href: "/templates" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Contact", href: "/contact" },
      { label: "Blog" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Feedback", href: "/feedback" },
      { label: "Contribute & maintain", href: "/contribute" },
      { label: "Support Inkwell", href: "/donate" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation" },
      { label: "Help" },
      { label: "Keyboard shortcuts" },
      { label: "Changelog" },
    ],
  },
  {
    title: "Legal",
    links: [{ label: "Privacy" }, { label: "Terms" }, { label: "Security" }],
  },
  {
    // AGPL-3.0 §13: anyone interacting with this program over a network
    // must be offered a way to get its source — this is that, not a
    // marketing choice.
    title: "Open source",
    links: [
      { label: "Source code", href: "https://github.com/harinandan-h-shukla/latexwork" },
      { label: "License (AGPL-3.0)", href: "https://github.com/harinandan-h-shukla/latexwork/blob/main/LICENSE" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-7">
          <div className="col-span-2 flex flex-col gap-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center">
              <InkwellLogo size="sm" />
            </Link>
            <p className="text-xs text-muted-foreground">
              A research workspace for discovering, writing, and compiling
              papers — LaTeX included.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-2.5">
              <h3 className="text-xs font-semibold text-foreground">{col.title}</h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) =>
                  link.href ? (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={link.label} className="text-xs text-muted-foreground/50">
                      {link.label}
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/80 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Inkwell. Free and{" "}
            <Link
              href="https://github.com/harinandan-h-shukla/latexwork/blob/main/LICENSE"
              className="underline hover:text-foreground"
            >
              open source (AGPL-3.0)
            </Link>
            .
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
