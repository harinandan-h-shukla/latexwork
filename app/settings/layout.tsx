import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/projects"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to dashboard
        </Link>
        <h1 className="text-xl font-semibold">Settings</h1>
        <SettingsNav />
      </div>
      {children}
    </div>
  );
}
