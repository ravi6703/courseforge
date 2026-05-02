// src/lib/zoom/index.ts
//
// Phase 7 — Zoom OAuth + recording fetch helpers. Uses the Zoom OAuth
// 2.0 Authorization Code flow with PKCE-ish state validation, token
// refresh, and webhook signature verification (HMAC-SHA256 on the
// Zoom-Signature header per the Zoom Webhook 2.0 spec).
//
// Required env at runtime:
//   ZOOM_CLIENT_ID
//   ZOOM_CLIENT_SECRET
//   ZOOM_REDIRECT_URI         (e.g. https://courseforge-rust.vercel.app/api/zoom/auth/callback)
//   ZOOM_WEBHOOK_SECRET       (Secret Token configured in the Zoom Marketplace app)

import crypto from "crypto";

const AUTH_URL  = "https://zoom.us/oauth/authorize";
const TOKEN_URL = "https://zoom.us/oauth/token";
const API_URL   = "https://api.zoom.us/v2";

export function buildAuthorizeUrl(state: string, scopes: string[] = ["recording:read", "user:read"]): string {
  const u = new URL(AUTH_URL);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", process.env.ZOOM_CLIENT_ID!);
  u.searchParams.set("redirect_uri", process.env.ZOOM_REDIRECT_URI!);
  u.searchParams.set("state", state);
  // Scopes are space-separated when posted to Zoom even though the docs say comma —
  // both work; we use space to match their JS examples.
  u.searchParams.set("scope", scopes.join(" "));
  return u.toString();
}

export interface ZoomTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<ZoomTokens> {
  const basic = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.ZOOM_REDIRECT_URI!,
    }),
  });
  if (!res.ok) throw new Error(`Zoom token exchange ${res.status}: ${await res.text()}`);
  return res.json() as Promise<ZoomTokens>;
}

export async function refreshTokens(refreshToken: string): Promise<ZoomTokens> {
  const basic = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Zoom refresh ${res.status}`);
  return res.json() as Promise<ZoomTokens>;
}

export async function getMe(accessToken: string): Promise<{ id: string; account_id: string; email: string }> {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Zoom getMe ${res.status}`);
  return res.json() as Promise<{ id: string; account_id: string; email: string }>;
}

export async function downloadRecordingFile(downloadUrl: string, accessToken: string): Promise<ArrayBuffer> {
  // Zoom recording download URLs require the access_token. They redirect
  // to a CDN; fetch follows redirects by default.
  const url = `${downloadUrl}${downloadUrl.includes("?") ? "&" : "?"}access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Zoom recording download ${res.status}`);
  return res.arrayBuffer();
}

// ─── Webhook signature verification ─────────────────────────────────────────

/**
 * Verify the Zoom Webhook 2.0 signature on an incoming request.
 *  v0=HMAC_SHA256(secret, "v0:" + timestamp + ":" + body)  → header x-zm-signature
 */
export function verifyWebhook(body: string, headers: Headers): boolean {
  const sig = headers.get("x-zm-signature") ?? "";
  const ts  = headers.get("x-zm-request-timestamp") ?? "";
  if (!sig || !ts || !process.env.ZOOM_WEBHOOK_SECRET) return false;

  const message = `v0:${ts}:${body}`;
  const expected = "v0=" + crypto.createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET).update(message).digest("hex");

  // Constant-time compare
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/**
 * For the URL-validation challenge Zoom sends when you save the webhook URL,
 * we have to respond with HMAC of the plainToken. See:
 * https://developers.zoom.us/docs/api/webhooks/#secret-token-verification
 */
export function validationChallengeResponse(plainToken: string): {
  plainToken: string;
  encryptedToken: string;
} {
  const encryptedToken = crypto
    .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET!)
    .update(plainToken)
    .digest("hex");
  return { plainToken, encryptedToken };
}
