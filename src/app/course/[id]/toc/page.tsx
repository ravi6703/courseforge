// src/app/course/[id]/toc/page.tsx
//
// TOC tab — overhaul v1.
// Top of page:
//   1. ProfileChangedBanner   (if profile_updated_at > toc baseline)
//   2. ResearchPanel          (existing — moved into a collapsed details)
//   3. TocPresets             (named shape presets, replaces depth slider)
//   4. TocSummary             (counts + running totals + type mix)
// Body:
//   5. TocTree                (the in-place editor, unchanged)
//   6. Gantt                  (auto-generated project plan)
//   7. FinalToc               (read-only canonical learner view)

import { TocTree } from "./TocTree";
import { TocPresets } from "./TocPresets";
import { TocSummary } from "./TocSummary";
import { Gantt } from "./Gantt";
import { FinalToc } from "./FinalToc";
import { ProfileChangedBanner } from "./ProfileChangedBanner";
import { OutcomeCoverage } from "./OutcomeCoverage";
import { CompetitorOverlay } from "./CompetitorOverlay";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function TocTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [
    { data: modules },
    { data: lessons },
    { data: videos },
    { data: comments },
    { data: research },
    { data: course },
    { data: lessonItems },
  ] = await Promise.all([
    supabase
      .from("modules")
      .select("id, title, description, order, learning_objectives, updated_at")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase
      .from("lessons")
      .select("id, module_id, title, description, order, content_types, learning_objectives")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase
      .from("videos")
      .select("id, lesson_id, title, order, video_type, content_type, ideal_duration_minutes, duration_minutes")
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
      .select("title, learning_objectives, profile, profile_updated_at")
      .eq("id", id)
      .single(),
    supabase
      .from("content_items")
      .select("id, lesson_id, kind, status")
      .eq("course_id", id)
      .not("lesson_id", "is", null),
  ]);

  const profile = (course as unknown as {
    profile?: { difficulty_arc?: "beginner_only" | "beginner_to_intermediate" | "mixed" | "advanced" };
    profile_updated_at?: string;
  } | null)?.profile;
  const initialArc = profile?.difficulty_arc ?? "mixed";
  const profileUpdatedAt =
    (course as unknown as { profile_updated_at?: string } | null)?.profile_updated_at ?? null;

  const moduleCount = (modules || []).length;
  const lessonCount = (lessons || []).length;
  const videoCount = (videos || []).length;

  // Per-module video count for downstream surfaces
  const videosByModule: Record<string, number> = {};
  (lessons || []).forEach((l) => {
    const lessonVideoCount = (videos || []).filter((v) => v.lesson_id === l.id).length;
    videosByModule[l.module_id] = (videosByModule[l.module_id] || 0) + lessonVideoCount;
  });

  const totalMinutes = (videos || []).reduce(
    (sum, v) => sum + (v.ideal_duration_minutes ?? v.duration_minutes ?? 0),
    0,
  );
  const typeBreakdown: Record<string, number> = {};
  (videos || []).forEach((v) => {
    const t = v.video_type ?? "theory";
    typeBreakdown[t] = (typeBreakdown[t] ?? 0) + 1;
  });

  // Use the most recently updated module's updated_at as the "TOC baseline"
  // for stale-banner comparison.
  const tocBaseline = (modules || []).reduce<string | null>((latest, m) => {
    const u = m.updated_at as string | undefined;
    if (!u) return latest;
    return latest && new Date(latest).getTime() >= new Date(u).getTime() ? latest : u;
  }, null);

  const lessonForGantt = (lessons || []).map((l) => ({
    id: l.id,
    title: l.title,
    module_id: l.module_id,
  }));

  return (
    <div className="space-y-6">
      {profileUpdatedAt && (
        <ProfileChangedBanner
          courseId={id}
          profileUpdatedAt={profileUpdatedAt}
          tocLastGeneratedAt={tocBaseline}
        />
      )}
      <ResearchPanel research={research} />
      <TocPresets courseId={id} initialArc={initialArc} />
      <TocSummary
        courseId={id}
        moduleCount={moduleCount}
        lessonCount={lessonCount}
        videoCount={videoCount}
        totalMinutes={totalMinutes}
        videoTypeBreakdown={typeBreakdown}
      />
      <OutcomeCoverage courseId={id} />
      <CompetitorOverlay
        courseId={id}
        ownTopics={(modules || []).map((m) => m.title).concat((lessons || []).map((l) => l.title))}
      />
      <TocTree
        courseId={id}
        courseTitle={course?.title ?? ""}
        courseObjectives={(course?.learning_objectives as unknown[] | null) ?? []}
        modules={modules || []}
        lessons={lessons || []}
        videos={(videos || []).map((v) => ({
          ...v,
          // Coerce optional numbers so client component can rely on them.
          ideal_duration_minutes: v.ideal_duration_minutes ?? null,
          video_type: v.video_type ?? "theory",
        }))}
        comments={comments || []}
        videoCountByModule={videosByModule}
      />
      <Gantt courseId={id} lessons={lessonForGantt} />
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
    <details className="rounded-lg border border-emerald-200 bg-emerald-50/40 overflow-hidden">
      <summary className="px-4 py-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between hover:bg-emerald-50">
        <span className="text-xs font-medium text-emerald-700 uppercase tracking-wider">
          Why this TOC is better
        </span>
        <span className="text-[11px] text-emerald-600 font-semibold">
          {(r.competitor_courses?.length ?? 0)} competitors · click to expand
        </span>
      </summary>
      <div className="px-4 pb-3 pt-1">
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
      </div>
    </details>
  );
}
