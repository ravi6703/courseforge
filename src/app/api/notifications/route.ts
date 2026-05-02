// GET /api/notifications        list current user's notifications (unread first)
// POST /api/notifications/read  mark one or many as read (body: { ids: string[] })
//
// PROD-2. Backs the bell icon in the header so PMs see "coach commented
// on TOC for course X" / "AI improvement complete" etc. RLS already
// scopes notifications to the recipient (see migration v2:
// notifications_self_select), so a session-bound client returns only
// the caller's rows.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, type, link, course_id, read_at, created_at")
    .order("read_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    notifications: data ?? [],
    unread: (data ?? []).filter((n) => !n.read_at).length,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: { ids?: string[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const ids = Array.isArray(body.ids) ? body.ids.filter((s) => typeof s === "string") : [];
  if (!ids.length) return NextResponse.json({ ok: true, updated: 0 });

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: (data ?? []).length });
}
