"use client";

// AI Edit chat panel.
//
// Sits in the right rail of the Content workspace. Coach types a plain-English
// instruction, gets back a unified diff + rationale, can Accept (writes the
// row + records a revision) or Reject (drops it). Past revisions are listed
// with one-click Revert.

import { useEffect, useState } from "react";
import { Send, Loader2, Check, X, RotateCcw, Sparkles } from "lucide-react";

interface Revision {
  id: string;
  prompt: string;
  diff_text: string | null;
  status: "accepted" | "reverted" | "rejected";
  created_at: string;
}

interface PendingDiff {
  prompt: string;
  rationale: string;
  diff_text: string;
  next_payload: Record<string, unknown>;
}

export function AiEditPanel({
  contentItemId, onApplied,
}: {
  contentItemId: string | null;
  onApplied?: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<"send" | "accept" | "revert" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDiff | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);

  useEffect(() => {
    if (!contentItemId) return;
    fetch(`/api/content/${contentItemId}/ai-edit`)
      .then((r) => r.ok ? r.json() : { revisions: [] })
      .then((d) => setRevisions(d.revisions ?? []))
      .catch(() => {});
  }, [contentItemId]);

  if (!contentItemId) {
    return (
      <div className="bg-white border border-bi-navy-100 rounded-[10px] overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-bi-navy-100 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-bi-accent-600" />
          <span className="text-[10.5px] font-bold uppercase tracking-[.05em] text-bi-navy-700">AI Edit</span>
        </div>
        <p className="p-3.5 text-[12px] text-bi-navy-500 leading-relaxed">
          Generate this artifact first, then describe edits in plain English to refine it.
        </p>
      </div>
    );
  }

  const send = async () => {
    if (!prompt.trim()) return;
    setBusy("send");
    setError(null);
    try {
      const res = await fetch(`/api/content/${contentItemId}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? `HTTP ${res.status}`);
      else setPending({ prompt: data.prompt, rationale: data.rationale, diff_text: data.diff_text, next_payload: data.next_payload });
    } catch (e) { setError((e as Error).message); }
    setBusy(null);
  };

  const accept = async () => {
    if (!pending) return;
    setBusy("accept");
    try {
      const res = await fetch(`/api/content/${contentItemId}/ai-edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          prompt: pending.prompt,
          diff_text: pending.diff_text,
          next_payload: pending.next_payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? `HTTP ${res.status}`);
      else {
        setRevisions((r) => [{ id: data.revision.id, prompt: pending.prompt, diff_text: pending.diff_text, status: "accepted", created_at: data.revision.created_at }, ...r]);
        setPending(null);
        setPrompt("");
        onApplied?.();
      }
    } catch (e) { setError((e as Error).message); }
    setBusy(null);
  };

  const reject = () => { setPending(null); setError(null); };

  const revert = async (revisionId: string) => {
    setBusy("revert");
    try {
      const res = await fetch(`/api/content/${contentItemId}/ai-edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert", revision_id: revisionId }),
      });
      if (res.ok) {
        setRevisions((r) => r.map((x) => x.id === revisionId ? { ...x, status: "reverted" } : x));
        onApplied?.();
      }
    } finally { setBusy(null); }
  };

  return (
    <div className="bg-white border border-bi-navy-100 rounded-[10px] overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-bi-navy-100 flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-[.05em] text-bi-navy-700 inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-bi-accent-600" />
          AI Edit
        </span>
        <span className="text-[10px] text-bi-navy-500 font-medium">{revisions.length} revision{revisions.length === 1 ? "" : "s"}</span>
      </div>

      {/* Pending diff */}
      {pending && (
        <div className="border-b border-bi-navy-100 p-3 bg-bi-blue-50/40">
          <div className="text-[11px] text-bi-navy-700 italic mb-1.5">{pending.rationale}</div>
          <pre className="text-[10.5px] font-mono whitespace-pre-wrap bg-white border border-bi-navy-100 rounded p-2 max-h-48 overflow-auto">
{pending.diff_text.split("\n").map((line, i) => {
  const cls = line.startsWith("+") ? "text-emerald-700 bg-emerald-50"
            : line.startsWith("-") ? "text-red-700 bg-red-50"
            : "text-bi-navy-600";
  return <div key={i} className={cls}>{line}</div>;
})}
          </pre>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={accept}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white text-[11.5px] font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === "accept" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Accept
            </button>
            <button
              onClick={reject}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-bi-navy-200 text-bi-navy-700 text-[11.5px] font-semibold hover:bg-bi-navy-50"
            >
              <X className="w-3 h-3" /> Reject
            </button>
          </div>
        </div>
      )}

      {/* Prompt input */}
      {!pending && (
        <div className="p-3 border-b border-bi-navy-100">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Describe an edit in plain English. e.g. 'Tighten talking points to one line each' or 'Add an example using a SaaS product'"
            className="w-full text-[12.5px] border border-bi-navy-200 rounded p-2 outline-none focus:border-bi-blue-400 focus:ring-1 focus:ring-bi-blue-100 resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
          />
          {error && <p className="text-[11px] text-red-700 mt-1">{error}</p>}
          <button
            onClick={send}
            disabled={busy !== null || !prompt.trim()}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-navy-900 text-white text-[12px] font-semibold hover:bg-bi-navy-800 disabled:opacity-40"
          >
            {busy === "send" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Send (⌘↵)
          </button>
        </div>
      )}

      {/* Revision history */}
      <div className="p-3 max-h-56 overflow-auto">
        <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-bi-navy-500 mb-1.5">History</div>
        {revisions.length === 0 ? (
          <div className="text-[11px] text-bi-navy-400 italic">No edits yet.</div>
        ) : (
          <ul className="space-y-1.5">
            {revisions.map((r) => (
              <li key={r.id} className="text-[11.5px] flex items-start gap-1.5">
                <span className={`shrink-0 mt-0.5 inline-block w-1.5 h-1.5 rounded-full ${
                  r.status === "accepted" ? "bg-emerald-500" : r.status === "reverted" ? "bg-bi-navy-300" : "bg-red-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-bi-navy-700 truncate" title={r.prompt}>{r.prompt}</div>
                  <div className="text-[10px] text-bi-navy-400 mt-0.5">{new Date(r.created_at).toLocaleString()} · {r.status}</div>
                </div>
                {r.status === "accepted" && (
                  <button
                    onClick={() => revert(r.id)}
                    disabled={busy !== null}
                    className="text-[10px] text-bi-navy-500 hover:text-bi-navy-900 inline-flex items-center gap-0.5 shrink-0"
                    title="Revert to before this edit"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> revert
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
