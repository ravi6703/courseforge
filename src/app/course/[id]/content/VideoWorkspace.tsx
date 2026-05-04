"use client";

// Right pane of the Content tab v3. Vertical artifact rail (light, BI
// aesthetic, navy fill on active) + preview pane + AI Edit / Suggestions
// side rail (P2/P3 stubs).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Check, FileText, AlertCircle } from "lucide-react";
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

const RAIL_TONE: Record<ContentKindKey, string> = {
  reading:  "bg-violet-50 text-violet-700",
  pq:       "bg-bi-blue-50 text-bi-blue-700",
  gq:       "bg-bi-accent-50 text-bi-accent-700",
  scorm:    "bg-teal-50 text-teal-700",
  ai_coach: "bg-orange-50 text-orange-700",
};

export function VideoWorkspace({ row, activeKind, onKindChange }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [bulkBusy, setBulkBusy] = useState<"approve_ready" | "regen_all" | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const item = findItem(row, activeKind);
  const draftCount = row.contentItems.filter((i) => i.status === "draft").length;
  const approvedCount = row.contentItems.filter((i) => i.status === "approved").length;

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
        let failed = 0;
        for (const job of data.regenerate as Array<{ video_id: string; kind: string }>) {
          try {
            const r = await fetch("/api/content/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ video_id: job.video_id, kind: job.kind }),
            });
            if (!r.ok) failed++;
          } catch { failed++; }
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
    <section className="bg-white border border-slate-200 rounded-[10px] shadow-sm grid grid-cols-[200px_1fr] overflow-hidden min-h-[640px]">
      {/* Vertical artifact rail (BI light, navy active) */}
      <aside className="border-r border-slate-200 bg-slate-50 py-3">
        <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-[.06em] text-slate-500">
          Artifacts · {row.videoTitle.match(/V\d+/)?.[0] ?? ""}
        </div>
        <ul>
          {CONTENT_KINDS.map((kind) => {
            const it = findItem(row, kind);
            const meta = KIND_META[kind];
            const isSel = activeKind === kind;
            const status = it ? it.status : "missing";
            let pillCls = "bg-slate-100 text-slate-600";
            let pillTxt = "—";
            if (status === "approved") { pillCls = "bg-emerald-100 text-emerald-700"; pillTxt = "OK"; }
            else if (status === "draft") { pillCls = "bg-amber-100 text-amber-700"; pillTxt = "Draft"; }
            return (
              <li key={kind}>
                <button
                  onClick={() => onKindChange(kind)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] border-l-[3px] transition-colors ${
                    isSel
                      ? "bg-white border-l-bi-navy-900 text-slate-900 font-bold"
                      : "border-l-transparent text-slate-700 hover:bg-white font-medium"
                  }`}
                >
                  <span className={`shrink-0 w-[22px] h-[22px] rounded-md grid place-items-center text-[12px] ${
                    isSel ? "bg-bi-navy-900 text-white" : RAIL_TONE[kind]
                  }`}>{meta.icon}</span>
                  <span className="flex-1 text-left truncate">{meta.label}</span>
                  <span className={`shrink-0 font-mono text-[10px] font-bold px-1.5 py-px rounded-full ${pillCls}`}>
                    {pillTxt}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Workspace body */}
      <div className="p-5">
        {/* Video header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">{KIND_META[activeKind].icon} {row.videoTitle} · {KIND_META[activeKind].label}</h2>
            <div className="text-[12px] text-slate-500 mt-0.5">{row.moduleTitle} · {row.lessonTitle}</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => callBulk("regen_all")}
              disabled={bulkBusy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {bulkBusy === "regen_all" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Re-generate all
            </button>
            <button
              onClick={() => callBulk("approve_ready")}
              disabled={bulkBusy !== null || draftCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bi-navy-900 text-white text-[12.5px] font-semibold hover:bg-bi-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkBusy === "approve_ready" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Approve drafts
              <span className="bg-white/20 text-white px-1.5 py-px rounded-full text-[10px] font-bold ml-1">{draftCount}</span>
            </button>
          </div>
        </div>

        {bulkError && (
          <div className="mb-3 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5">{bulkError}</div>
        )}

        {/* Preview + side rail */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="bg-white border border-slate-200 rounded-[10px] overflow-hidden">
            <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[14px] font-bold text-slate-900">{KIND_META[activeKind].label}</h3>
                <div className="text-[11.5px] text-slate-500 mt-0.5">{KIND_META[activeKind].sub}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button className="p-1.5 rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900" title="Copy as JSON">
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900" title="Format spec">
                  <AlertCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </header>
            <div className="p-4">
              <Preview kind={activeKind} payload={item?.payload ?? null} />
            </div>
            <ApprovalBar
              itemId={item?.id ?? null}
              status={item ? item.status : "missing"}
              approvedAt={item?.approved_at ?? null}
              generatedAt={item?.generated_at ?? null}
              videoId={row.videoId}
              kind={activeKind}
            />
            {item?.generation_error && (
              <div className="mx-4 mb-4 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5">
                Last generation error: {item.generation_error}
              </div>
            )}
          </div>

          {/* Side rail */}
          <aside className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-[10px] overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-[.05em] text-slate-700 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-bi-accent-600" /> AI Edit
                </span>
                <span className="text-[10px] text-slate-500 font-medium">P2 · soon</span>
              </div>
              <div className="p-3.5 text-[12.5px] text-slate-600 leading-relaxed">
                Describe an edit in plain English; accept the diff; revert anytime. Coming next.
              </div>
              <button disabled className="w-full mx-3.5 mb-3.5 py-1.5 rounded-md bg-slate-100 text-slate-500 text-[11.5px] font-semibold cursor-not-allowed" style={{ width: "calc(100% - 1.75rem)" }}>
                Open chat
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-[10px] overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-[.05em] text-slate-700 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-bi-blue-600" /> Suggestions
                </span>
                <span className="text-[10px] text-slate-500 font-medium">P3 · soon</span>
              </div>
              <div className="p-3.5 text-[12.5px] text-slate-600 leading-relaxed">
                Pedagogy lint findings (uncovered LO, weight imbalance, reading-level drift) with one-click apply.
              </div>
            </div>

            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[10px] p-3.5">
              <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-slate-700">Format spec</div>
              <div className="text-[11.5px] text-slate-600 mt-1.5 leading-relaxed">{KIND_META[activeKind].sub}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[10px] p-3.5">
              <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-slate-700">Status</div>
              <div className="text-[12.5px] text-slate-700 mt-1.5">
                <strong className="text-slate-900">{approvedCount}</strong> of <strong className="text-slate-900">{CONTENT_KINDS.length}</strong> artifacts approved on this video.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
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
