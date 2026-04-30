"use client";

// src/components/CourseHealthPanel.tsx — wedge feature UI.
//
// Polls /api/lint and shows a pedagogy health card on any course tab. The
// PM dashboard and the Final Review tab should both mount this.
//
// Why this is the wedge: nobody else's course tool grades the *quality* of the
// course before publish. This is what an instructional designer pays for.

import { useEffect, useState } from "react";

type Severity = "critical" | "warning" | "info";

type Finding = {
  id: string;
  severity: Severity;
  rule: string;
  message: string;
  target_type: string;
  target_id?: string;
  suggestion?: string;
};

type Report = {
  score: number;
  findings: Finding[];
  by_severity: Record<Severity, number>;
};

const SEV_CLASS: Record<Severity, string> = {
  critical: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-slate-50 border-slate-200 text-slate-700",
};

const SEV_LABEL: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

export function CourseHealthPanel({ courseId }: { courseId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Severity | "all">("all");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/lint?courseId=${courseId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => {
        if (alive) {
          setReport(r);
          setLoading(false);
        }
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [courseId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 p-4 bg-white">
        <div className="text-sm text-slate-500">Linting course…</div>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="rounded-lg border border-slate-200 p-4 bg-white">
        <div className="text-sm text-slate-500">Could not load course health.</div>
      </div>
    );
  }

  const filtered =
    filter === "all" ? report.findings : report.findings.filter((f) => f.severity === filter);

  const scoreColor =
    report.score >= 85 ? "text-emerald-700" : report.score >= 65 ? "text-amber-700" : "text-red-700";

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Course Health
          </div>
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {report.score}
            <span className="text-sm font-normal text-slate-500"> / 100</span>
          </div>
        </div>
        <div className="flex gap-1.5 text-xs">
          {(["critical", "warning", "info"] as Severity[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? "all" : s)}
              className={
                "px-2 py-1 rounded border " +
                (filter === s
                  ? "border-slate-900 font-medium "
                  : "border-slate-200 ") +
                SEV_CLASS[s]
              }
            >
              {report.by_severity[s]} {SEV_LABEL[s]}
            </button>
          ))}
        </div>
      </header>
      <ul className="divide-y divide-slate-100">
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-500">
            {filter === "all"
              ? "Nothing flagged. Course passes pedagogy checks."
              : `No ${filter} findings.`}
          </li>
        )}
        {filtered.map((f) => (
          <li key={f.id} className="px-4 py-3 flex items-start gap-3">
            <span
              className={
                "shrink-0 inline-block w-1.5 h-5 rounded-full mt-0.5 " +
                (f.severity === "critical"
                  ? "bg-red-500"
                  : f.severity === "warning"
                  ? "bg-amber-500"
                  : "bg-slate-400")
              }
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-slate-900">{f.message}</div>
              {f.suggestion && (
                <div className="text-xs text-slate-500 mt-1">→ {f.suggestion}</div>
              )}
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">
                {f.rule} · {f.target_type}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
