"use client";

// Right pane of the Content tab v2. Receives the selected video row + the
// active artifact tab, renders the KPI strip, tab strip, per-artifact preview,
// and the approval bar. AI Edit + Suggestions side rail are P2/P3 (stubbed
// here as TODO panels so the layout intent stays visible in the code).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ContentVideoRow, ContentKindKey } from "./types";
import { CONTENT_KINDS, KIND_META, findItem } from "./types";
import { ApprovalBar } from "./ApprovalBar";
import { PreviewReading } from "./previews/PreviewReading";
import { PreviewPQ } from "./previews/PreviewPQ";
import { PreviewGQ } from "./previews/PreviewGQ";
import { PreviewSCORM } from "./previews/PreviewSCORM";
import { PreviewAICoach } from "./previews/PreviewAICoach";

interface Props {
  row: ContentVideoRow;
  activeKind: ContentKindKey;
  onKindChange: (k: ContentKindKey) => void;
}

export function VideoWorkspace({ row, activeKind, onKindChange }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [bulkBusy, setBulkBusy] = useState<"approve_ready" | "regen_all" | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const item = findItem(row, activeKind);

  const approvedCount = row.contentItems.filter((i) => i.status === "approved").length;
  const draftCount = row.contentItems.filter((i) => i.status === "draft").length;
  const missingCount = CONTENT_KINDS.length - row.contentItems.length;

  const callBulk = async (action: "approve_ready" | "regen_all") => {
    setBulkBusy(action);
    setBulkError(null);
    try {
      const res = await fetch("/api/content/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: row.videoId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBulkError(data.error ?? `HTTP ${res.status}`);
      } else if (action === "regen_all" && Array.isArray(data.regenerate)) {
        // Fire each regeneration from the browser — Vercel cancels server
        // background fetches when the function returns. We sequence them
        // to keep AI cost predictable; failures are surfaced as a count.
        let failed = 0;
        for (const job of data.regenerate as Array<{ video_id: string; kind: string }>) {
          try {
            const r = await fetch("/api/content/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ video_id: job.video_id, kind: job.kind }),
            });
            if (!r.ok) failed++;
          } catch {
            failed++;
          }
        }
        if (failed > 0) setBulkError(`${failed} regenerations failed — open each tab to retry.`);
        startTransition(() => router.refresh());
      } else {
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setBulkError((e as Error).message);
    }
    setBulkBusy(null);
  };

  return (
    <main className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-bi-navy-500 uppercase tracking-wide">
              {row.moduleTitle} · {row.lessonTitle}
            </div>
            <h1 className="mt-1 text-xl font-bold text-bi-navy-900 truncate">{row.videoTitle}</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => callBulk("regen_all")}
              disabled={bulkBusy !== null}
              className="text-xs font-semibold text-bi-navy-700 px-2.5 py-1.5 border border-bi-navy-200 rounded hover:bg-bi-navy-50 disabled:opacity-50"
            >
              {bulkBusy === "regen_all" ? <Loader2 className="w-3 h-3 inline animate-spin" /> : null} Re-generate all
            </button>
            <button
              onClick={() => callBulk("approve_ready")}
              disabled={bulkBusy !== null || draftCount === 0}
              className="text-xs font-semibold text-white px-3 py-1.5 bg-bi-blue-600 hover:bg-bi-blue-700 rounded disabled:opacity-50"
            >
              {bulkBusy === "approve_ready" ? <Loader2 className="w-3 h-3 inline animate-spin" /> : null}
              Approve all drafts ({draftCount})
            </button>
          </div>
        </div>

        {bulkError && (
          <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{bulkError}</div>
        )}

        {/* KPI strip */}
        <div className="mt-3 rounded-lg border border-bi-navy-200 bg-white px-4 py-2.5 flex items-center gap-6">
          {CONTENT_KINDS.map((kind) => {
            const it = findItem(row, kind);
            const meta = KIND_META[kind];
            const status = it ? it.status : "missing";
            const txt = status === "approved" ? "Approved"
                      : status === "draft"    ? "Draft"
                      : "Not built";
            const cls = status === "approved" ? "text-emerald-700"
                      : status === "draft"    ? "text-amber-700"
                      : "text-bi-navy-400";
            return (
              <div key={kind} className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-bi-navy-500">
                  {meta.icon} {meta.label}
                </span>
                <span className={`text-sm font-bold ${cls}`}>{txt}</span>
              </div>
            );
          })}
          <div className="ml-auto flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wide font-semibold text-bi-navy-500">Status</span>
            <span className="text-sm font-bold text-bi-navy-700">{approvedCount}/{CONTENT_KINDS.length} approved · {missingCount} not built</span>
          </div>
        </div>

        {/* Tab strip */}
        <div className="mt-4 flex border-b border-bi-navy-200">
          {CONTENT_KINDS.map((kind) => {
            const it = findItem(row, kind);
            const meta = KIND_META[kind];
            const isSel = activeKind === kind;
            const status = it ? it.status : "missing";
            const badgeCls = status === "approved" ? "bg-emerald-100 text-emerald-700"
                           : status === "draft"    ? "bg-amber-100 text-amber-700"
                           : "bg-bi-navy-100 text-bi-navy-600";
            return (
              <button
                key={kind}
                onClick={() => onKindChange(kind)}
                className={`px-3 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  isSel
                    ? "border-bi-blue-600 text-bi-blue-700"
                    : "border-transparent text-bi-navy-600 hover:text-bi-navy-900"
                }`}
              >
                <span>{meta.icon} {meta.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-[1px] rounded-full ${badgeCls}`}>
                  {status === "approved" ? "OK" : status === "draft" ? "Draft" : "—"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Body: preview + side rail */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <section className="rounded-lg border border-bi-navy-200 bg-white p-4">
            <div className="text-xs text-bi-navy-500 mb-3">{KIND_META[activeKind].sub}</div>
            <Preview kind={activeKind} payload={item?.payload ?? null} />
            <ApprovalBar
              itemId={item?.id ?? null}
              status={item ? item.status : "missing"}
              approvedAt={item?.approved_at ?? null}
              generatedAt={item?.generated_at ?? null}
              videoId={row.videoId}
              kind={activeKind}
            />
            {item?.generation_error && (
              <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                Last generation error: {item.generation_error}
              </div>
            )}
          </section>

          {/* Side rail (P2 / P3 stubs) */}
          <aside className="space-y-3">
            <div className="rounded-lg border border-bi-navy-200 bg-white p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-bi-navy-600 mb-1">AI Edit</div>
              <div className="text-xs text-bi-navy-500">
                Coming in P2 — describe an edit in plain English, accept the diff, revert anytime.
              </div>
              <button
                disabled
                className="mt-2 w-full text-xs font-semibold py-1.5 rounded bg-bi-navy-100 text-bi-navy-400 cursor-not-allowed"
              >
                Open chat
              </button>
            </div>

            <div className="rounded-lg border border-bi-navy-200 bg-white p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-bi-navy-600 mb-1">Suggestions</div>
              <div className="text-xs text-bi-navy-500">
                Coming in P3 — pedagogy lint findings (uncovered LO, weight imbalance, reading-level drift) with one-click apply.
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-bi-navy-200 bg-bi-navy-50 p-3">
              <div className="text-xs font-bold text-bi-navy-700">Format spec</div>
              <div className="text-xs text-bi-navy-600 mt-1 leading-relaxed">{KIND_META[activeKind].sub}</div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Preview({ kind, payload }: { kind: ContentKindKey; payload: Record<string, unknown> | null }) {
  switch (kind) {
    case "reading":  return <PreviewReading  payload={payload} />;
    case "pq":       return <PreviewPQ       payload={payload} />;
    case "gq":       return <PreviewGQ       payload={payload} />;
    case "scorm":    return <PreviewSCORM    payload={payload} />;
    case "ai_coach": return <PreviewAICoach  payload={payload} />;
  }
}
