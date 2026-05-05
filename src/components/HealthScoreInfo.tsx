"use client";

// Small popover that explains how the Health Score is calculated. The
// real grading rules live in src/lib/health-score/grade.ts and the rule
// catalog in RULE_LABELS — this component renders them as a checklist
// so anyone hovering the dashboard KPI knows what they're looking at.

import { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";
import { RULE_LABELS } from "@/lib/health-score/grade";

const GRADE_BANDS: Array<{ band: string; range: string; label: string }> = [
  { band: "A", range: "90–100", label: "Excellent" },
  { band: "B", range: "80–89",  label: "Strong" },
  { band: "C", range: "70–79",  label: "Adequate" },
  { band: "D", range: "60–69",  label: "Needs work" },
  { band: "F", range: "< 60",   label: "Below standard" },
];

export function HealthScoreInfo({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[11px] text-bi-navy-500 hover:text-bi-navy-900 font-medium"
        aria-expanded={open}
        aria-label="How is the health score calculated?"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        {!compact && <span>How is this calculated?</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-[360px] bg-white border border-bi-navy-200 rounded-lg shadow-xl p-4 text-left">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Health score</div>
              <h3 className="text-[14px] font-bold text-bi-navy-900">How we grade a course</h3>
            </div>
            <button onClick={() => setOpen(false)} className="text-bi-navy-400 hover:text-bi-navy-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[12px] text-bi-navy-600 leading-relaxed">
            We start at 100 and deduct points for each pedagogy-lint rule that
            doesn&apos;t pass. The result is averaged across modules and capped at 0–100.
          </p>

          <div className="mt-3">
            <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500 mb-1">Grade bands</div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {GRADE_BANDS.map((g) => (
                <div key={g.band} className="rounded-md border border-bi-navy-100 px-1 py-1">
                  <div className="text-[14px] font-extrabold text-bi-navy-900">{g.band}</div>
                  <div className="text-[10px] text-bi-navy-500">{g.range}</div>
                  <div className="text-[10px] text-bi-navy-700">{g.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500 mb-1">Rules we check</div>
            <ul className="space-y-1.5">
              {Object.entries(RULE_LABELS).map(([k, r]) => (
                <li key={k} className="text-[11.5px] leading-snug">
                  <span className="font-semibold text-bi-navy-900">{r.title}.</span>{" "}
                  <span className="text-bi-navy-600">{r.what}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-bi-navy-500 mt-3 pt-2 border-t border-bi-navy-100">
            The actual score for a course is computed by <code className="px-1 rounded bg-bi-navy-50 text-[10.5px]">/api/lint</code>; the
            dashboard average uses a stable placeholder until each course is linted.
          </p>
        </div>
      )}
    </div>
  );
}
