// src/app/course/[id]/content/page.tsx — generated supplemental content viewer.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: items } = await supabase
    .from("content_items")
    .select("id, type, title, status, lesson_id, lessons!inner(title, modules!inner(title))")
    .eq("course_id", id)
    .order("order", { ascending: true });

  const groups: Record<string, typeof items> = {};
  (items || []).forEach((it) => {
    const k = it.type;
    (groups[k] = groups[k] || []).push(it);
  });

  return (
    <div className="space-y-4">
      {Object.keys(KIND_LABEL).map((kind) => {
        const list = groups[kind] || [];
        if (list.length === 0) return null;
        return (
          <section key={kind} className="rounded-lg border border-slate-200 bg-white">
            <header className="px-4 py-2 border-b border-slate-200 flex justify-between text-sm">
              <span className="font-semibold">{KIND_LABEL[kind]}</span>
              <span className="text-xs text-slate-500">{list.length}</span>
            </header>
            <ul className="divide-y divide-slate-100 text-sm">
              {list.map((it) => {
                const lesson = (it as { lessons?: { title?: string; modules?: { title?: string } } }).lessons;
                return (
                  <li key={it.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-slate-900 truncate">{it.title}</div>
                      <div className="text-xs text-slate-500 truncate">
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
        <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          No supplemental content yet. Run content generation from the transcripts.
        </div>
      )}
    </div>
  );
}

function pillFor(s: string) {
  const map: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    generating: "bg-blue-50 text-blue-700",
    generated: "bg-purple-50 text-purple-700",
    approved: "bg-emerald-50 text-emerald-700",
  };
  return `text-xs px-2 py-0.5 rounded ${map[s] || "bg-slate-100 text-slate-600"}`;
}
