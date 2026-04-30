// src/types/index.ts — reconciled with migration_v2.sql.
//
// Changes vs original:
//   - Added Org and made org_id required on every business object
//   - Added Assessment and Question (replacing JSON-blob quizzes)
//   - Added generic Comment (TOCComment is now an alias)
//   - Added ActivityLog, Notification, PPTUpload, CoachInput
//   - Aligned CourseStatus with the 13 status values used in the live demo
//   - Made fields that exist in the DB but were missing from types explicit
//   - Removed never-persisted fields that were only in old types

export type Role = "pm" | "coach";
export type AIProvider = "anthropic" | "openai" | "azure" | "bedrock";

export type CourseStatus =
  | "draft"
  | "toc_generation"
  | "toc_review"
  | "toc_approved"
  | "content_briefs"
  | "ppt_generation"
  | "ppt_review"
  | "recording"
  | "transcription"
  | "content_generation"
  | "content_review"
  | "final_review"
  | "published";

export type Platform = "coursera" | "udemy" | "university" | "infylearn" | "custom";

export type ContentType =
  | "reading"
  | "practice_quiz"
  | "graded_quiz"
  | "discussion"
  | "plugin"
  | "case_study"
  | "glossary"
  | "ai_dialogue"
  | "peer_review";

export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

// ─── Core ────────────────────────────────────────────────────────────────────

export interface Org {
  id: string;
  name: string;
  slug: string;
  brand_kit: { primary_hex?: string; logo_url?: string; font_family?: string } & Record<string, unknown>;
  default_platform: Platform;
  ai_provider: AIProvider;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  org_id: string;
  auth_user_id: string;
  email: string;
  name: string;
  role: Role;
  is_admin: boolean;
  avatar_url?: string;
}

// ─── Course graph ────────────────────────────────────────────────────────────

export interface LearningObjective {
  id: string;
  text: string;
  bloom_level: BloomLevel;
}

export interface Course {
  id: string;
  org_id: string;
  title: string;
  description: string;
  platform: Platform;
  status: CourseStatus;
  audience_level: "beginner" | "intermediate" | "advanced" | "mixed";
  duration_weeks: number;
  hours_per_week: number;
  domain?: string;
  prerequisites?: string;
  target_job_roles: string[];
  certification_goal?: string;
  theory_handson_ratio: number; // 0-100, theory %
  project_based: boolean;
  capstone: boolean;
  reference_course_url?: string;
  created_by?: string;
  assigned_coach?: string;
  content_types: ContentType[];
  module_hours: Record<string, number>;
  toc_locked: boolean;
  toc_locked_at?: string;
  toc_locked_by?: string;
  published_at?: string;
  published_to_platform_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  org_id: string;
  course_id: string;
  title: string;
  description: string;
  duration_hours: number;
  order: number;
  is_capstone: boolean;
  is_project_milestone: boolean;
  learning_objectives: LearningObjective[];
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  org_id: string;
  module_id: string;
  course_id: string;
  title: string;
  description: string;
  order: number;
  learning_objectives: LearningObjective[];
  content_types: ContentType[];
  videos: Video[];
}

export interface Video {
  id: string;
  org_id: string;
  course_id: string;
  lesson_id: string;
  title: string;
  duration_minutes: number;
  order: number;
  is_handson: boolean;
  coach_slide_count?: number;
  status:
    | "pending"
    | "brief_ready"
    | "ppt_ready"
    | "recorded"
    | "transcribed"
    | "reviewed";
  recording_mode?: "zoom" | "upload" | "ai_voice";
}

// ─── Production artifacts ────────────────────────────────────────────────────

export interface ContentItem {
  id: string;
  org_id: string;
  course_id: string;
  lesson_id: string;
  type: ContentType | "video";
  title: string;
  description?: string;
  duration?: string;
  order: number;
  content?: unknown;
  status: "pending" | "generating" | "generated" | "approved";
}

export interface ContentBrief {
  id: string;
  org_id: string;
  course_id: string;
  lesson_id: string;
  video_id: string;
  coach_id?: string;
  what_to_cover: string;
  examples: string;
  visual_cues: string;
  key_takeaways: string;
  script_outline: string;
  status: "pending" | "generating" | "generated" | "approved" | "changes_requested";
  created_at: string;
  updated_at: string;
}

export interface CoachInput {
  id: string;
  org_id: string;
  course_id: string;
  video_id: string;
  coach_id?: string;
  key_topics?: string;
  examples?: string;
  visual_requirements?: string;
  difficulty_notes?: string;
  references?: string;
  special_instructions?: string;
  status: "not_started" | "in_progress" | "completed";
  created_at: string;
  updated_at: string;
}

export interface PPTSlide {
  id: string;
  org_id: string;
  course_id: string;
  lesson_id: string;
  video_id: string;
  slide_number: number;
  title: string;
  content: unknown;
  speaker_notes?: string;
  layout_type: "title" | "content" | "two_column" | "diagram" | "summary" | "code";
  template_used?: string;
  file_url?: string;
  status: "generated" | "editing" | "finalized" | "approved";
}

export interface PPTUpload {
  id: string;
  org_id: string;
  course_id: string;
  video_id: string;
  uploaded_by?: string;
  original_filename: string;
  storage_path?: string;
  slide_count: number;
  status: "uploaded" | "parsing" | "parsed" | "ai_editing" | "finalized";
  created_at: string;
  updated_at: string;
}

export interface Recording {
  id: string;
  org_id: string;
  course_id: string;
  lesson_id: string;
  video_id: string;
  recording_type: "zoom" | "upload" | "elevenlabs";
  audio_url?: string;
  video_url?: string;
  duration_seconds?: number;
  status: "pending" | "scheduled" | "recording" | "uploaded" | "processing" | "ready";
  created_at: string;
  updated_at: string;
}

export interface Transcript {
  id: string;
  org_id: string;
  course_id: string;
  lesson_id: string;
  video_id: string;
  recording_id?: string;
  text_content: string;
  segments: Array<{ start: number; end: number; text: string }>;
  language: string;
  confidence: number;
  word_count: number;
  status: "pending" | "transcribing" | "ready" | "edited" | "approved";
  created_at: string;
  updated_at: string;
}

// ─── Assessments (NEW — replaces JSON-blob quizzes) ──────────────────────────

export interface Assessment {
  id: string;
  org_id: string;
  course_id: string;
  module_id?: string;
  lesson_id?: string;
  title: string;
  kind: "practice_quiz" | "graded_quiz" | "case_study" | "peer_review";
  description?: string;
  passing_score: number;
  time_limit_minutes?: number;
  attempts_allowed: number;
  randomize_questions: boolean;
  status: "draft" | "review" | "approved" | "published";
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  org_id: string;
  course_id: string;
  assessment_id: string;
  prompt: string;
  kind: "mcq_single" | "mcq_multi" | "true_false" | "short_answer" | "long_answer" | "code" | "peer_assessed";
  options: QuestionOption[];
  correct_answers: string[]; // option ids for MCQ; rubric ref for written
  explanation?: string;
  weight: number;
  bloom_level?: BloomLevel;
  learning_objective_id?: string;
  order: number;
}

// ─── Comments / activity / notifications ─────────────────────────────────────

export interface Comment {
  id: string;
  org_id: string;
  course_id: string;
  author_id?: string;
  author_name?: string;
  author_role: "pm" | "coach" | "ai";
  text: string;
  target_type:
    | "module"
    | "lesson"
    | "video"
    | "toc"
    | "brief"
    | "ppt"
    | "content"
    | "assessment"
    | "transcript"
    | "general";
  target_id: string;
  parent_id?: string;
  is_ai_flag: boolean;
  is_ask_pm: boolean;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use Comment with target_type='toc' */
export type TOCComment = Comment;

export interface ActivityLog {
  id: string;
  org_id: string;
  course_id: string;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  org_id: string;
  user_id: string;
  course_id?: string;
  title: string;
  message: string;
  type: "info" | "action" | "warning";
  link?: string;
  read_at?: string;
  created_at: string;
}

// ─── Research / TOC versioning ───────────────────────────────────────────────

export interface CourseResearch {
  id: string;
  org_id: string;
  course_id: string;
  competitor_courses: Array<{
    name: string;
    platform: string;
    rating?: number;
    url?: string;
    duration?: string;
  }>;
  curriculum_gaps: string[];
  job_market_skills: string[];
  industry_trends: string[];
  best_existing_course?: {
    name: string;
    platform: string;
    rating: number;
    why_best: string;
  };
  why_better: string[];
  positioning_statement?: string;
  sources: Array<{ title: string; url: string; type: string }>;
  created_at: string;
}

export interface TOCVersion {
  id: string;
  org_id: string;
  course_id: string;
  version: number;
  toc_data: GeneratedTOC;
  generated_by: "ai" | "manual";
  created_at: string;
}

// ─── AI generation contracts ─────────────────────────────────────────────────

export interface GeneratedTOC {
  course_title: string;
  course_description: string;
  course_learning_objectives: LearningObjective[];
  modules: Module[];
  research?: CourseResearch;
}

export interface ResearchStep {
  label: string;
  description: string;
  status: "pending" | "loading" | "done";
  details?: string;
}

// ─── Phase config (unchanged) ────────────────────────────────────────────────

export const PHASE_CONFIG: Record<
  CourseStatus,
  { label: string; phase: number; color: string }
> = {
  draft: { label: "Draft", phase: 0, color: "gray" },
  toc_generation: { label: "TOC Generation", phase: 1, color: "blue" },
  toc_review: { label: "TOC Review", phase: 2, color: "yellow" },
  toc_approved: { label: "TOC Approved", phase: 3, color: "green" },
  content_briefs: { label: "Content Briefs", phase: 4, color: "blue" },
  ppt_generation: { label: "PPT Generation", phase: 5, color: "purple" },
  ppt_review: { label: "PPT Review", phase: 6, color: "purple" },
  recording: { label: "Recording", phase: 7, color: "orange" },
  transcription: { label: "Transcription", phase: 8, color: "blue" },
  content_generation: { label: "Content Generation", phase: 9, color: "blue" },
  content_review: { label: "Content Review", phase: 10, color: "yellow" },
  final_review: { label: "Final Review", phase: 11, color: "green" },
  published: { label: "Published", phase: 12, color: "green" },
};

export const NEXT_PHASE: Partial<Record<CourseStatus, CourseStatus>> = {
  draft: "toc_generation",
  toc_generation: "toc_review",
  toc_review: "toc_approved",
  toc_approved: "content_briefs",
  content_briefs: "ppt_generation",
  ppt_generation: "ppt_review",
  ppt_review: "recording",
  recording: "transcription",
  transcription: "content_generation",
  content_generation: "content_review",
  content_review: "final_review",
  final_review: "published",
};
