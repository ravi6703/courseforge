// Per-artifact full-page editor.
//
// Same VideoWorkspace component but the URL forces a single kind so the
// coach can focus on one artifact without the per-video tab strip
// distracting them. Useful from deep-links (audit fix arrows, briefs
// "Send to Content") and bookmarkable.

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { CONTENT_KINDS, KIND_META, type ContentKindKey } from "../../types";
import { FocusedKindClient } from "./FocusedKindClient";

export default async function ContentArtifactPage({
  params,
}: {
  params: Promise<{ id: string; videoId: string; kind: string }>;
}) {
  const { id, videoId, kind } = await params;
  if (!(CONTENT_KINDS as readonly string[]).includes(kind)) notFound();
  const k = kind as ContentKindKey;

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

  const lesson = (video as unknown as { lesson?: { title: string; module?: { title: string; order: number } } }).lesson;

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={`/course/${id}/content/${videoId}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-bi-navy-500 hover:text-bi-navy-900"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> {video.title}
        </Link>
        <div className="text-[11.5px] text-bi-navy-500 inline-flex items-center gap-1.5">
          <span className={`text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded ${KIND_META[k].tone}`}>{KIND_META[k].icon}</span>
          {KIND_META[k].label}
        </div>
      </header>

      <FocusedKindClient
        courseId={id}
        kind={k}
        row={{
          videoId: video.id,
          videoTitle: video.title,
          lessonTitle: lesson?.title ?? "",
          moduleTitle: lesson?.module?.title ?? "",
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
