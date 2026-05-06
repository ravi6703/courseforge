"use client";

// Sidebar course tree — collapsible hierarchy that replaces the
// horizontal stage tabs. Course → Module → Lesson → Video, each with
// status pips for the 5 artifacts (reading / pq / gq / scorm / coach)
// and a contextual "..." menu.
//
// Selection drives the right pane via URL search params:
//   ?stage=profile|toc|briefs|ppts|recording|transcript|content|review
//   ?focus=<videoId>     selected video (optional)
//
// State persistence:
//   localStorage cf:tree:<courseId> stores expanded state per course
//   so a coach's deep-tree view survives navigation.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight, ChevronDown, MoreHorizontal, Search,
} from "lucide-react";

interface VideoNode {
  id: string;
  title: string;
  duration_minutes?: number | null;
  status?: string | null;
  // map kind → status (approved/draft/missing)
  artifacts?: Record<string, "approved" | "draft" | "missing">;
}
interface LessonNode {
  id: string;
  title: string;
  videos: VideoNode[];
}
interface ModuleNode {
  id: string;
  title: string;
  lessons: LessonNode[];
}

export interface CourseTreeData {
  courseId: string;
  courseTitle: string;
  modules: ModuleNode[];
  // Aggregate progress for the badge in the root row
  progressPct: number;
  healthScore?: number | null;
}

// 5 artifact kinds, used to compute the per-video completion dot.
const KINDS = ["reading", "pq", "gq", "scorm", "ai_coach"] as const;

function loadExpanded(courseId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(`cf:tree:${courseId}`) || "{}"); }
  catch { return {}; }
}
function saveExpanded(courseId: string, exp: Record<string, boolean>) {
  try { localStorage.setItem(`cf:tree:${courseId}`, JSON.stringify(exp)); } catch {}
}

export function CourseTree({ data }: { data: CourseTreeData }) {
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const focus = sp.get("focus");
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpanded(loadExpanded(data.courseId));
  }, [data.courseId]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveExpanded(data.courseId, next);
      return next;
    });
  };
  const expandAll = () => {
    const next: Record<string, boolean> = {};
    data.modules.forEach((m) => {
      next[`m:${m.id}`] = true;
      m.lessons.forEach((l) => { next[`l:${l.id}`] = true; });
    });
    setExpanded(next); saveExpanded(data.courseId, next);
  };
  const collapseAll = () => { setExpanded({}); saveExpanded(data.courseId, {}); };

  const isMatch = (text: string) => !search || text.toLowerCase().includes(search.toLowerCase());

  // Selection helper — when a video is clicked, push ?focus=<videoId> AND
  // jump to the appropriate stage. Default jump = current stage.
  const selectVideo = (videoId: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set("focus", videoId);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <aside className="bg-white border border-slate-200 rounded-[10px] flex flex-col overflow-hidden">
      {/* Compact rail header — course title shown in page chrome above,
          so the rail just shows progress + an "open TOC" affordance. */}
      <header className="px-3 py-2 border-b border-slate-200 flex items-center gap-2">
        <Link
          href={`/course/${data.courseId}/toc`}
          className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500 hover:text-bi-blue-700 shrink-0"
          title="Open TOC"
        >
          Tree
        </Link>
        <div className="flex-1 flex items-center gap-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-bi-blue-600 to-bi-accent-600" style={{ width: `${data.progressPct}%` }} />
          </div>
          <span className="font-bold text-slate-700 text-[10.5px] tabular-nums">{data.progressPct}%</span>
          {typeof data.healthScore === "number" && (
            <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${
              data.healthScore >= 80 ? "bg-emerald-50 text-emerald-700" :
              data.healthScore >= 60 ? "bg-amber-50 text-amber-700" :
                                        "bg-red-50 text-red-700"
            }`}>{data.healthScore}</span>
          )}
        </div>
      </header>

      {/* Search + expand controls */}
      <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-md px-2 py-1 focus-within:border-bi-blue-600 focus-within:ring-2 focus-within:ring-bi-blue-100 transition-all">
          <Search className="w-3 h-3 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find lesson or video…"
            className="flex-1 bg-transparent outline-none text-[12px] text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <button onClick={expandAll}   className="text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-900" title="Expand all">⤢</button>
        <button onClick={collapseAll} className="text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-900" title="Collapse all">⤡</button>
      </div>

      {/* Tree body */}
      <div className="flex-1 overflow-auto py-2">
        {data.modules.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12.5px] text-slate-500">
            Generate a TOC to see the lesson tree here.
          </div>
        ) : data.modules.map((mod, mi) => {
          const mKey = `m:${mod.id}`;
          const isOpen = expanded[mKey] ?? mi === 0; // open the first module by default
          const visibleLessons = mod.lessons.filter((l) =>
            isMatch(l.title) || l.videos.some((v) => isMatch(v.title))
          );
          if (search && visibleLessons.length === 0 && !isMatch(mod.title)) return null;
          return (
            <div key={mod.id} className="mt-1.5 first:mt-0">
              <Row
                indent={0}
                onClick={() => toggle(mKey)}
                chevron={isOpen ? "down" : "right"}
                title={mod.title}
                subtitle={`Module ${mi + 1}`}
                bold
                actions={[
                  {
                    label: "Re-pitch with different audience",
                    onClick: async () => {
                      const persona = window.prompt("Describe the new audience (e.g. 'Product managers, no engineering background, evaluating AI tools'):");
                      if (!persona?.trim()) return;
                      await fetch("/api/ai/improve-toc", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          courseId: data.courseId,
                          comments: [{
                            target_type: "module", target_id: mod.id,
                            text: `Re-pitch this module's title, description and learning objectives for a different audience: ${persona.trim()}.`,
                          }],
                          courseTitle: data.courseTitle,
                        }),
                      });
                      location.reload();
                    },
                  },
                  {
                    label: mi === 0 ? "Move down" : "Move up",
                    onClick: async () => {
                      const newOrder = mi === 0 ? 1 : mi - 1;
                      await fetch(`/api/courses/${data.courseId}/update-item`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ table: "modules", id: mod.id, order: newOrder }),
                      });
                      location.reload();
                    },
                  },
                ]}
              />
              {isOpen && mod.lessons.map((lesson, li) => {
                const lKey = `l:${lesson.id}`;
                const lOpen = expanded[lKey] ?? li === 0;
                const visibleVideos = lesson.videos.filter((v) => isMatch(v.title) || isMatch(lesson.title));
                if (search && visibleVideos.length === 0 && !isMatch(lesson.title)) return null;
                const prevLesson = mod.lessons[li - 1];
                return (
                  <div key={lesson.id}>
                    <Row
                      indent={1}
                      onClick={() => toggle(lKey)}
                      chevron={lOpen ? "down" : "right"}
                      title={lesson.title}
                      subtitle={`Lesson ${li + 1}`}
                      actions={[
                        {
                          label: "Split into two lessons",
                          onClick: async () => {
                            if (!confirm(`Split "${lesson.title}" into two lessons? The AI will draft titles for both halves.`)) return;
                            await fetch("/api/ai/improve-toc", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                courseId: data.courseId,
                                comments: [{
                                  target_type: "lesson", target_id: lesson.id,
                                  text: `Split this lesson into two distinct lessons that together cover the same scope. Give each a focused title and description.`,
                                }],
                                courseTitle: data.courseTitle,
                              }),
                            });
                            location.reload();
                          },
                        },
                        {
                          label: prevLesson ? `Merge with "${prevLesson.title}"` : "Merge with previous",
                          onClick: async () => {
                            if (!prevLesson) { alert("This is the first lesson — nothing to merge with."); return; }
                            if (!confirm(`Merge "${lesson.title}" into "${prevLesson.title}"? Videos move into the previous lesson and this lesson is deleted.`)) return;
                            // Move every video to the previous lesson, then delete this lesson row.
                            await Promise.all(lesson.videos.map((v) =>
                              fetch(`/api/courses/${data.courseId}/update-item`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ table: "videos", id: v.id, lesson_id: prevLesson.id }),
                              }).catch(() => null)
                            ));
                            await fetch(`/api/courses/${data.courseId}/update-item?table=lessons&itemId=${lesson.id}`, { method: "DELETE" });
                            location.reload();
                          },
                        },
                        {
                          label: li === 0 ? "Move down" : "Move up",
                          onClick: async () => {
                            const newOrder = li === 0 ? 1 : li - 1;
                            await fetch(`/api/courses/${data.courseId}/update-item`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ table: "lessons", id: lesson.id, order: newOrder }),
                            });
                            location.reload();
                          },
                        },
                      ]}
                    />
                    {lOpen && visibleVideos.map((vid, vi) => {
                      const isSel = vid.id === focus;
                      return (
                        <div key={vid.id}>
                          <button
                            type="button"
                            onClick={() => selectVideo(vid.id)}
                            className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 text-left transition-colors ${
                              isSel ? "bg-bi-blue-50 border-l-[3px] border-l-bi-blue-600 -ml-px" : "hover:bg-slate-50 border-l-[3px] border-l-transparent -ml-px"
                            }`}
                          >
                            <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0 w-6 tabular-nums">V{vi + 1}</span>
                            <span className={`flex-1 truncate text-[12.5px] ${isSel ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                              {vid.title}
                            </span>
                            <ArtifactPips artifacts={vid.artifacts || {}} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function Row({
  indent, onClick, chevron, title, subtitle, bold = false, actions,
}: {
  indent: number;
  onClick: () => void;
  chevron: "right" | "down";
  title: string;
  subtitle?: string;
  bold?: boolean;
  actions?: Array<{ label: string; onClick: () => void }>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      className={`flex items-center gap-1.5 pr-2 py-1.5 hover:bg-slate-50 group ${indent === 0 ? "pl-3" : "pl-5"}`}
    >
      <button onClick={onClick} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
        {chevron === "down"
          ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
        <span className={`truncate ${bold ? "text-[12.5px] font-bold text-slate-900" : "text-[12px] font-semibold text-slate-700"}`}>
          {title}
        </span>
        {subtitle && (
          <span className="ml-auto pl-2 text-[10px] text-slate-400 font-mono uppercase tracking-wider shrink-0">{subtitle}</span>
        )}
      </button>
      {actions && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-200 text-slate-500"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
          {menuOpen && (
            <>
              <button className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <ul className="absolute right-0 top-full mt-1 z-20 min-w-[180px] bg-white border border-slate-200 rounded-md shadow-lg py-1">
                {actions.map((a) => (
                  <li key={a.label}>
                    <button
                      onClick={() => { a.onClick(); setMenuOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50"
                    >{a.label}</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ArtifactPips({ artifacts }: { artifacts: Record<string, "approved" | "draft" | "missing"> }) {
  // Per coach feedback: 5 emoji pips per video read as clutter, not info.
  // Collapse to a single completion dot — green = all approved,
  // amber = at least one draft (in progress), gray = nothing yet.
  const states = KINDS.map((k) => artifacts[k] ?? "missing");
  const all = states.length;
  const approved = states.filter((s) => s === "approved").length;
  const draft = states.filter((s) => s === "draft").length;
  const tone =
    approved === all     ? "bg-emerald-400" :
    approved + draft > 0 ? "bg-amber-400"   :
                            "bg-slate-200";
  const label =
    approved === all     ? "All artifacts approved" :
    approved + draft > 0 ? `${approved}/${all} approved · ${draft} draft` :
                            "No artifacts yet";
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1.5"
      title={label}
    >
      <span className={`w-2 h-2 rounded-full ${tone}`} />
      <span className="text-[10px] font-mono tabular-nums text-slate-400">{approved}/{all}</span>
    </span>
  );
}
