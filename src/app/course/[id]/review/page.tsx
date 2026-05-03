// src/app/course/[id]/review/page.tsx — Final Review tab.
//
// Includes the wedge feature: <CourseHealthPanel /> rendered inline with the
// completion checklist. The PM cannot publish unless health score ≥ 80 AND
// all critical findings are resolved (enforced server-side at publish time).

import { CourseHealthPanel } from "@/components/CourseHealthPanel";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function ReviewTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [{ data: videos }, { data: transcripts }, { data: contentItems }, { data: pptSlides }] =
    await Promise.all([
      supabase.from("videos").select("id, status").eq("course_id", id),
      supabase.from("transcripts").select("id, status").eq("course_id", id),
      supabase.from("content_items").select("id, status").eq("course_id", id),
      supabase.from("ppt_slides").select("id, status").eq("course_id", id),
    ]);

  const checklist = [
    {
      label: "All videos recorded",
      done:
        (videos || []).length > 0 &&
        (videos || []).every((v) =>
          ["recorded", "transcribed", "reviewed"].includes(v.status)
        ),
      detail: `${(videos || []).filter((v) => ["recorded", "transcribed", "reviewed"].includes(v.status)).length} / ${(videos || []).length}`,
    },
    {
      label: "All transcripts approved",
      done:
        (transcripts || []).length > 0 &&
        (transcripts || []).every((t) => t.status === "approved"),
      detail: `${(transcripts || []).filter((t) => t.status === "approved").length} / ${(transcripts || []).length}`,
    },
    {
      label: "All slides finalized",
      done:
        (pptSlides || []).length > 0 &&
        (pptSlides || []).every((s) =>
          ["finalized", "approved"].includes(s.status)
        ),
      detail: `${(pptSlides || []).filter((s) => ["finalized", "approved"].includes(s.status)).length} / ${(pptSlides || []).length}`,
    },
    {
      label: "Supplemental content approved",
      done:
        (contentItems || []).length > 0 &&
        (contentItems || []).every((c) => c.status === "approved"),
      detail: `${(contentItems || []).filter((c) => c.status === "approved").length} / ${(contentItems || []).length}`,
    },
  ];

  return (
    <div className="space-y-4">
      <CourseHealthPanel courseId={id} />

      <section className="rounded-lg border border-bi-navy-200 bg-white">
        <header className="px-4 py-3 border-b border-bi-navy-200">
          <h2 className="font-semibold">Completion checklist</h2>
        </header>
        <ul className="divide-y divide-slate-100">
          {checklist.map((row) => (
            <li
              key={row.label}
              className="px-4 py-3 flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={
                    "inline-block w-5 h-5 rounded-full border-2 " +
                    (row.done
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-bi-navy-300 bg-white")
                  }
                  aria-hidden
                />
                <span className={row.done ? "text-bi-navy-900" : "text-bi-navy-600"}>
                  {row.label}
                </span>
              </div>
              <span className="text-xs text-bi-navy-500">{row.detail}</span>
            </li>
          ))}
        </ul>
        <footer className="px-4 py-3 border-t border-bi-navy-200 flex justify-end gap-2 text-sm">
          <button className="px-3 py-1.5 rounded-md border border-bi-navy-300 hover:bg-bi-navy-50">
            Submit for authority approval
          </button>
          <button
            className="px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={checklist.some((c) => !c.done)}
          >
            Publish course
          </button>
        </footer>
      </section>
    </div>
  );
}
