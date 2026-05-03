"use client";

// PPT Tracker client component. Owns the Generate buttons and any UI state.
// Server component handed us the initial table; we mutate it in place as
// generations finish so the user gets immediate feedback.

import { useState, useTransition } from "react";
import { Sparkles, Download, AlertCircle, CheckCircle2 } from "lucide-react";

export interface TrackerRow {
  videoId: string;
  videoTitle: string;
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  videoStatus: string;
  slidesTotal: number;
  slidesApproved: number;
  upload: { filename: string; status: string } | null;
}

export function PptTrackerClient({ courseId, courseHref, initialRows, waitingOnApproval, totalVideos }: { courseId: string; courseHref: string; initialRows: TrackerRow[]; waitingOnApproval: number; totalVideos: number }) {
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [, startTransition] = useTransition();

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
    // Sequential to avoid hammering Anthropic + the rate limiter.
    for (const r of rows) {
      if (r.slidesTotal > 0) continue; // skip already-generated
      await generateOne(r);
    }
    setBulkBusy(false);
  };

  const exportFull = () => {
    window.open(`/api/export/pptx?courseId=${courseId}`, "_blank");
  };

  const exportOne = (videoId: string) => {
    window.open(`/api/export/pptx?courseId=${courseId}&videoId=${videoId}`, "_blank");
  };

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
      <div className="rounded-lg border border-slate-200 bg-white">
        <header className="px-4 py-3 border-b border-slate-200 flex justify-between items-center gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold">PPT Tracker</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {rows.length} videos · {rows.filter((r) => r.slidesTotal > 0).length} have slides ·{" "}
              {totalToGenerate} pending
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {totalToGenerate > 0 && (
              <button
                onClick={generateAll}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {bulkBusy ? `Generating ${totalToGenerate} videos…` : `Generate slides for all (${totalToGenerate})`}
              </button>
            )}
            <button
              onClick={exportFull}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" /> Export full course .pptx
            </button>
          </div>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-4 py-2">Module / Lesson</th>
              <th className="text-left px-4 py-2">Video</th>
              <th className="text-left px-4 py-2">Slides</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.videoId} className="hover:bg-slate-50/60">
                <td className="px-4 py-2 align-top">
                  <div className="text-xs text-slate-500">{r.moduleTitle}</div>
                  <div className="text-slate-700 text-sm">{r.lessonTitle}</div>
                </td>
                <td className="px-4 py-2 align-top text-slate-900">{r.videoTitle}</td>
                <td className="px-4 py-2 align-top">
                  {r.slidesTotal > 0 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {r.slidesTotal} slides
                    </span>
                  ) : (
                    <span className="text-slate-400">none</span>
                  )}
                </td>
                <td className="px-4 py-2 align-top">
                  {errors[r.videoId] ? (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600" title={errors[r.videoId]}>
                      <AlertCircle className="w-3.5 h-3.5" /> error
                    </span>
                  ) : (
                    <StatusPill status={r.slidesTotal > 0 ? "ppt_ready" : r.videoStatus} />
                  )}
                </td>
                <td className="px-4 py-2 text-right align-top">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => generateOne(r)}
                      disabled={busy[r.videoId] || bulkBusy}
                      className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 inline-flex items-center gap-1"
                      title={r.slidesTotal > 0 ? "Regenerate slides" : "Generate slides"}
                    >
                      <Sparkles className="w-3 h-3" />
                      {busy[r.videoId] ? "…" : (r.slidesTotal > 0 ? "Regen" : "Generate")}
                    </button>
                    <button
                      onClick={() => exportOne(r.videoId)}
                      disabled={r.slidesTotal === 0}
                      className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1"
                      title={r.slidesTotal === 0 ? "Generate slides first" : "Download .pptx"}
                    >
                      <Download className="w-3 h-3" /> .pptx
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            {totalVideos === 0
              ? "No videos yet — generate a TOC first to populate the PPT tracker."
              : `No approved briefs yet. Approve briefs in the Content Briefs tab to populate this list (${totalVideos} videos waiting).`}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    brief_ready: "bg-blue-50 text-blue-700",
    ppt_ready: "bg-purple-50 text-purple-700",
    recorded: "bg-orange-50 text-orange-700",
    transcribed: "bg-cyan-50 text-cyan-700",
    reviewed: "bg-emerald-50 text-emerald-700",
  };
  return <span className={`text-xs px-2 py-0.5 rounded ${map[status] || map.pending}`}>{status}</span>;
}
