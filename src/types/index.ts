export type Role = "pm" | "coach";

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

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar_url?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  platform: Platform;
  status: CourseStatus;
  audience_level: "beginner" | "intermediate" | "advanced" | "mixed";
  duration_weeks: number;
  hours_per_week: number;
  domain: string;
  prerequisites: string;
  target_job_roles: string[];
  certification_goal: string;
  theory_handson_ratio: number; // 0-100, represents theory percentage
  project_based: boolean;
  capstone: boolean;
  reference_course_url: string;
  created_by: string;
  assigned_coach?: string;
  content_types: ContentType[];
  module_hours: Record<string, number>; // module index -> hours allocated
  created_at: string;
  updated_at: string;
}

export interface LearningObjective {
  id: string;
  text: string;
  bloom_level: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
}

export interface ContentItem {
  id: string;
  lesson_id: string;
  type: ContentType | "video";
  title: string;
  description?: string;
  duration?: string;
  order: number;
  content?: string;
  status: "pending" | "generating" | "generated" | "approved";
}

export interface Module {
  id: string;
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
  module_id: string;
  title: string;
  description: string;
  order: number;
  learning_objectives: LearningObjective[];
  content_types: ContentType[];
  content_items?: ContentItem[];
  videos: Video[];
}

export interface Video {
  id: string;
  lesson_id: string;
  title: string;
  duration_minutes: number;
  order: number;
  is_handson: boolean;
  coach_slide_count?: number;
  status: "pending" | "brief_ready" | "ppt_ready" | "recorded" | "transcribed" | "reviewed";
  recording_mode?: "zoom" | "upload" | "ai_voice";
}

export interface CoachInput {
  id: string;
  video_id: string;
  coach_id: string;
  key_topics: string;
  examples: string;
  visual_requirements: string;
  difficulty_notes: string;
  references: string;
  special_instructions: string;
  status: "not_started" | "in_progress" | "completed";
  created_at: string;
  updated_at: string;
}

export interface ContentBrief {
  id: string;
  video_id: string;
  lesson_id: string;
  course_id: string;
  coach_id: string;
  what_to_cover: string;
  examples: string;
  visual_cues: string;
  key_takeaways: string;
  script_outline: string;
  status: "pending" | "generating" | "generated" | "approved" | "changes_requested";
  created_at: string;
  updated_at: string;
}

export interface PPTSlide {
  id: string;
  video_id: string;
  lesson_id: string;
  course_id: string;
  slide_number: number;
  title: string;
  content: string;
  notes?: string;
  layout_type: "title" | "content" | "two_column" | "diagram" | "summary" | "code";
  image_url?: string;
  image_request?: string;
  has_animation: boolean;
  is_uploaded: boolean;
  status: "generated" | "editing" | "finalized" | "approved";
}

export interface PPTUpload {
  id: string;
  video_id: string;
  course_id: string;
  original_filename: string;
  slide_count: number;
  uploaded_by: string;
  status: "uploaded" | "parsing" | "parsed" | "ai_editing" | "finalized";
  created_at: string;
}

export interface Recording {
  id: string;
  video_id: string;
  lesson_id: string;
  course_id: string;
  coach_id: string;
  source: "zoom" | "upload" | "ai_voice";
  zoom_meeting_id?: string;
  recording_url?: string;
  duration_seconds?: number;
  quality?: string;
  status: "not_started" | "scheduled" | "recording" | "uploaded" | "processing" | "ready";
  created_at: string;
  updated_at: string;
}

export interface Transcript {
  id: string;
  recording_id: string;
  video_id: string;
  course_id: string;
  text: string;
  language: string;
  confidence: number;
  word_count: number;
  edited_by?: string;
  status: "pending" | "transcribing" | "ready" | "edited" | "approved";
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  course_id: string;
  author: string;
  author_role: Role;
  text: string;
  target_type: "module" | "lesson" | "video" | "toc" | "brief" | "ppt" | "content" | "general";
  target_id: string;
  resolved: boolean;
  is_ai_flag: boolean;
  is_ask_pm: boolean;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TOCComment extends Comment {}

export interface CourseResearch {
  id: string;
  course_id: string;
  competitor_courses: { name: string; platform: string; rating: number; url: string; duration: string; }[];
  curriculum_gaps: string[];
  job_market_skills: string[];
  industry_trends: string[];
  best_existing_course: { name: string; platform: string; rating: number; why_best: string; };
  why_better: string[];
  positioning_statement: string;
  sources: { title: string; url: string; type: string; }[];
  created_at: string;
}

export interface ActivityLog {
  id: string;
  course_id: string;
  user_id: string;
  user_name: string;
  user_role: Role;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  message: string;
  type: "info" | "action" | "warning";
  read: boolean;
  link?: string;
  created_at: string;
}

export interface ResearchStep {
  label: string;
  description: string;
  status: "pending" | "loading" | "done";
  details?: string;
}

export interface GeneratedTOC {
  course_title: string;
  course_description: string;
  course_learning_objectives: LearningObjective[];
  modules: Module[];
  research?: CourseResearch;
}

// Phase configuration
export const PHASE_CONFIG: Record<CourseStatus, { label: string; phase: number; color: string; }> = {
  draft: { label: "Draft", phase: 0, color: "gray" },
  toc_generation: { label: "TOC Generation", phase: 1, color: "blue" },
  toc_review: { label: "TOC Review", phase: 2, color: "yellow" },
  toc_approved: { label: "TOC Approved", phase: 3, color: "green" },
  content_briefs: { label: "Content Briefs", phase: 4, color: "blue" },
  ppt_generation: { label: "PPT Generation", phase: 5, color: "purple" },
  ppt_review: { label: "PPT Review", phase: 6, color: "purple" },
  recording: { label: "Recording", phase: 7, color: "orange" },
  transcription: { label: "Transcription", phase: 8, color: "blue" },
  content_generation: { label: "Content Generation", phase: 8, color: "blue" },
  content_review: { label: "Content Review", phase: 8, color: "yellow" },
  final_review: { label: "Final Review", phase: 9, color: "green" },
  published: { label: "Published", phase: 9, color: "green" },
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
