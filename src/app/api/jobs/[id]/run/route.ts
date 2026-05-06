// POST /api/jobs/[id]/run
//
// Inline runner — picks one queued job and dispatches it to the right
// upstream endpoint (currently /api/content/generate for content:* kinds).
// Production should run this from a real worker (cron, Inngest,
// Trigger.dev, etc.); we expose this so the UI can also hand-trigger.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const { data: job } = await sb.from("generation_jobs").select("id, kind, payload, status").eq("id", id).maybeSingle();
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });
  if (job.status === "running") return NextResponse.json({ error: "already running" }, { status: 409 });

  await sb.from("generation_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", id);

  // Dispatch
  let result: unknown = null;
  let error: string | null = null;
  try {
    if (job.kind.startsWith("content:")) {
      const kind = job.kind.split(":")[1];
      const payload = job.payload as { course_id: string; lesson_id: string };
      const r = await fetch(new URL("/api/content/generate", req.url), {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
        body: JSON.stringify({ lesson_id: payload.lesson_id, kind }),
      });
      if (!r.ok) error = `HTTP ${r.status}`;
      else result = await r.json().catch(() => null);
    } else {
      error = `unknown job kind: ${job.kind}`;
    }
  } catch (e) {
    error = (e as Error).message;
  }

  await sb.from("generation_jobs").update({
    status: error ? "error" : "done",
    error,
    result,
    finished_at: new Date().toISOString(),
  }).eq("id", id);

  return NextResponse.json({ ok: !error, error, result });
}
