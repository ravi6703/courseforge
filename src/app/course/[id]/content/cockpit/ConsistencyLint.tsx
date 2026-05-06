"use client";

// Cross-lesson consistency lint — surfaces structural quality bugs.

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface Finding {
  severity: "info" | "warn" | "error";
  rule: string;
  title: string;
  body: string;
  lessonIds: string[];
}

export function ConsistencyLint({ courseId }: { courseId: string }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [openOnce, setOpenOnce] = useState(false);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/consistency-lint`)
      .then((r) => r.json())
      .then((j) => setFindings(j.findings ?? []))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11.5px] text-slate-500 inline-flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" /> Running consistency lint…
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] text-emerald-700 inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" /> No cross-lesson consistency issues found.
      </div>
    );
  }

  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.filter((f) => f.severity === "warn").length;

  return (
    <details
      open={!openOnce}
      onToggle={(e) => setOpenOnce(!(e.currentTarget as HTMLDetailsElement).open)}
      className="rounded-lg border border-slate-200 bg-white"
    >
      <summary className="px-3 py-2 cursor-pointer list-none flex items-center gap-2 hover:bg-slate-50">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-[12px] font-bold text-slate-900">Cross-lesson consistency</span>
        <span className="ml-auto text-[10.5px] font-mono text-slate-500">
          {errors > 0 && <span className="text-rose-700 font-bold mr-2">{errors} errors</span>}
          {warns > 0 && <span className="text-amber-700 font-bold mr-2">{warns} warns</span>}
          {findings.length} total
        </span>
      </summary>
      <ul className="divide-y divide-slate-100 border-t border-slate-200">
        {findings.map((f, i) => {
          const Icon = f.severity === "info" ? Info : AlertTriangle;
          const tone =
            f.severity === "error" ? "text-rose-700" :
            f.severity === "warn"  ? "text-amber-700" :
                                      "text-slate-500";
          return (
            <li key={i} className="px-3 py-2 flex items-start gap-2">
              <Icon className={`w-3.5 h-3.5 mt-0.5 ${tone}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-slate-900">{f.title}</div>
                <div className="text-[11px] text-slate-600 mt-0.5">{f.body}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono uppercase tracking-wider">
                  {f.rule} · {f.lessonIds.length} lesson{f.lessonIds.length === 1 ? "" : "s"}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
