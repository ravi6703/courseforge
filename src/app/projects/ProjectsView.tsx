"use client";

// Portfolio Gantt — one row per course, phase-level rollup.
// Sorted by deadline tightness (most urgent first).

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, Calendar } from "lucide-react";
import { STEP_LABELS, STEP_COLORS, type TimelineStepKind } from "@/lib/timeline";

interface Step {
  id: string;
  step_kind: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  lesson_id: string | null;
}
interface Timeline {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
}
export interface CourseRow {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  targetCompletionDate: string | null;
  targetDays: number | null;
  timeline: Timeline | null;
  steps: Step[];
}

const PHASE_ORDER: TimelineStepKind[] = [
  "profile", "toc", "brief", "slides", "record", "transcript", "assets", "review", "publish",
];

export function ProjectsView({ courses }: { courses: CourseRow[] }) {
  // Sort: courses with deadlines closest first; courses without timelines last.
  const sorted = useMemo(() => {
    return courses.slice().sort((a, b) => {
      const aMs = a.targetCompletionDate ? new Date(a.targetCompletionDate).getTime() : Infinity;
      const bMs = b.targetCompletionDate ? new Date(b.targetCompletionDate).getTime() : Infinity;
      return aMs - bMs;
    });
  }, [courses]);

  // Global date range across all timelines so bars share a common scale.
  const { gStart, gEnd } = useMemo(() => {
    let gs = Infinity;
    let ge = -Infinity;
    sorted.forEach((c) => {
      if (!c.timeline) return;
      gs = Math.min(gs, new Date(c.timeline.start_date).getTime());
      ge = Math.max(ge, new Date(c.timeline.end_date).getTime());
    });
    if (!Number.isFinite(gs)) gs = Date.now();
    if (!Number.isFinite(ge)) ge = Date.now() + 30 * 86_400_000;
    return { gStart: gs, gEnd: ge };
  }, [sorted]);
  const gTotal = Math.max(86_400_000, gEnd - gStart);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {sorted.map((c) => {
        const phases = rollupPhases(c.steps);
        const slipCount = c.steps.filter((s) => s.status !== "done" && new Date(s.scheduled_end).getTime() < Date.now()).length;
        const doneCount = c.steps.filter((s) => s.status === "done").length;
        const totalSteps = c.steps.length;
        const daysToDeadline = c.targetCompletionDate
          ? Math.round((new Date(c.targetCompletionDate).getTime() - Date.now()) / 86_400_000)
          : null;
        const deadlineTone =
          daysToDeadline === null ? "text-slate-500" :
          daysToDeadline < 0 ? "text-rose-700 font-bold" :
          daysToDeadline < 7 ? "text-amber-700 font-bold" :
          "text-emerald-700";
        const bottleneck = computeBottleneck(c.steps);

        return (
          <Link
            key={c.id}
            href={`/course/${c.id}/timeline`}
            className="block px-4 py-3 border-b border-slate-100 hover:bg-slate-50/60 last:border-b-0"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-slate-900 truncate">{c.title}</div>
                <div className="text-[10.5px] text-slate-500">
                  {totalSteps > 0 ? `${doneCount}/${totalSteps} steps done` : "No plan generated"}
                  {bottleneck && totalSteps > 0 && (
                    <span className="ml-2">· bottleneck: <span className="font-semibold text-slate-700">{STEP_LABELS[bottleneck]}</span></span>
                  )}
                </div>
              </div>
              {slipCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                  <AlertTriangle className="w-3 h-3" /> {slipCount} slipping
                </span>
              )}
              <span className={`inline-flex items-center gap-1 text-[11px] tabular-nums shrink-0 ${deadlineTone}`}>
                <Calendar className="w-3 h-3" />
                {daysToDeadline === null ? "no deadline" : daysToDeadline < 0 ? `${Math.abs(daysToDeadline)}d over` : `${daysToDeadline}d left`}
              </span>
            </div>
            {/* Phase bars on global timeline scale */}
            <div className="relative h-5 bg-slate-100 rounded">
              {phases.map((p) => {
                const left = ((p.start - gStart) / gTotal) * 100;
                const width = Math.max(0.8, ((p.end - p.start) / gTotal) * 100);
                return (
                  <span
                    key={p.kind}
                    className="absolute top-0 bottom-0 rounded-sm"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: STEP_COLORS[p.kind as TimelineStepKind],
                      opacity: p.allDone ? 1 : 0.85,
                    }}
                    title={`${STEP_LABELS[p.kind as TimelineStepKind]} · ${p.doneCount}/${p.totalCount} done`}
                  />
                );
              })}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function rollupPhases(steps: Step[]): Array<{
  kind: TimelineStepKind; start: number; end: number; doneCount: number; totalCount: number; allDone: boolean;
}> {
  if (steps.length === 0) return [];
  const m = new Map<TimelineStepKind, Step[]>();
  steps.forEach((s) => {
    const k = s.step_kind as TimelineStepKind;
    const list = m.get(k) ?? [];
    list.push(s);
    m.set(k, list);
  });
  const out: Array<{ kind: TimelineStepKind; start: number; end: number; doneCount: number; totalCount: number; allDone: boolean }> = [];
  for (const k of PHASE_ORDER) {
    const list = m.get(k);
    if (!list) continue;
    const start = Math.min(...list.map((s) => new Date(s.scheduled_start).getTime()));
    const end = Math.max(...list.map((s) => new Date(s.scheduled_end).getTime()));
    const doneCount = list.filter((s) => s.status === "done").length;
    out.push({ kind: k, start, end, doneCount, totalCount: list.length, allDone: doneCount === list.length });
  }
  return out;
}

function computeBottleneck(steps: Step[]): TimelineStepKind | null {
  if (steps.length === 0) return null;
  const m = new Map<TimelineStepKind, { done: number; total: number }>();
  steps.forEach((s) => {
    const k = s.step_kind as TimelineStepKind;
    const cur = m.get(k) ?? { done: 0, total: 0 };
    cur.total++;
    if (s.status === "done") cur.done++;
    m.set(k, cur);
  });
  let bottleneck: TimelineStepKind | null = null;
  let lo = 1.1;
  for (const [k, v] of m.entries()) {
    if (v.total === 0) continue;
    const r = v.done / v.total;
    if (r < lo) { lo = r; bottleneck = k; }
  }
  return bottleneck;
}
