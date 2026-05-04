import Link from "next/link";
import { ReactNode } from "react";
import { CourseHeader } from "../_components/CourseHeader";
import { CourseTabs } from "../_components/CourseTabs";
import { AppShell } from "@/components/shell/AppShell";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function CourseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  const crumbs = [
    { label: "Courses", href: "/dashboard" },
    { label: course?.title ?? "Course" },
  ];

  return (
    <AppShell crumbs={crumbs} fullBleed>
      <div className="bg-white">
        <CourseHeader courseId={id} />
        <CourseTabs courseId={id} />
      </div>
      <div className="max-w-[1320px] mx-auto px-7 py-6">{children}</div>
      <ExportBar courseId={id} />
    </AppShell>
  );
}

function ExportBar({ courseId }: { courseId: string }) {
  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="max-w-[1320px] mx-auto px-7 py-3 flex items-center gap-3 text-[13px]">
        <span className="font-semibold text-slate-700">Export:</span>
        <Link href={`/api/export/pptx?courseId=${courseId}`}     className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">PowerPoint</Link>
        <Link href={`/api/export/scorm?courseId=${courseId}`}    className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">SCORM 1.2</Link>
        <Link href={`/api/export/coursera?courseId=${courseId}`} className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Coursera</Link>
        <span className="text-[11.5px] text-slate-500 ml-auto">Udemy &amp; xAPI exports coming soon</span>
      </div>
    </div>
  );
}
