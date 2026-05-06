import { ReactNode } from "react";
import { CourseHeader } from "../_components/CourseHeader";
import { CourseTree } from "../_components/CourseTree";
import { CollapsibleRail } from "../_components/CollapsibleRail";
import { loadCourseTreeData } from "../_components/loadCourseTree";
import { loadStageStatus } from "../_components/loadStageStatus";
import { AppShell } from "@/components/shell/AppShell";
import { getServerSupabase } from "@/lib/supabase/server";

// Course shell.
// 2026-05 declutter v2:
//   - Bottom export bar removed; exports live in the new Settings menu
//     (CourseSettingsMenu) on the header instead.
//   - CollapsibleRail picks its default state from the URL — collapsed
//     on overview pages, expanded on drill-down pages.

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
    </AppShell>
  );
}
