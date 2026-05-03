// PATCH /api/courses/[id]/public-health-score
//
// Flips course.public_health_score on or off. Body: { public: boolean }
// Only PMs can flip the flag — it controls whether the course's pedagogy
// score is published on the open web at /health-score/[id], so this is a
// real publishing decision, not a coach-level setting.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "pm") {
    return NextResponse.json({ error: "PM role required to publish a health score" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body?.public !== "boolean") {
    return NextResponse.json({ error: "body.public must be a boolean" }, { status: 400 });
  }

  const sb = await getServerSupabase();
  const { data: course, error } = await sb
    .from("courses")
    .update({ public_health_score: body.public })
    .eq("id", params.id)
    .select("id, public_health_score")
    .single();

  if (error || !course) {
    return NextResponse.json({ error: error?.message ?? "course not found" }, { status: 404 });
  }

  return NextResponse.json({ id: course.id, public: course.public_health_score });
}
