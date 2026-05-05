"use client";

// Content overview — lessons × artifact-kinds grid.
//
// One job: tell the coach at a glance which lesson-level artifact is
// done, in progress, or missing. Click any cell → focused editor for
// that lesson + kind.

import Link from "next/link";
import { useMemo, useState } from "react";
import { CONTENT_KINDS, KIND_META } from "./types";
import { Search, Video as VideoIcon } from "lucide-react";

interface OverviewRow {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  moduleOrder: number;
  videoCount: number;
  contentItems: Array<{ id: string; kind: string; status: string; stale_since?: string | null }>;
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
      !q || r.lessonTitle.toLowerCase().includes(q.toLowerCase())
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
          <div className="text-[11px] text-bi-navy-500 uppercase tracking-wider">Lesson artifacts</div>
          <div className="text-[20px] font-semibold text-bi-navy-800">
            {approvedCells}<span className="text-[13px] font-normal text-bi-navy-500"> / {totalCells} approved</span>
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="h-1.5 bg-bi-navy-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-300" style={{ width: `${totalCells ? Math.round((approvedCells / totalCells) * 100) : 0}%` }} />
          </div>
          <div className="text-[11px] text-bi-navy-500 mt-1">
            {draftCells} draft · click a cell to open or generate · Reading / Quiz / Assessment / Worked example / Discussion / SCORM / AI Coach are all per-lesson now
          </div>
        </div>
        <div className="inline-flex items-center gap-2 border border-bi-navy-100 bg-white rounded-lg px-3 py-1.5 w-72">
          <Search className="w-3.5 h-3.5 text-bi-navy-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Find lesson…"
            className="flex-1 bg-transparent outline-none text-[12.5px] text-bi-navy-900 placeholder:text-bi-navy-400"
          />
        </div>
      </header>

      <div className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden">
        <div
          className="grid border-b border-bi-navy-100 bg-bi-navy-50/40 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-bi-navy-500"
          style={{ gridTemplateColumns: `minmax(240px, 1fr) 60px repeat(${CONTENT_KINDS.length}, 60px)` }}
        >
          <div>Lesson</div>
          <div className="text-center">Videos</div>
          {CONTENT_KINDS.map((k) => (
            <div key={k} className="text-center" title={KIND_META[k].label}>
              <span className={`text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded ${KIND_META[k].tone}`}>
                {KIND_META[k].icon}
              </span>
            </div>
          ))}
        </div>

        <div className="divide-y divide-bi-navy-100">
          {visible.length === 0 ? (
            <div className="px-4 py-12 text-center text-[13px] text-bi-navy-500 italic">
              {rows.length === 0
                ? "No lessons yet — generate a TOC first."
                : "No lessons match your search."}
            </div>
          ) : visible.map((r) => (
            <div
              key={r.lessonId}
              className="grid items-center px-4 py-2 hover:bg-bi-navy-50/40"
              style={{ gridTemplateColumns: `minmax(240px, 1fr) 60px repeat(${CONTENT_KINDS.length}, 60px)` }}
            >
              <Link
                href={`/course/${courseId}/content/lesson/${r.lessonId}`}
                className="min-w-0 pr-3"
              >
                <div className="text-[10.5px] text-bi-navy-500 uppercase tracking-wider truncate">
                  M{r.moduleOrder} · {r.moduleTitle}
                </div>
                <div className="text-[13px] font-medium text-bi-navy-900 truncate hover:text-bi-blue-700">{r.lessonTitle}</div>
              </Link>
              <div className="text-center text-[12px] text-bi-navy-500 inline-flex items-center justify-center gap-1">
                <VideoIcon className="w-3 h-3 text-bi-navy-300" />
                {r.videoCount}
              </div>
              {CONTENT_KINDS.map((k) => {
                const item = r.contentItems.find((i) => i.kind === k);
                const status = item?.status ?? "missing";
                const stale = !!item?.stale_since;
                return (
                  <Link
                    key={k}
                    href={`/course/${courseId}/content/lesson/${r.lessonId}/${k}`}
                    className="grid place-items-center"
                    title={`${KIND_META[k].label} · ${status}${stale ? " · stale" : ""}`}
                  >
                    <Cell status={status} stale={stale} />
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

function Cell({ status, stale }: { status: string; stale?: boolean }) {
  const ring = stale ? "ring-2 ring-amber-300 ring-offset-1" : "";
  if (status === "approved") return <span className={`w-3 h-3 rounded-full bg-emerald-400 ${ring}`} />;
  if (status === "draft")    return <span className={`w-3 h-3 rounded-full bg-bi-blue-300 ${ring}`} />;
  return                            <span className={`w-3 h-3 rounded-full border border-bi-navy-200 bg-white ${ring}`} />;
}
