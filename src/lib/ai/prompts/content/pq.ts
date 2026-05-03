import { PQPayloadSchema, type PQPayload } from "@/lib/validation/schemas";

export function buildPQPrompt(
  videoTitle: string,
  videoTranscript: string,
  lessonTitle: string,
  moduleTitle: string,
  courseTitle: string
): { system: string; user: string } {
  const systemPrompt = `You are an expert educational content developer specializing in creating practice questions for online courses. Your goal is to generate high-quality practice questions that help learners reinforce and test their understanding of the material.

Rules:
- Generate 5-10 multiple choice and short-answer practice questions
- Vary difficulty levels: easy, medium, and hard
- Apply Bloom's taxonomy: recall, understand, apply, analyze
- Each question should have a clear learning objective
- For MCQs, provide 3-4 plausible options with one correct answer
- For short answers, provide a concise correct answer and an explanation
- All questions must be based on the provided video content
- Return a valid JSON object with a "questions" array

Output ONLY valid JSON matching this structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "stem": "Question text",
      "options": ["option1", "option2", "option3"],
      "correct": "correct option or key phrase",
      "explanation": "Why this is correct and what learners should understand",
      "difficulty": "easy|medium|hard",
      "bloom": "recall|understand|apply|analyze"
    }
  ]
}`;

  const userPrompt = `Create 5-10 practice questions for this video content:

Course: ${courseTitle}
Module: ${moduleTitle}
Lesson: ${lessonTitle}
Video: ${videoTitle}

Video Transcript:
${videoTranscript}

Generate questions with varied difficulty and Bloom's taxonomy levels. Return ONLY valid JSON.`;

  return { system: systemPrompt, user: userPrompt };
}
