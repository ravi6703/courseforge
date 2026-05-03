"use client";

// Content tab v2 — top-level orchestrator. Renders the two-pane layout
// (LessonTree | VideoWorkspace), holds selection state in the URL so
// refreshes don't lose context, and owns the ?v=<videoId>&k=<kind>
// search params.
//
// Selection rules:
//   - On first render with no ?v, auto-select the first video that has
//     at least one content_item (so the coach lands on something they
//     were last working on, not an empty SCORM tab on lesson 1).
//   - If no video has any content_items, select the first video.
//
// AI Edit + Suggestions side rail are P2/P3 stubs in VideoWorkspace.

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LessonTree } from "./LessonTree";
import { VideoWorkspace } from "./VideoWorkspace";
import { CONTENT_KINDS } from "./types";
import type { ContentVideoRow, ContentKindKey } from "./types";

// Kept in the public surface for the page.tsx server component, which
// re-exports it from the page module path.
export type { ContentVideoRow } from "./types";

export function ContentView({
  courseId: _courseId,  // currently unused in v2 (selection state is video-keyed)
  rows,
  kpis: _kpis,          // page-level KPIs are now derived in LessonTree
}: {
  courseId: string;
  rows: ContentVideoRow[];
  kpis: { videosWithContent: number; approvedCount: number; totalCount: number };
}) {
  void _courseId; void _kpis;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedVideoId = searchParams.get("v");
  const activeKindRaw = searchParams.get("k") as ContentKindKey | null;
  const activeKind: ContentKindKey =
    activeKindRaw && (CONTENT_KINDS as readonly string[]).includes(activeKindRaw)
      ? (activeKindRaw as ContentKindKey)
      : "reading";

  // Auto-select on first render if nothing chosen yet.
  useEffect(() => {
    if (selectedVideoId || rows.length === 0) return;
    const firstWithContent = rows.find((r) => r.contentItems.length > 0);
    const target = firstWithContent ?? rows[0];
    if (target) {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("v", target.videoId);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideoId, rows.length]);

  const setVideo = (videoId: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("v", videoId);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };
  const setKind = (kind: ContentKindKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("k", kind);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  const selectedRow = rows.find((r) => r.videoId === selectedVideoId) ?? null;

  // Empty state — no videos at all.
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-bi-navy-300 bg-white p-10 text-center">
        <div className="text-3xl mb-2">📚</div>
        <div className="text-sm font-semibold text-bi-navy-700">No videos in this course yet</div>
        <div className="mt-1 text-xs text-bi-navy-500">
          Generate a TOC and approve briefs to land here.
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-bi-navy-50 rounded-lg border border-bi-navy-200 overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: 540 }}>
      <LessonTree rows={rows} selectedVideoId={selectedVideoId} onSelect={setVideo} />
      {selectedRow ? (
        <VideoWorkspace row={selectedRow} activeKind={activeKind} onKindChange={setKind} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-bi-navy-500">
          Pick a video on the left to start.
        </div>
      )}
    </div>
  );
}
