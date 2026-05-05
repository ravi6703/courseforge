// /api/courses/[id]
//
// PATCH — partial update (e.g. status="archived" from the dashboard kebab).
// DELETE — soft delete: flip status to "archived" rather than removing the
// row, so historical activity, exports and audit logs still resolve. The
// dashboard hides archived courses unless the user explicitly filters for
// them.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { recordActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const allowed: Record<string, unknown> = {};
  if (typeof body.title === "string")             allowed.title = body.title;
  if (typeof body.description === "string")       allowed.description = body.description;
  if (typeof body.status === "string")            allowed.status = body.status;
  if (typeof body.archived === "boolean")         allowed.status = body.archived ? "archived" : "draft";
  if (typeof body.company_logo_url === "string")  allowed.company_logo_url = body.company_logo_url;
  if (typeof body.ppt_template_url === "string")  allowed.ppt_template_url = body.ppt_template_url;
  if (body.hierarchy_preset && typeof body.hierarchy_preset === "object")
    allowed.hierarchy_preset = body.hierarchy_preset;
  if (Array.isArray(body.learning_objectives))    allowed.learning_objectives = body.learning_objectives;
  if (body.content_format_defaults && typeof body.content_format_defaults === "object")
    allowed.content_format_defaults = body.content_format_defaults;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("courses")
    .update(allowed)
    .eq("id", id)
    .eq("org_id", auth.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordActivity(supabase, {
    orgId: auth.orgId,
    userId: auth.profileId,
    userName: auth.email ?? undefined,
    userRole: auth.role,
    courseId: id,
    action: "course.updated",
    targetType: "course",
    targetId: id,
    details: allowed,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const supabase = await getServerSupabase();
  // Soft delete — keeps comments, activity, exports linkable.
  const { error } = await supabase
    .from("courses")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("org_id", auth.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordActivity(supabase, {
    orgId: auth.orgId,
    userId: auth.profileId,
    userName: auth.email ?? undefined,
    userRole: auth.role,
    courseId: id,
    action: "course.archived",
    targetType: "course",
    targetId: id,
    details: {},
  });

  return NextResponse.json({ ok: true });
}
