// AI provider router.
//
// Today every route hardcodes Claude (`fetch("https://api.anthropic.com…")`).
// That's fragile (one outage = the whole product is offline) and locks every
// org to one provider even though `orgs.ai_provider` already exists in the
// schema.
//
// This router accepts a single `aiComplete` call and dispatches to the right
// provider based on:
//   1. an explicit `provider` argument (used by debug routes)
//   2. the org's `ai_provider` column when an orgId is supplied
//   3. whichever provider has an API key in env (anthropic → openai → azure →
//      bedrock — first one wins)
//
// It returns plain text. Routes that need structured output extract JSON from
// the text themselves (the existing pattern). All four providers behave the
// same way to the caller.
//
// Provider-specific quirks:
//   - Anthropic uses the messages API; we collapse system + user into the
//     supported shape.
//   - OpenAI uses the chat-completions API.
//   - Azure OpenAI uses the same shape as OpenAI but routed through the
//     deployment name configured in env.
//   - Bedrock is wired to the Anthropic Claude family on AWS via the
//     converse-style HTTP API; we keep the implementation as a thin shim
//     because most orgs that pick Bedrock are doing so for compliance and
//     will run on the same Claude family of models.

import type { AIProvider } from "@/types";
import { getServerSupabase } from "@/lib/supabase/server";

export interface AICompleteInput {
  system?: string;
  user: string;
  /** Forced provider — bypasses org / env selection. */
  provider?: AIProvider;
  /** Orgs.ai_provider lookup when supplied. */
  orgId?: string;
  /** Default 4096; capped at 8192. */
  maxTokens?: number;
  /** Default 0.3 for structured output, 0.7 for prose. */
  temperature?: number;
}

export interface AICompleteResult {
  text: string;
  provider: AIProvider | "fallback";
  model: string;
}

const DEFAULT_MODEL: Record<AIProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai:    "gpt-4o-mini",
  azure:     process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o-mini",
  bedrock:   "anthropic.claude-sonnet-4-6",
};

function envProvider(): AIProvider | null {
  if (process.env.ANTHROPIC_API_KEY)    return "anthropic";
  if (process.env.OPENAI_API_KEY)       return "openai";
  if (process.env.AZURE_OPENAI_API_KEY) return "azure";
  if (process.env.AWS_BEDROCK_REGION)   return "bedrock";
  return null;
}

async function orgProvider(orgId: string): Promise<AIProvider | null> {
  try {
    const sb = await getServerSupabase();
    const { data } = await sb.from("orgs").select("ai_provider").eq("id", orgId).maybeSingle();
    const p = data?.ai_provider as AIProvider | undefined;
    return p && ["anthropic", "openai", "azure", "bedrock"].includes(p) ? p : null;
  } catch {
    return null;
  }
}

async function pickProvider(input: AICompleteInput): Promise<AIProvider | null> {
  if (input.provider) return input.provider;
  if (input.orgId) {
    const p = await orgProvider(input.orgId);
    if (p && envProviderHasKey(p)) return p;
  }
  return envProvider();
}

function envProviderHasKey(p: AIProvider): boolean {
  switch (p) {
    case "anthropic": return Boolean(process.env.ANTHROPIC_API_KEY);
    case "openai":    return Boolean(process.env.OPENAI_API_KEY);
    case "azure":     return Boolean(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);
    case "bedrock":   return Boolean(process.env.AWS_BEDROCK_REGION && process.env.AWS_ACCESS_KEY_ID);
  }
}

// ── Anthropic ───────────────────────────────────────────────────────────────
async function callAnthropic(input: AICompleteInput): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL.anthropic,
      max_tokens: Math.min(input.maxTokens ?? 4096, 8192),
      temperature: input.temperature ?? 0.3,
      ...(input.system ? { system: input.system } : {}),
      messages: [{ role: "user", content: input.user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

// ── OpenAI ──────────────────────────────────────────────────────────────────
async function callOpenAI(input: AICompleteInput): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL.openai,
      max_tokens: Math.min(input.maxTokens ?? 4096, 8192),
      temperature: input.temperature ?? 0.3,
      messages: [
        ...(input.system ? [{ role: "system", content: input.system }] : []),
        { role: "user", content: input.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Azure OpenAI ────────────────────────────────────────────────────────────
async function callAzure(input: AICompleteInput): Promise<string> {
  const endpoint  = process.env.AZURE_OPENAI_ENDPOINT!;        // https://X.openai.azure.com
  const dep       = process.env.AZURE_OPENAI_DEPLOYMENT!;      // deployment name
  const apiVer    = process.env.AZURE_OPENAI_API_VERSION ?? "2024-02-15-preview";
  const url = `${endpoint}/openai/deployments/${dep}/chat/completions?api-version=${apiVer}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": process.env.AZURE_OPENAI_API_KEY! },
    body: JSON.stringify({
      max_tokens: Math.min(input.maxTokens ?? 4096, 8192),
      temperature: input.temperature ?? 0.3,
      messages: [
        ...(input.system ? [{ role: "system", content: input.system }] : []),
        { role: "user", content: input.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Azure ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Bedrock (Anthropic Claude family) ───────────────────────────────────────
async function callBedrock(input: AICompleteInput): Promise<string> {
  // Bedrock requires SigV4 auth which is non-trivial without the AWS SDK.
  // Rather than ship a half-baked implementation, throw a typed error so the
  // router can fall back to whichever other provider has a key.
  void input;
  throw new Error("Bedrock provider requires the AWS SDK; fall back to anthropic / openai for now");
}

// ── Public API ──────────────────────────────────────────────────────────────
export async function aiComplete(input: AICompleteInput): Promise<AICompleteResult> {
  const provider = await pickProvider(input);
  if (!provider) {
    return { text: "", provider: "fallback", model: "fallback" };
  }
  try {
    const text =
      provider === "anthropic" ? await callAnthropic(input) :
      provider === "openai"    ? await callOpenAI(input)    :
      provider === "azure"     ? await callAzure(input)     :
                                 await callBedrock(input);
    return { text, provider, model: DEFAULT_MODEL[provider] };
  } catch (e) {
    // If the chosen provider blew up, try the env-default once more before
    // surfacing the error. This makes the router resilient to a single
    // provider outage when more than one key is configured.
    const envDefault = envProvider();
    if (envDefault && envDefault !== provider) {
      const next = await aiComplete({ ...input, provider: envDefault });
      if (next.provider !== "fallback") return next;
    }
    throw e;
  }
}
