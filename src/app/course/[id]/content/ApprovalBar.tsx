"use client";

// Sticky bottom bar on the per-artifact panel — shows last edit, item status,
// and the three terminal actions (Reject / Re-generate / Approve). All three
// hit existing endpoints; no new server work.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, RotateCcw } from "lucide-react";

export function ApprovalBar({
  itemId,
  status,
  approvedAt,
  generatedAt,
  videoId,
  kind,
  onChanged,
}: {
  itemId: string | null;
  status: string;          // 'draft' | 'approved' | 'missing'
  approvedAt: string | null;
  generatedAt: string | null;
  videoId: string;
  kind: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<"approve" | "reject" | "regen" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => startTransition(() => {
    onChanged?.();
    router.refresh();
  });

  const setStatus = async (next: "approved" | "draft") => {
    if (!itemId) return;
    setBusy(next === "approved" ? "approve" : "reject");
    setError(null);
    try {
      const res = await fetch(`/api/content/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
  };

  const regenerate = async () => {
    setBusy("regen");
    setError(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, kind }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
  };

  const isApproved = status === "approved";
  const noItem = status === "missing" || !itemId;

  return (
    <div className="mt-3">
      {error && (
        <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {error}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="text-xs text-slate-600 min-w-0 truncate">
          {noItem
            ? <>Not generated yet</>
            : isApproved
              ? <>Approved <span className="text-slate-400">·</span> {approvedAt ? new Date(approvedAt).toLocaleString() : ""}</>
              : <>Draft <span className="text-slate-400">·</span> generated {generatedAt ? new Date(generatedAt).toLocaleString() : ""}</>
          }
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!noItem && (
            <button
              onClick={regenerate}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white border border-slate-200 rounded disabled:opacity-50"
            >
              {busy === "regen" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Re-generate
            </button>
          )}
          {isApproved && (
            <button
              onClick={() => setStatus("draft")}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white border border-slate-200 rounded disabled:opacity-50"
            >
              {busy === "reject" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Unapprove
            </button>
          )}
          {!noItem && !isApproved && (
            <button
              onClick={() => setStatus("approved")}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded disabled:opacity-50"
            >
              {busy === "approve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Approve
            </button>
          )}
          {noItem && (
            <button
              onClick={regenerate}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-bi-navy-700 hover:bg-bi-navy-800 rounded disabled:opacity-50"
            >
              {busy === "regen" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Generate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
