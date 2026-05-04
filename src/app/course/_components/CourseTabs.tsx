"use client";

// Stage tabs underneath the CourseHeader. Matches the BI hub stage-tab
// pattern: subtle text, navy underline on active, "done" check icon on
// completed phases, count pill where it adds info.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ListTree, ClipboardList, Presentation, Video, Mic, BookOpen, CheckCircle2, Check,
} from "lucide-react";

const TABS = [
  { slug: "toc",        label: "Table of contents", icon: ListTree         },
  { slug: "briefs",     label: "Content briefs",    icon: ClipboardList    },
  { slug: "ppts",       label: "Presentations",     icon: Presentation     },
  { slug: "recording",  label: "Recordings",        icon: Video            },
  { slug: "transcript", label: "Transcripts",       icon: Mic              },
  { slug: "content",    label: "Content",           icon: BookOpen         },
  { slug: "review",     label: "Final review",      icon: CheckCircle2     },
] as const;

export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname() ?? "";
  // The "current" tab is whatever the URL ends with; everything before
  // it is considered "done" so the eye picks up progress immediately.
  const current = TABS.findIndex((t) => pathname.endsWith(`/${t.slug}`));

  return (
    <nav className="bg-white border-b border-bi-navy-100 px-7 sticky top-16 z-20">
      <div className="flex gap-px overflow-x-auto -mb-px">
        {TABS.map((t, i) => {
          const isCurrent = i === current;
          const isDone = current === -1 ? false : i < current;
          const Icon = t.icon;
          return (
            <Link
              key={t.slug}
              href={`/course/${courseId}/${t.slug}`}
              className={`inline-flex items-center gap-2 px-3.5 py-3 text-[13.5px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isCurrent
                  ? "border-bi-navy-900 text-bi-navy-900"
                  : "border-transparent text-bi-navy-500 hover:text-bi-navy-800"
              }`}
            >
              {isDone ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? "" : "opacity-70"}`} />
              )}
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
