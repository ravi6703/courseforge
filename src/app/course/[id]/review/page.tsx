// Final review tab — re-themed to BI aesthetic. Keeps existing data flow:
// CourseHealthPanel + ShareHealthScoreToggle + completion checklist.

import { CourseHealthPanel } from "@/components/CourseHealthPanel";
import { ShareHealthScoreToggle } from "@/components/ShareHealthScoreToggle";
import { getServerSupabase } from "@/lib/supabase/server";
import { Tag } from "@/components/ui/Tag";
import { Check, X, ArrowRight } from "lucide-react";
import Link from "next/link";

interface CheckRow {
  label: string;
  done: boolean;
  detail: string;
  href?: string;
}

export default async function ReviewTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [
    { data: videos }, { data: transcripts }, { data: contentItems },
    { data: pptSlides }, { data: courseRow },
  ] = await Promise.all([
    supabase.from("videos").select("id, status").eq("course_id", id),
    supabase.from("transcripts").select("id, status").eq("course_id", id),
    supabase.from("content_items").select("id, status").eq("course_id", id),
    supabase.from("ppt_slides").select("id, status").eq("course_id", id),
    supabase.from("courses").select("public_health_score").eq("id", id).maybeSingle(),
  ]);

  const v = videos ?? [], t = transcripts ?? [], ci = contentItems ?? [], pp = pptSlides ?? [];

  const checklist: CheckRow[] = [
    {
      label: "All videos recorded",
      done: v.length > 0 && v.every((x) => ["recorded","transcribed","reviewed"].includes(x.status)),
      detail: `${v.filter((x) => ["recorded","transcribed","reviewed"].includes(x.status)).length} / ${v.length}`,
      href: `/course/${id}/recording`,
    },
    {
      label: "All transcripts approved",
      done: t.length > 0 && t.every((x) => x.status === "approved"),
      detail: `${t.filter((x) => x.status === "approved").length} / ${t.length}`,
      href: `/course/${id}/transcript`,
    },
    {
      label: "All slides finalized",
      done: pp.length > 0 && pp.every((x) => ["finalized","approved"].includes(x.status)),
      detail: `${pp.filter((x) => ["finalized","approved"].includes(x.status)).length} / ${pp.length}`,
      href: `/course/${id}/ppts`,
    },
    {
      label: "All content artifacts approved",
      done: ci.length > 0 && ci.every((x) => x.status === "approved"),
      detail: `${ci.filter((x) => x.status === "approved").length} / ${ci.length}`,
      href: `/course/${id}/content`,
    },
  ];

  const allDone = checklist.every((c) => c.done);

  return (
    <div className="space-y-4">
      {/* Course health panel + share toggle, side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CourseHealthPanel courseId={id} />
        <ShareHealthScoreToggle courseId={id} initialPublic={Boolean(courseRow?.public_health_score)} />
      </div>

      {/* Completion checklist */}
      <section className="bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm overflow-hidden">
        <header className="px-5 py-3.5 border-b border-bi-navy-100 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-bi-navy-900 tracking-tight">Completion checklist</h2>
            <div className="text-[12px] text-bi-navy-500 mt-0.5">
              {checklist.filter((c) => c.done).length} / {checklist.length} stages complete
            </div>
          </div>
          {allDone ? <Tag tone="emerald">Ready to publish</Tag> : <Tag tone="amber">In progress</Tag>}
        </header>
        <ul>
          {checklist.map((row) => (
            <li key={row.label} className="px-5 py-3 flex items-center gap-3 border-b border-bi-navy-50 last:border-0 hover:bg-bi-navy-50 group">
              <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center ${row.done ? "bg-emerald-100 text-emerald-700" : "bg-bi-navy-100 text-bi-navy-400"}`}>
                {row.done ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              </span>
              <span className={`flex-1 text-[13.5px] font-medium ${row.done ? "text-bi-navy-900" : "text-bi-navy-700"}`}>
                {row.label}
              </span>
              <span className="text-[12px] text-bi-navy-500 tabular-nums">{row.detail}</span>
              {row.href && (
                <Link href={row.href} className="text-[12px] font-semibold text-bi-blue-600 hover:underline shrink-0 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  Review <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </li>
          ))}
        </ul>
        <footer className="px-5 py-3 border-t border-bi-navy-100 flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 rounded-md border border-bi-navy-100 text-[13px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50">
            Submit for authority approval
          </button>
          <button
            disabled={!allDone}
            className="px-3.5 py-1.5 rounded-md bg-emerald-700 text-white text-[13px] font-semibold hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Publish course
          </button>
        </footer>
      </section>
    </div>
  );
}
