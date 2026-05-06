// /projects — portfolio Project Plan view.
//
// One row per in-production course showing its phase Gantt, deadline
// pill, slipping count, bottleneck step. Sorted by deadline tightness
// so the most-urgent courses surface first.

import Link from "next/link";
import { Calendar, AlertTriangle, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { getServerSupabase } from "@/lib/supabase/server";
import { ProjectsView } from "./ProjectsView";

export default async function ProjectsPage() {
  const sb = await getServerSupabase();

  // Pull every course + its timeline + steps in one batched query.
  const [{ data: courses }, { data: timelines }, { data: steps }] = await Promise.all([
    sb.from("courses").select("id, title, status, target_completion_date, target_days, created_at").order("created_at", { ascending: false }),
    sb.from("course_timelines").select("id, course_id, start_date, end_date, total_days, status"),
    sb.from("timeline_steps").select("id, course_id, step_kind, scheduled_start, scheduled_end, status, lesson_id"),
  ]);

  const cs = (courses ?? []).filter((c) => c.status !== "draft" && c.status !== "published");
  const tlByCourse = new Map((timelines ?? []).map((t) => [t.course_id, t]));
  const stepsByCourse = new Map<string, typeof steps>();
  (steps ?? []).forEach((s) => {
    const list = stepsByCourse.get(s.course_id) ?? [];
    list.push(s);
    stepsByCourse.set(s.course_id, list);
  });

  // Compute portfolio stats for the header
  const inProduction = cs.length;
  const withTimeline = cs.filter((c) => tlByCourse.has(c.id)).length;
  const slipping = cs.filter((c) => {
    const myStepsInner = stepsByCourse.get(c.id) ?? [];
    return myStepsInner.some((s) => s.status !== "done" && new Date(s.scheduled_end).getTime() < Date.now());
  }).length;

  return (
    <AppShell title="Project plan">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-[24px] font-extrabold text-bi-navy-900 tracking-tight inline-flex items-center gap-2">
            <Calendar className="w-5 h-5 text-bi-blue-600" /> Project plan
          </h1>
          <p className="text-[13px] text-bi-navy-500 mt-0.5">
            Phase-level Gantt across every in-production course. Sorted by deadline tightness.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bi-blue-600 text-white text-[13px] font-semibold hover:bg-bi-blue-700"
        >
          <Plus className="w-3.5 h-3.5" /> New course
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiTile label="In production" value={inProduction} tone="blue" />
        <KpiTile label="Plans generated" value={`${withTimeline}/${inProduction}`} tone="purple" />
        <KpiTile label="Slipping" value={slipping} tone={slipping > 0 ? "rose" : "emerald"} />
        <KpiTile label="At risk" value={cs.filter((c) => atRisk(c, stepsByCourse.get(c.id) ?? [])).length} tone="amber" />
      </div>

      {inProduction === 0 ? (
        <div className="bg-white border border-dashed border-bi-navy-200 rounded-lg p-12 text-center text-[13px] text-bi-navy-500">
          No courses currently in production. <Link href="/create" className="text-bi-blue-700 underline font-semibold">Create one →</Link>
        </div>
      ) : (
        <ProjectsView
          courses={cs.map((c) => ({
            id: c.id,
            title: c.title,
            status: c.status,
            createdAt: c.created_at,
            targetCompletionDate: c.target_completion_date,
            targetDays: c.target_days,
            timeline: tlByCourse.get(c.id) ?? null,
            steps: (stepsByCourse.get(c.id) ?? []).map((s) => ({
              id: s.id,
              step_kind: s.step_kind,
              scheduled_start: s.scheduled_start,
              scheduled_end: s.scheduled_end,
              status: s.status,
              lesson_id: s.lesson_id,
            })),
          }))}
        />
      )}

      <div className="mt-4 text-[11.5px] text-bi-navy-400">
        <ChevronRight className="inline w-3 h-3" />
        Click any course → its individual <em>Timeline</em> page for full per-phase detail and the <em>Generate plan</em> action.
      </div>
    </AppShell>
  );
}

function KpiTile({ label, value, tone }: { label: string; value: string | number; tone: "blue" | "purple" | "emerald" | "amber" | "rose" }) {
  const TONE = {
    blue:    { bg: "bg-bi-blue-50",  fg: "text-bi-blue-700",  ring: "ring-bi-blue-200" },
    purple:  { bg: "bg-purple-50",   fg: "text-purple-700",   ring: "ring-purple-200" },
    emerald: { bg: "bg-emerald-50",  fg: "text-emerald-700",  ring: "ring-emerald-200" },
    amber:   { bg: "bg-amber-50",    fg: "text-amber-700",    ring: "ring-amber-200" },
    rose:    { bg: "bg-rose-50",     fg: "text-rose-700",     ring: "ring-rose-200" },
  }[tone];
  return (
    <div className={`bg-white border border-bi-navy-100 rounded-lg p-3 flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-md ring-1 ${TONE.bg} ${TONE.fg} ${TONE.ring} flex items-center justify-center`}>
        <AlertTriangle className="w-4 h-4 opacity-0" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-bi-navy-500">{label}</div>
        <div className="text-[18px] font-extrabold text-bi-navy-900 tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function atRisk(
  course: { target_completion_date: string | null },
  steps: Array<{ scheduled_end: string; status: string }>,
): boolean {
  const target = course.target_completion_date ? new Date(course.target_completion_date).getTime() : null;
  if (target !== null) {
    const days = Math.round((target - Date.now()) / 86_400_000);
    if (days >= 0 && days < 7) return true;
  }
  return steps.some((s) => s.status !== "done" && new Date(s.scheduled_end).getTime() < Date.now());
}
