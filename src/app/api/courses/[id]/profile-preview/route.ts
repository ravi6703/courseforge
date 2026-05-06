// POST /api/courses/[id]/profile-preview
//
// Renders short sample outputs (brief intro + slide bullet) using the
// CURRENT in-memory profile so the coach sees the AI's voice without
// saving. Body: the profile JSON (CourseProfile shape).

import { NextRequest, NextResponse } from "next/server";
import { buildPromptFragment } from "@/lib/course-profile";
import type { CourseProfile } from "@/types/course-profile";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const profile = (await req.json().catch(() => null)) as CourseProfile | null;
  if (!profile) return NextResponse.json({ error: "missing profile" }, { status: 400 });

  // Render fast deterministic samples — server-side templates seeded
  // from the profile fields. We avoid a real AI call here so the
  // preview updates as the user types without rate-limiting.
  const persona = profile.audience?.primary_persona?.trim() || "Backend developer, 2-5y";
  const tone = profile.tone?.primary || "educational";
  const pedagogy = profile.pedagogy?.preset?.replace(/_/g, " ") || "bloom strict";
  const handsOn = 100 - (profile.pedagogy?.theory_handson_ratio ?? 70);
  const must = (profile.vocabulary?.must_include ?? []).slice(0, 3).join(", ") || "(none)";
  const banned = (profile.vocabulary?.banned ?? []).slice(0, 3).join(", ") || "(none)";
  const outcome = (profile.outcomes?.outcomes ?? [])[0] ?? "Apply the framework to a real scenario";

  const sampleBriefIntro = renderBriefIntro({ persona, tone, outcome });
  const sampleSlideBullet = renderSlideBullet({ persona, tone });
  const fragment = buildPromptFragment(profile);

  return NextResponse.json({
    fragment,
    samples: {
      briefIntro: sampleBriefIntro,
      slideBullet: sampleSlideBullet,
    },
    summary: {
      tone, pedagogy, handsOnPct: handsOn, mustInclude: must, banned,
    },
  });
}

function renderBriefIntro({ persona, tone, outcome }: { persona: string; tone: string; outcome: string }) {
  const open = TONE_OPENERS[tone] ?? TONE_OPENERS.educational;
  return `${open(persona)} By the end you will: ${outcome.toLowerCase()}.`;
}

function renderSlideBullet({ persona, tone }: { persona: string; tone: string }) {
  const lead = TONE_BULLETS[tone] ?? TONE_BULLETS.educational;
  return lead(persona);
}

const TONE_OPENERS: Record<string, (persona: string) => string> = {
  concise:        () => "Three things you'll know after this video.",
  detailed:       (p) => `In this video we walk a ${p.toLowerCase()} through every step of the workflow with concrete examples and edge cases.`,
  professional:   (p) => `This module addresses concepts most relevant to the ${p.toLowerCase()}.`,
  educational:    (p) => `Welcome — if you're a ${p.toLowerCase()}, this video gives you the mental model you need.`,
  conversational: (p) => `Hey — if you're a ${p.toLowerCase()}, you're going to like this one.`,
  storytelling:   () => "It's 11pm and the build is failing. You ssh in, and…",
};

const TONE_BULLETS: Record<string, (persona: string) => string> = {
  concise:        () => "Trigger fires → Workflow runs → Result returns.",
  detailed:       () => "When a webhook trigger fires, n8n queues the workflow on its internal job runner; downstream nodes execute in topological order until the final node returns.",
  professional:   () => "Trigger nodes initiate a workflow execution upon receipt of a qualifying event.",
  educational:    () => "Think of a trigger like a doorbell: when it rings (the event), the workflow (the host) takes a defined action.",
  conversational: () => "Picture a trigger as your app saying \"hey, something just happened\" — n8n picks that up and runs the rest.",
  storytelling:   () => "Last quarter, our trigger fired 14,000 times in one night because of a misconfigured cron. Here's how we caught it.",
};
