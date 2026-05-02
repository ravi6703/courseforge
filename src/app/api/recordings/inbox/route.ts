// GET /api/recordings/inbox
// List unassigned recordings for the user's org (typically arrived via Zoom).

import { NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const sb = await getServerSupabase();
  const { data, error } = await sb
    .from("recordings")
    .select("id, audio_url, video_url, duration_seconds, recording_type, status, created_at")
    .is("course_id", null)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recordings: data ?? [] });
}
