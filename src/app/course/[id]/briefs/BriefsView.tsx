"use client";

// Briefs page — two-pane layout.
//
// LEFT  flat video list grouped by module / lesson, with status icons +
//       filter (All / Pending / Draft / Approved); single click selects.
// RIGHT brief for the selected video — embedded BriefCard without the
//       outer chrome.
//
// What we removed compared to the previous accordion version:
//   - Three-level expand-collapse (Module → Lesson → Video card)
//   - Per-card course-context banner repeated on every brief
//   - Per-card AI Suggest panel + Tone selector + meters always visible
//   - Keyboard j/k nav (kept simple — clicking is fine)
//
// What stays:
//   - "Generate all (N pending)" bulk action
//   - Per-module "Approve all"
//   - URL ?focus=<videoId> still selects that video on load

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, Sparkles, Loader2, FileText } from "lucide-react";
import { BriefCard } from "./BriefCard";
import { StatusPill } from "@/components/ui/StatusPill";

export interface BriefRow {
  videoId: string;
  videoTitle: string;
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  brief: {
    id?: string;
    talking_points: unknown;
    visual_cues: unknown;
    key_takeaways: unknown;
    script_outline: string;
    estimated_duration?: string;
    status: string;
    stale_since?: string | null;
    stale_reason?: string | null;
  } | null;
}

type FilterMode = "all" | "pending" | "draft" | "approved";

export function BriefsView({
  courseId, courseTitle, audienceLevel, prerequisites, rows,
}: {
  courseId: string;
  courseTitle: string;
  audienceLevel: string | null;
  prerequisites: string | null;
  rows: BriefRow[];
}) {
  const sp = useSearchParams();
  const focusVideoId = sp.get("focus");
  const [localRows, setLocalRows] = useState(rows);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedId, setSelectedId] = useState<string | null>(focusVideoId ?? rows[0]?.videoId ?? null);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  useEffect(() => {
    if (focusVideoId) setSelectedId(focusVideoId);
  }, [focusVideoId]);

  const totalVideos = localRows.length;
  const pending  = localRows.filter((r) => !r.brief).length;
  const drafted  = localRows.filter((r) => r.brief?.status === "draft").length;
  const approved = localRows.filter((r) => r.brief?.status === "approved").length;

  const matches = (r: BriefRow): boolean => {
    if (filter === "all") return true;
    if (filter === "pending") return !r.brief;
    if (filter === "draft") return r.brief?.status === "draft";
    if (filter === "approved") return r.brief?.status === "approved";
    return true;
  };
  const visible = useMemo(() => localRows.filter(matches), [localRows, filter]);

  // Group visible videos by module → lesson for the left list.
  const grouped = useMemo(() => {
    const map = new Map<string, { moduleTitle: string; moduleOrder: number; lessons: Map<string, { lessonTitle: string; rows: BriefRow[] }> }>();
    for (const r of visible) {
      if (!map.has(r.moduleId)) map.set(r.moduleId, { moduleTitle: r.moduleTitle, moduleOrder: r.moduleOrder, lessons: new Map() });
      const m = map.get(r.moduleId)!;
      if (!m.lessons.has(r.lessonId)) m.lessons.set(r.lessonId, { lessonTitle: r.lessonTitle, rows: [] });
      m.lessons.get(r.lessonId)!.rows.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].moduleOrder - b[1].moduleOrder)
      .map(([moduleId, m]) => ({ moduleId, ...m, lessons: Array.from(m.lessons.entries()).map(([lessonId, l]) => ({ lessonId, ...l })) }));
  }, [visible]);

  const generateAllPending = async () => {
    setBulkGenerating(true);
    const toGenerate = localRows.filter((r) => !r.brief);
    for (const r of toGenerate) {
      try {
        const res = await fetch("/api/ai/generate-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: r.videoId, courseId }),
        });
        const data = await res.json();
        if (data.success) {
          setLocalRows((rs) => rs.map((rr) => rr.videoId === r.videoId ? { ...rr, brief: data.brief } : rr));
        }
      } catch { /* swallow */ }
    }
    setBulkGenerating(false);
  };

  const selectedRow = localRows.find((r) => r.videoId === selectedId) ?? null;

  return (
    <div className="space-y-3">
      {/* Header strip */}
      <div className="bg-white border border-bi-navy-100 rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
        <div>
          <div className="text-[11px] text-bi-navy-500 uppercase tracking-wider">Briefs approved</div>
          <div className="text-[20px] font-semibold text-bi-navy-800">
            {approved}<span className="text-[13px] font-normal text-bi-navy-500"> / {totalVideos}</span>
          </div>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="h-1.5 bg-bi-navy-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-300" style={{ width: `${totalVideos ? Math.round((approved / totalVideos) * 100) : 0}%` }} />
          </div>
          <div className="text-[11px] text-bi-navy-500 mt-1">
            {pending} pending · {drafted} draft · {approved} approved
          </div>
        </div>
        {pending > 0 && (
          <button
            onClick={generateAllPending}
            disabled={bulkGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[12px] font-semibold hover:bg-bi-blue-200 disabled:opacity-50"
          >
            {bulkGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {bulkGenerating ? `Generating ${pending}…` : `Generate all (${pending} pending)`}
          </button>
        )}
        <div className="flex items-center gap-1.5">
          {([
            { k: "all"      as const, label: "All",      count: totalVideos, variant: "neutral"  as const },
            { k: "pending"  as const, label: "Pending",  count: pending,     variant: "pending"  as const },
            { k: "draft"    as const, label: "Draft",    count: drafted,     variant: "draft"    as const },
            { k: "approved" as const, label: "Approved", count: approved,    variant: "approved" as const },
          ]).map((f) => (
            <StatusPill
              key={f.k}
              variant={f.variant}
              label={f.label}
              count={f.count}
              active={filter === f.k}
              onClick={() => setFilter(f.k)}
            />
          ))}
        </div>
      </div>

      {/* Two-pane body */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3">
        {/* LEFT — videos list */}
        <aside className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden self-start max-h-[75vh] overflow-y-auto">
          {grouped.length === 0 ? (
            <div className="px-4 py-8 text-[12.5px] text-bi-navy-500 text-center italic">
              No briefs match this filter.
            </div>
          ) : grouped.map((m) => (
            <div key={m.moduleId}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-bi-navy-500 bg-bi-navy-50/50 border-b border-bi-navy-100">
                M{m.moduleOrder} · {m.moduleTitle}
              </div>
              {m.lessons.map((l) => (
                <div key={l.lessonId}>
                  <div className="px-3 pt-2 pb-0.5 text-[11px] text-bi-navy-500">{l.lessonTitle}</div>
                  {l.rows.map((r) => {
                    const isSel = selectedId === r.videoId;
                    return (
                      <button
                        key={r.videoId}
                        onClick={() => setSelectedId(r.videoId)}
                        className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-[12.5px] border-l-[3px] ${
                          isSel
                            ? "bg-bi-blue-50 border-l-bi-blue-400 text-bi-navy-900 font-semibold"
                            : "border-l-transparent text-bi-navy-700 hover:bg-bi-navy-50"
                        }`}
                      >
                        <StatusIcon status={r.brief?.status} />
                        <span className="flex-1 truncate">{r.videoTitle}</span>
                        {r.brief?.stale_since && (
                          <StatusPill
                            variant="stale"
                            size="sm"
                            label="Stale"
                            title={r.brief.stale_reason ?? "Outcomes changed since this brief was generated"}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* RIGHT — selected brief */}
        <main className="min-w-0">
          {selectedRow ? (
            <div className="bg-white border border-bi-navy-100 rounded-lg p-4">
              <header className="mb-3 pb-3 border-b border-bi-navy-100">
                <div className="text-[11px] text-bi-navy-500">
                  M{selectedRow.moduleOrder} · {selectedRow.moduleTitle} <span className="text-bi-navy-300 mx-1">›</span> {selectedRow.lessonTitle}
                </div>
                <div className="text-[15px] font-semibold text-bi-navy-900 mt-0.5">{selectedRow.videoTitle}</div>
              </header>
              <BriefCard
                embedded
                videoId={selectedRow.videoId}
                videoTitle={selectedRow.videoTitle}
                lessonTitle={selectedRow.lessonTitle}
                moduleTitle={selectedRow.moduleTitle}
                courseId={courseId}
                courseTitle={courseTitle}
                audienceLevel={audienceLevel}
                prerequisites={prerequisites}
                existingBrief={selectedRow.brief}
              />
            </div>
          ) : (
            <div className="bg-white border border-dashed border-bi-navy-200 rounded-lg p-12 text-center text-[13px] text-bi-navy-500 inline-flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> Pick a video on the left.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status?: string }) {
  if (status === "approved") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  if (status === "draft")    return <Circle className="w-3.5 h-3.5 text-bi-blue-400 shrink-0 fill-bi-blue-50" />;
  return                            <Circle className="w-3.5 h-3.5 text-bi-navy-300 shrink-0" />;
}
