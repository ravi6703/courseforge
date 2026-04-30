"use client";

// src/app/course/_components/CourseTabs.tsx — URL-driven tab nav.

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: Array<{ slug: string; label: string }> = [
  { slug: "toc", label: "Table of Contents" },
  { slug: "briefs", label: "Content Briefs" },
  { slug: "ppts", label: "Presentations" },
  { slug: "recording", label: "Recording" },
  { slug: "transcript", label: "Transcript" },
  { slug: "content", label: "Content" },
  { slug: "review", label: "Final Review" },
];

export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const href = `/course/${courseId}/${t.slug}`;
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={t.slug}
              href={href}
              className={
                "px-3 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px " +
                (active
                  ? "border-slate-900 text-slate-900 font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-800")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
