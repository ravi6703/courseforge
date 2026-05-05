// /api/content/[id]/ai-edit
//
// AI Edit chat — turns plain-English instructions into a unified diff over the
// current content_item.payload, returns both the diff and the next payload so
// the client can render an Accept/Reject affordance. Accepting writes the
// row + records an artifact_revisions entry.
//
// Verbs:
//   POST   { prompt }                             — request a diff
//   PATCH  { revision_id, action }                — accept | reject | revert
//   GET                                            — list revisions for this item

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { hasAIProvider, aiHeaders, aiMode } from "@/lib/ai/fallback";
import { recordActivity } from "@/lib/activity";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DiffResult {
  next_payload: Record<string, unknown>;
  diff_text: string;
  rationale: string;
}

function unifiedDiff(before: unknown, after: unknown): string {
  // Tiny line-level diff so we don't pull in a full diff library. Good enough
  // for the chat panel preview; the source of truth is payload_before/after.
  const a = JSON.stringify(before, null, 2).split("\n");
  const b = JSON.stringify(after,  null, 2).split("\n");
  const out: string[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i >= a.length)        { out.push(`+ ${b[j++]}`); continue; }
    if (j >= b.length)        { out.push(`- ${a[i++]}`); continue; }
    if (a[i] === b[j])        { out.push(`  ${a[i]}`); i++; j++; continue; }
    out.push(`- ${a[i++]}`);
    out.push(`+ ${b[j++]}`);
  }
  return out.join("\n");
}

async function callClaude(prompt: string, payload: unknown, kind: string): Promise<DiffResult> {
  const sys = `You are CourseForge's content editor. The user will describe an edit to a learning artifact in plain English. Your job is to apply ONLY the edit they describe, returning the FULL next payload as strict JSON, plus a one-line rationale. Preserve all existing fields and structure unless the user asks to change them. Never invent new top-level keys.`;
  const user = `Artifact kind: ${kind}
Current payload:
${JSON.stringify(payload, null, 2)}

User edit instruction:
${prompt}

Return JSON: { "next_payload": <full updated payload>, "rationale": "<one line why>" }`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: sys,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in AI response");
  const parsed = JSON.parse(match[0]) as { next_payload: Record<string, unknown>; rationale: string };
  return {
    next_payload: parsed.next_payload,
    rationale: parsed.rationale ?? "Applied requested edit.",
    diff_text: unifiedDiff(payload, parsed.next_payload),
  };
}

function fallbackDiff(payload: Record<string, unknown>, prompt: string): DiffResult {
  // No AI — return a no-op diff but echo the prompt so the panel still renders
  // the chat thread. Lets us verify wiring offline.
  const next = { ...payload, _ai_edit_note: `[fallback mode] ${prompt}` };
  return {
    next_payload: next,
    rationale: "AI is in fallback mode — no real edit was applied.",
    diff_text: unifiedDiff(payload, next),
  };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const __rl = await checkRateLimit(auth.orgId, "ai-edit", { perMinute: 20, perDay: 500 });
  if (!__rl.ok) return rateLimitResponse(__rl);

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const prompt: string = (body.prompt ?? "").toString().trim();
  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });
  if (prompt.length > 4000) return NextResponse.json({ error: "prompt too long" }, { status: 400 });

  const supabase = await getServerSupabase();
  const { data: item } = await supabase
    .from("content_items")
    .select("id, kind, payload, course_id, org_id")
    .eq("id", id)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: "content item not found" }, { status: 404 });
  if (item.org_id !== auth.orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let result: DiffResult;
  try {
    result = hasAIProvider()
      ? await callClaude(prompt, item.payload, item.kind)
      : fallbackDiff(item.payload as Record<string, unknown>, prompt);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502, headers: aiHeaders(aiMode()) });
  }

  return NextResponse.json({
    success: true,
    prompt,
    rationale: result.rationale,
    diff_text: result.diff_text,
    next_payload: result.next_payload,
  }, { headers: aiHeaders(aiMode()) });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const action: string = body.action;
  if (!["accept", "revert"].includes(action)) {
    return NextResponse.json({ error: "action must be accept | revert" }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { data: item } = await supabase
    .from("content_items")
    .select("id, course_id, payload, kind, org_id")
    .eq("id", id)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: "content item not found" }, { status: 404 });
  if (item.org_id !== auth.orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (action === "accept") {
    const next: Record<string, unknown> = body.next_payload;
    const prompt: string = body.prompt ?? "";
    const diff_text: string = body.diff_text ?? "";
    if (!next || typeof next !== "object") {
      return NextResponse.json({ error: "next_payload required" }, { status: 400 });
    }

    const { error: updErr } = await supabase
      .from("content_items")
      .update({ payload: next, status: "draft", approved_at: null, approved_by: null })
      .eq("id", id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    const { data: rev, error: revErr } = await supabase
      .from("artifact_revisions")
      .insert({
        org_id: auth.orgId,
        course_id: item.course_id,
        content_item_id: id,
        author_id: auth.profileId,
        prompt,
        diff_text,
        payload_before: item.payload,
        payload_after: next,
        status: "accepted",
        ai_provider: process.env.ANTHROPIC_API_KEY ? "anthropic" : "fallback",
      })
      .select("id, created_at")
      .single();
    if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 });

    await recordActivity(supabase, {
      orgId: auth.orgId,
      userId: auth.profileId,
      userName: auth.email ?? undefined,
      userRole: auth.role,
      courseId: item.course_id,
      action: "content.ai_edit.accepted",
      targetType: "content_item",
      targetId: id,
      details: { kind: item.kind, prompt: prompt.slice(0, 200) },
    });

    return NextResponse.json({ ok: true, revision: rev });
  }

  // revert: restore payload_before from the named revision
  const revisionId: string = body.revision_id;
  if (!revisionId) return NextResponse.json({ error: "revision_id required" }, { status: 400 });
  const { data: rev } = await supabase
    .from("artifact_revisions")
    .select("payload_before, status")
    .eq("id", revisionId)
    .maybeSingle();
  if (!rev) return NextResponse.json({ error: "revision not found" }, { status: 404 });

  await supabase.from("content_items")
    .update({ payload: rev.payload_before, status: "draft", approved_at: null, approved_by: null })
    .eq("id", id);
  await supabase.from("artifact_revisions").update({ status: "reverted" }).eq("id", revisionId);

  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("artifact_revisions")
    .select("id, prompt, diff_text, status, created_at")
    .eq("content_item_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ revisions: data ?? [] });
}
