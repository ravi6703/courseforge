"use client";

// Smart cuts panel — fetches AI-detected fillers/restarts/long-pauses
// from the recording's transcript and lets the coach approve them.

import { useEffect, useState } from "react";
import { Loader2, Scissors, CheckCircle2 } from "lucide-react";

interface Cut {
  id: string;
  startSec: number;
  endSec: number;
  reason: "filler" | "restart" | "long_pause";
  preview: string;
}

export function SmartCuts({ recordingId }: { recordingId: string }) {
  const [cuts, setCuts] = useState<Cut[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/recordings/${recordingId}/smart-cuts`)
      .then((r) => r.json())
      .then((j) => {
        setCuts(j.cuts ?? []);
        setPicked(new Set((j.cuts ?? []).map((c: Cut) => c.id)));
      })
      .finally(() => setLoading(false));
  }, [recordingId]);

  const save = async () => {
    if (!cuts) return;
    setSaving(true);
    try {
      const subset = cuts.filter((c) => picked.has(c.id));
      await fetch(`/api/recordings/${recordingId}/smart-cuts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuts: subset }),
      });
      setSavedCount(subset.length);
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="px-3 py-2 text-[11.5px] text-slate-500 inline-flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" /> Detecting smart cuts…
      </div>
    );
  }

  if (!cuts || cuts.length === 0) {
    return (
      <div className="px-3 py-2 text-[11.5px] text-emerald-700 inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" /> Clean take — no fillers or long pauses detected.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <header className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-[11.5px] font-bold text-slate-900">{cuts.length} suggested cut{cuts.length > 1 ? "s" : ""}</span>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600 text-white text-[11px] font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scissors className="w-3 h-3" />}
          Save {picked.size} cut{picked.size === 1 ? "" : "s"}
        </button>
      </header>
      <ul className="divide-y divide-slate-100 max-h-64 overflow-auto">
        {cuts.map((c) => (
          <li key={c.id} className="px-3 py-1.5 flex items-start gap-2 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={picked.has(c.id)}
              onChange={(e) => {
                const next = new Set(picked);
                if (e.target.checked) next.add(c.id); else next.delete(c.id);
                setPicked(next);
              }}
              className="mt-1 accent-purple-600"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] font-mono text-slate-500">
                {fmt(c.startSec)} → {fmt(c.endSec)} · <span className="uppercase font-bold">{c.reason}</span>
              </div>
              <div className="text-[11.5px] text-slate-700 truncate">{c.preview}</div>
            </div>
          </li>
        ))}
      </ul>
      {savedCount !== null && (
        <div className="px-3 py-2 text-[11px] text-emerald-700 border-t border-slate-100">
          Saved {savedCount} cut{savedCount === 1 ? "" : "s"} to recording metadata.
        </div>
      )}
    </div>
  );
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}
