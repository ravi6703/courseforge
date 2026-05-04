// GET /api/activity — recent activity for the caller's org.
//
// Returns the last N (default 20, capped 100) rows from activity_log
// joined with the course title for human-readable rendering. RLS
// scopes the read to the caller's org automatically.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ActivityItem {
  id: string;
  course_id: string;
  course_title: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  target_type: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const courseId = url.searchParams.get("courseId");

  const sb = await getServerSupabase();
  let query = sb
    .from("activity_log")
    .select("id, course_id, user_name, user_role, action, target_type, details, created_at, courses(title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (courseId) query = query.eq("course_id", courseId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items: ActivityItem[] = (data ?? []).map((row: Record<string, unknown>) => {
    const courseField = row.courses;
    const course = Array.isArray(courseField) ? courseField[0] : courseField;
    return {
      id: row.id as string,
      course_id: row.course_id as string,
      course_title: (course as { title?: string } | null)?.title ?? null,
      user_name: (row.user_name as string | null) ?? null,
      user_role: (row.user_role as string | null) ?? null,
      action: row.action as string,
      target_type: (row.target_type as string | null) ?? null,
      details: (row.details as Record<string, unknown>) ?? {},
      created_at: row.created_at as string,
    };
  });

  return NextResponse.json({ items });
}
