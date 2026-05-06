"use client";

// Workflow stepper across the top of every course page.
//
// Coach feedback: the app should feel like one guided flow, not a set
// of disconnected tabs. Each stage shows a state pip:
//   • green  = stage complete
//   • blue   = stage active (current)
//   • amber  = stage in progress (started but not done)
//   • gray   = stage not yet reached
//
// Compact on mobile, full labels at lg+.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings, Layers, Calendar, FileText, Presentation, Video, Mic, BookOpen, CheckCircle2, ChevronRight,
} from "lucide-react";

const STAGES = [
  { slug: "profile",    label: "Profile",     icon: Settings       },
  { slug: "toc",        label: "TOC",         icon: Layers         },
  { slug: "timeline",   label: "Timeline",    icon: Calendar       },
  { slug: "briefs",     label: "Briefs",      icon: FileText       },
  { slug: "ppts",       label: "Slides",      icon: Presentation   },
  { slug: "recording",  label: "Recording",   icon: Video          },
  { slug: "transcript", label: "Transcript",  icon: Mic            },
  { slug: "content",    label: "Content",     icon: BookOpen       },
  { slug: "review",     label: "Publish",     icon: CheckCircle2   },
] as const;

type Status = "done" | "active" | "in_progress" | "todo";

export interface StageNavProps {
  courseId: string;
  /** Status per stage slug — server-computed on each request. */
  stageStatus?: Partial<Record<(typeof STAGES)[number]["slug"], Status>>;
}

export function StageNav({ courseId, stageStatus = {} }: StageNavProps) {
  const pathname = usePathname() ?? "";

  // The current path determines "active". Derived status: anything
  // before active that's missing data → in_progress; anything after → todo.
  const activeIdx = STAGES.findIndex((s) => pathname.endsWith(`/${s.slug}`));

  return (
    <nav
      className="flex items-center gap-0.5 overflow-x-auto"
      aria-label="Course workflow stages"
    >
      {STAGES.map((s, i) => {
        const isActive = i === activeIdx;
        const status: Status =
          stageStatus[s.slug] ??
          (isActive ? "active" : i < activeIdx ? "in_progress" : "todo");
        const Icon = s.icon;

        const tone =
          status === "done"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : status === "active"
              ? "bg-bi-blue-100 text-bi-blue-700 border-bi-blue-300 ring-1 ring-bi-blue-200"
              : status === "in_progress"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "text-bi-navy-500 hover:bg-bi-navy-50 border-transparent";

        return (
          <span key={s.slug} className="inline-flex items-center">
            <Link
              href={`/course/${courseId}/${s.slug}`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold whitespace-nowrap transition-colors border ${tone}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status === "done"
                    ? "bg-emerald-500"
                    : status === "active"
                      ? "bg-bi-blue-600 animate-pulse"
                      : status === "in_progress"
                        ? "bg-amber-500"
                        : "bg-slate-300"
                }`}
              />
              <Icon className="w-3 h-3" />
              <span className="hidden xl:inline">{s.label}</span>
            </Link>
            {i < STAGES.length - 1 && (
              <ChevronRight className="w-2.5 h-2.5 text-bi-navy-300 mx-0.5 shrink-0" />
            )}
          </span>
        );
      })}
    </nav>
  );
}

export const STAGE_SLUGS = STAGES.map((s) => s.slug);
