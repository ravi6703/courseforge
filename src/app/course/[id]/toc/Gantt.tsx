"use client";

// Gantt / project plan view — auto-generated when the TOC is locked.
//
// Coach feedback: "purpose of this whole activity is to complete the
// course as soon as possible, so when locking the TOC, a Gantt chart or
// suitable project plan should be created automatically with all the
// steps and day allocations. Slipping steps red. Notifications."
//
// This component shows the steps as horizontal bars on a date axis, with
// red highlighting for steps past their scheduled end and not yet done.

import { useEffect, useState } from "react";
import { Loader2, Calendar, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { STEP_LABELS, STEP_COLORS, type TimelineStepKind } from "@/lib/timeline";

interface Step {
  id: string;
  step_kind: TimelineStepKind;
  step_order: number;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: "not_started" | "in_progress" | "done" | "blocked";
  lesson_id: string | null;
  module_id: string | null;
}
interface Timeline {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: "on_track" | "at_risk" | "slipping" | "complete";
  generated_at: string;
}

export function Gantt({
  courseId,
  lessons,
}: {
  courseId: string;
  lessons: Array<{ id: string; title: string; module_id: string }>;
}) {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [targetDays, setTargetDays] = useState(21);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/course/${courseId}/timeline`);
      if (r.ok) {
        const j = await r.json();
        setTimeline(j.timeline);
        setSteps(j.steps);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [courseId]);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/course/${courseId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDays }),
      });
      if (r.ok) await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-lg border border-bi-navy-200 bg-white p-4 flex items-center gap-3 text-[12.5px] text-bi-navy-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading project plan…
      </section>
    );
  }

  if (!timeline) {
    return (
      <section className="rounded-lg border border-bi-navy-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-bi-blue-700 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-[14px] font-bold text-bi-navy-900">No project plan yet</h3>
            <p className="text-[12px] text-bi-navy-600 mt-1">
              Generate a Gantt-style timeline from your TOC. Each lesson gets steps for brief → slides →
              record → transcript → assets. Slipping steps will surface in red and trigger notifications.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-[11.5px] font-semibold text-bi-navy-700">Days to complete:</label>
              <input
                type="number"
                min={3}
                max={365}
                value={targetDays}
                onChange={(e) => setTargetDays(Number(e.target.value) || 21)}
                className="w-20 px-2 py-1 border border-slate-200 rounded text-[12.5px]"
              />
              <button
                onClick={generate}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-600 text-white text-[12.5px] font-semibold hover:bg-bi-blue-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                Generate plan
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const startMs = new Date(timeline.start_date).getTime();
  const endMs = new Date(timeline.end_date).getTime();
  const totalMs = Math.max(86_400_000, endMs - startMs);

  const slipCount = steps.filter((s) => {
    if (s.status === "done") return false;
    return new Date(s.scheduled_end).getTime() < Date.now();
  }).length;

  const doneCount = steps.filter((s) => s.status === "done").length;
  const lessonById = Object.fromEntries(lessons.map((l) => [l.id, l]));

  return (
    <section className="rounded-lg border border-bi-navy-200 bg-white">
      <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Project plan</div>
          <div className="text-[14px] font-bold text-bi-navy-900">
            {timeline.total_days} days · {steps.length} steps · {doneCount} done
            {slipCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-rose-700 text-[12px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {slipCount} slipping
              </span>
            )}
            {slipCount === 0 && doneCount === steps.length && (
              <span className="ml-3 inline-flex items-center gap-1 text-emerald-700 text-[12px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-bi-navy-500">
            {fmt(timeline.start_date)} → {fmt(timeline.end_date)}
          </span>
          <button
            onClick={generate}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Regenerate
          </button>
        </div>
      </header>
      <div className="overflow-auto">
        <div className="min-w-[800px] py-2">
          {steps.map((s) => {
            const sMs = new Date(s.scheduled_start).getTime();
            const eMs = new Date(s.scheduled_end).getTime();
            const left = ((sMs - startMs) / totalMs) * 100;
            const width = Math.max(1.5, ((eMs - sMs) / totalMs) * 100);
            const slipping =
              s.status !== "done" && new Date(s.scheduled_end).getTime() < Date.now();
            const color = STEP_COLORS[s.step_kind];
            const isCourseLevel = !s.lesson_id;
            const lessonTitle = s.lesson_id ? (lessonById[s.lesson_id]?.title ?? "Lesson") : null;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2 px-3 py-1 hover:bg-slate-50 ${
                  isCourseLevel ? "bg-slate-50/50 font-semibold" : ""
                }`}
              >
                <span className="w-32 text-[11px] text-slate-700 truncate shrink-0" title={lessonTitle ?? "Course"}>
                  {lessonTitle ?? "Course-level"}
                </span>
                <span className="w-20 text-[11px] text-slate-600 truncate shrink-0">
                  {STEP_LABELS[s.step_kind]}
                </span>
                <div className="flex-1 relative h-5 bg-slate-100 rounded">
                  <div
                    className={`absolute top-0 bottom-0 rounded-sm transition-all ${
                      slipping ? "ring-2 ring-rose-400" : ""
                    }`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: s.status === "done" ? "#10b981" : color,
                      opacity: s.status === "not_started" ? 0.55 : 1,
                    }}
                    title={`${STEP_LABELS[s.step_kind]} · ${s.scheduled_start} → ${s.scheduled_end} · ${s.status}`}
                  />
                </div>
                <span
                  className={`w-20 text-[10.5px] font-mono shrink-0 text-right ${
                    s.status === "done"
                      ? "text-emerald-700"
                      : slipping
                        ? "text-rose-700 font-bold"
                        : s.status === "in_progress"
                          ? "text-amber-700"
                          : "text-slate-500"
                  }`}
                >
                  {s.status === "done" ? "✓ done" : slipping ? `${daysFromNow(s.scheduled_end)}d late` : fmt(s.scheduled_end)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function daysFromNow(iso: string): number {
  return Math.abs(Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
