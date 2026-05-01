// src/lib/supabase/server.ts
// Server-side Supabase helpers.
//
// IMPORTANT — auth model:
//   • API routes MUST call requireUser() (or readUser()) before doing any DB work.
//     The middleware explicitly excludes /api/* from session checks, so each
//     route is responsible for proving who is making the call.
//   • getServerSupabase() returns a session-bound client (RLS enforced).
//     Use this for all reads/writes that should be scoped to the caller.
//   • getServiceSupabase() returns a service-role client that BYPASSES RLS.
//     Only use it when you have already authenticated the user and need
//     elevated access (e.g. cross-org admin tasks). Never expose its results
//     to a caller without an org_id check first.
//
// NEVER import this file from client components.

import { createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Session-bound Supabase client. Honours Postgres RLS using the caller's JWT
 * from the Supabase auth cookie. This is what API routes should use by default.
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // No-op: API routes don't need to refresh cookies on the response;
        // the middleware handles cookie rotation for page navigations.
        setAll: () => {},
      },
    }
  );
}

/**
 * Service-role client. BYPASSES RLS. Only use after you've authenticated
 * the caller and confirmed they're allowed to do the thing you're about to do.
 */
export function getServiceSupabase(): SupabaseClient {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export type AuthedUser = {
  authUserId: string; // auth.users.id
  profileId: string;  // profiles.id
  orgId: string;      // profiles.org_id
  role: string;       // 'pm' | 'coach'
  email: string | null;
};

/**
 * Read the authenticated user from the session, plus their org_id from the
 * profiles table. Returns null if the request is unauthenticated or the
 * profile row hasn't been created yet.
 *
 * Callers usually want requireUser() instead, which returns a 401 response
 * directly when there's no user.
 */
export async function readUser(): Promise<AuthedUser | null> {
  const supabase = await getServerSupabase();

  // getUser() hits Supabase to validate the JWT — don't use getSession().
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return null;

  // Service-role read: we need profiles even if its RLS would otherwise
  // hide it, because we're using it to *establish* the caller's identity.
  const service = getServiceSupabase();
  const { data: profile } = await service
    .from("profiles")
    .select("id, org_id, role, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    authUserId: user.id,
    profileId: profile.id as string,
    orgId: profile.org_id as string,
    role: (profile.role as string) ?? "coach",
    email: (profile.email as string) ?? user.email ?? null,
  };
}

/**
 * Use at the top of an API route. Returns the user, or a NextResponse 401
 * that the route should return immediately:
 *
 *   const auth = await requireUser();
 *   if (auth instanceof NextResponse) return auth;
 *   // ...auth.orgId is now safe to use
 */
export async function requireUser(): Promise<AuthedUser | NextResponse> {
  const user = await readUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

// Kept temporarily for any code still importing it. New code should use
// the authenticated user's orgId instead.
export const DEMO_ORG_ID = "00000000-0000-0000-0000-0000000000aa";
