"use client";

// Asset Hub — once a transcript is generated, the transcript becomes the
// source for non-video assets. This panel surfaces one-click generators:
// blog post, captions/SRT, summary, quiz, study guide, social clips,
// downloadable PDF notes.
//
// Coach feedback: "purpose of transcript is creation of non-video assets
// with you. once transcript is created — it should be reflected on
// content page."

import { useState } from "react";
import {
  FileText, Subtitles, Sparkles, BookOpen, Scissors, Download, Loader2, CheckCircle2,
} from "lucide-react";

interface AssetKind {
  id: "blog" | "captions" | "summary" | "quiz" | "study_guide" | "clips" | "pdf_notes";
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  endpoint: string;
}

const ASSETS: AssetKind[] = [
  { id: "blog",        label: "Blog post",     hint: "Long-form article from the talk-track",     icon: FileText,    endpoint: "/api/transcript/{id}/asset?kind=blog" },
  { id: "captions",    label: "Captions (SRT)", hint: "Time-aligned subtitle file",                icon: Subtitles,   endpoint: "/api/transcript/{id}/asset?kind=captions" },
  { id: "summary",     label: "Summary",       hint: "1–2 paragraph executive summary",           icon: Sparkles,    endpoint: "/api/transcript/{id}/asset?kind=summary" },
  { id: "quiz",        label: "Quiz",          hint: "5–8 question check-for-understanding",      icon: BookOpen,    endpoint: "/api/transcript/{id}/asset?kind=quiz" },
  { id: "study_guide", label: "Study guide",   hint: "Notes + key terms + practice prompts",      icon: BookOpen,    endpoint: "/api/transcript/{id}/asset?kind=study_guide" },
  { id: "clips",       label: "Social clips",  hint: "30–60s highlight clips with hooks",         icon: Scissors,    endpoint: "/api/transcript/{id}/asset?kind=clips" },
  { id: "pdf_notes",   label: "PDF notes",     hint: "Designed PDF with visuals",                 icon: Download,    endpoint: "/api/transcript/{id}/asset?kind=pdf_notes" },
];

export function AssetHub({
  transcriptId,
  videoId,
}: {
  transcriptId: string;
  videoId: string;
}) {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<Record<string, string>>({});

  const generate = async (a: AssetKind) => {
    setBusy((b) => ({ ...b, [a.id]: true }));
    setErr((e) => { const { [a.id]: _drop, ...rest } = e; void _drop; return rest; });
    try {
      const url = a.endpoint.replace("{id}", transcriptId);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      if (res.ok) setDone((d) => ({ ...d, [a.id]: true }));
      else {
        const data = await res.json().catch(() => ({}));
        setErr((e) => ({ ...e, [a.id]: data.error ?? `HTTP ${res.status}` }));
      }
    } catch (e) {
      setErr((er) => ({ ...er, [a.id]: (e as Error).message }));
    } finally {
      setBusy((b) => ({ ...b, [a.id]: false }));
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-bi-blue-600" />
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Generate from this transcript</div>
          <div className="text-[12.5px] text-bi-navy-700">Spawn non-video assets one click each. They&apos;ll surface on the Content tab.</div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {ASSETS.map((a) => {
          const Icon = a.icon;
          const isBusy = busy[a.id];
          const isDone = done[a.id];
          const e = err[a.id];
          return (
            <button
              key={a.id}
              onClick={() => generate(a)}
              disabled={isBusy}
              className={`text-left p-2.5 rounded-md border transition-all ${
                isDone
                  ? "border-emerald-300 bg-emerald-50"
                  : e
                    ? "border-rose-300 bg-rose-50"
                    : "border-slate-200 hover:border-bi-blue-300 hover:bg-bi-blue-50/30"
              }`}
              title={a.hint}
            >
              <div className="flex items-center gap-1.5">
                {isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-bi-blue-600" />
                ) : isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Icon className="w-3.5 h-3.5 text-bi-navy-700" />
                )}
                <span className="text-[12px] font-bold text-bi-navy-900">{a.label}</span>
              </div>
              <div className="text-[10.5px] text-bi-navy-500 mt-1 line-clamp-2">
                {e ? <span className="text-rose-700">{e}</span> : a.hint}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
