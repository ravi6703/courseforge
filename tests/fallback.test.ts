import { describe, it, expect, beforeEach } from "vitest";
import { hasAIProvider, aiMode, aiHeaders } from "@/lib/ai/fallback";

describe("ai/fallback", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AWS_BEDROCK_REGION;
  });

  it("hasAIProvider returns false when no keys are set", () => {
    expect(hasAIProvider()).toBe(false);
  });

  it("hasAIProvider returns true when ANTHROPIC_API_KEY is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(hasAIProvider()).toBe(true);
  });

  it("aiMode returns fallback when no provider", () => {
    expect(aiMode()).toBe("fallback");
  });

  it("aiMode returns live when a provider is set", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(aiMode()).toBe("live");
  });

  it("aiHeaders surfaces the right provider and mode", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(aiHeaders("live")).toEqual({
      "x-cf-ai-mode": "live",
      "x-cf-ai-provider": "anthropic",
    });
  });

  it("aiHeaders falls back to 'fallback' provider when nothing set", () => {
    expect(aiHeaders("fallback")).toEqual({
      "x-cf-ai-mode": "fallback",
      "x-cf-ai-provider": "fallback",
    });
  });

  it("provider precedence: anthropic > openai > azure > bedrock", () => {
    process.env.ANTHROPIC_API_KEY = "1";
    process.env.OPENAI_API_KEY = "2";
    expect(aiHeaders("live")["x-cf-ai-provider"]).toBe("anthropic");
    delete process.env.ANTHROPIC_API_KEY;
    expect(aiHeaders("live")["x-cf-ai-provider"]).toBe("openai");
  });
});
