// GET /api/zoom/auth/start
//
// Starts the Zoom OAuth dance. We sign a state token with the user's
// profileId so the callback can verify it without server-side state.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { buildAuthorizeUrl } from "@/lib/zoom";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_REDIRECT_URI) {
    return NextResponse.json({ error: "Zoom integration not configured" }, { status: 503 });
  }

  // Sign the state with HMAC so the callback can verify it came from us.
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${auth.profileId}.${auth.orgId}.${nonce}`;
  const sig = crypto.createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(payload).digest("hex").slice(0, 32);
  const state = `${payload}.${sig}`;

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
