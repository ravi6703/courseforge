// src/app/api/export/pptx/route.ts
//
// GET /api/export/pptx?courseId=...&videoId=...
//
// Streams back a real .pptx file generated from the slides in Supabase.
// If videoId is omitted, the entire course is exported as a single deck
// with section headers per video.
//
// Auth: relies on Supabase RLS — caller must be in the same org as the
// course. We use the request cookie to authenticate the Supabase client.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { renderSlidesToPptx, SlideJSON } from "@/lib/exporters/pptx";

export const runtime = "nodejs"; // pptxgenjs needs Node, not Edge
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  const videoId = url.searchParams.get("videoId");
  if (!courseId)
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });

  const supabase = await getServerSupabase();

  // Ownership check: collapse "not found" and "not yours" into 404 to avoid
  // leaking which course IDs exist in other orgs.
  const { data: ownerRow } = await supabase
    .from("courses")
    .select("org_id")
    .eq("id", courseId)
    .maybeSingle();
  if (!ownerRow || ownerRow.org_id !== auth.orgId)
    return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .select("id, title, description, org_id, orgs!inner(name, brand_kit)")
    .eq("id", courseId)
    .single();

  if (courseErr || !course)
    return NextResponse.json({ error: "Course not found" }, { status: 404 });

  let slidesQuery = supabase
    .from("ppt_slides")
    .select("slide_number, title, content, speaker_notes, layout_type, video_id, videos!inner(title, order)")
    .eq("course_id", courseId)
    .order("slide_number", { ascending: true });

  if (videoId) slidesQuery = slidesQuery.eq("video_id", videoId);

  const { data: slides, error: slidesErr } = await slidesQuery;
  if (slidesErr)
    return NextResponse.json({ error: slidesErr.message }, { status: 500 });
  if (!slides || slides.length === 0)
    return NextResponse.json({ error: "No slides to export" }, { status: 404 });

  const orgRow = (course as { orgs?: { name?: string; brand_kit?: { primary_hex?: string } } }).orgs;
  const buf = await renderSlidesToPptx(
    {
      title: course.title,
      description: course.description,
      org_name: orgRow?.name ?? null,
      brand_color_hex: orgRow?.brand_kit?.primary_hex ?? null,
    },
    videoId
      ? (slides[0] as { videos?: { title?: string } }).videos?.title || "Lecture"
      : course.title,
    slides as unknown as SlideJSON[]
  );

  const filename = `${slug(course.title)}${videoId ? `-${videoId.slice(0, 6)}` : ""}.pptx`;
  // Materialize a clean ArrayBuffer so TS narrows it to a valid BlobPart
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const body = new Blob([ab], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}
