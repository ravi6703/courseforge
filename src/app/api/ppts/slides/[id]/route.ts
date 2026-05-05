// /api/ppts/slides/[id]
//
// GET    return the slide
// PATCH  update title / content / speaker_notes / layout_type / image_url
// DELETE remove the slide
//
// Used by the per-video PPT editor.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownership(slideId: string, orgId: string) {
  const sb = await getServerSupabase();
  const { data } = await sb.from("ppt_slides").select("id, org_id").eq("id", slideId).maybeSingle();
  if (!data || data.org_id !== orgId) return null;
  return sb;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const sb = await ownership(id, auth.orgId);
  if (!sb) return NextResponse.json({ error: "slide not found" }, { status: 404 });
  const { data } = await sb.from("ppt_slides").select("*").eq("id", id).maybeSingle();
  return NextResponse.json({ slide: data });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const sb = await ownership(id, auth.orgId);
  if (!sb) return NextResponse.json({ error: "slide not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const fields: Record<string, unknown> = {};
  if (typeof body.title === "string")          fields.title = body.title.slice(0, 200);
  if (body.content !== undefined)              fields.content = body.content;
  if (typeof body.speaker_notes === "string" || body.speaker_notes === null) fields.speaker_notes = body.speaker_notes ?? "";
  if (typeof body.layout_type === "string")    fields.layout_type = body.layout_type;
  if (typeof body.image_url === "string" || body.image_url === null) fields.image_url = body.image_url;
  if (typeof body.slide_number === "number")   fields.slide_number = body.slide_number;
  if (Object.keys(fields).length === 0) return NextResponse.json({ error: "no fields" }, { status: 400 });

  const { error } = await sb.from("ppt_slides").update(fields).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const sb = await ownership(id, auth.orgId);
  if (!sb) return NextResponse.json({ error: "slide not found" }, { status: 404 });
  const { error } = await sb.from("ppt_slides").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
