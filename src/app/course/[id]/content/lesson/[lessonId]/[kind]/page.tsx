// Per-lesson per-kind focused editor.
//
// Same workspace as /content/lesson/[lessonId] but the kind is locked
// from the URL. Lets a coach deep-link to "edit the Reading for lesson X"
// from the audit panel or stale-flag CTAs.

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { CONTENT_KINDS, KIND_META, type ContentKindKey } from "../../../types";
import { FocusedKindClient } from "./FocusedKindClient";

export default async function ContentLessonKindPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string; kind: string }>;
}) {
  const { id, lessonId, kind } = await params;
  if (!(CONTENT_KINDS as readonly string[]).includes(kind)) notFound();
  const k = kind as ContentKindKey;

  const sb = await getServerSupabase();
  const { data: lesson } = await sb
    .from("lessons")
    .select(`
      id, title, course_id,
      module:modules (id, title, order),
      content_items (id, kind, status, payload, generated_at, approved_at, generation_error)
    `)
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson || lesson.course_id !== id) notFound();

  const moduleObj = (lesson as unknown as { module?: { title: string; order: number } }).module;
  const items = ((lesson as unknown as { content_items?: Array<{ id: string; kind: string; status: string; payload: unknown; generated_at: string | null; approved_at: string | null; generation_error: string | null }> }).content_items ?? []);

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={`/course/${id}/content/lesson/${lessonId}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-bi-navy-500 hover:text-bi-navy-900"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> {lesson.title}
        </Link>
        <div className="text-[11.5px] text-bi-navy-500 inline-flex items-center gap-1.5">
          <span className={`text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded ${KIND_META[k].tone}`}>{KIND_META[k].icon}</span>
          {KIND_META[k].label}
          <span className="text-bi-navy-300 mx-1">·</span>
          M{moduleObj?.order ?? 0} · {moduleObj?.title ?? ""}
        </div>
      </header>

      <FocusedKindClient
        lessonId={lessonId}
        lessonTitle={lesson.title}
        kind={k}
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
