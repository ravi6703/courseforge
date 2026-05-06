// POST /api/content/[id]/clear-stale
//
// Clears stale_since + stale_reason on a content item. Used by the
// Stale queue's "Mark reviewed" action when the coach decides the
// existing artifact is still fine despite the upstream change.

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const { error } = await sb
    .from("content_items")
    .update({ stale_since: null, stale_reason: null })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
