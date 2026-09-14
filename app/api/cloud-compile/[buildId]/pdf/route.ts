import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/db/require-user";

// The one deliberate app/api route in this codebase — everything else is a
// "use server" Server Action (see lib/mock-api/*, lib/cloud-compiler/actions.ts),
// but a Server Action can't efficiently stream a binary PDF back to the
// browser (it would have to be base64-encoded inline in the RPC response).
// This proxies the compiled PDF from the cloud-compiler service, adding the
// CLOUD_COMPILER_SHARED_SECRET server-side so it's never exposed to the
// browser — the client only ever sees this same-origin, cookie-authenticated
// URL, never the cloud-compiler service's own URL or secret directly.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = process.env.CLOUD_COMPILER_URL;
  const secret = process.env.CLOUD_COMPILER_SHARED_SECRET;
  if (!url || !secret) {
    return NextResponse.json({ error: "Cloud compiler is not configured." }, { status: 503 });
  }

  const upstream = await fetch(
    `${url.replace(/\/$/, "")}/builds/${encodeURIComponent(buildId)}/output.pdf?callerId=${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" }
  );

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "PDF not available." }, { status: upstream.status || 404 });
  }

  return new NextResponse(upstream.body, {
    headers: { "Content-Type": "application/pdf" },
  });
}
