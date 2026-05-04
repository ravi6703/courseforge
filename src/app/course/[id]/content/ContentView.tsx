"use client";

// Top-level Content tab orchestrator. Two columns:
// LessonTree (300px) + VideoWorkspace card. Selection state via URL
// search params (?v=<videoId>&k=<kind>).

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LessonTree } from "./LessonTree";
import { VideoWorkspace } from "./VideoWorkspace";
import { CONTENT_KINDS } from "./types";
import type { ContentVideoRow, ContentKindKey } from "./types";

export type { ContentVideoRow } from "./types";

export function ContentView({
  courseId: _courseId,
  rows,
  kpis: _kpis,
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

  useEffect(() => {
    if (selectedVideoId || rows.length === 0) return;
    const firstWithContent = rows.find((r) => r.contentItems.length > 0) ?? rows[0];
    if (firstWithContent) {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("v", firstWithContent.videoId);
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

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-dashed border-bi-navy-200 rounded-[10px] p-12 text-center">
        <div className="text-3xl mb-2">📚</div>
        <div className="text-[15px] font-bold text-bi-navy-900">No videos in this course yet</div>
        <div className="mt-1 text-[13px] text-bi-navy-500">Generate a TOC and approve briefs to land here.</div>
      </div>
    );
  }

  const selectedRow = rows.find((r) => r.videoId === selectedVideoId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
      <LessonTree rows={rows} selectedVideoId={selectedVideoId} onSelect={setVideo} />
      {selectedRow ? (
        <VideoWorkspace row={selectedRow} activeKind={activeKind} onKindChange={setKind} />
      ) : (
        <div className="bg-white border border-bi-navy-100 rounded-[10px] p-12 text-center text-[13px] text-bi-navy-500">
          Pick a video on the left to start.
        </div>
      )}
    </div>
  );
}
