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
    <div className="min-h-screen bg-bi-navy-50">
      <CourseHeader courseId={id} />
      <CourseTabs courseId={id} />
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
      <ExportBar courseId={id} />
    </div>
  );
}

function ExportBar({ courseId }: { courseId: string }) {
  return (
    <div className="border-t border-bi-navy-200 bg-white shadow-bi-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3 text-sm">
        <span className="font-semibold text-bi-navy-700">Export:</span>
        <Link
          href={`/api/export/pptx?courseId=${courseId}`}
          className="px-4 py-2 rounded-md border border-bi-navy-300 text-bi-navy-700 hover:bg-bi-navy-50 font-medium transition-colors"
        >
          PowerPoint
        </Link>
        <Link
          href={`/api/export/scorm?courseId=${courseId}`}
          className="px-4 py-2 rounded-md border border-bi-navy-300 text-bi-navy-700 hover:bg-bi-navy-50 font-medium transition-colors"
        >
          SCORM 1.2
        </Link>
        <Link
          href={`/api/export/coursera?courseId=${courseId}`}
          className="px-4 py-2 rounded-md border border-bi-navy-300 text-bi-navy-700 hover:bg-bi-navy-50 font-medium transition-colors"
        >
          Coursera
        </Link>
        <span className="text-xs text-bi-navy-600 ml-auto">
          Udemy & xAPI exports coming soon
        </span>
      </div>
    </div>
  );
}
