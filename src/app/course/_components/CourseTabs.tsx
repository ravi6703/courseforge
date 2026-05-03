"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  FileText,
  Presentation,
  Video,
  Mic,
  BookOpen,
  CheckSquare,
} from "lucide-react";

const TABS: Array<{ slug: string; label: string; icon: React.ReactNode }> = [
  { slug: "toc", label: "Table of Contents", icon: <Layers className="w-4 h-4" /> },
  { slug: "briefs", label: "Content Briefs", icon: <FileText className="w-4 h-4" /> },
  { slug: "ppts", label: "Presentations", icon: <Presentation className="w-4 h-4" /> },
  { slug: "recording", label: "Recording", icon: <Video className="w-4 h-4" /> },
  { slug: "transcript", label: "Transcript", icon: <Mic className="w-4 h-4" /> },
  { slug: "content", label: "Content", icon: <BookOpen className="w-4 h-4" /> },
  { slug: "review", label: "Final Review", icon: <CheckSquare className="w-4 h-4" /> },
];

export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-bi-navy-200 shadow-bi-sm">
      <div className="max-w-7xl mx-auto px-6 flex gap-0 overflow-x-auto">
        {TABS.map((t) => {
          const href = `/course/${courseId}/${t.slug}`;
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={t.slug}
              href={href}
              className={`
                px-4 py-3 text-sm whitespace-nowrap border-b-2 -mb-px flex items-center gap-2
                transition-colors duration-200
                ${
                  active
                    ? "border-bi-accent-600 text-bi-navy-700 font-semibold"
                    : "border-transparent text-bi-navy-600 hover:text-bi-navy-700"
                }
              `}
            >
              {t.icon}
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
