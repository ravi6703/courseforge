// SCORM package generation helper
// In production, this would coordinate with a SCORM packaging service
// For now, we just provide the structure

export function buildScormPrompt(
  videoTitle: string,
  videoTranscript: string,
  lessonTitle: string,
  moduleTitle: string,
  courseTitle: string
): { system: string; user: string } {
  const systemPrompt = `You are helping generate metadata for a SCORM 1.2 package. Analyze the video content and suggest structure for the learning package.

Return JSON with:
{
  "title": "Package title",
  "description": "What learners will accomplish",
  "objectives": ["objective1", "objective2"],
  "duration_minutes": estimated_duration,
  "estimated_size_kb": size_estimate
}`;

  const userPrompt = `Analyze this video for SCORM packaging:
Title: ${videoTitle}
Lesson: ${lessonTitle}
Module: ${moduleTitle}
Course: ${courseTitle}

Transcript excerpt: ${videoTranscript.slice(0, 500)}...`;

  return { system: systemPrompt, user: userPrompt };
}
