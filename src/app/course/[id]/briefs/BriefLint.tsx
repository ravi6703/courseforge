"use client";

// LO drift lint — runs every time a brief is opened. Surfaces warnings
// where the brief's text doesn't actually cover the lesson's LOs.

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface Finding {
  severity: "info" | "warn" | "error";
  rule: string;
  title: string;
  body: string;
}

export function BriefLint({ videoId }: { videoId: string }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/briefs/${videoId}/lint`)
      .then((r) => r.json())
      .then((j) => setFindings(j.findings ?? []))
      .finally(() => setLoading(false));
  }, [videoId]);

  if (loading) {
    return (
      <div className="text-[11.5px] text-slate-500 inline-flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" /> Linting brief vs. learning objective…
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="text-[11.5px] text-emerald-700 inline-flex items-center gap-1.5 font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5" /> Brief covers the LO cleanly.
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {findings.map((f, i) => {
        const tone =
          f.severity === "error" ? "border-rose-200 bg-rose-50 text-rose-800" :
          f.severity === "warn"  ? "border-amber-200 bg-amber-50 text-amber-800" :
                                    "border-bi-blue-200 bg-bi-blue-50 text-bi-blue-800";
        const Icon = f.severity === "info" ? Info : AlertTriangle;
        return (
          <li key={i} className={`flex items-start gap-2 px-2.5 py-1.5 rounded border ${tone}`}>
            <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] font-bold">{f.title}</div>
              <div className="text-[11px] mt-0.5 opacity-90">{f.body}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
