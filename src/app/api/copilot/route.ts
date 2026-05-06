// /api/copilot — minimal chat endpoint scoped to a course.
//
// GET ?course=<id>            → most recent session messages
// POST { course, content }     → append user message, ask Anthropic, append reply
//
// Keeps the AI prompt SHORT — we attach the course profile fragment so
// the model knows the context but don't dump the entire course in.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { getProfile, buildPromptFragment } from "@/lib/course-profile";

export const runtime = "nodejs";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("course");
  if (!courseId) return NextResponse.json({ error: "course required" }, { status: 400 });
  const sb = await getServerSupabase();

  // Latest session for this user × course.
  const { data: session } = await sb
    .from("copilot_sessions")
    .select("id")
    .eq("course_id", courseId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!session) return NextResponse.json({ messages: [] });

  const { data: messages } = await sb
    .from("copilot_messages")
    .select("id, role, content, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ sessionId: session.id, messages: messages ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  const courseId = body.course as string;
  const userContent = (body.content as string ?? "").trim();
  if (!courseId || !userContent) return NextResponse.json({ error: "course + content required" }, { status: 400 });

  const sb = await getServerSupabase();

  // Find or create session.
  let sessionId: string | null = null;
  const { data: existing } = await sb
    .from("copilot_sessions").select("id").eq("course_id", courseId)
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (existing?.id) sessionId = existing.id;
  else {
    const { data } = await sb.from("copilot_sessions").insert({ course_id: courseId, user_id: auth.profileId, title: userContent.slice(0, 60) }).select("id").single();
    sessionId = data?.id ?? null;
  }
  if (!sessionId) return NextResponse.json({ error: "session create failed" }, { status: 500 });

  // Append user msg
  await sb.from("copilot_messages").insert({ session_id: sessionId, role: "user", content: userContent });

  // Build the LLM payload.
  const profile = await getProfile(sb, courseId);
  const systemPrompt = `You are CourseForge co-pilot, scoped to a single course. Be concise.

${profile ? buildPromptFragment(profile) : ""}`;

  let assistantContent = "";
  if (ANTHROPIC_KEY) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 700,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });
      if (r.ok) {
        const j = await r.json();
        assistantContent = (j.content?.[0]?.text as string) ?? "";
      } else {
        assistantContent = `(model error HTTP ${r.status})`;
      }
    } catch (e) {
      assistantContent = `(model error: ${(e as Error).message})`;
    }
  } else {
    // Stub when ANTHROPIC_API_KEY isn't configured — keeps UX testable.
    assistantContent = "Co-pilot stub: I would help with that, but no ANTHROPIC_API_KEY is configured on the server.";
  }

  await sb.from("copilot_messages").insert({ session_id: sessionId, role: "assistant", content: assistantContent });
  await sb.from("copilot_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);

  return NextResponse.json({ sessionId, reply: assistantContent });
}
