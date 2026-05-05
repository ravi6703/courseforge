// /api/collaborators/accept
//
// The invitee posts here with the invite token. We verify token, attach
// their user_id, and stamp accepted_at. The invitee then has access to
// the course (RLS additionally allows org members to read; this gives an
// auditable trail of who-invited-whom).

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const token: string = (body.token ?? "").toString();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const sb = await getServerSupabase();
  const { data: collab } = await sb.from("course_collaborators")
    .select("id, course_id, org_id, email, role, accepted_at")
    .eq("invite_token", token)
    .maybeSingle();
  if (!collab) return NextResponse.json({ error: "invalid token" }, { status: 404 });

  if (collab.email !== (auth.email ?? "").toLowerCase()) {
    return NextResponse.json({ error: "invite was sent to a different email" }, { status: 403 });
  }

  if (!collab.accepted_at) {
    await sb.from("course_collaborators")
      .update({ user_id: auth.profileId, accepted_at: new Date().toISOString() })
      .eq("id", collab.id);
  }

  return NextResponse.json({ ok: true, course_id: collab.course_id, role: collab.role });
}
