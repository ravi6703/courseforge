import { describe, it, expect, beforeEach } from "vitest";
import { transcribeProvider } from "@/lib/transcribe";

describe("transcribe/provider", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.REPLICATE_API_TOKEN;
  });

  it("returns null when nothing is set", () => {
    expect(transcribeProvider()).toBe(null);
  });

  it("prefers OpenAI when both set", () => {
    process.env.OPENAI_API_KEY = "sk-a";
    process.env.REPLICATE_API_TOKEN = "r-b";
    expect(transcribeProvider()).toBe("openai");
  });

  it("falls through to Replicate when only it is set", () => {
    process.env.REPLICATE_API_TOKEN = "r-b";
    expect(transcribeProvider()).toBe("replicate");
  });
});
