// Per-video PPT editor.
//
// Three panes:
//   LEFT   slide tiles (numbered, with status pip)
//   MIDDLE editable slide (title + bullets + image slot + speaker notes)
//   RIGHT  AI Edit chat scoped to the active slide
//
// Backed by the existing ppt_slides table (one row per slide).

import Link from "next/link";
import { ChevronLeft, Download } from "lucide-react";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { PptEditor } from "./PptEditor";

interface SlideRow {
  id: string;
  slide_number: number;
  title: string;
  content: unknown;
  speaker_notes: string | null;
  layout_type: string;
  status: string;
  image_url?: string | null;
}

export default async function PptVideoEditorPage({
  params,
}: {
  params: Promise<{ id: string; videoId: string }>;
}) {
  const { id, videoId } = await params;
  const sb = await getServerSupabase();

  const [{ data: video }, { data: course }, { data: slides }] = await Promise.all([
    sb.from("videos").select("id, title, course_id").eq("id", videoId).maybeSingle(),
    sb.from("courses").select("profile").eq("id", id).maybeSingle(),
    sb.from("ppt_slides")
      .select("id, slide_number, title, content, speaker_notes, layout_type, status, image_url")
      .eq("video_id", videoId)
      .order("slide_number", { ascending: true }),
  ]);
  if (!video || video.course_id !== id) notFound();

  // Pull brand colors + font from the course profile so the canvas
  // mirrors what the .pptx exporter actually produces.
  const profileBrand = (course as { profile?: { brand?: { primary_color?: string; accent_color?: string; typography?: string } } } | null)?.profile?.brand;
  const brand = {
    primary: profileBrand?.primary_color,
    accent:  profileBrand?.accent_color,
    font:    profileBrand?.typography,
  };

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={`/course/${id}/ppts`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-bi-navy-500 hover:text-bi-navy-900"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> All slide decks
        </Link>
        <a
          href={`/api/export/pptx?courseId=${id}&videoId=${videoId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-bi-navy-200 text-[12px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
        >
          <Download className="w-3.5 h-3.5" /> Download .pptx
        </a>
      </header>

      <PptEditor
        courseId={id}
        videoId={videoId}
        videoTitle={video.title}
        brand={brand}
        initialSlides={(slides ?? []) as SlideRow[]}
      />
    </div>
  );
}
