"use client";

// Inline AI Edit chat for the active slide. Replaces the previous
// window.prompt() one-shot call with a real chat panel that:
//   - keeps a session history of prompts in the right rail
//   - shows a per-attempt "applying…" state
//   - surfaces the rationale + outcome inline
//
// Per-slide rewrite goes through /api/ppt/by-video/[videoId]/rewrite
// with a slide-scoped instruction. After a successful rewrite the
// caller refreshes the slide from the server.

import { useState } from "react";
import { Loader2, Send, Sparkles, Wand2 } from "lucide-react";

interface ChatTurn {
  prompt: string;
  status: "running" | "done" | "error";
  error?: string;
}

const QUICK_ACTIONS = [
  { label: "Tighten bullets", prompt: "Tighten every bullet to one line. Cut filler. Keep meaning." },
  { label: "More concrete",   prompt: "Replace abstract bullets with concrete examples or numbers." },
  { label: "Add a callout",   prompt: "Add a callout for the most common mistake learners make on this topic." },
];

export function SlideAiEdit({
  videoId, slideNumber, onApplied,
}: {
  videoId: string;
  slideNumber: number;
  onApplied: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);

  const send = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const turn: ChatTurn = { prompt: trimmed, status: "running" };
    setHistory((h) => [turn, ...h]);
    setBusy(true);
    try {
      const res = await fetch(`/api/ppt/by-video/${videoId}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: `[Slide ${slideNumber} only] ${trimmed}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setHistory((h) => h.map((t, i) => i === 0 ? { ...t, status: "error", error: data.error ?? `HTTP ${res.status}` } : t));
        return;
      }
      setHistory((h) => h.map((t, i) => i === 0 ? { ...t, status: "done" } : t));
      await onApplied();
      setDraft("");
    } catch (e) {
      setHistory((h) => h.map((t, i) => i === 0 ? { ...t, status: "error", error: (e as Error).message } : t));
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden flex flex-col h-full">
      <header className="px-3.5 py-2.5 border-b border-bi-navy-100 flex items-center gap-1.5">
        <Wand2 className="w-3.5 h-3.5 text-bi-blue-700" />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-bi-navy-700">AI edit · slide {slideNumber}</span>
      </header>

      {/* Quick actions */}
      <div className="px-3 py-2 border-b border-bi-navy-100 flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.label}
            onClick={() => send(a.prompt)}
            disabled={busy}
            className="text-[10.5px] px-2 py-1 rounded-md border border-bi-navy-200 text-bi-navy-700 hover:bg-bi-navy-50 disabled:opacity-50"
          >{a.label}</button>
        ))}
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
        {history.length === 0 ? (
          <p className="text-[11.5px] text-bi-navy-500 italic">
            Tell the AI what to change about <strong>just this slide</strong>. Quick actions above, or write your own below.
          </p>
        ) : history.map((t, i) => (
          <div key={i} className="rounded-md border border-bi-navy-100 bg-bi-navy-50/40 p-2">
            <div className="text-[12px] text-bi-navy-800 leading-snug">{t.prompt}</div>
            <div className="mt-1 text-[10.5px] inline-flex items-center gap-1">
              {t.status === "running" && <span className="text-bi-blue-700 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> applying…</span>}
              {t.status === "done"    && <span className="text-emerald-700">✓ applied</span>}
              {t.status === "error"   && <span className="text-red-700" title={t.error}>✗ {t.error ?? "error"}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="p-2 border-t border-bi-navy-100">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(draft); }}
            placeholder="e.g. add a chart placeholder"
            rows={2}
            className="flex-1 text-[12px] border border-bi-navy-200 rounded p-2 outline-none focus:border-bi-blue-400 focus:ring-1 focus:ring-bi-blue-100 resize-none"
          />
          <button
            onClick={() => send(draft)}
            disabled={busy || !draft.trim()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[11.5px] font-semibold hover:bg-bi-blue-200 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Send
          </button>
        </div>
        <p className="text-[10px] text-bi-navy-400 mt-1.5 inline-flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" /> ⌘↵ to send · for deck-wide rewrites use Tone in the tracker
        </p>
      </div>
    </div>
  );
}
