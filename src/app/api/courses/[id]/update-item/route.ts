import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Tbl = "modules" | "lessons" | "videos" | "courses";
const ALLOWED: ReadonlyArray<Tbl> = ["modules", "lessons", "videos", "courses"];

function pickFields(table: Tbl, body: Record<string, unknown>): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  if (typeof body.title === "string")            out.title = body.title;
  if (typeof body.description === "string")      out.description = body.description;
  if (typeof body.order === "number")            out.order = body.order;
  if (Array.isArray(body.learning_objectives))   out.learning_objectives = body.learning_objectives;
  if (Array.isArray(body.content_types))         out.content_types = body.content_types;
  if (typeof body.duration_minutes === "number") out.duration_minutes = body.duration_minutes;
  if (typeof body.is_capstone === "boolean")     out.is_capstone = body.is_capstone;
  if (typeof body.lesson_id === "string" && table === "videos") out.lesson_id = body.lesson_id;
  if (typeof body.module_id === "string" && table === "lessons") out.module_id = body.module_id;
  // New (2026-05): video typing + ideal duration drive downstream automation.
  if (table === "videos") {
    if (typeof body.video_type === "string") out.video_type = body.video_type;
    if (typeof body.content_type === "string") out.content_type = body.content_type;
    if (typeof body.ideal_duration_minutes === "number") {
      out.ideal_duration_minutes = body.ideal_duration_minutes;
    } else if (body.ideal_duration_minutes === null) {
      out.ideal_duration_minutes = null;
    }
    // Allow setting duration_minutes to null too (when clearing the field).
    if (body.duration_minutes === null) out.duration_minutes = null;
  }
  if (table === "courses") {
    if (typeof body.company_logo_url === "string") out.company_logo_url = body.company_logo_url;
    if (typeof body.ppt_template_url === "string") out.ppt_template_url = body.ppt_template_url;
    if (body.hierarchy_preset && typeof body.hierarchy_preset === "object") out.hierarchy_preset = body.hierarchy_preset;
    if (body.ppt_settings && typeof body.ppt_settings === "object") out.ppt_settings = body.ppt_settings;
    if (typeof body.target_days === "number") out.target_days = body.target_days;
    if (typeof body.target_completion_date === "string") out.target_completion_date = body.target_completion_date;
  }
  return Object.keys(out).length ? out : null;
}

async function checkCourseOwnership(courseId: string, orgId: string) {
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("courses").select("org_id").eq("id", courseId).maybeSingle();
  if (!data || data.org_id !== orgId) return null;
  return supabase;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id: courseId } = await params;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const table = body.table as Tbl;
  const id = body.id as string;
  if (!ALLOWED.includes(table) || !id) {
    return NextResponse.json({ error: "Invalid table or id" }, { status: 400 });
  }

  const fields = pickFields(table, body);
  if (!fields) return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  fields.updated_at = new Date().toISOString();

  const supabase = await checkCourseOwnership(courseId, auth.orgId);
  if (!supabase) return NextResponse.json({ error: "course not found" }, { status: 404 });

  const { error } = await supabase.from(table).update(fields).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Create a new module / lesson / video. The client sends the parent id
  // (module_id for lessons, lesson_id for videos) plus the title.
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id: courseId } = await params;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const table = body.table as Tbl;
  if (!ALLOWED.includes(table) || table === "courses") {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }
  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const supabase = await checkCourseOwnership(courseId, auth.orgId);
  if (!supabase) return NextResponse.json({ error: "course not found" }, { status: 404 });

  const newId = crypto.randomUUID();
  const row: Record<string, unknown> = {
    id: newId,
    org_id: auth.orgId,
    course_id: courseId,
    title: body.title,
    description: (body.description as string) ?? "",
    order: (body.order as number) ?? 0,
  };

  if (table === "modules") {
    row.learning_objectives = body.learning_objectives ?? [];
  } else if (table === "lessons") {
    if (!body.module_id) return NextResponse.json({ error: "module_id required" }, { status: 400 });
    row.module_id = body.module_id;
    row.learning_objectives = body.learning_objectives ?? [];
    row.content_types = body.content_types ?? [];
  } else if (table === "videos") {
    if (!body.lesson_id) return NextResponse.json({ error: "lesson_id required" }, { status: 400 });
    row.lesson_id = body.lesson_id;
    row.duration_minutes = (body.duration_minutes as number) ?? 10;
    row.status = "pending";
  }

  const { error } = await supabase.from(table).insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: newId });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id: courseId } = await params;

  const url = new URL(request.url);
  const table = url.searchParams.get("table") as Tbl | null;
  const itemId = url.searchParams.get("itemId");
  if (!table || !ALLOWED.includes(table) || !itemId || table === "courses") {
    return NextResponse.json({ error: "Invalid table or itemId" }, { status: 400 });
  }

  const supabase = await checkCourseOwnership(courseId, auth.orgId);
  if (!supabase) return NextResponse.json({ error: "course not found" }, { status: 404 });

  const { error } = await supabase.from(table).delete().eq("id", itemId).eq("course_id", courseId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
