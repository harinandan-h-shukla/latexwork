"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { setTwoFactorEnabled } from "@/lib/mock-api/account";
import type { User } from "@/lib/types";

interface TwoFactorPanelProps {
  user: User;
  onUserChange: (user: User) => void;
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateSetupKey(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let key = "";
  for (const byte of bytes) key += BASE32_ALPHABET[byte % 32];
  return key.match(/.{1,4}/g)?.join(" ") ?? key;
}

export function TwoFactorPanel({ user, onUserChange }: TwoFactorPanelProps) {
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [setupKey, setSetupKey] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enrollOpen) return;
    (async () => {
      const key = generateSetupKey();
      setSetupKey(key);
      const secret = key.replace(/\s+/g, "");
      const otpauthUrl = `otpauth://totp/Inkwell:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Inkwell`;
      try {
        setQrDataUrl(await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 160 }));
      } catch {
        setQrDataUrl(null);
      }
    })();
  }, [enrollOpen, user.email]);

  async function handleToggle(checked: boolean) {
    if (checked) {
      setEnrollOpen(true);
      return;
    }
    setBusy(true);
    try {
      await setTwoFactorEnabled(false);
      onUserChange({ ...user, twoFactorEnabled: false });
      toast.success("Two-factor authentication disabled.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmEnroll() {
    setBusy(true);
    try {
      await setTwoFactorEnabled(true);
      onUserChange({ ...user, twoFactorEnabled: true });
      toast.success("Two-factor authentication enabled.");
      setEnrollOpen(false);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Require an authenticator app code in addition to your password.
          </CardDescription>
        </div>
        <Switch checked={user.twoFactorEnabled} onCheckedChange={handleToggle} disabled={busy} />
      </CardHeader>
      {user.twoFactorEnabled && (
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">
            <ShieldCheckIcon className="size-4" />
            Two-factor authentication is active on your account.
          </div>
        </CardContent>
      )}

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>
              Scan this QR code with an authenticator app, then enter the 6-digit code it
              generates.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex size-40 items-center justify-center rounded-lg border border-border bg-white p-2">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Two-factor authentication QR code" className="size-full" />
              ) : (
                <div className="size-full animate-pulse rounded-md bg-muted" />
              )}
            </div>
            <p className="font-mono text-xs text-muted-foreground">Setup key: {setupKey}</p>
          </div>
          <Field>
            <FieldLabel htmlFor="totp-code">Authentication code</FieldLabel>
            <Input
              id="totp-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <DialogFooter>
            <Button
              onClick={handleConfirmEnroll}
              disabled={busy || code.length !== 6}
            >
              {busy ? "Verifying…" : "Verify and enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
