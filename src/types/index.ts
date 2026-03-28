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
  | "ai_dialogue";

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
  audience_level: "beginner" | "intermediate" | "advanced";
  duration_weeks: number;
  created_by: string;
  assigned_coach?: string;
  content_types: ContentType[];
  video_style?: "green_screen" | "ppt_based";
  requirements?: string;
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
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  duration?: string;
  order: number;
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
  status: "pending" | "ppt_ready" | "recorded" | "reviewed";
  recording_mode?: "ai_voice" | "self_narrate" | "natural";
}

export interface ContentBrief {
  id: string;
  video_id: string;
  lesson_id: string;
  course_id: string;
  coach_id: string;
  what_to_cover: string;
  examples: string;
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
  image_url?: string;
  status: "generated" | "reviewing" | "approved";
}

export interface Recording {
  id: string;
  video_id: string;
  lesson_id: string;
  course_id: string;
  coach_id: string;
  recording_url?: string;
  duration_seconds?: number;
  status: "pending" | "uploading" | "recorded" | "processing";
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
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  course_id: string;
  author: string;
  author_role: Role;
  text: string;
  target_type: "module" | "lesson" | "video" | "toc" | "brief" | "ppt" | "content";
  target_id: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface TOCComment extends Comment {}

export interface GeneratedTOC {
  course_title: string;
  course_description: string;
  course_learning_objectives: LearningObjective[];
  modules: Module[];
}
