// src/lib/ai/fallback.ts — single source of truth for "is the AI live or canned?"
//
// Every AI route (generate-toc, generate-slides, generate-content, generate-brief,
// improve-toc) currently silently returns canned data when ANTHROPIC_API_KEY is
// missing. That's fine for demo; it's a disaster in production because users
// don't know they're getting boilerplate.
//
// Usage in an API route:
//
//   if (!hasAIProvider()) {
//     return NextResponse.json(generateFallbackTOC(input), {
//       headers: { "x-cf-ai-mode": "fallback" },
//     });
//   }
//
// Then the AIFallbackBanner component on the client surfaces it.

export type AIMode = "live" | "fallback";

export function hasAIProvider(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.AZURE_OPENAI_API_KEY ||
      process.env.AWS_BEDROCK_REGION
  );
}

export function aiMode(): AIMode {
  return hasAIProvider() ? "live" : "fallback";
}

/** Standard headers to attach to AI responses so the client can detect mode. */
export function aiHeaders(mode: AIMode): Record<string, string> {
  return {
    "x-cf-ai-mode": mode,
    "x-cf-ai-provider":
      process.env.ANTHROPIC_API_KEY
        ? "anthropic"
        : process.env.OPENAI_API_KEY
        ? "openai"
        : process.env.AZURE_OPENAI_API_KEY
        ? "azure"
        : process.env.AWS_BEDROCK_REGION
        ? "bedrock"
        : "fallback",
  };
}
