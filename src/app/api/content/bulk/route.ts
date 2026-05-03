// POST /api/content/bulk
//
// Two bulk actions, scoped to a single video, used by the v2 Content tab
// header buttons:
//
//   { video_id, action: "approve_ready" }  → flip every draft item on this
//                                            video to approved (server-side
//                                            atomic update).
//   { video_id, action: "regen_all"     }  → re-fire /api/content/generate
//                                            for every existing kind on this
//                                            video. Implemented by clearing
//                                            the items to draft and returning
//                                            the list of (video_id, kind)
//                                            pairs the client should hit.
//                                            The actual generation runs from
//                                            the browser to dodge Vercel's
//                                            background-fetch cancellation.
//
// Auth: requires a session. RLS does the org isolation on the underlying
// content_items / videos rows.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  video_id: z.string().uuid(),
  action: z.enum(["approve_ready", "regen_all"]),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const raw = await req.json().catch(() => ({}));
  const parse = BodySchema.safeParse(raw);
  if (!parse.success) {
    return NextResponse.json(
      { error: "invalid request", issues: parse.error.issues },
      { status: 400 }
    );
  }

  const { video_id, action } = parse.data;
  const sb = await getServerSupabase();

  // Confirm the video exists in the caller's org. RLS would block a
  // foreign-org video from showing up, but we want a clean 404 rather
  // than a successful zero-row update on a bad id.
  const { data: video } = await sb
    .from("videos")
    .select("id")
    .eq("id", video_id)
    .maybeSingle();
  if (!video) {
    return NextResponse.json({ error: "video not found" }, { status: 404 });
  }

  if (action === "approve_ready") {
    const { data, error } = await sb
      .from("content_items")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("video_id", video_id)
      .eq("status", "draft")
      .select("id, kind");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ approved: data ?? [], count: data?.length ?? 0 });
  }

  // action === "regen_all"
  const { data: items, error: listErr } = await sb
    .from("content_items")
    .select("id, kind, status")
    .eq("video_id", video_id);
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }
  // Reset to draft so the UI shows the "Regenerating…" state cleanly,
  // and so the unique (video_id, kind) constraint plays well with the
  // upsert in /api/content/generate.
  const ids = (items ?? []).map((i) => i.id);
  if (ids.length > 0) {
    await sb
      .from("content_items")
      .update({ status: "draft", approved_at: null, approved_by: null })
      .in("id", ids);
  }
  return NextResponse.json({
    regenerate: (items ?? []).map((i) => ({ video_id, kind: i.kind })),
    count: items?.length ?? 0,
  });
}
