export type Role = "pm" | "coach";

export type CourseStatus =
  | "draft"
  | "toc_generation"
  | "toc_review"
  | "toc_locked"
  | "content_generation"
  | "ppt_generation"
  | "video_recording"
  | "review"
  | "completed";

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
  created_at: string;
  updated_at: string;
}

export interface LearningObjective {
  id: string;
  text: string;
  bloom_level: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
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

export interface TOCComment {
  id: string;
  author: string;
  author_role: Role;
  text: string;
  target_type: "module" | "lesson" | "video";
  target_id: string;
  resolved: boolean;
  created_at: string;
}

export interface GeneratedTOC {
  course_title: string;
  course_description: string;
  course_learning_objectives: LearningObjective[];
  modules: Module[];
}
