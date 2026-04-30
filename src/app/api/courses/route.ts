// GET  /api/courses        list courses for the demo org
// POST /api/courses        create a course (+ optional modules + lessons)

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, DEMO_ORG_ID } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, status, platform, domain, audience_level, duration_weeks, created_at, updated_at")
    .eq("org_id", DEMO_ORG_ID)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ courses: data ?? [] });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = await getServerSupabase();
  const id = (body.id as string) || crypto.randomUUID();

  const courseRow = {
    id,
    org_id: DEMO_ORG_ID,
    title: (body.title as string) || "Untitled Course",
    description: (body.description as string) || "",
    platform: (body.platform as string) || "infylearn",
    status: (body.status as string) || "draft",
    audience_level: (body.audience_level as string) || "intermediate",
    duration_weeks: (body.duration_weeks as number) ?? 6,
    hours_per_week: (body.hours_per_week as number) ?? 6,
    domain: (body.domain as string) ?? null,
    target_job_roles: (body.target_job_roles as string[]) ?? [],
    certification_goal: (body.certification_goal as string) ?? null,
    theory_handson_ratio: (body.theory_handson_ratio as number) ?? 60,
    project_based: (body.project_based as boolean) ?? false,
    capstone: (body.capstone as boolean) ?? false,
    reference_course_url: (body.reference_course_url as string) ?? null,
    content_types: (body.content_types as string[]) ?? [],
  };

  const { error: cErr } = await supabase.from("courses").upsert(courseRow, { onConflict: "id" });
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  // Optional modules + lessons
  type IM = { id?: string; title: string; description?: string; order?: number; learning_objectives?: unknown; lessons?: IL[] };
  type IL = { id?: string; title: string; description?: string; order?: number; content_types?: string[]; learning_objectives?: unknown };
  for (const m of ((body.modules as IM[]) ?? [])) {
    const moduleId = m.id || crypto.randomUUID();
    await supabase.from("modules").upsert({
      id: moduleId, org_id: DEMO_ORG_ID, course_id: id,
      title: m.title, description: m.description ?? "", order: m.order ?? 0,
      learning_objectives: m.learning_objectives ?? [],
    }, { onConflict: "id" });

    for (const l of (m.lessons ?? [])) {
      await supabase.from("lessons").upsert({
        id: l.id || crypto.randomUUID(),
        org_id: DEMO_ORG_ID, course_id: id, module_id: moduleId,
        title: l.title, description: l.description ?? "", order: l.order ?? 0,
        content_types: l.content_types ?? [], learning_objectives: l.learning_objectives ?? [],
      }, { onConflict: "id" });
    }
  }

  return NextResponse.json({ id, ok: true });
}
