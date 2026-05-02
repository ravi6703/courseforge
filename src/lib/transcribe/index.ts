// src/lib/transcribe/index.ts
//
// Phase 8a — Whisper transcription. We support OpenAI's whisper-1
// (cheap, ubiquitous) and Replicate (good for self-host or large
// files). Provider chosen by env:
//
//   OPENAI_API_KEY      → openai
//   REPLICATE_API_TOKEN → replicate
//   neither             → throws; caller marks the job 'error'
//
// Both providers expect an audio URL (the recording in our private
// bucket — we mint a 30-min signed URL). For files > 25 MB on OpenAI
// we'd need to chunk; for pilot we cap at 25 MB and flag bigger files.

export type TranscribeProvider = "openai" | "replicate";

export interface TranscribeInput {
  audioUrl: string;            // signed URL (or any HTTPS URL)
  language?: string;           // ISO 639-1; omit to auto-detect
  prompt?: string;             // domain hints (course title, vocabulary)
  filenameHint?: string;       // for OpenAI multipart 'filename'
}

export interface TranscribeOutput {
  text: string;
  language?: string;
  duration_seconds?: number;
  segments?: Array<{ start: number; end: number; text: string }>;
  provider: TranscribeProvider;
}

export function transcribeProvider(): TranscribeProvider | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.REPLICATE_API_TOKEN) return "replicate";
  return null;
}

export async function transcribe(input: TranscribeInput): Promise<TranscribeOutput> {
  const p = transcribeProvider();
  if (!p) throw new Error("No transcription provider configured (set OPENAI_API_KEY or REPLICATE_API_TOKEN)");
  if (p === "openai")    return transcribeOpenAI(input);
  return transcribeReplicate(input);
}

// ─── OpenAI Whisper ─────────────────────────────────────────────────────────

async function transcribeOpenAI(input: TranscribeInput): Promise<TranscribeOutput> {
  // OpenAI's transcription endpoint expects a multipart form with the
  // audio file uploaded. We fetch the signed URL ourselves and forward
  // the bytes — keeps the signed URL out of OpenAI's logs and lets us
  // size-check before paying for the transcription.
  const audioRes = await fetch(input.audioUrl);
  if (!audioRes.ok) throw new Error(`audio fetch failed: ${audioRes.status}`);
  const audioBuf = await audioRes.arrayBuffer();
  if (audioBuf.byteLength > 25 * 1024 * 1024) {
    throw new Error(`audio too large for OpenAI Whisper (${audioBuf.byteLength} > 25MB) — switch to Replicate`);
  }

  const filename = input.filenameHint || "audio.m4a";
  const form = new FormData();
  form.append("file", new Blob([audioBuf]), filename);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  if (input.language) form.append("language", input.language);
  if (input.prompt)   form.append("prompt", input.prompt);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI Whisper ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json() as {
    text: string;
    language?: string;
    duration?: number;
    segments?: Array<{ start: number; end: number; text: string }>;
  };

  return {
    text: data.text,
    language: data.language,
    duration_seconds: data.duration ? Math.round(data.duration) : undefined,
    segments: data.segments?.map((s) => ({ start: s.start, end: s.end, text: s.text })),
    provider: "openai",
  };
}

// ─── Replicate Whisper Large v3 ─────────────────────────────────────────────

async function transcribeReplicate(input: TranscribeInput): Promise<TranscribeOutput> {
  // openai/whisper-large-v3 on Replicate. We poll until succeeded or
  // failed; in practice ~5-30s for a 5 minute clip.
  const create = await fetch("https://api.replicate.com/v1/models/openai/whisper-large-v3/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: {
        audio: input.audioUrl,
        language: input.language,
        initial_prompt: input.prompt,
      },
    }),
  });
  if (!create.ok) throw new Error(`Replicate create ${create.status}`);
  const job = await create.json() as { id: string; urls: { get: string } };

  // Poll for up to 5 minutes.
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await fetch(job.urls.get, {
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
    });
    if (!poll.ok) throw new Error(`Replicate poll ${poll.status}`);
    const j = await poll.json() as { status: string; output?: { transcription?: string; segments?: Array<{ start: number; end: number; text: string }> }; error?: string };
    if (j.status === "succeeded") {
      const out = j.output ?? {};
      return {
        text: out.transcription ?? "",
        segments: out.segments,
        provider: "replicate",
      };
    }
    if (j.status === "failed" || j.status === "canceled") {
      throw new Error(`Replicate job ${j.status}: ${j.error ?? "unknown"}`);
    }
  }
  throw new Error("Replicate job timed out after 5 min");
}
