"use client";

// Pre-flight scorecard — single score + 3 sub-scores + finding list,
// with "auto-fix" buttons for fixable items.

import { useEffect, useState } from "react";
import { Loader2, Shield, Wrench, AlertCircle, CheckCircle2 } from "lucide-react";

interface Finding {
  category: "wcag" | "completeness" | "brand";
  severity: "info" | "warn" | "error";
  rule: string;
  title: string;
  body: string;
  autoFixable: boolean;
}
interface Scorecard {
  overall: number;
  wcag: number;
  completeness: number;
  brand: number;
  findings: Finding[];
}

export function PreflightScorecard({ courseId }: { courseId: string }) {
  const [data, setData] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinning, setPinning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/preflight`);
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [courseId]);

  const pin = async () => {
    setPinning(true);
    try { await fetch(`/api/courses/${courseId}/preflight`, { method: "POST" }); }
    finally { setPinning(false); }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-[12.5px] text-slate-500 py-3">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running pre-flight…
      </div>
    );
  }

  const tone =
    data.overall >= 90 ? "emerald" :
    data.overall >= 70 ? "amber" :
                          "rose";
  const TONE_BG = { emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200", amber: "bg-amber-50 text-amber-700 ring-amber-200", rose: "bg-rose-50 text-rose-700 ring-rose-200" }[tone];
  const TONE_FG = { emerald: "text-emerald-700", amber: "text-amber-700", rose: "text-rose-700" }[tone];

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 flex-wrap">
        <Shield className="w-4 h-4 text-bi-blue-600" />
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Pre-flight scorecard</div>
          <div className="text-[14px] font-bold text-slate-900">Course readiness check</div>
        </div>
        <div className={`inline-flex items-baseline gap-1 px-3 py-1 rounded-full ring-1 ${TONE_BG}`}>
          <span className="text-[10.5px] font-bold uppercase tracking-wider">Overall</span>
          <span className="text-[18px] font-extrabold tabular-nums">{data.overall}</span>
        </div>
        <button
          onClick={pin}
          disabled={pinning}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {pinning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
          Pin score
        </button>
      </header>
      <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-slate-200">
        <ScoreTile label="WCAG / Accessibility" value={data.wcag} />
        <ScoreTile label="Completeness"          value={data.completeness} />
        <ScoreTile label="Brand compliance"      value={data.brand} />
      </div>
      {data.findings.length === 0 ? (
        <div className="px-4 py-4 text-[12.5px] text-emerald-700 inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Clean pre-flight. Ready to publish.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.findings.map((f, i) => (
            <li key={i} className="px-4 py-2.5 flex items-start gap-3">
              <AlertCircle className={`w-4 h-4 mt-0.5 ${f.severity === "error" ? "text-rose-600" : f.severity === "warn" ? "text-amber-600" : "text-slate-500"} ${TONE_FG}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-slate-900">{f.title}</div>
                <div className="text-[11.5px] text-slate-600 mt-0.5">{f.body}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono uppercase tracking-wider">
                  {f.category} · {f.rule}
                </div>
              </div>
              {f.autoFixable && (
                <button
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-purple-200 bg-purple-50 text-purple-700 text-[11px] font-bold hover:bg-purple-100"
                  title="Auto-fix queued — a future job will run the rewrite"
                >
                  <Wrench className="w-3 h-3" /> Auto-fix
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  const tone = value >= 90 ? "emerald" : value >= 70 ? "amber" : "rose";
  const COLOR = { emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500" }[tone];
  const FG    = { emerald: "text-emerald-700", amber: "text-amber-700", rose: "text-rose-700" }[tone];
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider font-bold text-slate-500">{label}</div>
      <div className={`text-[20px] font-extrabold tabular-nums ${FG}`}>{value}</div>
      <div className="h-1 mt-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${COLOR}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
