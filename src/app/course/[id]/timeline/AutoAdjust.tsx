"use client";

// Auto-adjust button — shifts all downstream slipping steps in one click.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wrench } from "lucide-react";

export function AutoAdjust({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ shiftedCount: number; slipDays: number; newEndDate?: string; message?: string } | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/course/${courseId}/timeline/auto-adjust`, { method: "POST" });
      if (r.ok) {
        const j = await r.json();
        setResult(j);
        if (j.shiftedCount > 0) router.refresh();
      }
    } finally { setBusy(false); }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 flex items-start gap-3">
      <Wrench className="w-4 h-4 text-amber-600 mt-0.5" />
      <div className="flex-1">
        <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Auto-adjust on slip</div>
        <div className="text-[13px] font-bold text-slate-900">Shift downstream steps to absorb a slip</div>
        <p className="text-[12px] text-slate-600 mt-1">
          Detects the worst slipping step and pushes every later step out by the same number of days.
          The course deadline shifts with it.
        </p>
        {result && (
          <div className={`text-[12px] font-semibold mt-1.5 ${result.shiftedCount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
            {result.message ?? `Shifted ${result.shiftedCount} step${result.shiftedCount === 1 ? "" : "s"} by ${result.slipDays}d. New end: ${result.newEndDate}.`}
          </div>
        )}
      </div>
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 text-white text-[12.5px] font-semibold hover:bg-amber-700 disabled:opacity-50 shrink-0"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
        Auto-adjust
      </button>
    </section>
  );
}
