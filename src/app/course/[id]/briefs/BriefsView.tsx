"use client";

// BriefsView — the redesigned briefs page UX.
//
// Replaces the 32-cards-fully-expanded wall with a scannable list:
//   - Cards collapsed by default; click to expand inline
//   - Grouped by module in collapsible accordion sections
//   - Filter bar at top (All / Drafted / Approved / Pending)
//   - Bulk actions: "Generate all briefs (N)", per-module "Approve all"
//   - Status icon + colored left border per card for at-a-glance scanning
//   - Course Context (audience + prereqs) shown once at the page header
//   - Keyboard shortcuts: j/k navigate, Enter expand, a approve, g generate

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown, ChevronRight, Sparkles, CheckCircle2, Circle, Clock,
  Filter
} from "lucide-react";
import { BriefCard } from "./BriefCard";

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
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterMode>("all");
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkApprovingModule, setBulkApprovingModule] = useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [localRows, setLocalRows] = useState(rows);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalVideos = localRows.length;
  const drafted = localRows.filter((r) => r.brief && r.brief.status === "draft").length;
  const approved = localRows.filter((r) => r.brief && r.brief.status === "approved").length;
  const pending = localRows.filter((r) => !r.brief).length;
  const approvedPct = totalVideos ? Math.round((approved / totalVideos) * 100) : 0;

  // Group by module preserving order
  const grouped = useMemo(() => {
    const map = new Map<string, { moduleId: string; moduleTitle: string; moduleOrder: number; rows: BriefRow[] }>();
    localRows.forEach((r) => {
      if (!map.has(r.moduleId)) map.set(r.moduleId, {
        moduleId: r.moduleId, moduleTitle: r.moduleTitle, moduleOrder: r.moduleOrder, rows: [],
      });
      map.get(r.moduleId)!.rows.push(r);
    });
    return Array.from(map.values()).sort((a, b) => a.moduleOrder - b.moduleOrder);
  }, [localRows]);

  // Apply filter
  const matchesFilter = (r: BriefRow): boolean => {
    if (filter === "all") return true;
    if (filter === "pending") return !r.brief;
    if (filter === "draft") return r.brief?.status === "draft";
    if (filter === "approved") return r.brief?.status === "approved";
    return true;
  };

  const visibleRows: BriefRow[] = useMemo(() =>
    grouped.flatMap((g) => g.rows.filter(matchesFilter)),
    [grouped, filter]
  );

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, visibleRows.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && focusedIdx >= 0 && focusedIdx < visibleRows.length) {
        const v = visibleRows[focusedIdx];
        toggleVideoExpanded(v.videoId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visibleRows, focusedIdx]);

  const toggleVideoExpanded = (videoId: string) => {
    setExpandedVideos((s) => {
      const next = new Set(s);
      if (next.has(videoId)) next.delete(videoId); else next.add(videoId);
      return next;
    });
  };

  const toggleModuleCollapsed = (moduleId: string) => {
    setCollapsedModules((s) => {
      const next = new Set(s);
      if (next.has(moduleId)) next.delete(moduleId); else next.add(moduleId);
      return next;
    });
  };

  // Bulk: generate briefs for every video that doesn't have one
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
      } catch { /* swallow per-row errors; continue */ }
    }
    setBulkGenerating(false);
  };

  // Bulk approve every brief whose video belongs to this module
  const approveModule = async (moduleId: string) => {
    setBulkApprovingModule(moduleId);
    try {
      const res = await fetch("/api/ai/approve-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, courseId, status: "approved" }),
      });
      if (res.ok) {
        // Optimistic update — flip every brief in that module to approved
        setLocalRows((rs) => rs.map((r) =>
          r.moduleId === moduleId && r.brief
            ? { ...r, brief: { ...r.brief, status: "approved" } }
            : r
        ));
      }
    } catch { /* swallow */ }
    setBulkApprovingModule(null);
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {/* HEADER */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Briefs approved</div>
            <div className="text-2xl font-bold mt-0.5">
              {approved}<span className="text-sm font-normal text-slate-500"> / {totalVideos} videos</span>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${approvedPct}%` }} />
            </div>
            <div className="text-xs text-slate-500 mt-1">{approvedPct}% approved · slides unlock once approved</div>
          </div>

          {pending > 0 && (
            <button
              onClick={generateAllPending}
              disabled={bulkGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-600 text-white text-xs hover:bg-bi-blue-700 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {bulkGenerating ? `Generating ${pending}…` : `Generate all (${pending} pending)`}
            </button>
          )}
        </div>

        {/* Course Context — audience + prereqs (shown once at top, not per-card) */}
        {(audienceLevel || prerequisites) && (
          <div className="rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs flex items-start gap-4 flex-wrap">
            <div className="font-semibold text-blue-900 uppercase tracking-wider">Course context</div>
            {audienceLevel && (
              <div className="flex gap-1.5"><span className="text-blue-700 font-medium">Audience:</span><span className="text-blue-900 capitalize">{audienceLevel}</span></div>
            )}
            {prerequisites && (
              <div className="flex gap-1.5 min-w-0"><span className="text-blue-700 font-medium shrink-0">Prerequisites:</span><span className="text-blue-900 truncate">{prerequisites}</span></div>
            )}
            <div className="text-bi-blue-600/70 italic ml-auto">AI uses this context automatically</div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          {[
            { key: "all" as const, label: "All", count: totalVideos },
            { key: "pending" as const, label: "Pending", count: pending },
            { key: "draft" as const, label: "Draft", count: drafted },
            { key: "approved" as const, label: "Approved", count: approved },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                filter === f.key
                  ? "bg-bi-navy-700 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label} <span className="opacity-70">({f.count})</span>
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-400">
            <kbd className="px-1 rounded bg-slate-100 font-mono">j</kbd> / <kbd className="px-1 rounded bg-slate-100 font-mono">k</kbd> nav · <kbd className="px-1 rounded bg-slate-100 font-mono">Enter</kbd> expand
          </span>
        </div>
      </div>

      {/* MODULE ACCORDIONS */}
      {grouped.map((g) => {
        const moduleVisible = g.rows.filter(matchesFilter);
        if (moduleVisible.length === 0 && filter !== "all") return null;
        const collapsed = collapsedModules.has(g.moduleId);
        const moduleApproved = g.rows.filter((r) => r.brief?.status === "approved").length;
        const allApproved = moduleApproved === g.rows.length && g.rows.length > 0;

        return (
          <div key={g.moduleId} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {/* Module header */}
            <header
              className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/60 cursor-pointer"
              onClick={() => toggleModuleCollapsed(g.moduleId)}
            >
              {collapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Module {g.moduleOrder}</div>
              <div className="font-semibold text-slate-900 truncate flex-1">{g.moduleTitle}</div>
              <div className="text-xs text-slate-500 shrink-0">{moduleApproved} / {g.rows.length} approved</div>
              {!allApproved && g.rows.some((r) => r.brief) && (
                <button
                  onClick={(e) => { e.stopPropagation(); approveModule(g.moduleId); }}
                  disabled={bulkApprovingModule === g.moduleId}
                  className="text-xs px-2 py-1 rounded border border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 inline-flex items-center gap-1 shrink-0"
                  title="Approve every brief in this module"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {bulkApprovingModule === g.moduleId ? "…" : "Approve all"}
                </button>
              )}
            </header>

            {/* Module body */}
            {!collapsed && (
              <ul className="divide-y divide-slate-100">
                {moduleVisible.map((r) => {
                  const focused = visibleRows[focusedIdx]?.videoId === r.videoId;
                  const expanded = expandedVideos.has(r.videoId);
                  return (
                    <li
                      key={r.videoId}
                      className={`transition-colors ${focused ? "bg-blue-50/40" : ""} ${
                        r.brief?.status === "approved" ? "border-l-4 border-l-emerald-400" :
                        r.brief?.status === "draft" ? "border-l-4 border-l-blue-400" :
                        "border-l-4 border-l-slate-200"
                      }`}
                    >
                      <button
                        onClick={() => toggleVideoExpanded(r.videoId)}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50/40"
                      >
                        <StatusIcon status={r.brief?.status} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-slate-500 truncate">
                            {r.lessonTitle}
                          </div>
                          <div className="text-sm text-slate-900 truncate">{r.videoTitle}</div>
                        </div>
                        {r.brief?.estimated_duration && (
                          <span className="text-[11px] text-slate-500 shrink-0 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />{r.brief.estimated_duration}
                          </span>
                        )}
                        <StatusPill status={r.brief?.status} />
                        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </button>

                      {expanded && (
                        <div className="px-2 pb-3 -mt-1">
                          {/* The actual BriefCard form lives here when expanded */}
                          <div className="rounded-md border border-slate-200 bg-slate-50/40 p-2">
                            <BriefCard
                              embedded
                              videoId={r.videoId}
                              videoTitle={r.videoTitle}
                              lessonTitle={r.lessonTitle}
                              moduleTitle={r.moduleTitle}
                              courseId={courseId}
                              courseTitle={courseTitle}
                              audienceLevel={audienceLevel}
                              prerequisites={prerequisites}
                              existingBrief={r.brief}
                            />
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
                {moduleVisible.length === 0 && (
                  <li className="px-4 py-3 text-xs text-slate-400">No briefs in this module match the current filter.</li>
                )}
              </ul>
            )}
          </div>
        );
      })}

      {totalVideos === 0 && (
        <div className="rounded-lg border border-dashed border-bi-navy-300 p-10 text-center text-sm text-slate-500">
          No videos yet — generate a TOC first to populate briefs.
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status?: string }) {
  if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (status === "draft") return <Circle className="w-4 h-4 text-blue-400 shrink-0 fill-blue-100" />;
  return <Circle className="w-4 h-4 text-slate-300 shrink-0" />;
}

function StatusPill({ status }: { status?: string }) {
  if (status === "approved") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium shrink-0">Approved</span>;
  if (status === "draft") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium shrink-0">Draft</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">Pending</span>;
}
