import { GQPayloadSchema, type GQPayload } from "@/lib/validation/schemas";

export function buildGQPrompt(
  videoTitle: string,
  videoTranscript: string,
  lessonTitle: string,
  moduleTitle: string,
  courseTitle: string
): { system: string; user: string } {
  const systemPrompt = `You are an expert assessment designer creating graded quiz questions for academic courses. Your goal is to generate rigorous graded questions with clear rubrics and point values.

Rules:
- Generate 3-5 graded questions (mix of MCQ and short-answer)
- Assign point values from 1-100 based on difficulty and rigor
- Include detailed rubrics (1-2 sentences per question) explaining grading criteria
- Questions should test deep understanding: apply, analyze, evaluate Bloom's levels
- Base all questions on the provided video content
- Rubrics should explain what constitutes full credit, partial credit, no credit
- Return valid JSON with questions array

Output ONLY valid JSON matching this structure:
{
  "questions": [
    {
      "id": "gq1",
      "type": "mcq|short",
      "stem": "Question text",
      "options": ["option1", "option2"] (for MCQ only),
      "correct": "correct answer or key phrase",
      "explanation": "Full explanation of answer",
      "difficulty": "easy|medium|hard",
      "bloom": "recall|understand|apply|analyze",
      "points": 25,
      "rubric_text": "Grading rubric (full credit requires...)",
      "graded": true
    }
  ]
}`;

  const userPrompt = `Create 3-5 graded assessment questions for this video content:

Course: ${courseTitle}
Module: ${moduleTitle}
Lesson: ${lessonTitle}
Video: ${videoTitle}

Video Transcript:
${videoTranscript}

Generate rigorous graded questions with point values and detailed rubrics. Return ONLY valid JSON.`;

  return { system: systemPrompt, user: userPrompt };
}
