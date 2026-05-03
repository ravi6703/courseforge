"use client";

// Left rail of the Content tab v2 — module → lesson → video, with status
// pills showing how many of the 5 artifact kinds are approved per video.

import type { ContentVideoRow } from "./types";
import { CONTENT_KINDS } from "./types";

interface LessonTreeProps {
  rows: ContentVideoRow[];
  selectedVideoId: string | null;
  onSelect: (videoId: string) => void;
}

interface ModuleGroup {
  moduleTitle: string;
  lessons: Record<string, ContentVideoRow[]>;
}

export function LessonTree({ rows, selectedVideoId, onSelect }: LessonTreeProps) {
  // Group videos by module → lesson (preserving input order)
  const modules = new Map<string, ModuleGroup>();
  for (const row of rows) {
    if (!modules.has(row.moduleTitle)) {
      modules.set(row.moduleTitle, { moduleTitle: row.moduleTitle, lessons: {} });
    }
    const mod = modules.get(row.moduleTitle)!;
    (mod.lessons[row.lessonTitle] ||= []).push(row);
  }

  // Course-level summary
  const totalVideos = rows.length;
  const totalArtifacts = totalVideos * CONTENT_KINDS.length;
  const approvedArtifacts = rows.reduce(
    (sum, r) => sum + r.contentItems.filter((i) => i.status === "approved").length,
    0
  );
  const approvedPct = totalArtifacts > 0
    ? Math.round((approvedArtifacts / totalArtifacts) * 100)
    : 0;

  return (
    <aside className="bg-white border-r border-bi-navy-200 overflow-auto" style={{ width: 300 }}>
      <div className="px-4 pt-4 pb-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-bi-navy-600">
          Course progress
        </div>
        <div className="mt-2 rounded-lg border border-bi-navy-200 bg-bi-blue-50 px-3 py-2.5">
          <div className="text-lg font-bold text-bi-navy-700 leading-none">
            {approvedArtifacts} <span className="text-bi-navy-400 font-medium">/ {totalArtifacts}</span>
          </div>
          <div className="text-xs text-bi-navy-600 mt-0.5">
            artifacts approved · {approvedPct}%
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-bi-navy-600">
          Lessons
        </div>
      </div>

      {Array.from(modules.values()).map((mod) => {
        const modVideos = Object.values(mod.lessons).flat();
        const modApproved = modVideos.reduce(
          (s, v) => s + v.contentItems.filter((i) => i.status === "approved").length,
          0
        );
        const modTotal = modVideos.length * CONTENT_KINDS.length;
        const modPct = modTotal > 0 ? Math.round((modApproved / modTotal) * 100) : 0;

        return (
          <div key={mod.moduleTitle}>
            <div className="px-4 py-2 text-sm font-bold text-bi-navy-700 bg-bi-navy-50 border-t border-bi-navy-100 flex justify-between items-center">
              <span className="truncate">{mod.moduleTitle}</span>
              <span className="text-[11px] font-semibold text-bi-navy-600 shrink-0 ml-2">{modPct}%</span>
            </div>

            {Object.entries(mod.lessons).map(([lessonTitle, videos]) => (
              <div key={lessonTitle} className="py-1">
                <div className="px-5 pt-1.5 pb-1 text-[12px] font-semibold text-bi-navy-700">
                  {lessonTitle}
                </div>
                {videos.map((v) => {
                  const approvedCount = v.contentItems.filter((i) => i.status === "approved").length;
                  const isSelected = v.videoId === selectedVideoId;
                  return (
                    <button
                      key={v.videoId}
                      onClick={() => onSelect(v.videoId)}
                      className={`w-full text-left px-5 py-1.5 flex justify-between items-center gap-2 text-[13px] border-l-[3px] transition-colors ${
                        isSelected
                          ? "bg-white border-bi-blue-600 text-bi-navy-900 font-semibold"
                          : "border-transparent text-bi-navy-700 hover:bg-bi-blue-50"
                      }`}
                    >
                      <span className="truncate">{v.videoTitle}</span>
                      <ArtifactPill approved={approvedCount} total={CONTENT_KINDS.length} />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}

      {rows.length === 0 && (
        <div className="px-4 py-6 text-sm text-bi-navy-500 text-center">
          No videos yet. Generate a TOC and approve briefs to get here.
        </div>
      )}
    </aside>
  );
}

function ArtifactPill({ approved, total }: { approved: number; total: number }) {
  let cls = "bg-bi-navy-100 text-bi-navy-700";
  if (approved === total)        cls = "bg-emerald-100 text-emerald-700";
  else if (approved > 0)         cls = "bg-amber-100 text-amber-700";
  return (
    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-[1px] rounded-full ${cls}`}>
      {approved}/{total}
    </span>
  );
}
