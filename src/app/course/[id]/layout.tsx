// src/app/course/[id]/layout.tsx
//
// REPLACES src/app/course/[id]/page.tsx (1738 lines) as the entry. Each tab
// becomes its own route. The current 7 tabs from the rust deployment:
//
//   /course/[id]              → header + redirect to /toc
//   /course/[id]/toc          → Table of Contents (extracted in this PR)
//   /course/[id]/briefs       → Content Briefs
//   /course/[id]/ppts         → Slide Studio
//   /course/[id]/recording    → Recording dashboard
//   /course/[id]/transcript   → Transcripts
//   /course/[id]/content      → Generated content (readings/quizzes/etc.)
//   /course/[id]/review       → Final Review
//
// Benefits:
//   - Each tab is now a small file (≤300 lines) and independently shippable
//   - Server components fetch only what each tab needs (less bundle bloat)
//   - URL-based tab state survives refresh and is shareable
//   - Easier code review, fewer merge conflicts on the monolith

import Link from "next/link";
import { ReactNode } from "react";
import { CourseHeader } from "../_components/CourseHeader";
import { CourseTabs } from "../_components/CourseTabs";

export default async function CourseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-slate-50">
      <CourseHeader courseId={id} />
      <CourseTabs courseId={id} />
      <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
      <ExportBar courseId={id} />
    </div>
  );
}

function ExportBar({ courseId }: { courseId: string }) {
  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-2 text-sm">
        <span className="text-slate-500 mr-2">Export:</span>
        <Link
          href={`/api/export/pptx?courseId=${courseId}`}
          className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50"
        >
          .pptx
        </Link>
        <Link
          href={`/api/export/scorm?courseId=${courseId}`}
          className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50"
        >
          SCORM 1.2
        </Link>
        <Link
          href={`/api/export/coursera?courseId=${courseId}`}
          className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50"
        >
          Coursera pack
        </Link>
        <span className="text-xs text-slate-400 ml-auto">
          Udemy + xAPI exports coming next
        </span>
      </div>
    </div>
  );
}
