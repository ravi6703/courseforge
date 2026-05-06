"use client";

// Multi-target export — pick targets, queue them all in one click.

import { useEffect, useState } from "react";
import { Loader2, Download, CheckCircle2, AlertTriangle } from "lucide-react";

const TARGETS: Array<{ id: string; label: string; what: string }> = [
  { id: "scorm12",       label: "SCORM 1.2",      what: "Most LMS-compatible" },
  { id: "scorm2004",     label: "SCORM 2004",     what: "Modern LMS" },
  { id: "coursera",      label: "Coursera",       what: "Direct upload package" },
  { id: "xapi",          label: "xAPI",           what: "Tin-Can analytics" },
  { id: "mp4",           label: "MP4 bundle",     what: "Raw videos zipped" },
  { id: "landing_md",    label: "Landing page",   what: "Markdown for marketing" },
  { id: "linkedin_post", label: "LinkedIn post",  what: "Launch announcement draft" },
];

interface ExportRow {
  id: string;
  target: string;
  status: string;
  artifact_url: string | null;
  error: string | null;
  created_at: string;
}

export function MultiTargetExport({ courseId }: { courseId: string }) {
  const [picked, setPicked] = useState<Set<string>>(new Set(["scorm12", "coursera", "landing_md"]));
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ExportRow[]>([]);

  const load = async () => {
    const r = await fetch(`/api/courses/${courseId}/multi-export`);
    if (r.ok) {
      const j = await r.json();
      setHistory(j.exports ?? []);
    }
  };
  useEffect(() => { load(); }, [courseId]);

  const queue = async () => {
    setBusy(true);
    try {
      await fetch(`/api/courses/${courseId}/multi-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: Array.from(picked) }),
      });
      await load();
    } finally { setBusy(false); }
  };

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicked(next);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="px-4 py-3 border-b border-slate-200">
        <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Multi-target export</div>
        <div className="text-[14px] font-bold text-slate-900">Queue every export from one place</div>
      </header>
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {TARGETS.map((t) => {
            const on = picked.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={`text-left p-2.5 rounded-md border transition-all ${
                  on ? "bg-bi-blue-100 border-bi-blue-300 text-bi-blue-900" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="text-[12.5px] font-bold">{t.label}</div>
                <div className={`text-[10.5px] mt-0.5 ${on ? "text-bi-blue-700" : "text-slate-500"}`}>{t.what}</div>
              </button>
            );
          })}
        </div>
        <button
          onClick={queue}
          disabled={busy || picked.size === 0}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-600 text-white text-[12.5px] font-semibold hover:bg-bi-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Queue {picked.size} export{picked.size === 1 ? "" : "s"}
        </button>
      </div>
      {history.length > 0 && (
        <div className="border-t border-slate-200">
          <div className="px-4 py-2 text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Recent</div>
          <ul className="divide-y divide-slate-100">
            {history.slice(0, 6).map((h) => (
              <li key={h.id} className="px-4 py-2 flex items-center gap-3 text-[12px]">
                <span className="font-mono text-slate-700 w-32">{h.target}</span>
                <span className="text-slate-500 text-[11px] flex-1">{new Date(h.created_at).toLocaleString()}</span>
                {h.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> :
                 h.status === "error" ? <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> :
                                         <Loader2 className="w-3.5 h-3.5 animate-spin text-bi-blue-600" />}
                {h.artifact_url && <a href={h.artifact_url} className="text-bi-blue-700 font-semibold hover:underline" download>Download</a>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
