// src/app/course/[id]/toc/page.tsx
//
// The TOC tab — fully extracted from the 1738-line monolith as the model for
// how the other six tabs (briefs, ppts, recording, transcript, content,
// review) should be split. Server-rendered for the initial paint, then the
// `<TocTree />` client component handles inline edits + comment threading.
//
// Each lesson row links into deeper detail. Comments are now backed by the
// generic `comments` table (target_type='module' | 'lesson' | 'video' | 'toc')
// from migration_v2.sql.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { TocTree } from "./TocTree";

export default async function TocTab({
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

  const [{ data: modules }, { data: lessons }, { data: comments }, { data: research }] =
    await Promise.all([
      supabase
        .from("modules")
        .select("id, title, description, order, learning_objectives")
        .eq("course_id", id)
        .order("order", { ascending: true }),
      supabase
        .from("lessons")
        .select("id, module_id, title, description, order, content_types")
        .eq("course_id", id)
        .order("order", { ascending: true }),
      supabase
        .from("comments")
        .select("id, target_type, target_id, text, author_name, author_role, resolved, is_ai_flag, created_at")
        .eq("course_id", id)
        .in("target_type", ["module", "lesson", "video", "toc"])
        .order("created_at", { ascending: false }),
      supabase
        .from("course_research")
        .select("competitor_courses, why_better, positioning_statement, sources")
        .eq("course_id", id)
        .single(),
    ]);

  return (
    <div className="space-y-6">
      <ResearchPanel research={research} />
      <TocTree
        courseId={id}
        modules={modules || []}
        lessons={lessons || []}
        comments={comments || []}
      />
    </div>
  );
}

function ResearchPanel({ research }: { research: unknown }) {
  if (!research) return null;
  const r = research as {
    why_better?: string[];
    positioning_statement?: string;
    competitor_courses?: Array<{ name: string; rating?: number }>;
  };
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1">
        Why this TOC is better
      </div>
      {r.positioning_statement && (
        <p className="text-sm text-slate-800 mb-2">{r.positioning_statement}</p>
      )}
      {r.why_better && r.why_better.length > 0 && (
        <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
          {r.why_better.map((b: string, i: number) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {r.competitor_courses && r.competitor_courses.length > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          Benchmarked against {r.competitor_courses.length} competitor course
          {r.competitor_courses.length === 1 ? "" : "s"}
        </div>
      )}
    </section>
  );
}
