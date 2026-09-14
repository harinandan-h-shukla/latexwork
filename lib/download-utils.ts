"use client";

// Shared by any client component that needs to save an exportProject()
// result (or similarly base64/utf8-encoded content) as a browser download —
// originally only in ExportMenu, now also used by ProjectActionsMenu's
// dashboard-level "Download zip" action.

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function triggerDownload(
  filename: string,
  content: string,
  mime: string,
  encoding: "utf8" | "base64"
): void {
  const blob =
    encoding === "base64"
      ? new Blob([base64ToBytes(content).buffer as ArrayBuffer], { type: mime })
      : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
