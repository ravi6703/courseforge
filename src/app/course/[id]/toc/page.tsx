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

import Link from "next/link";
import { TocTree } from "./TocTree";
import { DepthSlider } from "./DepthSlider";
import { FinalToc } from "./FinalToc";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function TocTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [
    { data: modules }, { data: lessons }, { data: videos },
    { data: comments }, { data: research }, { data: course }, { data: lessonItems },
  ] = await Promise.all([
    supabase
      .from("modules")
      .select("id, title, description, order, learning_objectives")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase
      .from("lessons")
      .select("id, module_id, title, description, order, content_types, learning_objectives")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase
      .from("videos")
      .select("id, lesson_id, title, order")
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
    supabase
      .from("courses")
      .select("title, learning_objectives, profile")
      .eq("id", id)
      .single(),
    supabase
      .from("content_items")
      .select("id, lesson_id, kind, status")
      .eq("course_id", id)
      .not("lesson_id", "is", null),
  ]);

  const profile = (course as unknown as { profile?: { difficulty_arc?: "beginner_only" | "beginner_to_intermediate" | "mixed" | "advanced" } } | null)?.profile;
  const initialArc = profile?.difficulty_arc ?? "mixed";

  const moduleCount = (modules || []).length;
  const lessonCount = (lessons || []).length;
  const videoCount = (videos || []).length;

  // Per-module video count for downstream surfaces
  const videosByModule: Record<string, number> = {};
  (lessons || []).forEach((l) => {
    const lessonVideoCount = (videos || []).filter((v) => v.lesson_id === l.id).length;
    videosByModule[l.module_id] = (videosByModule[l.module_id] || 0) + lessonVideoCount;
  });

  return (
    <div className="space-y-6">
      <ResearchPanel research={research} />
      <DepthSlider courseId={id} initial={initialArc} />
      <div className="rounded-lg border border-bi-navy-200 bg-bi-navy-50 px-4 py-3 text-sm text-bi-navy-700 flex items-center gap-6 flex-wrap">
        <div><span className="font-semibold">{moduleCount}</span> <span className="text-bi-navy-500">modules</span></div>
        <div><span className="font-semibold">{lessonCount}</span> <span className="text-bi-navy-500">lessons</span></div>
        <div><span className="font-semibold">{videoCount}</span> <span className="text-bi-navy-500">videos</span></div>
        <div className="text-xs text-bi-navy-500 ml-auto flex items-center gap-3">
          <Link href={`/course/${id}/profile`} className="text-bi-blue-700 font-semibold hover:underline">
            ← Back to Course Profile
          </Link>
          <span>Briefs, slides, recordings and content all default to 1 per video.</span>
        </div>
      </div>
      <TocTree
        courseId={id}
        courseTitle={course?.title ?? ""}
        courseObjectives={(course?.learning_objectives as unknown[] | null) ?? []}
        modules={modules || []}
        lessons={lessons || []}
        videos={videos || []}
        comments={comments || []}
        videoCountByModule={videosByModule}
      />

      {/* Final TOC — read-only ordered view of the whole course as it
          will appear to a learner: every video first, then every
          non-video lesson artifact, in proper order. Per coach
          feedback the editor (above) is for outcomes; this section
          is the canonical "what the course looks like." */}
      <FinalToc
        courseId={id}
        modules={modules || []}
        lessons={lessons || []}
        videos={videos || []}
        items={(lessonItems || []).map((i) => ({ id: i.id, lesson_id: i.lesson_id, kind: i.kind, status: i.status }))}
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
        <p className="text-sm text-bi-navy-800 mb-2">{r.positioning_statement}</p>
      )}
      {r.why_better && r.why_better.length > 0 && (
        <ul className="text-sm text-bi-navy-700 list-disc pl-5 space-y-1">
          {r.why_better.map((b: string, i: number) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {r.competitor_courses && r.competitor_courses.length > 0 && (
        <div className="mt-2 text-xs text-bi-navy-500">
          Benchmarked against {r.competitor_courses.length} competitor course
          {r.competitor_courses.length === 1 ? "" : "s"}
        </div>
      )}
    </section>
  );
}
