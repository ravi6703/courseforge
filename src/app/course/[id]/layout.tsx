import Link from "next/link";
import { ReactNode } from "react";
import { CourseHeader } from "../_components/CourseHeader";
import { CourseTree } from "../_components/CourseTree";
import { CollapsibleRail } from "../_components/CollapsibleRail";
import { loadCourseTreeData } from "../_components/loadCourseTree";
import { loadStageStatus } from "../_components/loadStageStatus";
import { AppShell } from "@/components/shell/AppShell";
import { getServerSupabase } from "@/lib/supabase/server";

// Course shell — collapsible left rail (CourseTree) + workflow stepper
// in the header (StageNav). The shell is intentionally minimal so each
// page can use the freed space; the rail collapses to a 44px gutter.

export default async function CourseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const [{ data: course }, treeData, stageStatus] = await Promise.all([
    sb.from("courses").select("title").eq("id", id).maybeSingle(),
    loadCourseTreeData(sb, id),
    loadStageStatus(sb, id),
  ]);

  const crumbs = [
    { label: "Courses", href: "/dashboard" },
    { label: course?.title ?? "Course" },
  ];

  return (
    <AppShell crumbs={crumbs} fullBleed>
      <div className="bg-white">
        <CourseHeader courseId={id} stageStatus={stageStatus} />
      </div>
      <div className="max-w-[1480px] mx-auto px-7 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5">
          {treeData ? (
            <CollapsibleRail courseId={id}>
              <CourseTree data={treeData} />
            </CollapsibleRail>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[10px] p-4 text-[13px] text-slate-500 lg:w-[300px]">
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

// CollapsibleRail wraps the right-side gutter width; child width must be 300px
// when expanded, 44px when collapsed. The component handles both states.
