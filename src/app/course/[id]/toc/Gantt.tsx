"use client";

// Gantt / project plan view — auto-generated when the TOC is locked.
//
// Coach feedback v3 (final): only show the 9 phases. No drill-down.
// Per-lesson detail is "long project management" noise. The project
// plan should be 9 horizontal bars and that's it.
//
// The underlying timeline_steps rows stay per-lesson in the DB so slip
// detection / notifications still work — but this view rolls them up
// into 9 phase bars and never exposes the per-lesson detail.

import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Calendar, AlertTriangle, CheckCircle2, RefreshCw,
} from "lucide-react";
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

const PHASE_ORDER: TimelineStepKind[] = [
  "profile", "toc", "brief", "slides", "record", "transcript", "assets", "review", "publish",
];

interface PhaseRow {
  kind: TimelineStepKind;
  steps: Step[];
  start: number;
  end: number;
  doneCount: number;
  slipCount: number;
  totalCount: number;
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
  void lessons; // kept in signature for future per-lesson drill (currently unused — phase-only view)

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

  // Roll up per-lesson steps into one row per phase kind.
  const phases: PhaseRow[] = useMemo(() => {
    if (steps.length === 0) return [];
    const byKind = new Map<TimelineStepKind, Step[]>();
    steps.forEach((s) => {
      const list = byKind.get(s.step_kind) ?? [];
      list.push(s);
      byKind.set(s.step_kind, list);
    });
    const out: PhaseRow[] = [];
    for (const kind of PHASE_ORDER) {
      const list = byKind.get(kind);
      if (!list || list.length === 0) continue;
      const start = Math.min(...list.map((s) => new Date(s.scheduled_start).getTime()));
      const end   = Math.max(...list.map((s) => new Date(s.scheduled_end).getTime()));
      const doneCount = list.filter((s) => s.status === "done").length;
      const slipCount = list.filter((s) => s.status !== "done" && new Date(s.scheduled_end).getTime() < Date.now()).length;
      out.push({
        kind,
        steps: list.slice().sort((a, b) => a.step_order - b.step_order),
        start, end, doneCount, slipCount, totalCount: list.length,
      });
    }
    return out;
  }, [steps]);

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
              Generate a phase-level timeline from your TOC. Each phase (Profile → TOC → Briefs → Slides
              → Record → Transcript → Assets → Review → Publish) gets a bar with day allocations,
              done count, and slip detection.
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

  const totalSlip = phases.reduce((s, p) => s + p.slipCount, 0);
  const totalDone = phases.reduce((s, p) => s + p.doneCount, 0);
  const totalSteps = phases.reduce((s, p) => s + p.totalCount, 0);
  const allDone = totalDone === totalSteps && totalSteps > 0;

  return (
    <section className="rounded-lg border border-bi-navy-200 bg-white">
      <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Project plan</div>
          <div className="text-[14px] font-bold text-bi-navy-900">
            {timeline.total_days} days · {phases.length} phases · {totalDone}/{totalSteps} steps done
            {totalSlip > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-rose-700 text-[12px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {totalSlip} slipping
              </span>
            )}
            {allDone && (
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
        <div className="min-w-[640px]">
          {phases.map((p) => {
            const phaseSlipping = p.slipCount > 0;
            const phaseDone = p.doneCount === p.totalCount && p.totalCount > 0;
            const left = ((p.start - startMs) / totalMs) * 100;
            const width = Math.max(2, ((p.end - p.start) / totalMs) * 100);
            const color = STEP_COLORS[p.kind];
            const labelDate = fmt(new Date(p.end).toISOString());

            return (
              <div
                key={p.kind}
                className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
              >
                <span className="w-28 text-[13px] font-bold text-slate-800 truncate shrink-0">
                  {STEP_LABELS[p.kind]}
                </span>
                <span className="w-20 text-[11px] text-slate-500 truncate shrink-0 font-mono">
                  {p.doneCount}/{p.totalCount} done
                </span>
                <div className="flex-1 relative h-7 bg-slate-100 rounded">
                  <div
                    className={`absolute top-0 bottom-0 rounded-sm transition-all ${
                      phaseSlipping ? "ring-2 ring-rose-400" : ""
                    }`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: phaseDone ? "#10b981" : color,
                      opacity: 0.95,
                    }}
                    title={`${STEP_LABELS[p.kind]} · ${fmt(new Date(p.start).toISOString())} → ${fmt(new Date(p.end).toISOString())} · ${p.doneCount}/${p.totalCount} done${p.slipCount ? ` · ${p.slipCount} slipping` : ""}`}
                  />
                </div>
                <span
                  className={`w-24 text-[11px] font-mono shrink-0 text-right ${
                    phaseDone
                      ? "text-emerald-700 font-bold"
                      : phaseSlipping
                        ? "text-rose-700 font-bold"
                        : "text-slate-500"
                  }`}
                >
                  {phaseDone ? "✓ done" : phaseSlipping ? `${p.slipCount} late` : labelDate}
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
