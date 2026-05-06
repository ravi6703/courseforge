// GET /api/coach-capacity — list capacity rows for org coaches.
// PUT /api/coach-capacity — upsert hours_per_week for a coach.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const sb = await getServerSupabase();
  const [{ data: caps }, { data: coaches }] = await Promise.all([
    sb.from("coach_capacity").select("user_id, hours_per_week, effective_from, notes").order("effective_from", { ascending: false }),
    sb.from("profiles").select("id, name, email, role").eq("role", "coach"),
  ]);
  // Latest capacity per user.
  const latest: Record<string, { hours_per_week: number; effective_from: string; notes: string | null }> = {};
  (caps ?? []).forEach((c) => {
    if (!latest[c.user_id]) latest[c.user_id] = { hours_per_week: c.hours_per_week, effective_from: c.effective_from, notes: c.notes };
  });
  return NextResponse.json({
    coaches: (coaches ?? []).map((c) => ({
      ...c,
      capacity: latest[c.id] ?? { hours_per_week: 20, effective_from: null, notes: null },
    })),
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  const { user_id, hours_per_week, notes } = body as { user_id: string; hours_per_week: number; notes?: string };
  if (!user_id || typeof hours_per_week !== "number") {
    return NextResponse.json({ error: "user_id + hours_per_week required" }, { status: 400 });
  }
  const sb = await getServerSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await sb
    .from("coach_capacity")
    .upsert(
      { org_id: auth.orgId, user_id, hours_per_week, effective_from: today, notes: notes ?? null },
      { onConflict: "org_id,user_id,effective_from" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
