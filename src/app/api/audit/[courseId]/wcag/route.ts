// /api/audit/[courseId]/wcag
//
// Runs the WCAG AA scanner over a course and returns a structured findings
// list. Soft-warns; doesn't block publish today (the main /audit endpoint
// owns the publish gate).

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { auditCourse, type WcagAuditInput } from "@/lib/lint/wcag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReadingPayloadShape {
  markdown?: string;
  items?: Array<{ summary?: string; why_it_matters?: string }>;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { courseId } = await ctx.params;

  const sb = await getServerSupabase();
  const { data: course } = await sb
    .from("courses")
    .select("id, org_id, profile, company_logo_url, content_format_defaults")
    .eq("id", courseId)
    .maybeSingle();
  if (!course || course.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  const [{ data: readings }, { data: videos }, { data: transcripts }] = await Promise.all([
    sb.from("content_items").select("id, payload").eq("course_id", courseId).eq("kind", "reading"),
    sb.from("videos").select("id, status").eq("course_id", courseId),
    sb.from("transcripts").select("id, video_id, status").eq("course_id", courseId),
  ]);

  const transcriptByVideo = new Map<string, "ready" | "pending">();
  (transcripts ?? []).forEach((t) => transcriptByVideo.set(t.video_id, t.status === "ready" || t.status === "approved" ? "ready" : "pending"));

  const profile = ((course as { profile?: { brand?: { primary_color?: string; secondary_color?: string; accent_color?: string } } }).profile) ?? {};
  const brand = {
    primary:   profile.brand?.primary_color,
    secondary: profile.brand?.secondary_color,
    accent:    profile.brand?.accent_color,
  };

  const auditInput: WcagAuditInput = {
    brand,
    readings: (readings ?? []).map((r) => {
      const p = r.payload as ReadingPayloadShape | null;
      const md = p?.markdown
        ?? (p?.items ?? []).map((i) => `${i.summary ?? ""}\n${i.why_it_matters ?? ""}`).join("\n\n")
        ?? "";
      return { id: r.id, markdown: md };
    }),
    videos: (videos ?? []).map((v) => ({
      id: v.id,
      hasTranscript: transcriptByVideo.get(v.id) === "ready",
      // Captions = SRT/VTT downloaded. We can't tell if the operator
      // actually downloaded them, so we treat "transcript ready" as
      // "captions available" — same upstream artifact.
      hasCaptions: transcriptByVideo.get(v.id) === "ready",
    })),
  };

  const findings = auditCourse(auditInput);

  // Cache into wcag_findings so the Final Review tab can load fast on
  // subsequent visits. We delete then re-insert; volumes are tiny.
  await sb.from("wcag_findings").delete().eq("course_id", courseId);
  if (findings.length) {
    await sb.from("wcag_findings").insert(findings.map((f) => ({
      org_id: auth.orgId,
      course_id: courseId,
      scope: f.scope,
      scope_id: f.scope_id,
      rule_id: f.rule_id,
      level: f.level,
      severity: f.severity,
      message: f.message,
      fix_hint: f.fix_hint,
    })));
  }

  return NextResponse.json({
    course_id: courseId,
    findings,
    counts: {
      error:   findings.filter((f) => f.severity === "error").length,
      warning: findings.filter((f) => f.severity === "warning").length,
      info:    findings.filter((f) => f.severity === "info").length,
    },
  });
}
