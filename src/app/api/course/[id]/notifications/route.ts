// API: GET / PATCH course notifications.
//
// GET    → return up to 50 most recent un-dismissed notifications.
// PATCH  → { markAllRead: true }    mark every unread notif as read.
//          { dismissId: <uuid> }    dismiss a single notif.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const { data, error } = await sb
    .from("course_notifications")
    .select("id, kind, severity, title, body, link, read_at, created_at")
    .eq("course_id", id)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    markAllRead?: boolean;
    dismissId?: string;
  };
  const sb = await getServerSupabase();

  if (body.markAllRead) {
    const { error } = await sb
      .from("course_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("course_id", id)
      .is("read_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (body.dismissId) {
    const { error } = await sb
      .from("course_notifications")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", body.dismissId)
      .eq("course_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "no-op" }, { status: 400 });
}
