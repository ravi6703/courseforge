// /api/audit/[courseId]
//
// Course-level audit. Combines:
//   - Pedagogy lint (modules / lessons / videos / Bloom / time / capstone)
//   - Per-artifact content lint (PQ / GQ / Reading / AI Coach / Discussion / WE)
//   - Production readiness (every video has brief approved, slides ready, etc.)
//
// Returns a single shape that drives the Final Review tab:
//   { score, critical, major, minor, ready_to_publish, findings[] }
// Each finding includes a `target` link the UI can use to jump to the fix.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { lintCourse } from "@/lib/lint/pedagogy";
import { lintByKind, scoreFindings } from "@/lib/lint/content";
import type { Course, Module } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface AuditFinding {
  rule_id: string;
  scope: "course" | "pq" | "gq" | "reading" | "ai_coach" | "discussion" | "worked_example" | "production";
  severity: "critical" | "major" | "minor";
  message: string;
  fix_prompt?: string;
  target?: { kind: "video" | "module" | "lesson" | "stage"; id?: string; stage?: string };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ courseId: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { courseId } = await ctx.params;

  const supabase = await getServerSupabase();
  const { data: course } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
  if (!course || course.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  const [
    { data: modules }, { data: lessons }, { data: videos },
    { data: contentItems }, { data: pptSlides }, { data: briefs },
  ] = await Promise.all([
    supabase.from("modules").select("*").eq("course_id", courseId).order("order"),
    supabase.from("lessons").select("*").eq("course_id", courseId).order("order"),
    supabase.from("videos").select("*").eq("course_id", courseId),
    supabase.from("content_items").select("id, kind, payload, video_id").eq("course_id", courseId),
    supabase.from("ppt_slides").select("id, video_id, status").eq("course_id", courseId),
    supabase.from("content_briefs").select("id, video_id, status").eq("course_id", courseId),
  ]);

  // ── Pedagogy lint (course-level) ───────────────────────────────────────
  const lessonsByModule: Record<string, unknown[]> = {};
  (lessons ?? []).forEach((l) => {
    (lessonsByModule[l.module_id] = lessonsByModule[l.module_id] ?? []).push({
      ...l,
      videos: (videos ?? []).filter((v) => v.lesson_id === l.id),
    });
  });
  const fullModules = (modules ?? []).map((m) => ({ ...m, lessons: lessonsByModule[m.id] ?? [] })) as Module[];
  const pedagogy = lintCourse({ course: course as Course, modules: fullModules });

  const findings: AuditFinding[] = [];

  // Map pedagogy lint findings → audit findings. Pedagogy uses
  // 'critical' | 'warning' | 'info'; we map warning → major, info → minor.
  for (const f of pedagogy.findings) {
    let kind: NonNullable<AuditFinding["target"]>["kind"] = "stage";
    if (f.target_type === "module") kind = "module";
    else if (f.target_type === "lesson") kind = "lesson";
    findings.push({
      rule_id: `pedagogy.${f.rule}`,
      scope: "course",
      severity: f.severity === "critical" ? "critical" : f.severity === "warning" ? "major" : "minor",
      message: f.message,
      fix_prompt: f.suggestion,
      target: { kind, id: f.target_id, stage: "toc" },
    });
  }

  // ── Per-artifact content lint ─────────────────────────────────────────
  for (const item of contentItems ?? []) {
    const f = lintByKind(item.kind, item.payload as Record<string, unknown>);
    for (const x of f) {
      findings.push({
        rule_id: `content.${item.kind}.${x.rule_id}`,
        scope: item.kind as AuditFinding["scope"],
        severity: x.severity,
        message: x.message,
        fix_prompt: x.fix_prompt,
        target: { kind: "video", id: item.video_id },
      });
    }
  }

  // ── Production readiness ──────────────────────────────────────────────
  for (const v of videos ?? []) {
    const b = (briefs ?? []).find((x) => x.video_id === v.id);
    if (!b || b.status !== "approved") {
      findings.push({
        rule_id: "production.brief_not_approved",
        scope: "production",
        severity: "major",
        message: `Video "${v.title}" has no approved brief.`,
        target: { kind: "video", id: v.id, stage: "briefs" } as AuditFinding["target"],
      });
    }
    const slides = (pptSlides ?? []).filter((s) => s.video_id === v.id);
    if (slides.length === 0) {
      findings.push({
        rule_id: "production.no_slides",
        scope: "production",
        severity: "minor",
        message: `Video "${v.title}" has no slides yet.`,
        target: { kind: "video", id: v.id, stage: "ppts" } as AuditFinding["target"],
      });
    }
  }

  // ── Aggregate ──────────────────────────────────────────────────────────
  const score = scoreFindings(
    findings.map((f) => ({ rule_id: f.rule_id, severity: f.severity, message: f.message, fix_prompt: f.fix_prompt ?? "" }))
  );
  const ready_to_publish = score.critical === 0 && score.score >= 80;

  return NextResponse.json({
    course_id: courseId,
    score: score.score,
    critical: score.critical,
    major: score.major,
    minor: score.minor,
    ready_to_publish,
    findings,
  });
}
