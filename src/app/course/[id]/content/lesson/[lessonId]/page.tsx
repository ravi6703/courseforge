// Per-lesson content workspace.
//
// One lesson, every artifact kind in tabs. Drives the per-lesson rail
// inside VideoWorkspace (renamed conceptually; same component) by
// passing a synthetic "row" with the lesson's content_items.

import Link from "next/link";
import { ChevronLeft, Video as VideoIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { LessonWorkspaceClient } from "./LessonWorkspaceClient";

export default async function ContentLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const supabase = await getServerSupabase();

  const { data: lesson } = await supabase
    .from("lessons")
    .select(`
      id, title, course_id,
      module:modules (id, title, order),
      videos (id, title, order),
      content_items (id, kind, status, payload, generated_at, approved_at, generation_error)
    `)
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson || lesson.course_id !== id) notFound();

  const moduleObj = (lesson as unknown as { module?: { title: string; order: number } }).module;
  const videos = ((lesson as unknown as { videos?: Array<{ id: string; title: string; order: number }> }).videos ?? [])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const items = ((lesson as unknown as { content_items?: Array<{ id: string; kind: string; status: string; payload: unknown; generated_at: string | null; approved_at: string | null; generation_error: string | null }> }).content_items ?? []);

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={`/course/${id}/content`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-bi-navy-500 hover:text-bi-navy-900"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> All lessons
        </Link>
        <div className="text-[11.5px] text-bi-navy-500">
          M{moduleObj?.order ?? 0} · {moduleObj?.title ?? ""}
        </div>
      </header>

      {/* Compact video summary so the coach sees what this lesson covers */}
      {videos.length > 0 && (
        <section className="bg-white border border-bi-navy-100 rounded-lg p-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-bi-navy-500 mb-1.5 inline-flex items-center gap-1.5">
            <VideoIcon className="w-3 h-3" /> {videos.length} video{videos.length === 1 ? "" : "s"} in this lesson
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {videos.map((v, i) => (
              <li key={v.id} className="text-[12px] text-bi-navy-700 truncate">
                <span className="font-mono text-[10px] text-bi-navy-400 mr-1.5">V{i + 1}</span>
                {v.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      <LessonWorkspaceClient
        courseId={id}
        lessonId={lessonId}
        lessonTitle={lesson.title}
        moduleTitle={moduleObj?.title ?? ""}
        items={items.map((ci) => ({
          id: ci.id,
          kind: ci.kind,
          status: ci.status,
          payload: (ci.payload ?? {}) as Record<string, unknown>,
          generated_at: ci.generated_at ?? null,
          approved_at: ci.approved_at ?? null,
          generation_error: ci.generation_error ?? null,
        }))}
      />
    </div>
  );
}
