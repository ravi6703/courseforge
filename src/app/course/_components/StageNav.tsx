"use client";

// Compact stage selector. Lives in the CourseHeader so navigation
// between course-production phases is always one click away — without
// taking up vertical space on the left rail (which is now reserved for
// the TOC tree per coach feedback).

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings, Layers, FileText, Presentation, Video, Mic, BookOpen, CheckCircle2,
} from "lucide-react";

const STAGES = [
  { slug: "profile",    label: "Profile",     icon: Settings       },
  { slug: "toc",        label: "TOC",         icon: Layers         },
  { slug: "briefs",     label: "Briefs",      icon: FileText       },
  { slug: "ppts",       label: "Slides",      icon: Presentation   },
  { slug: "recording",  label: "Recordings",  icon: Video          },
  { slug: "transcript", label: "Transcripts", icon: Mic            },
  { slug: "content",    label: "Content",     icon: BookOpen       },
  { slug: "review",     label: "Review",      icon: CheckCircle2   },
] as const;

export function StageNav({ courseId }: { courseId: string }) {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Course stages">
      {STAGES.map((s) => {
        const isCurrent = pathname.endsWith(`/${s.slug}`);
        const Icon = s.icon;
        return (
          <Link
            key={s.slug}
            href={`/course/${courseId}/${s.slug}`}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-semibold whitespace-nowrap transition-colors ${
              isCurrent
                ? "bg-bi-navy-900 text-white"
                : "text-bi-navy-600 hover:bg-bi-navy-100"
            }`}
          >
            <Icon className="w-3 h-3" />
            <span>{s.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
