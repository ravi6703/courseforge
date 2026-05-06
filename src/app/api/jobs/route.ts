// GET /api/jobs?course=<id>  → list recent jobs for the course

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("course");
  if (!courseId) return NextResponse.json({ error: "course required" }, { status: 400 });
  const sb = await getServerSupabase();
  const { data } = await sb
    .from("generation_jobs")
    .select("id, kind, status, payload, error, created_at, finished_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(100);
  return NextResponse.json({ jobs: data ?? [] });
}
