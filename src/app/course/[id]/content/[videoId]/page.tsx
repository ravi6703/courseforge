// Per-video content workspace. One video, every artifact kind in tabs.
//
// Reuses the existing VideoWorkspace component which is the right
// abstraction; this page just hydrates the row from Supabase.

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { VideoWorkspaceClient } from "./VideoWorkspaceClient";

export default async function ContentVideoPage({
  params,
}: {
  params: Promise<{ id: string; videoId: string }>;
}) {
  const { id, videoId } = await params;
  const supabase = await getServerSupabase();

  const { data: video } = await supabase
    .from("videos")
    .select(`
      id, title, course_id,
      lesson:lessons (id, title, module:modules (id, title, order)),
      content_items (id, kind, status, payload, generated_at, approved_at, generation_error)
    `)
    .eq("id", videoId)
    .maybeSingle();

  if (!video || video.course_id !== id) notFound();

  // Supabase joined the lesson/module as nested objects (or null).
  const lesson = (video as unknown as { lesson?: { id: string; title: string; module?: { title: string; order: number } } }).lesson;
  const moduleTitle = lesson?.module?.title ?? "";
  const moduleOrder = lesson?.module?.order ?? 0;

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={`/course/${id}/content`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-bi-navy-500 hover:text-bi-navy-900"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> All content
        </Link>
        <div className="text-[11.5px] text-bi-navy-500">
          M{moduleOrder} · {moduleTitle} <span className="text-bi-navy-300 mx-1">›</span> {lesson?.title ?? ""}
        </div>
      </header>

      <VideoWorkspaceClient
        courseId={id}
        row={{
          videoId: video.id,
          videoTitle: video.title,
          lessonTitle: lesson?.title ?? "",
          moduleTitle,
          contentItems: (video.content_items || []).map((ci) => ({
            id: ci.id,
            kind: ci.kind,
            status: ci.status,
            payload: (ci.payload ?? {}) as Record<string, unknown>,
            generated_at: ci.generated_at ?? null,
            approved_at: ci.approved_at ?? null,
            generation_error: ci.generation_error ?? null,
          })),
        }}
      />
    </div>
  );
}
