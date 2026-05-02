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
  reference_course_url: z.string().url().nullish(),
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
  reference_course_url: z.string().url().optional(),
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
