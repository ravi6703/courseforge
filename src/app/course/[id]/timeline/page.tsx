// Dedicated Timeline (Gantt) page.
//
// Coach feedback: "where is the Gantt or project timeline chart?" — it
// was tucked at the bottom of the TOC page. Now it has a top-level
// stage so it's discoverable from the workflow stepper.

import Link from "next/link";
import { Calendar, ArrowLeft, Sparkles } from "lucide-react";
import { Gantt } from "../toc/Gantt";
import { AutoAdjust } from "./AutoAdjust";
import { CapacityWidget } from "./CapacityWidget";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const [{ data: course }, { data: lessons }] = await Promise.all([
    sb.from("courses").select("title, target_days, target_completion_date, toc_locked").eq("id", id).maybeSingle(),
    sb.from("lessons").select("id, title, module_id, order").eq("course_id", id).order("order", { ascending: true }),
  ]);

  const lessonForGantt = (lessons ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    module_id: l.module_id,
  }));

  const tocLocked = Boolean(course?.toc_locked);

  return (
    <div className="space-y-4">
      <header className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <Calendar className="w-5 h-5 text-bi-blue-700 mt-0.5" />
        <div className="flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Project plan</div>
          <h1 className="text-[18px] font-bold text-bi-navy-900">Timeline &amp; Gantt</h1>
          <p className="text-[12.5px] text-bi-navy-600 mt-0.5">
            Pick a target completion date or days, and we generate a per-lesson plan covering
            brief → slides → record → transcript → assets. Slipping steps surface in red and
            trigger in-app notifications.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/course/${id}/toc`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-3 h-3" /> Back to TOC
          </Link>
          <Link
            href={`/course/${id}/briefs`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-600 text-white text-[12px] font-semibold hover:bg-bi-blue-700"
          >
            <Sparkles className="w-3 h-3" /> Continue to Briefs
          </Link>
        </div>
      </header>

      {!tocLocked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-900">
          The TOC isn&apos;t locked yet. Generating a plan now is fine — we&apos;ll regenerate
          automatically if you add or remove lessons. <Link href={`/course/${id}/toc`} className="underline font-semibold">Open TOC</Link>.
        </div>
      )}

      <Gantt courseId={id} lessons={lessonForGantt} />

      <AutoAdjust courseId={id} />
      <CapacityWidget />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
        <span className="font-semibold text-slate-800">How this works:</span> when you click <em>Generate plan</em>,
        we walk every lesson and allocate days to brief → slides → record → transcript → assets,
        then bookend with course-level steps (profile, TOC review, final review, publish).
        Day weights are tuned for typical SaaS courses; you can regenerate any time the TOC changes.
      </div>
      <div className="mt-1 text-[11px] text-bi-navy-400">
        Course: {course?.title ?? id}
      </div>
    </div>
  );
}
