// GET /api/courses/[id]/preflight  → run scorecard
// POST /api/courses/[id]/preflight → persist a scorecard snapshot
//
// Pre-flight covers WCAG (alt text, color contrast hints, transcript
// presence), completeness (every lesson has every artifact),
// brand-compliance (vocabulary banned-term presence).

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { CONTENT_KINDS } from "@/app/course/[id]/content/types";

export const runtime = "nodejs";

interface Finding {
  category: "wcag" | "completeness" | "brand";
  severity: "info" | "warn" | "error";
  rule: string;
  title: string;
  body: string;
  autoFixable: boolean;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const [
    { data: course },
    { data: lessons },
    { data: items },
    { data: slides },
    { data: transcripts },
  ] = await Promise.all([
    sb.from("courses").select("profile, ppt_settings").eq("id", id).maybeSingle(),
    sb.from("lessons").select("id, title").eq("course_id", id),
    sb.from("content_items").select("lesson_id, kind, status, payload").eq("course_id", id),
    sb.from("ppt_slides").select("id, title, image_url").eq("course_id", id),
    sb.from("transcripts").select("video_id").eq("course_id", id),
  ]);

  const findings: Finding[] = [];
  const profile = (course?.profile ?? {}) as { vocabulary?: { banned?: string[] }; brand?: { primary_color?: string } };

  // Completeness
  const ls = lessons ?? [];
  const itemMap = new Set((items ?? []).map((i) => `${i.lesson_id}::${i.kind}`));
  ls.forEach((l) => {
    CONTENT_KINDS.forEach((k) => {
      if (!itemMap.has(`${l.id}::${k}`)) {
        findings.push({
          category: "completeness",
          severity: "warn",
          rule: "missing-artifact",
          title: `Missing ${k} for "${l.title}"`,
          body: `Generate this artifact before publishing.`,
          autoFixable: true,
        });
      }
    });
  });

  // WCAG: slides without alt text on images = miss
  (slides ?? []).forEach((s) => {
    if (s.image_url && !s.title) {
      findings.push({
        category: "wcag",
        severity: "warn",
        rule: "image-without-title",
        title: "Slide has an image but no title (acts as alt text)",
        body: `Slide ${s.id} — give it a descriptive title.`,
        autoFixable: false,
      });
    }
  });
  // Transcripts present?
  const trVidIds = new Set((transcripts ?? []).map((t) => t.video_id));
  if (trVidIds.size === 0 && (slides?.length ?? 0) > 0) {
    findings.push({
      category: "wcag",
      severity: "error",
      rule: "no-transcripts",
      title: "Course has slides but no transcripts",
      body: "Captions/transcripts are required for accessible video. Generate transcripts before publishing.",
      autoFixable: false,
    });
  }

  // Brand: banned vocabulary leaks
  const banned = profile.vocabulary?.banned ?? [];
  if (banned.length > 0) {
    const corpus = [
      ...(items ?? []).map((i) => JSON.stringify(i.payload ?? "")),
      ...(slides ?? []).map((s) => s.title),
    ].join(" ").toLowerCase();
    banned.forEach((term) => {
      if (term && corpus.includes(term.toLowerCase())) {
        findings.push({
          category: "brand",
          severity: "warn",
          rule: "banned-term",
          title: `Banned term "${term}" found in content`,
          body: "Auto-rewrite available, or open the offending lesson and edit manually.",
          autoFixable: true,
        });
      }
    });
  }

  // Compute scores 0-100
  const cap = (n: number) => Math.max(0, Math.min(100, n));
  const wcagFindings = findings.filter((f) => f.category === "wcag");
  const completenessFindings = findings.filter((f) => f.category === "completeness");
  const brandFindings = findings.filter((f) => f.category === "brand");
  const wcag = cap(100 - wcagFindings.length * 12);
  const completeness = cap(100 - completenessFindings.length * 4);
  const brand = cap(100 - brandFindings.length * 8);
  const overall = Math.round((wcag + completeness + brand) / 3);

  return NextResponse.json({
    overall,
    wcag,
    completeness,
    brand,
    findings,
  });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = await fetch(new URL(`/api/courses/${id}/preflight`, _req.url), { headers: { cookie: _req.headers.get("cookie") ?? "" } });
  if (!r.ok) return NextResponse.json({ error: "preflight calc failed" }, { status: 500 });
  const j = await r.json();
  const sb = await getServerSupabase();
  await sb.from("preflight_scorecards").upsert({
    course_id: id,
    overall_score: j.overall,
    wcag_score: j.wcag,
    completeness_score: j.completeness,
    brand_score: j.brand,
    findings: j.findings,
  }, { onConflict: "course_id" });
  return NextResponse.json({ ok: true, overall: j.overall });
}
