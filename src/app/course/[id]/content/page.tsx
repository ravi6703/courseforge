import { getServerSupabase } from "@/lib/supabase/server";
// src/app/course/[id]/content/page.tsx — generated supplemental content viewer.


const KIND_LABEL: Record<string, string> = {
  reading: "Reading",
  practice_quiz: "Practice quiz",
  graded_quiz: "Graded quiz",
  discussion: "Discussion prompt",
  case_study: "Case study",
  glossary: "Glossary",
  ai_dialogue: "AI dialogue",
  peer_review: "Peer review",
};

export default async function ContentTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [{ data: items }, { data: transcripts }, { data: lessons }] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, type, title, status, lesson_id, lessons!inner(title, modules!inner(title))")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase.from("transcripts").select("lesson_id, status").eq("course_id", id),
    supabase.from("lessons").select("id").eq("course_id", id),
  ]);

  // Phase 2 R7 — content generation requires transcripts to exist for each lesson.
  // This is a soft gate (we still render existing items) but a banner tells the
  // user how many lessons need transcription before content generation makes sense.
  const transcribedLessonIds = new Set((transcripts || []).filter((t) => t.status === "ready").map((t) => t.lesson_id));
  const totalLessons = (lessons || []).length;
  const lessonsWithTranscript = (lessons || []).filter((l) => transcribedLessonIds.has(l.id)).length;
  const lessonsWaitingTranscript = totalLessons - lessonsWithTranscript;

  const groups: Record<string, typeof items> = {};
  (items || []).forEach((it) => {
    const k = it.type;
    (groups[k] = groups[k] || []).push(it);
  });

  return (
    <div className="space-y-4">
      {lessonsWaitingTranscript > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-amber-900">
            <span className="font-semibold">{lessonsWaitingTranscript} of {totalLessons}</span> lessons have no transcript yet — content generation works best after transcripts are ready.
          </div>
          <a href={`/course/${id}/transcript`} className="text-sm text-amber-900 hover:underline font-medium shrink-0">
            Go to Transcript →
          </a>
        </div>
      )}
      {Object.keys(KIND_LABEL).map((kind) => {
        const list = groups[kind] || [];
        if (list.length === 0) return null;
        return (
          <section key={kind} className="rounded-lg border border-bi-navy-200 bg-white">
            <header className="px-4 py-2 border-b border-bi-navy-200 flex justify-between text-sm">
              <span className="font-semibold">{KIND_LABEL[kind]}</span>
              <span className="text-xs text-bi-navy-500">{list.length}</span>
            </header>
            <ul className="divide-y divide-slate-100 text-sm">
              {list.map((it) => {
                const lesson = (it as { lessons?: { title?: string; modules?: { title?: string } } }).lessons;
                return (
                  <li key={it.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-bi-navy-900 truncate">{it.title}</div>
                      <div className="text-xs text-bi-navy-500 truncate">
                        {lesson?.modules?.title} › {lesson?.title}
                      </div>
                    </div>
                    <span className={pillFor(it.status)}>{it.status}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {(items || []).length === 0 && (
        <div className="rounded-lg border border-dashed border-bi-navy-300 p-10 text-center text-sm text-bi-navy-500">
          No supplemental content yet. Run content generation from the transcripts.
        </div>
      )}
    </div>
  );
}

function pillFor(s: string) {
  const map: Record<string, string> = {
    pending: "bg-bi-navy-100 text-bi-navy-600",
    generating: "bg-blue-50 text-blue-700",
    generated: "bg-purple-50 text-purple-700",
    approved: "bg-emerald-50 text-emerald-700",
  };
  return `text-xs px-2 py-0.5 rounded ${map[s] || "bg-bi-navy-100 text-bi-navy-600"}`;
}
