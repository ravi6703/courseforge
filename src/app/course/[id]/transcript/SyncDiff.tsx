"use client";

// Sync diff panel — shows transcript sentences that drifted from the
// slide-deck speaker_notes (improvised) and script lines that the
// speaker skipped (missing).

import { useEffect, useState } from "react";
import { Loader2, GitCompare, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DiffResp {
  summary: { improvised: number; missing: number; scriptSentenceCount: number; transcriptSentenceCount: number };
  improvised: Array<{ kind: "improvised"; text: string }>;
  missing: Array<{ kind: "missing"; text: string }>;
}

export function SyncDiff({ transcriptId }: { transcriptId: string }) {
  const [data, setData] = useState<DiffResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/transcript/${transcriptId}/sync-diff`);
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  };

  return (
    <details
      open={opened}
      onToggle={(e) => {
        const o = (e.currentTarget as HTMLDetailsElement).open;
        setOpened(o);
        if (o && !data) load();
      }}
      className="rounded-lg border border-slate-200 bg-white"
    >
      <summary className="px-3 py-2 cursor-pointer list-none flex items-center gap-2 hover:bg-slate-50">
        <GitCompare className="w-3.5 h-3.5 text-purple-600" />
        <span className="text-[12px] font-bold text-slate-900">Talk-track ↔ slides sync diff</span>
        {data && (
          <span className="ml-auto text-[10.5px] font-mono text-slate-500">
            {data.summary.improvised} improvised · {data.summary.missing} skipped
          </span>
        )}
      </summary>
      <div className="px-3 py-2 border-t border-slate-200 space-y-2">
        {loading && <div className="text-[11.5px] text-slate-500 inline-flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Comparing…</div>}
        {data && data.summary.improvised === 0 && data.summary.missing === 0 && (
          <div className="text-[11.5px] text-emerald-700 inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Talk-track matches the script.</div>
        )}
        {data && data.improvised.length > 0 && (
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-amber-700 mb-1">Improvised (in talk, not in script)</div>
            <ul className="space-y-1">
              {data.improvised.map((d, i) => (
                <li key={i} className="text-[11.5px] text-slate-800 px-2 py-1 rounded bg-amber-50 border border-amber-100">
                  <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-700" />
                  {d.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data && data.missing.length > 0 && (
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-rose-700 mb-1">Skipped (in script, not in talk)</div>
            <ul className="space-y-1">
              {data.missing.map((d, i) => (
                <li key={i} className="text-[11.5px] text-slate-800 px-2 py-1 rounded bg-rose-50 border border-rose-100">
                  <AlertTriangle className="w-3 h-3 inline mr-1 text-rose-700" />
                  {d.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
