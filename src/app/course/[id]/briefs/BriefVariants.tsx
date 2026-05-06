"use client";

// Brief A/B variants — generates 2 stylistic variants side-by-side and
// lets the coach commit one as the canonical brief in a single click.

import { useState } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";

interface Variant {
  label: "A" | "B";
  format: string;
  payload: Record<string, unknown>;
}

export function BriefVariants({ videoId, onPicked }: { videoId: string; onPicked?: () => void }) {
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<"A" | "B" | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/briefs/${videoId}/variants`, { method: "POST" });
      if (r.ok) {
        const j = await r.json();
        setVariants(j.variants ?? []);
      }
    } finally { setBusy(false); }
  };

  const pick = async (label: "A" | "B") => {
    setPicking(label);
    try {
      await fetch(`/api/briefs/${videoId}/variants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picked: label }),
      });
      onPicked?.();
    } finally { setPicking(null); }
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-bi-blue-600" />
        <div className="flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">A/B variants</div>
          <div className="text-[12px] text-slate-700">Generate 2 stylistic versions. Pick the better one with one click.</div>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-bi-blue-600 text-white text-[11.5px] font-semibold hover:bg-bi-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Generate variants
        </button>
      </div>
      {variants && (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-200">
          {variants.map((v) => (
            <div key={v.label} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Variant {v.label}</span>
                  <span className="ml-2 text-[10.5px] text-slate-500 font-mono">{v.format.replace(/_/g, " ")}</span>
                </div>
                <button
                  onClick={() => pick(v.label)}
                  disabled={picking === v.label}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {picking === v.label ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Use this
                </button>
              </div>
              <pre className="text-[10.5px] bg-slate-50 border border-slate-200 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono">
{JSON.stringify(v.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
