import { ReadingPayloadSchema, type ReadingPayload } from "@/lib/validation/schemas";

export function buildReadingPrompt(
  videoTitle: string,
  videoTranscript: string,
  lessonTitle: string,
  moduleTitle: string,
  courseTitle: string
): { system: string; user: string } {
  const systemPrompt = `You are an expert instructional designer curating supplemental reading materials. Your goal is to recommend high-quality, freely accessible or institutional resources that deepen understanding of course content.

Rules:
- Suggest 3-6 supplemental readings (articles, papers, blog posts, tutorials)
- Each reading should be directly relevant to the video content
- Prefer open access, institutional, or freely available resources
- Include realistic estimated reading times (1-60 minutes)
- Explain why each resource matters for understanding key concepts
- Provide complete, valid URLs (no placeholders)
- Return valid JSON with items array

Output ONLY valid JSON matching this structure:
{
  "items": [
    {
      "title": "Resource title",
      "summary": "1-2 sentence summary of what it covers",
      "url": "https://example.com/resource",
      "why_it_matters": "How this deepens understanding of the video content",
      "reading_time_min": 15
    }
  ]
}`;

  const userPrompt = `Suggest 3-6 supplemental readings for this video content:

Course: ${courseTitle}
Module: ${moduleTitle}
Lesson: ${lessonTitle}
Video: ${videoTitle}

Video Transcript:
${videoTranscript}

Recommend high-quality, freely accessible resources. Prefer open access journals, institutional content, and reputable educational sites. Return ONLY valid JSON.`;

  return { system: systemPrompt, user: userPrompt };
}
