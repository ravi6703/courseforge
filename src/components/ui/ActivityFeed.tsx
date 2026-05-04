"use client";

// Recent activity feed — human-readable line per activity_log row,
// pulled from /api/activity. Renders as a panel with a header.
//
// Friendly action labels for the cardinal events. Anything unmapped
// falls back to a humanized version of the raw action key.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { relativeTime } from "@/lib/format/relativeTime";
import { AvatarMini } from "./AvatarStack";

interface ActivityItem {
  id: string;
  course_id: string;
  course_title: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  target_type: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  "course.created":          "created the course",
  "course.toc_generated":    "generated the TOC",
  "course.toc_locked":       "locked the TOC",
  "brief.approved":          "approved a brief",
  "brief.rejected":          "rejected a brief",
  "ppt.generated":           "rewrote a slide deck",
  "recording.uploaded":      "uploaded a recording",
  "recording.transcribed":   "transcribed a recording",
  "transcript.approved":     "approved a transcript",
  "content.generated":       "generated a content artifact",
  "content.approved":        "approved a content artifact",
  "course.published":        "published the course",
};

function actionLine(item: ActivityItem): string {
  const label = ACTION_LABEL[item.action]
    ?? item.action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toLowerCase());
  return label;
}

export function ActivityFeed({
  courseId,
  limit = 12,
  title = "Recent activity",
  emptyTitle = "No activity yet",
  emptyBody = "As your team approves briefs, records videos, and generates content, the latest events show up here.",
}: {
  courseId?: string;
  limit?: number;
  title?: string;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = `/api/activity?limit=${limit}` + (courseId ? `&courseId=${courseId}` : "");
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setItems(d.items ?? []))
      .catch((e) => setError(e.message));
  }, [courseId, limit]);

  return (
    <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">{title}</h2>
        {items && items.length > 0 && (
          <span className="text-[11.5px] text-slate-500">{items.length} events</span>
        )}
      </div>

      {/* Loading skeleton */}
      {items === null && !error && (
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-2.5 w-3/4 bg-slate-100 rounded animate-pulse" />
                <div className="h-2 w-1/3 bg-slate-50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 text-[12.5px] text-red-700 bg-red-50">Failed to load activity: {error}</div>
      )}

      {items && items.length === 0 && (
        <div className="px-5 py-8 text-center">
          <div className="text-[13.5px] font-semibold text-slate-900">{emptyTitle}</div>
          <div className="text-[12px] text-slate-500 mt-1 max-w-sm mx-auto">{emptyBody}</div>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/course/${it.course_id}/toc`}
                className="flex items-start gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors group"
              >
                {it.user_name ? (
                  <AvatarMini name={it.user_name} className="shrink-0 mt-0.5" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-slate-100 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0 text-[13px]">
                  <span className="font-semibold text-slate-900">{it.user_name ?? "Someone"}</span>{" "}
                  <span className="text-slate-600">{actionLine(it)}</span>{" "}
                  {it.course_title && (
                    <span className="text-slate-600">in <span className="font-medium text-slate-900">{it.course_title}</span></span>
                  )}
                  <div className="text-[11px] text-slate-500 mt-0.5">{relativeTime(it.created_at)}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
