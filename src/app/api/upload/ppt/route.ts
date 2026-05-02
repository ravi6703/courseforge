// POST /api/upload/ppt
//
// Phase 6 — Coach uploads an externally-built .pptx. We store the file
// in the ppt-uploads bucket under <org_id>/<course_id>/<upload_id>.pptx,
// create a ppt_uploads row, and parse the slide text inline so the
// downstream rewrite endpoint has something to work with.
//
// Request: multipart/form-data with fields:
//   file:      the .pptx (or .pdf, but we only parse .pptx today)
//   videoId:   the videos.id this PPT belongs to
//   courseId:  videos.course_id (we revalidate ownership against this)
//
// Response:
//   { upload_id, slide_count, slides: ParsedSlide[] }

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser, getServiceSupabase } from "@/lib/supabase/server";
import { parsePptx } from "@/lib/pptx/parse";
import { recordActivity } from "@/lib/activity";
import { logger, requestId } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — match the bucket limit

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const log = logger("api/upload/ppt").child({ req: requestId(), org: auth.orgId });

  // Multipart parse — Next 14 supports req.formData() natively.
  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 }); }

  const file = form.get("file");
  const videoId = form.get("videoId") as string | null;
  const courseId = form.get("courseId") as string | null;

  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!videoId || !courseId) return NextResponse.json({ error: "videoId and courseId are required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: `File exceeds ${MAX_BYTES} bytes` }, { status: 413 });

  // Ownership: the course (and therefore the video) must belong to the user's org.
  const sb = await getServerSupabase();
  const { data: courseRow } = await sb.from("courses").select("org_id").eq("id", courseId).maybeSingle();
  if (!courseRow || courseRow.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }
  const { data: videoRow } = await sb.from("videos").select("id, course_id").eq("id", videoId).eq("course_id", courseId).maybeSingle();
  if (!videoRow) return NextResponse.json({ error: "video not found" }, { status: 404 });

  // Read file bytes (we need them for both parse + storage upload).
  const buf = Buffer.from(await file.arrayBuffer());

  // Parse text up front so we can store it on the row.
  let slides: Awaited<ReturnType<typeof parsePptx>> = [];
  let parseError: string | null = null;
  try {
    slides = await parsePptx(buf);
    log.info({ slideCount: slides.length, fileBytes: buf.length }, "parsed pptx");
  } catch (e) {
    parseError = (e as Error).message;
    log.error({ err: e }, "pptx parse failed");
  }

  // Storage upload via service role (bucket is private; we'll generate
  // signed URLs on read). The path encodes org_id so the storage RLS
  // policy added in migration v4 keeps cross-org reads out.
  const uploadId = crypto.randomUUID();
  const storagePath = `${auth.orgId}/${courseId}/${uploadId}.pptx`;
  const service = getServiceSupabase();
  const { error: storeErr } = await service.storage
    .from("ppt-uploads")
    .upload(storagePath, buf, {
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      upsert: false,
    });
  if (storeErr) {
    log.error({ err: storeErr }, "storage upload failed");
    return NextResponse.json({ error: storeErr.message }, { status: 500 });
  }

  // Insert ppt_uploads row (RLS-bound — the user can read it back).
  const { data: row, error: insErr } = await sb.from("ppt_uploads").insert({
    id: uploadId,
    org_id: auth.orgId,
    course_id: courseId,
    video_id: videoId,
    uploaded_by: auth.profileId,
    original_filename: file.name,
    storage_path: storagePath,
    slide_count: slides.length,
    status: parseError ? "uploaded" : "parsed",
    slide_text: slides,
    parse_error: parseError,
  }).select("id, status, slide_count").single();

  if (insErr) {
    log.error({ err: insErr }, "ppt_uploads insert failed");
    // Best-effort cleanup of the orphan storage object.
    await service.storage.from("ppt-uploads").remove([storagePath]).catch(() => {});
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await recordActivity(sb, {
    orgId: auth.orgId,
    userId: auth.profileId,
    userName: auth.email ?? undefined,
    userRole: auth.role,
    courseId,
    action: "ppt.uploaded",
    targetType: "video",
    targetId: videoId,
    details: { slide_count: slides.length, filename: file.name },
  });

  return NextResponse.json({
    upload_id: row.id,
    slide_count: row.slide_count,
    status: row.status,
    parse_error: parseError,
    slides,
  });
}
