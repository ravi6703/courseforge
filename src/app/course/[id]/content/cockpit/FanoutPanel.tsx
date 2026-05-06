"use client";

// One-click "Generate everything" panel — fires content fanout via the
// background generation_jobs queue.

import { useState } from "react";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { CONTENT_KINDS, KIND_META, type ContentKindKey } from "../types";

export function FanoutPanel({ courseId, missingCount }: { courseId: string; missingCount: number }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ queued: number; message?: string } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set(CONTENT_KINDS));

  const togglePicked = (k: string) => {
    const next = new Set(picked);
    if (next.has(k)) next.delete(k); else next.add(k);
    setPicked(next);
  };

  const run = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/fanout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kinds: Array.from(picked) }),
      });
      if (r.ok) setResult(await r.json());
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-bi-blue-600 mt-0.5" />
        <div className="flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Generate everything</div>
          <div className="text-[13.5px] font-bold text-slate-900">Fire missing artifacts as background jobs</div>
          <p className="text-[12px] text-slate-600 mt-0.5">
            Pick which kinds to generate. {missingCount} cell{missingCount === 1 ? "" : "s"} currently missing across this course.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {CONTENT_KINDS.map((k) => {
              const m = KIND_META[k as ContentKindKey];
              const on = picked.has(k);
              return (
                <button
                  key={k}
                  onClick={() => togglePicked(k)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                    on ? `${m.tone} ring-1 ring-current/30` : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >{m.label}</button>
              );
            })}
          </div>
          {result && (
            <div className={`mt-2 text-[12px] inline-flex items-center gap-1 font-semibold ${result.queued > 0 ? "text-bi-blue-700" : "text-emerald-700"}`}>
              {result.queued > 0
                ? <><AlertTriangle className="w-3.5 h-3.5" /> {result.queued} job{result.queued === 1 ? "" : "s"} queued.</>
                : <><CheckCircle2 className="w-3.5 h-3.5" /> {result.message ?? "Nothing to generate."}</>}
            </div>
          )}
        </div>
        <button
          onClick={run}
          disabled={busy || picked.size === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-600 text-white text-[12.5px] font-semibold hover:bg-bi-blue-700 disabled:opacity-50 shrink-0"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Generate everything
        </button>
      </div>
    </div>
  );
}
