"use client";

// Content overview — videos × artifact-kinds grid.
//
// One job: tell the coach at a glance what's done and what's missing.
// Click a cell to drill into that artifact; click the row title to open
// the per-video workspace.
//
// Replaces the previous combined Lesson tree + Workspace + AI Edit +
// Suggestions + Format bar layout, which was 5 panels at once.

import Link from "next/link";
import { useMemo, useState } from "react";
import { CONTENT_KINDS, KIND_META, type ContentKindKey } from "./types";
import { Search } from "lucide-react";

interface OverviewRow {
  videoId: string;
  videoTitle: string;
  lessonTitle: string;
  moduleTitle: string;
  moduleOrder: number;
  contentItems: Array<{ id: string; kind: string; status: string }>;
}

export function ContentOverview({
  courseId, rows,
}: {
  courseId: string;
  rows: OverviewRow[];
}) {
  const [q, setQ] = useState("");
  const visible = useMemo(
    () => rows.filter((r) =>
      !q || r.videoTitle.toLowerCase().includes(q.toLowerCase())
        || r.lessonTitle.toLowerCase().includes(q.toLowerCase())
        || r.moduleTitle.toLowerCase().includes(q.toLowerCase())
    ),
    [rows, q],
  );

  const totalCells = rows.length * CONTENT_KINDS.length;
  const approvedCells = rows.reduce(
    (s, r) => s + CONTENT_KINDS.reduce((c, k) => c + (r.contentItems.find((i) => i.kind === k)?.status === "approved" ? 1 : 0), 0),
    0,
  );
  const draftCells = rows.reduce(
    (s, r) => s + CONTENT_KINDS.reduce((c, k) => c + (r.contentItems.find((i) => i.kind === k)?.status === "draft" ? 1 : 0), 0),
    0,
  );

  return (
    <div className="space-y-3">
      <header className="bg-white border border-bi-navy-100 rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
        <div>
          <div className="text-[11px] text-bi-navy-500 uppercase tracking-wider">Content artifacts</div>
          <div className="text-[20px] font-semibold text-bi-navy-800">
            {approvedCells}<span className="text-[13px] font-normal text-bi-navy-500"> / {totalCells} approved</span>
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="h-1.5 bg-bi-navy-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-300" style={{ width: `${totalCells ? Math.round((approvedCells / totalCells) * 100) : 0}%` }} />
          </div>
          <div className="text-[11px] text-bi-navy-500 mt-1">{draftCells} draft · click any cell to open it</div>
        </div>
        <div className="inline-flex items-center gap-2 border border-bi-navy-100 bg-white rounded-lg px-3 py-1.5 w-72">
          <Search className="w-3.5 h-3.5 text-bi-navy-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Find video…"
            className="flex-1 bg-transparent outline-none text-[12.5px] text-bi-navy-900 placeholder:text-bi-navy-400"
          />
        </div>
      </header>

      <div className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="grid border-b border-bi-navy-100 bg-bi-navy-50/40 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-bi-navy-500"
             style={{ gridTemplateColumns: `minmax(220px, 1fr) repeat(${CONTENT_KINDS.length}, 60px)` }}>
          <div>Video</div>
          {CONTENT_KINDS.map((k) => (
            <div key={k} className="text-center" title={KIND_META[k].label}>
              {KIND_META[k].icon}
            </div>
          ))}
        </div>

        <div className="divide-y divide-bi-navy-100">
          {visible.length === 0 ? (
            <div className="px-4 py-12 text-center text-[13px] text-bi-navy-500 italic">
              {rows.length === 0
                ? "No videos yet — generate a TOC and approve briefs first."
                : "No videos match your search."}
            </div>
          ) : visible.map((r) => (
            <div key={r.videoId}
                 className="grid items-center px-4 py-2 hover:bg-bi-navy-50/40"
                 style={{ gridTemplateColumns: `minmax(220px, 1fr) repeat(${CONTENT_KINDS.length}, 60px)` }}>
              <Link
                href={`/course/${courseId}/content/${r.videoId}`}
                className="min-w-0 pr-3"
              >
                <div className="text-[10.5px] text-bi-navy-500 uppercase tracking-wider truncate">
                  M{r.moduleOrder} · {r.lessonTitle}
                </div>
                <div className="text-[13px] font-medium text-bi-navy-900 truncate hover:text-bi-blue-700">{r.videoTitle}</div>
              </Link>
              {CONTENT_KINDS.map((k) => {
                const item = r.contentItems.find((i) => i.kind === k);
                const status = item?.status ?? "missing";
                return (
                  <Link
                    key={k}
                    href={`/course/${courseId}/content/${r.videoId}/${k}`}
                    className="grid place-items-center"
                    title={`${KIND_META[k].label} · ${status}`}
                  >
                    <Cell status={status} />
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Cell({ status }: { status: string }) {
  if (status === "approved") return <span className="w-3 h-3 rounded-full bg-emerald-400" />;
  if (status === "draft")    return <span className="w-3 h-3 rounded-full bg-bi-blue-300" />;
  return                            <span className="w-3 h-3 rounded-full border border-bi-navy-200 bg-white" />;
}
