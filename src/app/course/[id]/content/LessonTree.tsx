"use client";

// Light, BI-aesthetic lesson tree. Replaces the v2 navy-bg version.
// Card surface, soft pastel pills, navy-fill on the active video.

import { useState } from "react";
import { Search } from "lucide-react";
import type { ContentVideoRow } from "./types";
import { CONTENT_KINDS } from "./types";

interface LessonTreeProps {
  rows: ContentVideoRow[];
  selectedVideoId: string | null;
  onSelect: (videoId: string) => void;
}

export function LessonTree({ rows, selectedVideoId, onSelect }: LessonTreeProps) {
  const [q, setQ] = useState("");

  // Group videos by module → lesson preserving input order
  const modules = new Map<string, Record<string, ContentVideoRow[]>>();
  for (const r of rows) {
    if (!modules.has(r.moduleTitle)) modules.set(r.moduleTitle, {});
    (modules.get(r.moduleTitle)![r.lessonTitle] ||= []).push(r);
  }

  const total = rows.length;
  const totalArt = total * CONTENT_KINDS.length;
  const approved = rows.reduce(
    (s, r) => s + r.contentItems.filter((i) => i.status === "approved").length,
    0
  );
  const pct = totalArt > 0 ? Math.round((approved / totalArt) * 100) : 0;

  const matches = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());

  return (
    <aside className="bg-white border border-slate-200 rounded-[10px] shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="text-[10px] font-bold uppercase tracking-[.06em] text-slate-500">Course progress</div>
        <h3 className="mt-0.5 text-[14px] font-bold text-slate-900 tracking-tight">
          {approved} <span className="text-slate-300 font-semibold">/ {totalArt}</span>
          <span className="text-slate-500 font-medium ml-1.5">artifacts · {pct}%</span>
        </h3>
        <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-bi-blue-600 to-bi-accent-600" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2 border border-slate-200 rounded-md px-2.5 py-1.5 focus-within:border-bi-blue-600 focus-within:ring-2 focus-within:ring-bi-blue-100 transition-all">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lessons or videos…"
            className="flex-1 bg-transparent outline-none text-[13px] text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto py-2">
        {Array.from(modules.entries()).map(([modTitle, lessons]) => {
          const modVideos = Object.values(lessons).flat();
          const visible = modVideos.filter((v) => matches(v.videoTitle) || matches(v.lessonTitle) || matches(modTitle));
          if (visible.length === 0) return null;
          const modApproved = modVideos.reduce(
            (s, v) => s + v.contentItems.filter((i) => i.status === "approved").length, 0
          );
          const modTotal = modVideos.length * CONTENT_KINDS.length;
          const modPct = modTotal > 0 ? Math.round((modApproved / modTotal) * 100) : 0;

          return (
            <div key={modTitle} className="mt-1.5 first:mt-0">
              <div className="px-4 pt-1.5 pb-1 flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-[.05em] text-slate-500">{modTitle}</span>
                <span className="text-[10px] font-semibold text-slate-400">{modPct}%</span>
              </div>
              {Object.entries(lessons).map(([lessonTitle, videos]) => (
                <div key={lessonTitle} className="px-4 pt-1 pb-0.5">
                  <div className="text-[12px] font-semibold text-slate-700 truncate">{lessonTitle}</div>
                </div>
              ))}
              {modVideos.filter((v) => matches(v.videoTitle) || matches(v.lessonTitle) || matches(modTitle)).map((v) => {
                const isSel = v.videoId === selectedVideoId;
                const approvedC = v.contentItems.filter((i) => i.status === "approved").length;
                let pillCls = "bg-slate-100 text-slate-600";
                if (approvedC === CONTENT_KINDS.length) pillCls = "bg-emerald-50 text-emerald-700";
                else if (approvedC > 0)                  pillCls = "bg-amber-50 text-amber-700";
                return (
                  <button
                    key={v.videoId}
                    onClick={() => onSelect(v.videoId)}
                    className={`w-full text-left flex items-center gap-2 px-4 py-1.5 text-[13px] border-l-[3px] transition-colors ${
                      isSel
                        ? "bg-bi-blue-50 border-l-bi-blue-600 text-slate-900 font-bold"
                        : "border-l-transparent text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0 tabular-nums w-6">
                      {v.videoTitle.match(/V\d+/)?.[0] ?? "—"}
                    </span>
                    <span className="flex-1 truncate">{v.videoTitle.replace(/^V\d+\s*[·•:-]\s*/i, "")}</span>
                    <span className={`shrink-0 font-mono text-[10px] font-bold px-1.5 py-px rounded-full ${pillCls}`}>
                      {approvedC}/{CONTENT_KINDS.length}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-slate-500">
            No videos yet. Generate a TOC and approve briefs to land here.
          </div>
        )}
      </div>
    </aside>
  );
}
