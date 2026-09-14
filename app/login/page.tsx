"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { InkwellLogo } from "@/components/shell/inkwell-logo";

import { logIn, type OAuthProvider } from "@/lib/mock-api/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GitHubIcon, GoogleIcon, OrcidIcon } from "@/components/shell/oauth-icons";

type Pending = "password" | null;

const OAUTH_PROVIDERS: { provider: OAuthProvider; label: string; icon: typeof GoogleIcon }[] = [
  { provider: "google", label: "Google", icon: GoogleIcon },
  { provider: "github", label: "GitHub", icon: GitHubIcon },
  { provider: "orcid", label: "ORCID", icon: OrcidIcon },
];

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Pending>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending("password");
    try {
      await logIn({ email, password });
      toast.success("Welcome back!");
      router.push(next && next.startsWith("/") ? next : "/projects");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't log in");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-1 text-center">
          <Link href="/">
            <InkwellLogo size="lg" showTagline />
          </Link>
          <CardTitle className="mt-2 text-xl">Log in to your account</CardTitle>
          <CardDescription>Welcome back. Enter your details to continue.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {OAUTH_PROVIDERS.map(({ provider, label, icon: Icon }) => (
              <Button
                key={provider}
                variant="outline"
                disabled
                aria-label={`Continue with ${label} (not yet available)`}
                title={`${label} sign-in isn't set up yet — it needs a registered OAuth app`}
              >
                <Icon className="size-4" />
              </Button>
            ))}
          </div>

          <div className="relative py-1">
            <Separator />
            <span className="absolute inset-x-0 top-0 mx-auto w-fit -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or continue with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@university.edu"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" disabled={pending !== null} className="mt-1">
              {pending === "password" && <Loader2Icon className="animate-spin" />}
              Log in
            </Button>
          </form>

          <p
            className="text-center text-sm text-muted-foreground/60"
            title="Institutional SSO isn't set up yet — it needs a registered identity provider"
          >
            Institutional SSO — coming soon
          </p>
        </CardContent>
        <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
          Don&apos;t have an account?
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
