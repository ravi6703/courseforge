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

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight, ChevronDown, MoreHorizontal, Settings, Layers, FileText,
  Presentation, Video as VideoIcon, Mic, BookOpen, CheckCircle2, Search,
} from "lucide-react";

type StageSlug =
  | "profile" | "toc" | "briefs" | "ppts"
  | "recording" | "transcript" | "content" | "review";

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

const STAGE_LINKS: Array<{ slug: StageSlug; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { slug: "profile",    label: "Course profile",    icon: Settings       },
  { slug: "toc",        label: "Table of contents", icon: Layers         },
  { slug: "briefs",     label: "Content briefs",    icon: FileText       },
  { slug: "ppts",       label: "Presentations",     icon: Presentation   },
  { slug: "recording",  label: "Recordings",        icon: VideoIcon      },
  { slug: "transcript", label: "Transcripts",       icon: Mic            },
  { slug: "content",    label: "Content",           icon: BookOpen       },
  { slug: "review",     label: "Final review",      icon: CheckCircle2   },
];

// 5 artifact kinds, in the order the rail renders them
const KINDS = ["reading", "pq", "gq", "scorm", "ai_coach"] as const;
const KIND_GLYPH: Record<string, string> = {
  reading: "📖", pq: "✏️", gq: "📝", scorm: "📦", ai_coach: "🤖",
};

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

  // Determine current stage from the URL: /course/<id>/<stage>
  const stage = (() => {
    const m = pathname.match(/^\/course\/[^/]+\/([^/?#]+)/);
    return (m?.[1] as StageSlug | undefined) ?? "toc";
  })();

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
      {/* Course root — always visible */}
      <header className="px-4 py-3 border-b border-slate-200 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Course</div>
          <Link
            href={`/course/${data.courseId}/toc`}
            className="block mt-0.5 text-[14px] font-bold text-slate-900 truncate hover:text-bi-blue-700"
            title={data.courseTitle}
          >
            {data.courseTitle}
          </Link>
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-bi-blue-600 to-bi-accent-600" style={{ width: `${data.progressPct}%` }} />
            </div>
            <span className="font-bold text-slate-700">{data.progressPct}%</span>
            {typeof data.healthScore === "number" && (
              <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${
                data.healthScore >= 80 ? "bg-emerald-50 text-emerald-700" :
                data.healthScore >= 60 ? "bg-amber-50 text-amber-700" :
                                          "bg-red-50 text-red-700"
              }`}>{data.healthScore}</span>
            )}
          </div>
        </div>
      </header>

      {/* Stage links — always present, the right-pane router */}
      <nav className="px-2 py-2 border-b border-slate-200">
        <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500 px-2 pb-1.5">Stages</div>
        {STAGE_LINKS.map((s) => {
          const Icon = s.icon;
          const isCurrent = s.slug === stage;
          return (
            <Link
              key={s.slug}
              href={`/course/${data.courseId}/${s.slug}${focus ? `?focus=${focus}` : ""}`}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                isCurrent
                  ? "bg-slate-900 text-white font-semibold"
                  : "text-slate-700 hover:bg-slate-50 font-medium"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{s.label}</span>
            </Link>
          );
        })}
      </nav>

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
                  { label: "Re-pitch with different tone", onClick: () => alert("PATCH 5: re-pitch flow not wired yet") },
                  { label: "Reorder modules",              onClick: () => alert("PATCH 5: reorder UI not wired yet") },
                ]}
              />
              {isOpen && mod.lessons.map((lesson, li) => {
                const lKey = `l:${lesson.id}`;
                const lOpen = expanded[lKey] ?? li === 0;
                const visibleVideos = lesson.videos.filter((v) => isMatch(v.title) || isMatch(lesson.title));
                if (search && visibleVideos.length === 0 && !isMatch(lesson.title)) return null;
                return (
                  <div key={lesson.id}>
                    <Row
                      indent={1}
                      onClick={() => toggle(lKey)}
                      chevron={lOpen ? "down" : "right"}
                      title={lesson.title}
                      subtitle={`Lesson ${li + 1}`}
                      actions={[
                        { label: "Split into 2 lessons", onClick: () => alert("PATCH 5: split flow not wired yet") },
                        { label: "Merge with previous",  onClick: () => alert("PATCH 5: merge flow not wired yet") },
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
  return (
    <span className="flex items-center gap-0.5 shrink-0">
      {KINDS.map((k) => {
        const status = artifacts[k] ?? "missing";
        const cls = status === "approved" ? "bg-emerald-100 text-emerald-700"
                  : status === "draft"    ? "bg-amber-100 text-amber-700"
                                           : "bg-slate-100 text-slate-300";
        return (
          <span
            key={k}
            className={`w-4 h-4 rounded-sm grid place-items-center text-[9px] font-bold ${cls}`}
            title={`${k}: ${status}`}
          >{KIND_GLYPH[k]}</span>
        );
      })}
    </span>
  );
}
