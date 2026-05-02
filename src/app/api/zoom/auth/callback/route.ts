// GET /api/zoom/auth/callback?code=…&state=…
//
// Receives the OAuth code, verifies state (HMAC of profileId+orgId),
// exchanges for tokens, fetches the Zoom user identity, and stores
// credentials in zoom_credentials.

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getMe } from "@/lib/zoom";
import { getServiceSupabase } from "@/lib/supabase/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?zoom_error=missing_params", req.url));
  }

  // State format: <profileId>.<orgId>.<nonce>.<sig>
  const parts = state.split(".");
  if (parts.length !== 4) {
    return NextResponse.redirect(new URL("/dashboard?zoom_error=bad_state", req.url));
  }
  const [profileId, orgId, nonce, sig] = parts;
  const payload = `${profileId}.${orgId}.${nonce}`;
  const expectedSig = crypto.createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(payload).digest("hex").slice(0, 32);
  if (sig !== expectedSig) {
    return NextResponse.redirect(new URL("/dashboard?zoom_error=bad_sig", req.url));
  }

  let tokens, me;
  try {
    tokens = await exchangeCodeForTokens(code);
    me = await getMe(tokens.access_token);
  } catch (e) {
    console.error("[zoom/callback]", e);
    return NextResponse.redirect(new URL("/dashboard?zoom_error=exchange_failed", req.url));
  }

  // Service role: zoom_credentials is org-shared; the storing user may
  // not be the one Zoom said they are if you re-auth as a different
  // Zoom account, hence the unique (org_id, zoom_user_id) constraint.
  const sb = getServiceSupabase();
  const { error } = await sb.from("zoom_credentials").upsert({
    org_id: orgId,
    user_id: profileId,
    zoom_user_id: me.id,
    zoom_account_id: me.account_id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    scopes: tokens.scope.split(/\s+/),
  }, { onConflict: "org_id,zoom_user_id" });

  if (error) {
    console.error("[zoom/callback] upsert", error);
    return NextResponse.redirect(new URL("/dashboard?zoom_error=db", req.url));
  }

  return NextResponse.redirect(new URL("/dashboard?zoom=connected", req.url));
}
