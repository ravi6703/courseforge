// /api/courses/[id]/collaborators
//
// Per-course collaborator management. Every course is org-scoped; this
// route layers per-course role grants (editor / reviewer / viewer) on
// top of org membership.
//
// Verbs:
//   GET    list collaborators on this course
//   POST   invite by email + role; emits an invite_token
//   PATCH  change a collaborator's role
//   DELETE remove a collaborator

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "editor" | "reviewer" | "viewer";
const VALID_ROLES: Role[] = ["editor", "reviewer", "viewer"];

async function ownership(courseId: string, orgId: string) {
  const sb = await getServerSupabase();
  const { data } = await sb.from("courses").select("id, org_id, title").eq("id", courseId).maybeSingle();
  if (!data || data.org_id !== orgId) return null;
  return { sb, course: data };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const own = await ownership(id, auth.orgId);
  if (!own) return NextResponse.json({ error: "course not found" }, { status: 404 });

  const { data } = await own.sb.from("course_collaborators")
    .select("id, email, role, invited_at, accepted_at, user_id, invite_token")
    .eq("course_id", id)
    .order("invited_at", { ascending: false });
  return NextResponse.json({ collaborators: data ?? [] });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const own = await ownership(id, auth.orgId);
  if (!own) return NextResponse.json({ error: "course not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const email: string = (body.email ?? "").toString().trim().toLowerCase();
  const role:  Role   = body.role;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `role must be one of ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }

  // Generate a token the invitee can redeem on /accept-invite?token=…
  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  const { data, error } = await own.sb.from("course_collaborators")
    .upsert({
      org_id: auth.orgId,
      course_id: id,
      email,
      role,
      invited_by: auth.profileId,
      invite_token: token,
    }, { onConflict: "course_id,email" })
    .select("id, email, role, invite_token, invited_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // We don't ship transactional email today — return the invite link in
  // the response so the inviting user can copy-paste it. When SMTP is
  // wired (Resend / Postmark / Supabase Auth invites), the link gets
  // emailed instead.
  const acceptUrl = `${new URL(req.url).origin}/accept-invite?token=${token}`;
  return NextResponse.json({ ok: true, collaborator: data, accept_url: acceptUrl });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const own = await ownership(id, auth.orgId);
  if (!own) return NextResponse.json({ error: "course not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const collaboratorId: string = body.collaboratorId;
  const role: Role = body.role;
  if (!collaboratorId || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "collaboratorId + valid role required" }, { status: 400 });
  }
  const { error } = await own.sb.from("course_collaborators")
    .update({ role }).eq("id", collaboratorId).eq("course_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const own = await ownership(id, auth.orgId);
  if (!own) return NextResponse.json({ error: "course not found" }, { status: 404 });

  const url = new URL(req.url);
  const collaboratorId = url.searchParams.get("collaboratorId");
  if (!collaboratorId) return NextResponse.json({ error: "collaboratorId required" }, { status: 400 });
  await own.sb.from("course_collaborators").delete().eq("id", collaboratorId).eq("course_id", id);
  return NextResponse.json({ ok: true });
}
