// src/lib/supabase/server.ts
// Single helper for SERVER-SIDE Supabase access.
// Uses service-role (bypasses RLS) when SUPABASE_SERVICE_ROLE_KEY is set,
// else falls back to cookie-based session via @supabase/ssr.
// NEVER import this on the client.

import { createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function getServerSupabase(): Promise<SupabaseClient> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

export const DEMO_ORG_ID = "00000000-0000-0000-0000-0000000000aa";
