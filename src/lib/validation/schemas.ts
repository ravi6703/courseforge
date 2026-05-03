// src/lib/validation/schemas.ts
//
// Zod schemas for inbound request bodies. Each route imports the relevant
// schema and runs schema.safeParse(body) — failures return a 400 with the
// failing field path instead of a 500.
//
// SEC-5: validate at the edge so that malformed payloads can't crash a
// route into a 500 (and so that we don't trust unverified shapes downstream).

import { z } from "zod";
import { NextResponse } from "next/server";

const uuid = z.string().uuid();
const optionalUuid = uuid.optional();

const learningObjective = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  bloom_level: z.enum(["remember","understand","apply","analyze","evaluate","create"]),
});

const contentTypeEnum = z.enum([
  "reading","practice_quiz","graded_quiz","discussion","plugin","case_study","glossary","ai_dialogue","peer_review",
]);

export const CourseUpsertSchema = z.object({
  id: optionalUuid,
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  platform: z.enum(["coursera","udemy","university","infylearn","custom"]).optional(),
  status: z.string().max(40).optional(),
  audience_level: z.enum(["beginner","intermediate","advanced","mixed"]).optional(),
  duration_weeks: z.number().int().min(1).max(104).optional(),
  hours_per_week: z.number().int().min(1).max(168).optional(),
  domain: z.string().max(120).nullish(),
  prerequisites: z.string().max(2000).nullish(),
  target_job_roles: z.array(z.string().min(1).max(120)).max(20).optional(),
  certification_goal: z.string().max(200).nullish(),
  theory_handson_ratio: z.number().int().min(0).max(100).optional(),
  project_based: z.boolean().optional(),
  capstone: z.boolean().optional(),
  reference_course_url: z.union([z.string().url(), z.literal("")]).nullish(),
  content_types: z.array(contentTypeEnum).optional(),
  modules: z.array(z.unknown()).optional(),
});
export type CourseUpsertInput = z.infer<typeof CourseUpsertSchema>;

export const SyncTocSchema = z.object({
  modules: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    order: z.number().int().min(0).max(1000).optional(),
    learning_objectives: z.array(learningObjective).optional(),
    lessons: z.array(z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      order: z.number().int().min(0).max(1000).optional(),
      content_types: z.array(contentTypeEnum).optional(),
      learning_objectives: z.array(learningObjective).optional(),
      videos: z.array(z.object({
        title: z.string().min(1).max(200),
        duration_minutes: z.number().int().min(1).max(180).optional(),
        order: z.number().int().min(0).max(1000).optional(),
      })).optional(),
    })).optional(),
  })),
});

export const UpdateItemSchema = z.object({
  table: z.enum(["modules","lessons"]),
  id: uuid,
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

export const GenerateTocSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  platform: z.string().min(1).max(40),
  audience_level: z.string().min(1).max(40),
  duration_weeks: z.number().int().min(1).max(104),
  hours_per_week: z.number().int().min(1).max(168),
  domain: z.string().min(1).max(120),
  prerequisites: z.string().max(2000).optional(),
  target_job_roles: z.array(z.string().min(1)).max(20),
  content_types: z.array(contentTypeEnum),
  theory_handson_ratio: z.number().int().min(0).max(100),
  project_based: z.boolean(),
  capstone: z.boolean(),
  certification_goal: z.string().max(200).optional(),
  reference_course_url: z.union([z.string().url(), z.literal("")]).optional(),
});

export const ImproveTocSchema = z.object({
  courseId: uuid,
  modules: z.array(z.unknown()).min(1).max(50),
  comments: z.array(z.object({
    text: z.string().min(1).max(5000),
    target_type: z.string().min(1).max(40),
    target_id: z.string().min(1).max(120),
  })).max(200),
  courseTitle: z.string().min(1).max(200),
});

export const GenerateBriefSchema = z.object({
  videoId: optionalUuid,
  lessonId: optionalUuid,
  courseId: optionalUuid,
  videoTitle: z.string().min(1).max(200),
  lessonTitle: z.string().min(1).max(200),
  moduleTitle: z.string().min(1).max(200),
  courseTitle: z.string().min(1).max(200),
  coachInput: z.object({
    key_topics: z.string().max(5000).optional(),
    examples: z.string().max(5000).optional(),
    visual_requirements: z.string().max(5000).optional(),
    difficulty_notes: z.string().max(5000).optional(),
    references: z.string().max(5000).optional(),
  }).optional(),
});

export const GenerateContentSchema = z.object({
  lessonId: z.string().min(1),
  lessonTitle: z.string().min(1).max(200),
  type: z.enum(["reading","practice_quiz","graded_quiz","discussion","case_study","ai_dialogue","peer_review"]),
  courseTitle: z.string().min(1).max(200),
  moduleTitle: z.string().min(1).max(200),
  courseId: optionalUuid,
});

// Content item schemas for practice questions, graded questions, readings, SCORM, and AI coach
const mcqOption = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(1000),
});

const pqQuestion = z.object({
  id: z.string().min(1),
  type: z.enum(["mcq", "short_answer"]),
  stem: z.string().min(5).max(2000),
  options: z.array(mcqOption).optional(),
  correct_answer: z.string().min(1).max(2000),
  explanation: z.string().min(5).max(2000),
  difficulty: z.enum(["easy", "medium", "hard"]),
  bloom_level: z.enum(["recall", "understand", "apply", "analyze"]),
});

export const ContentPQPayloadSchema = z.object({
  questions: z.array(pqQuestion).min(1).max(10),
  generated_at: z.string().optional(),
});

const gqQuestion = pqQuestion.extend({
  points: z.number().int().min(1).max(100),
  rubric_text: z.string().min(5).max(5000),
  graded: z.literal(true),
});

export const ContentGQPayloadSchema = z.object({
  questions: z.array(gqQuestion).min(1).max(5),
  total_points: z.number().int().min(1),
  generated_at: z.string().optional(),
});

const readingItem = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  summary: z.string().min(10).max(500),
  suggested_url: z.string().url().optional(),
  why_it_matters: z.string().min(10).max(500),
  reading_time_minutes: z.number().int().min(1).max(120),
});

export const ContentReadingPayloadSchema = z.object({
  items: z.array(readingItem).min(1).max(6),
  generated_at: z.string().optional(),
});

export const ContentSCORMPayloadSchema = z.object({
  scorm_url: z.string().url(),
  filename: z.string().min(1).max(200),
  size_bytes: z.number().int().min(1),
  generated_at: z.string().optional(),
});

export const ContentAICoachPayloadSchema = z.object({
  system_prompt: z.string().min(100).max(50000),
  generated_at: z.string().optional(),
});

export const GenerateContentItemSchema = z.object({
  video_id: uuid,
  kind: z.enum(["pq", "gq", "reading", "scorm", "ai_coach"]),
});

export const PatchContentItemSchema = z.object({
  payload: z.unknown().optional(),
  status: z.enum(["draft", "approved"]).optional(),
});

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { ok: true; data: T } | { ok: false; res: NextResponse } {
  const r = schema.safeParse(body);
  if (r.success) return { ok: true, data: r.data };
  const issues = r.error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
  return {
    ok: false,
    res: NextResponse.json({ error: "Invalid request body", issues }, { status: 400 }),
  };
}

// Content Item Schemas (for practice questions, graded questions, reading materials, SCORM, AI coach)

export const ContentKindSchema = z.enum(["pq", "gq", "reading", "scorm", "ai_coach"]);
export type ContentKind = z.infer<typeof ContentKindSchema>;

// Practice Questions (PQ) Schema
export const PQQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["mcq", "short"]),
  stem: z.string().min(1).max(1000),
  options: z.array(z.string().min(1).max(500)).optional(),
  correct: z.string().min(1),
  explanation: z.string().min(1).max(2000),
  difficulty: z.enum(["easy", "medium", "hard"]),
  bloom: z.enum(["recall", "understand", "apply", "analyze"]),
});

export const PQPayloadSchema = z.object({
  questions: z.array(PQQuestionSchema).min(5).max(10),
});
export type PQPayload = z.infer<typeof PQPayloadSchema>;

// Graded Questions (GQ) Schema
export const GQQuestionSchema = PQQuestionSchema.extend({
  points: z.number().int().min(1).max(100),
  rubric_text: z.string().min(1).max(2000),
  graded: z.literal(true),
});

export const GQPayloadSchema = z.object({
  questions: z.array(GQQuestionSchema).min(3).max(5),
});
export type GQPayload = z.infer<typeof GQPayloadSchema>;

// Reading Materials Schema
export const ReadingItemSchema = z.object({
  title: z.string().min(1).max(300),
  summary: z.string().min(1).max(500),
  url: z.string().url(),
  why_it_matters: z.string().min(1).max(500),
  reading_time_min: z.number().int().min(1).max(180),
});

export const ReadingPayloadSchema = z.object({
  items: z.array(ReadingItemSchema).min(3).max(6),
});
export type ReadingPayload = z.infer<typeof ReadingPayloadSchema>;

// SCORM Package Schema
export const ScormPayloadSchema = z.object({
  url: z.string().url(),
  filename: z.string().min(1).max(200),
  size_bytes: z.number().int().min(1),
  built_at: z.string().datetime(),
});
export type ScormPayload = z.infer<typeof ScormPayloadSchema>;

// AI Coach System Prompt Schema
export const AICoachPayloadSchema = z.object({
  system: z.string().min(100).max(50000),
});
export type AICoachPayload = z.infer<typeof AICoachPayloadSchema>;

// Generate Content Item Request Schema
export const GenerateContentItemSchema = z.object({
  video_id: uuid,
  kind: ContentKindSchema,
});
export type GenerateContentItemInput = z.infer<typeof GenerateContentItemSchema>;

// Patch Content Item Schema
export const PatchContentSchema = z.object({
  payload: z.unknown().optional(),
  status: z.enum(["draft", "approved"]).optional(),
});
export type PatchContentInput = z.infer<typeof PatchContentSchema>;
