import Link from "next/link";
import { ReactNode } from "react";
import { CourseHeader } from "../_components/CourseHeader";
import { CourseTree } from "../_components/CourseTree";
import { loadCourseTreeData } from "../_components/loadCourseTree";
import { AppShell } from "@/components/shell/AppShell";
import { getServerSupabase } from "@/lib/supabase/server";

// Course shell — replaces the old horizontal CourseTabs stage bar with
// a persistent left rail (CourseTree). Stage navigation lives inside
// the tree under "Stages"; the lesson hierarchy lives below.
export default async function CourseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const [{ data: course }, treeData] = await Promise.all([
    sb.from("courses").select("title").eq("id", id).maybeSingle(),
    loadCourseTreeData(sb, id),
  ]);

  const crumbs = [
    { label: "Courses", href: "/dashboard" },
    { label: course?.title ?? "Course" },
  ];

  return (
    <AppShell crumbs={crumbs} fullBleed>
      <div className="bg-white">
        <CourseHeader courseId={id} />
      </div>
      <div className="max-w-[1480px] mx-auto px-7 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
          {treeData ? (
            <div className="lg:sticky lg:top-[120px] lg:self-start" style={{ maxHeight: "calc(100vh - 140px)" }}>
              <CourseTree data={treeData} />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[10px] p-4 text-[13px] text-slate-500">
              Course tree unavailable.
            </div>
          )}
          <div className="min-w-0">{children}</div>
        </div>
      </div>
      <ExportBar courseId={id} />
    </AppShell>
  );
}

function ExportBar({ courseId }: { courseId: string }) {
  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="max-w-[1480px] mx-auto px-7 py-3 flex items-center gap-3 text-[13px]">
        <span className="font-semibold text-slate-700">Export:</span>
        <Link href={`/api/export/pptx?courseId=${courseId}`}     className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">PowerPoint</Link>
        <Link href={`/api/export/scorm?courseId=${courseId}`}    className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">SCORM 1.2</Link>
        <Link href={`/api/export/coursera?courseId=${courseId}`} className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Coursera</Link>
        <span className="text-[11.5px] text-slate-500 ml-auto">Udemy &amp; xAPI exports coming soon</span>
      </div>
    </div>
  );
}
