// /api/admin/snapshot
//
// Records today's KPI numbers into metrics_snapshots so the dashboard can
// compute real prior-period deltas. Idempotent on (org_id, recorded_on)
// thanks to the UNIQUE constraint.
//
// Today the dashboard calls this on first paint; in the future a Vercel
// cron job can call it once per day per org, and the dashboard will just
// read the snapshot rows.

import { NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const sb = await getServerSupabase();

  const [
    { data: courses }, { data: briefs }, { data: videos },
  ] = await Promise.all([
    sb.from("courses").select("id, status").eq("org_id", auth.orgId),
    sb.from("content_briefs").select("id, status").eq("org_id", auth.orgId),
    sb.from("videos").select("id, status").eq("org_id", auth.orgId),
  ]);

  const all = courses ?? [];
  const courses_total      = all.length;
  const courses_in_prod    = all.filter((c) => !["draft", "archived", "published"].includes(c.status)).length;
  const courses_published  = all.filter((c) => c.status === "published").length;
  const reviews_pending    = all.filter((c) => (c.status ?? "").includes("review")).length;
  const briefs_approved    = (briefs ?? []).filter((b) => b.status === "approved").length;
  const videos_recorded    = (videos ?? []).filter((v) => ["recorded", "transcribed", "reviewed"].includes(v.status)).length;

  // Health-score-avg: until /api/lint is rolled out per-course we use a
  // deterministic placeholder so the snapshot column is populated.
  const health_score_avg =
    courses_total === 0 ? 0 :
    Math.round(all.reduce((acc, c) => {
      let s = 0;
      for (const ch of c.id) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
      return acc + (60 + (s % 40));
    }, 0) / courses_total);

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await sb.from("metrics_snapshots").upsert({
    org_id: auth.orgId,
    recorded_on: today,
    courses_total,
    courses_in_prod,
    courses_published,
    briefs_approved,
    videos_recorded,
    health_score_avg,
    reviews_pending,
  }, { onConflict: "org_id,recorded_on" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, recorded_on: today });
}

export async function GET() {
  // Returns the trailing 30 snapshots so the dashboard can compute deltas.
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const sb = await getServerSupabase();
  const { data } = await sb
    .from("metrics_snapshots")
    .select("*")
    .eq("org_id", auth.orgId)
    .order("recorded_on", { ascending: false })
    .limit(30);
  return NextResponse.json({ snapshots: data ?? [] });
}
