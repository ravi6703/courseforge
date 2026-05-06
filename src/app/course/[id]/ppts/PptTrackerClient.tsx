"use client";

// PPT Tracker — overhaul v1.
//
// Coach feedback:
//   - Statuses (created/pending/draft) too vague — use explicit states.
//   - Group rows by module with collapse + module-level progress bar.
//   - Add deck settings (tone / template / brand kit / slide count / must-include).
//   - Bulk: regenerate module.

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Sparkles, Download, AlertCircle, Wand2, Loader2, PencilLine,
  ChevronDown, ChevronRight, RefreshCw,
} from "lucide-react";
import { DeckSettings, type PptSettings } from "./DeckSettings";

export interface TrackerRow {
  videoId: string;
  videoTitle: string;
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  moduleId?: string;
  videoStatus: string;
  slidesTotal: number;
  slidesApproved: number;
  upload: { filename: string; status: string } | null;
}

export type DeckState =
  | "not_started" | "generating" | "draft" | "in_review" | "approved" | "published";

function deriveDeckState(row: TrackerRow, busy: boolean): DeckState {
  if (busy) return "generating";
  if (row.slidesTotal === 0) return "not_started";
  if (row.slidesApproved === 0) return "draft";
  if (row.slidesApproved < row.slidesTotal) return "in_review";
  if (row.videoStatus === "published") return "published";
  return "approved";
}

const STATE_TONE: Record<DeckState, { bg: string; fg: string; ring: string; dot: string; label: string }> = {
  not_started: { bg: "bg-slate-100",     fg: "text-slate-600",   ring: "ring-slate-200",   dot: "bg-slate-400",   label: "Not started" },
  generating:  { bg: "bg-bi-blue-50",    fg: "text-bi-blue-700", ring: "ring-bi-blue-200", dot: "bg-bi-blue-500", label: "Generating…" },
  draft:       { bg: "bg-amber-50",      fg: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500",   label: "Draft" },
  in_review:   { bg: "bg-purple-50",     fg: "text-purple-700",  ring: "ring-purple-200",  dot: "bg-purple-500",  label: "In review" },
  approved:    { bg: "bg-emerald-50",    fg: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500", label: "Approved" },
  published:   { bg: "bg-bi-blue-100",   fg: "text-bi-blue-800", ring: "ring-bi-blue-300", dot: "bg-bi-blue-700", label: "Published" },
};

function StatePill({ state }: { state: DeckState }) {
  const t = STATE_TONE[state];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold ring-1 ${t.bg} ${t.fg} ${t.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot} ${state === "generating" ? "animate-pulse" : ""}`} />
      {t.label}
    </span>
  );
}

export function PptTrackerClient({
  courseId,
  courseHref,
  initialRows,
  waitingOnApproval,
  totalVideos,
  pptSettings,
}: {
  courseId: string;
  courseHref: string;
  initialRows: TrackerRow[];
  waitingOnApproval: number;
  totalVideos: number;
  pptSettings: Partial<PptSettings> | null;
}) {
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [moduleBusy, setModuleBusy] = useState<Record<string, boolean>>({});
  const [toneBusy, setToneBusy] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  // Group rows by module title (since some legacy rows don't carry moduleId).
  const groups = useMemo(() => {
    const m: Record<string, TrackerRow[]> = {};
    rows.forEach((r) => {
      const k = r.moduleTitle || "Module";
      (m[k] = m[k] || []).push(r);
    });
    return Object.entries(m);
  }, [rows]);

  const rewriteTone = async (videoId: string) => {
    const tone = window.prompt("Describe the rewrite (e.g. 'more punchy and concrete', 'shorten bullets to one line'):");
    if (!tone?.trim()) return;
    setToneBusy((t) => ({ ...t, [videoId]: true }));
    try {
      const res = await fetch(`/api/ppt/by-video/${videoId}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: tone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setErrors((e) => ({ ...e, [videoId]: data.error ?? `HTTP ${res.status}` }));
      else startTransition(() => location.reload());
    } finally {
      setToneBusy((t) => ({ ...t, [videoId]: false }));
    }
  };

  const generateOne = async (row: TrackerRow): Promise<boolean> => {
    setBusy((b) => ({ ...b, [row.videoId]: true }));
    setErrors((e) => { const { [row.videoId]: _drop, ...rest } = e; void _drop; return rest; });
    try {
      const res = await fetch("/api/ai/generate-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: row.videoId, courseId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrors((e) => ({ ...e, [row.videoId]: data.error || `HTTP ${res.status}` }));
        return false;
      }
      startTransition(() => {
        setRows((rs) => rs.map((r) => r.videoId === row.videoId
          ? { ...r, slidesTotal: data.slides_count, slidesApproved: 0 }
          : r));
      });
      return true;
    } catch (e) {
      setErrors((er) => ({ ...er, [row.videoId]: (e as Error).message }));
      return false;
    } finally {
      setBusy((b) => ({ ...b, [row.videoId]: false }));
    }
  };

  const generateAll = async () => {
    setBulkBusy(true);
    for (const r of rows) {
      if (r.slidesTotal > 0) continue;
      await generateOne(r);
    }
    setBulkBusy(false);
  };

  const regenerateModule = async (moduleTitle: string) => {
    if (!confirm(`Regenerate every deck in "${moduleTitle}"? Existing slides will be replaced.`)) return;
    setModuleBusy((m) => ({ ...m, [moduleTitle]: true }));
    try {
      const moduleRows = rows.filter((r) => r.moduleTitle === moduleTitle);
      for (const r of moduleRows) await generateOne(r);
    } finally {
      setModuleBusy((m) => ({ ...m, [moduleTitle]: false }));
    }
  };

  const exportFull = () => window.open(`/api/export/pptx?courseId=${courseId}`, "_blank");
  const exportOne = (videoId: string) => window.open(`/api/export/pptx?courseId=${courseId}&videoId=${videoId}`, "_blank");

  const totalToGenerate = rows.filter((r) => r.slidesTotal === 0).length;

  return (
    <div className="space-y-4">
      {waitingOnApproval > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-amber-900">
            <span className="font-semibold">{waitingOnApproval} of {totalVideos}</span> videos are waiting on brief approval — slides only generate after the brief is approved.
          </div>
          <a href={`${courseHref}/briefs`} className="text-sm text-amber-900 hover:underline font-medium shrink-0">
            Go to Content Briefs →
          </a>
        </div>
      )}

      <DeckSettings courseId={courseId} initial={pptSettings} />

      <div className="rounded-lg border border-bi-navy-200 bg-white">
        <header className="px-4 py-3 border-b border-bi-navy-200 flex justify-between items-center gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold">PPT Tracker</h2>
            <p className="text-xs text-bi-navy-500 mt-0.5">
              {rows.length} videos · {rows.filter((r) => r.slidesTotal > 0).length} have slides ·{" "}
              {totalToGenerate} pending
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {totalToGenerate > 0 && (
              <button
                onClick={generateAll}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-600 text-white text-xs hover:bg-bi-blue-700 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {bulkBusy ? `Generating ${totalToGenerate} videos…` : `Generate all (${totalToGenerate})`}
              </button>
            )}
            <button
              onClick={exportFull}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-xs hover:bg-bi-blue-200"
            >
              <Download className="w-3.5 h-3.5" /> Export full course .pptx
            </button>
          </div>
        </header>

        {groups.length === 0 ? (
          <div className="p-8 text-center text-sm text-bi-navy-500">
            {totalVideos === 0
              ? "No videos yet — generate a TOC first to populate the PPT tracker."
              : `No approved briefs yet. Approve briefs in the Content Briefs tab to populate this list (${totalVideos} videos waiting).`}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {groups.map(([moduleTitle, moduleRows]) => {
              const total = moduleRows.length;
              const generated = moduleRows.filter((r) => r.slidesTotal > 0).length;
              const approved = moduleRows.filter((r) => r.slidesApproved > 0 && r.slidesApproved >= r.slidesTotal).length;
              const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
              const isCol = collapsed[moduleTitle] ?? false;
              const isModBusy = moduleBusy[moduleTitle];
              return (
                <section key={moduleTitle}>
                  <header className="px-4 py-2.5 bg-slate-50 flex items-center gap-3">
                    <button
                      onClick={() => setCollapsed((c) => ({ ...c, [moduleTitle]: !isCol }))}
                      className="p-1 rounded text-slate-500 hover:bg-slate-200"
                    >
                      {isCol ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-bold text-bi-navy-900 truncate">{moduleTitle}</div>
                      <div className="text-[11px] text-bi-navy-500">{generated}/{total} decks · {approved} approved</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex-1 w-32 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-bi-navy-700 tabular-nums w-10 text-right">{pct}%</span>
                      <button
                        onClick={() => regenerateModule(moduleTitle)}
                        disabled={isModBusy}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                        title="Regenerate every deck in this module"
                      >
                        {isModBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Regen module
                      </button>
                    </div>
                  </header>
                  {!isCol && (
                    <table className="w-full text-sm">
                      <thead className="bg-white text-[10.5px] uppercase tracking-wider text-slate-500">
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-4 py-1.5">Lesson · Video</th>
                          <th className="text-left px-4 py-1.5">Slides</th>
                          <th className="text-left px-4 py-1.5">Status</th>
                          <th className="text-right px-4 py-1.5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {moduleRows.map((r) => {
                          const state = deriveDeckState(r, !!busy[r.videoId]);
                          return (
                            <tr key={r.videoId} className="hover:bg-bi-navy-50/40">
                              <td className="px-4 py-2 align-top">
                                <div className="text-[10.5px] text-bi-navy-500">{r.lessonTitle}</div>
                                <div className="text-bi-navy-900 text-[12.5px] truncate">{r.videoTitle}</div>
                              </td>
                              <td className="px-4 py-2 align-top text-[12.5px]">
                                {r.slidesTotal > 0 ? (
                                  <Link
                                    href={`/course/${courseId}/ppts/${r.videoId}`}
                                    className="inline-flex items-center gap-1 text-bi-blue-700 hover:underline"
                                  >
                                    {r.slidesApproved}/{r.slidesTotal}
                                    <PencilLine className="w-3 h-3" />
                                  </Link>
                                ) : (
                                  <span className="text-bi-navy-400">none</span>
                                )}
                              </td>
                              <td className="px-4 py-2 align-top">
                                {errors[r.videoId] ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-red-600" title={errors[r.videoId]}>
                                    <AlertCircle className="w-3 h-3" /> error
                                  </span>
                                ) : (
                                  <StatePill state={state} />
                                )}
                              </td>
                              <td className="px-4 py-2 text-right align-top">
                                <div className="inline-flex gap-1">
                                  <button
                                    onClick={() => generateOne(r)}
                                    disabled={busy[r.videoId] || bulkBusy}
                                    className="text-[11px] px-2 py-1 rounded border border-blue-300 text-blue-700 bg-blue-50 hover:bg-bi-blue-100 disabled:opacity-40 inline-flex items-center gap-1"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    {busy[r.videoId] ? "…" : (r.slidesTotal > 0 ? "Regen" : "Generate")}
                                  </button>
                                  <button
                                    onClick={() => rewriteTone(r.videoId)}
                                    disabled={r.slidesTotal === 0 || toneBusy[r.videoId]}
                                    className="text-[11px] px-2 py-1 rounded border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-40 inline-flex items-center gap-1"
                                  >
                                    {toneBusy[r.videoId] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                    Tone
                                  </button>
                                  <button
                                    onClick={() => exportOne(r.videoId)}
                                    disabled={r.slidesTotal === 0}
                                    className="text-[11px] px-2 py-1 rounded border border-bi-navy-300 hover:bg-bi-navy-50 disabled:opacity-40 inline-flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" /> .pptx
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
