// GET /api/ppt/[id]/url — short-lived signed URL to download the original .pptx
import { NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-syntax -- legit: storage.createSignedUrl requires service role; ownership checked above via RLS-bound read
import { getServerSupabase, requireUser, getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  // RLS scopes the read to the user's org.
  const sb = await getServerSupabase();
  const { data: row } = await sb.from("ppt_uploads").select("storage_path").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Service role to mint the signed URL (storage objects API is server-side anyway).
  const service = getServiceSupabase();
  const { data, error } = await service.storage.from("ppt-uploads").createSignedUrl(row.storage_path, 60 * 5);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, expires_in_sec: 300 });
}
