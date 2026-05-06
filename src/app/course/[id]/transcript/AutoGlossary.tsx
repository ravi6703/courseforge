"use client";

// Auto-glossary panel — extract domain terms from a transcript and let
// the coach promote each one to the course profile vocabulary.

import { useState } from "react";
import { Loader2, BookOpen, Plus, Check } from "lucide-react";

export function AutoGlossary({ transcriptId, courseId }: { transcriptId: string; courseId: string }) {
  void courseId;
  const [terms, setTerms] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [promoted, setPromoted] = useState<Set<string>>(new Set());

  const run = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/transcript/${transcriptId}/auto-glossary`, { method: "POST" });
      if (r.ok) {
        const j = await r.json();
        setTerms(j.terms ?? []);
      }
    } finally { setBusy(false); }
  };

  const promote = async (term: string) => {
    // glossary_entries are upserted on extract; we look up by (course, term) to get the id.
    // To keep this client-only, we re-extract on each promote: short-circuit if already promoted.
    const r = await fetch(`/api/glossary/by-term?course=${encodeURIComponent(courseId)}&term=${encodeURIComponent(term)}`);
    if (!r.ok) return;
    const j = await r.json();
    if (!j.id) return;
    await fetch(`/api/glossary/${j.id}/promote`, { method: "POST" });
    setPromoted((p) => new Set([...p, term]));
  };

  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="px-3 py-2 cursor-pointer list-none flex items-center gap-2 hover:bg-slate-50">
        <BookOpen className="w-3.5 h-3.5 text-bi-blue-600" />
        <span className="text-[12px] font-bold text-slate-900">Auto-glossary</span>
        {terms.length > 0 && <span className="ml-auto text-[10.5px] font-mono text-slate-500">{terms.length} terms</span>}
      </summary>
      <div className="px-3 py-2 border-t border-slate-200 space-y-2">
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-bi-blue-600 text-white text-[11.5px] font-semibold hover:bg-bi-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
          Extract terms from transcript
        </button>
        {terms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {terms.map((t) => {
              const isP = promoted.has(t);
              return (
                <button
                  key={t}
                  onClick={() => promote(t)}
                  disabled={isP}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                    isP
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-bi-blue-50 hover:border-bi-blue-300"
                  }`}
                >
                  {isP ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {t}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[10.5px] text-slate-500">
          Click any term to promote it into the Course Profile vocabulary.must_include list. Future AI generations will keep using it consistently.
        </p>
      </div>
    </details>
  );
}
