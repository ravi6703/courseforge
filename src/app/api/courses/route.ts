// GET  /api/courses        list courses for the authenticated user's org
// POST /api/courses        create a course (+ optional modules + lessons)
//
// Both verbs require an authenticated user. We derive org_id from the user's
// profile rather than trusting the client. Reads/writes go through the
// session-bound Supabase client so RLS enforces org scoping (defense in depth
// alongside the explicit ownership check on upsert).

import { NextRequest, NextResponse } from "next/server";
import { CourseUpsertSchema, parseBody } from "@/lib/validation/schemas";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { recordActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const supabase = await getServerSupabase();
  // RLS already restricts to the caller's org; the explicit eq is belt-and-braces
  // and also makes the intent obvious to a reader.
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, status, platform, domain, audience_level, duration_weeks, created_at, updated_at")
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ courses: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const __p = parseBody(CourseUpsertSchema, raw);
  if (!__p.ok) return __p.res;
  const body = __p.data as unknown as Record<string, unknown>;

  const supabase = await getServerSupabase();
  // Always server-generate the id for new courses. If the client sends an id
  // we honour it (so existing flows that pre-allocate a UUID still work) but
  // RLS will reject the upsert if the row exists in a different org.
  const id = (body.id as string) || crypto.randomUUID();

  if (body.id) {
    const { data: existing } = await supabase
      .from("courses")
      .select("org_id")
      .eq("id", id)
      .maybeSingle();
    if (existing && existing.org_id !== auth.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const courseRow = {
    id,
    org_id: auth.orgId,
    title: (body.title as string) || "Untitled Course",
    description: (body.description as string) || "",
    platform: (body.platform as string) || "infylearn",
    status: (body.status as string) || "draft",
    audience_level: (body.audience_level as string) || "intermediate",
    duration_weeks: (body.duration_weeks as number) ?? 6,
    hours_per_week: (body.hours_per_week as number) ?? 6,
    domain: (body.domain as string) ?? null,
    prerequisites: (body.prerequisites as string) ?? null,
    target_job_roles: (body.target_job_roles as string[]) ?? [],
    certification_goal: (body.certification_goal as string) ?? null,
    theory_handson_ratio: (body.theory_handson_ratio as number) ?? 60,
    project_based: (body.project_based as boolean) ?? false,
    capstone: (body.capstone as boolean) ?? false,
    reference_course_url: (body.reference_course_url as string) ?? null,
    content_types: (body.content_types as string[]) ?? [],
    ...(body.hierarchy_preset       ? { hierarchy_preset:       body.hierarchy_preset } : {}),
    ...(body.company_logo_url       ? { company_logo_url:       body.company_logo_url } : {}),
    ...(body.ppt_template_url       ? { ppt_template_url:       body.ppt_template_url } : {}),
    ...(body.learning_objectives    ? { learning_objectives:    body.learning_objectives } : {}),
    ...(body.content_format_defaults? { content_format_defaults: body.content_format_defaults } : {}),
  };

  // First attempt: write everything. If the DB is missing the newer columns
  // (i.e. the 20260505100000_course_settings migration hasn't been applied
  // to this project yet), Postgres fails with "column X does not exist".
  // Rather than 500-ing, retry with just the legacy fields and surface a
  // clearer hint so the operator knows to run migrations.
  let { error: cErr } = await supabase.from("courses").upsert(courseRow, { onConflict: "id" });
  if (cErr && /column .* does not exist/i.test(cErr.message)) {
    const legacyRow = { ...courseRow };
    delete (legacyRow as Record<string, unknown>).hierarchy_preset;
    delete (legacyRow as Record<string, unknown>).company_logo_url;
    delete (legacyRow as Record<string, unknown>).ppt_template_url;
    delete (legacyRow as Record<string, unknown>).learning_objectives;
    delete (legacyRow as Record<string, unknown>).content_format_defaults;
    const retry = await supabase.from("courses").upsert(legacyRow, { onConflict: "id" });
    cErr = retry.error;
  }
  if (cErr) {
    return NextResponse.json({
      error: cErr.message,
      hint: cErr.message.includes("column")
        ? "A required Supabase migration may not be applied. Run `supabase db push` or apply migrations 20260505100000 and 20260505200000 in the Supabase dashboard."
        : undefined,
    }, { status: 500 });
  }

  // PROD-2: surface this in the PM dashboard activity feed.
  await recordActivity(supabase, {
    orgId: auth.orgId,
    userId: auth.profileId,
    userName: auth.email ?? undefined,
    userRole: auth.role,
    courseId: id,
    action: body.id ? "course.updated" : "course.created",
    targetType: "course",
    targetId: id,
    details: { title: courseRow.title, status: courseRow.status },
  });


  // Optional modules + lessons. Bulk insert (PERF-1 fix) lives in
  // /api/courses/[id]/sync-toc; this path is for callers that pass the tree
  // inline at create time, which is rare and small (1–2 modules max).
  type IM = { id?: string; title: string; description?: string; order?: number; learning_objectives?: unknown; lessons?: IL[] };
  type IL = { id?: string; title: string; description?: string; order?: number; content_types?: string[]; learning_objectives?: unknown };
  const inlineModules = (body.modules as IM[]) ?? [];
  if (inlineModules.length) {
    const moduleRows = inlineModules.map((m) => ({
      id: m.id || crypto.randomUUID(),
      org_id: auth.orgId,
      course_id: id,
      title: m.title,
      description: m.description ?? "",
      order: m.order ?? 0,
      learning_objectives: m.learning_objectives ?? [],
    }));
    await supabase.from("modules").upsert(moduleRows, { onConflict: "id" });

    const lessonRows: Array<Record<string, unknown>> = [];
    inlineModules.forEach((m, idx) => {
      const moduleId = moduleRows[idx].id;
      (m.lessons ?? []).forEach((l) => {
        lessonRows.push({
          id: l.id || crypto.randomUUID(),
          org_id: auth.orgId,
          course_id: id,
          module_id: moduleId,
          title: l.title,
          description: l.description ?? "",
          order: l.order ?? 0,
          content_types: l.content_types ?? [],
          learning_objectives: l.learning_objectives ?? [],
        });
      });
    });
    if (lessonRows.length) {
      await supabase.from("lessons").upsert(lessonRows, { onConflict: "id" });
    }
  }

  return NextResponse.json({ id, ok: true });
}
