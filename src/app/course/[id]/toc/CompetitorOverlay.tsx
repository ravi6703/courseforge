"use client";

// Competitor TOC overlay — paste competitor URLs, see their topics next
// to yours with overlap diff. Helps coaches answer "is this TOC really
// better?" with evidence rather than vibes.

import { useState } from "react";
import { Loader2, Search, Plus, X, ExternalLink } from "lucide-react";

interface Competitor {
  url: string;
  title: string | null;
  topics: string[];
  error: string | null;
}

export function CompetitorOverlay({ courseId, ownTopics }: { courseId: string; ownTopics: string[] }) {
  const [urls, setUrls] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[] | null>(null);

  const fetchAll = async () => {
    const filtered = urls.map((u) => u.trim()).filter(Boolean);
    if (filtered.length === 0) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/competitor-toc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: filtered }),
      });
      const j = await r.json();
      setCompetitors(j.competitors ?? []);
    } finally {
      setBusy(false);
    }
  };

  const ownTopicsLower = new Set(ownTopics.map((t) => t.toLowerCase()));
  const allTheirTopics = (competitors ?? []).flatMap((c) => c.topics);
  const theirsLower = new Set(allTheirTopics.map((t) => t.toLowerCase()));

  const onlyYours = ownTopics.filter((t) => !theirsLower.has(t.toLowerCase())).slice(0, 12);
  const onlyTheirs = allTheirTopics.filter((t) => !ownTopicsLower.has(t.toLowerCase())).slice(0, 12);

  return (
    <details className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <summary className="px-4 py-2.5 cursor-pointer list-none flex items-center gap-2 hover:bg-slate-50">
        <Search className="w-4 h-4 text-slate-500" />
        <div className="flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Competitor TOC overlay</div>
          <div className="text-[13px] font-bold text-slate-900">
            Compare your TOC against 1–3 competitor course landing pages
          </div>
        </div>
        {competitors && (
          <span className="text-[11px] text-slate-500">{competitors.length} compared</span>
        )}
      </summary>
      <div className="px-4 py-3 border-t border-slate-200 space-y-3">
        <div className="space-y-1.5">
          {urls.map((u, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={u}
                onChange={(e) => setUrls(urls.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`Competitor ${i + 1} URL`}
                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded text-[12.5px] outline-none focus:border-bi-blue-400 focus:ring-2 focus:ring-bi-blue-100"
              />
              {urls.length > 1 && (
                <button onClick={() => setUrls(urls.filter((_, j) => j !== i))} className="p-1 rounded text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          {urls.length < 3 && (
            <button
              onClick={() => setUrls([...urls, ""])}
              className="text-[11.5px] font-semibold text-bi-blue-700 inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add another
            </button>
          )}
        </div>

        <button
          onClick={fetchAll}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-600 text-white text-[12.5px] font-semibold hover:bg-bi-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Fetch & compare
        </button>

        {competitors && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-emerald-700">
                Topics only you have
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {onlyYours.length === 0 ? (
                  <li className="text-[11.5px] text-slate-500 italic">None — your TOC overlaps fully with competitors so far.</li>
                ) : onlyYours.map((t, i) => (
                  <li key={i} className="text-[12px] text-emerald-900 truncate">{t}</li>
                ))}
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-amber-700">
                Topics they have, you don&apos;t
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {onlyTheirs.length === 0 ? (
                  <li className="text-[11.5px] text-slate-500 italic">None — you&apos;re ahead.</li>
                ) : onlyTheirs.map((t, i) => (
                  <li key={i} className="text-[12px] text-amber-900 truncate">{t}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {competitors && competitors.some((c) => c.error) && (
          <div className="text-[11.5px] text-rose-700">
            Some URLs failed: {competitors.filter((c) => c.error).map((c) => c.url).join(", ")}
          </div>
        )}

        {competitors && competitors.length > 0 && (
          <div className="border-t border-slate-200 pt-2 mt-2">
            <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500 mb-1.5">Competitor TOCs</div>
            <ul className="space-y-1">
              {competitors.map((c) => (
                <li key={c.url} className="text-[11.5px] flex items-center gap-2">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-bi-blue-700 hover:underline truncate flex-1 inline-flex items-center gap-1">
                    {c.title ?? c.url} <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-slate-500">{c.topics.length} topics</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
