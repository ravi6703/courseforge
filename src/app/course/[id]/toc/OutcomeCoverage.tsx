"use client";

// Outcome coverage panel — renders a check for every course-level
// learning outcome and tells the coach whether the TOC actually
// teaches each one.

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

interface Finding {
  outcome: string;
  outcomeBloom: string;
  coveringLessons: Array<{ id: string; title: string; bloom: string }>;
  maxLessonBloom: string | null;
  status: "ok" | "uncovered" | "underbloom";
}

interface CoverageResp {
  findings: Finding[];
  courseBloomCap: string;
  summary: { total: number; uncovered: number; underbloom: number };
}

export function OutcomeCoverage({ courseId }: { courseId: string }) {
  const [data, setData] = useState<CoverageResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/outcome-coverage`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="px-4 py-2.5 cursor-pointer list-none text-[12.5px] text-slate-500 inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading outcome coverage…
        </summary>
      </details>
    );
  }

  if (!data || data.findings.length === 0) {
    return (
      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="px-4 py-2.5 cursor-pointer list-none text-[12.5px] text-slate-500">
          Outcome coverage: <span className="italic">no learning outcomes set on the Profile yet — add some to enable this check</span>
        </summary>
      </details>
    );
  }

  const { findings, summary } = data;
  const issues = summary.uncovered + summary.underbloom;
  const allOk = issues === 0;

  return (
    <details open={!allOk} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <summary className="px-4 py-2.5 cursor-pointer list-none flex items-center gap-2 hover:bg-slate-50">
        {allOk ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        )}
        <div className="flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Outcome coverage</div>
          <div className="text-[13px] font-bold text-slate-900">
            {allOk
              ? `All ${summary.total} outcomes covered at the right Bloom level.`
              : `${issues} of ${summary.total} outcomes need attention`}
          </div>
        </div>
        {!allOk && (
          <span className="inline-flex items-center gap-3 text-[11px] font-mono shrink-0">
            {summary.uncovered > 0 && <span className="text-rose-700 font-bold">{summary.uncovered} uncovered</span>}
            {summary.underbloom > 0 && <span className="text-amber-700 font-bold">{summary.underbloom} under-Bloom</span>}
          </span>
        )}
      </summary>
      <ul className="divide-y divide-slate-100 border-t border-slate-200">
        {findings.map((f, i) => (
          <li key={i} className="px-4 py-2.5 flex items-start gap-3">
            <span className="mt-1 shrink-0">
              {f.status === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {f.status === "underbloom" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              {f.status === "uncovered" && <AlertCircle className="w-4 h-4 text-rose-600" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-slate-900">{f.outcome}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                <span className="font-mono uppercase">{f.outcomeBloom}</span>
                {f.coveringLessons.length === 0 ? (
                  <span> · no covering lessons found</span>
                ) : (
                  <span> · covered by {f.coveringLessons.length} lesson{f.coveringLessons.length > 1 ? "s" : ""} (max Bloom: <span className="font-mono uppercase">{f.maxLessonBloom}</span>)</span>
                )}
              </div>
              {f.status === "underbloom" && (
                <div className="text-[11px] text-amber-700 mt-1">
                  Lessons exist but only reach <span className="font-mono uppercase">{f.maxLessonBloom}</span>. Promote a lesson to <span className="font-mono uppercase">{f.outcomeBloom}</span> or split this outcome.
                </div>
              )}
              {f.status === "uncovered" && (
                <div className="text-[11px] text-rose-700 mt-1">
                  Add a lesson covering this outcome, or remove it from the Profile.
                </div>
              )}
              {f.coveringLessons.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {f.coveringLessons.slice(0, 6).map((l) => (
                    <span key={l.id} className="text-[10.5px] bg-slate-50 border border-slate-200 px-1.5 py-px rounded text-slate-700">
                      {l.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
