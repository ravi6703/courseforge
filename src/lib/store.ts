"use client";

// Simple client-side store for MVP (replaces Supabase until connected)
// This uses localStorage + React state for persistence during development

import {
  Course,
  Module,
  Lesson,
  User,
  Role,
  GeneratedTOC,
  TOCComment,
  ContentType,
  Platform,
  ContentBrief,
  PPTSlide,
  PPTUpload,
  Recording,
  Transcript,
  Comment,
  ContentItem,
  CoachInput,
  CourseResearch,
  ActivityLog,
  Notification,
} from "@/types";

const STORAGE_KEY = "courseforge_data";

export interface AppState {
  currentUser: User | null;
  courses: Course[];
  modules: Record<string, Module[]>; // keyed by course_id
  comments: Comment[];
  contentBriefs: ContentBrief[];
  pptSlides: PPTSlide[];
  pptUploads: PPTUpload[];
  recordings: Recording[];
  transcripts: Transcript[];
  contentItems: ContentItem[];
  coachInputs: CoachInput[];
  courseResearch: Record<string, CourseResearch>; // keyed by course_id
  activityLog: ActivityLog[];
  notifications: Notification[];
}

const defaultState: AppState = {
  currentUser: null,
  courses: [],
  modules: {},
  comments: [],
  contentBriefs: [],
  pptSlides: [],
  pptUploads: [],
  recordings: [],
  transcripts: [],
  contentItems: [],
  coachInputs: [],
  courseResearch: {},
  activityLog: [],
  notifications: [],
};

// Demo users
export const DEMO_USERS: Record<Role, User> = {
  pm: {
    id: "pm-001",
    org_id: "00000000-0000-0000-0000-0000000000aa",
    auth_user_id: "pm-001",
    email: "ravi@boardinfinity.com",
    name: "Ravi",
    role: "pm",
    is_admin: true,
  },
  coach: {
    id: "coach-001",
    org_id: "00000000-0000-0000-0000-0000000000aa",
    auth_user_id: "coach-001",
    email: "coach@boardinfinity.com",
    name: "Dr. Priya Sharma",
    role: "coach",
    is_admin: false,
  },
};

// Sample course for demo
export const SAMPLE_COURSE: Course = {
  id: "course-001",
  org_id: "00000000-0000-0000-0000-0000000000aa",
  toc_locked: false,
  title: "Applied Generative AI for Business",
  description: "A comprehensive course covering practical applications of generative AI in business contexts, including prompt engineering, AI workflow automation, and responsible AI deployment.",
  platform: "infylearn",
  status: "toc_review",
  audience_level: "intermediate",
  duration_weeks: 6,
  hours_per_week: 8,
  domain: "Generative AI",
  prerequisites: "",
  target_job_roles: ["AI Engineer", "ML Engineer"],
  certification_goal: "",
  theory_handson_ratio: 60,
  project_based: true,
  capstone: true,
  reference_course_url: "",
  created_by: "pm-001",
  assigned_coach: "coach-001",
  content_types: ["reading", "practice_quiz", "graded_quiz", "discussion", "case_study", "glossary"],
  module_hours: {},
  created_at: "2026-03-25T10:00:00Z",
  updated_at: "2026-03-28T10:00:00Z",
};

export const SAMPLE_MODULES: Module[] = [
  {
    id: "mod-1",
    org_id: "00000000-0000-0000-0000-0000000000aa",
    course_id: "course-001",
    title: "Module 1: Foundations of Generative AI",
    description: "Understanding the core concepts, architectures, and capabilities of generative AI systems.",
    duration_hours: 12,
    order: 1,
    is_capstone: false,
    is_project_milestone: false,
    learning_objectives: [
      { id: "lo-1-1", text: "Explain the key differences between discriminative and generative AI models", bloom_level: "understand" },
      { id: "lo-1-2", text: "Identify the major generative AI architectures (Transformers, Diffusion, GANs)", bloom_level: "remember" },
      { id: "lo-1-3", text: "Evaluate the capabilities and limitations of current LLMs for business tasks", bloom_level: "evaluate" },
    ],
    lessons: [
      {
        id: "les-1-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-1", title: "What is Generative AI?", description: "Introduction to generative AI and its business significance", order: 1,
        learning_objectives: [{ id: "lo-les-1-1", text: "Define generative AI and distinguish it from traditional AI approaches", bloom_level: "understand" }],
        content_types: ["reading", "glossary", "discussion", "practice_quiz"],
        videos: [
          { id: "v-1-1-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-1-1", title: "The Rise of Generative AI", duration_minutes: 12, order: 1, is_handson: false, status: "pending" },
          { id: "v-1-1-2", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-1-1", title: "How LLMs Work: A Non-Technical Overview", duration_minutes: 15, order: 2, is_handson: false, status: "pending" },
        ]
      },
      {
        id: "les-1-2", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-1", title: "AI Architectures Demystified", description: "Transformers, Diffusion Models, and GANs explained for business leaders", order: 2,
        learning_objectives: [{ id: "lo-les-1-2", text: "Compare transformer, diffusion, and GAN architectures at a conceptual level", bloom_level: "analyze" }],
        content_types: ["reading", "plugin", "practice_quiz"],
        videos: [
          { id: "v-1-2-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-1-2", title: "Transformer Architecture Explained", duration_minutes: 18, order: 1, is_handson: false, status: "pending" },
          { id: "v-1-2-2", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-1-2", title: "Diffusion Models and Image Generation", duration_minutes: 14, order: 2, is_handson: false, status: "pending" },
        ]
      },
      {
        id: "les-1-3", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-1", title: "The Business Landscape of AI", description: "Market overview, key players, and enterprise adoption patterns", order: 3,
        learning_objectives: [{ id: "lo-les-1-3", text: "Assess the current state of enterprise AI adoption and identify key trends", bloom_level: "evaluate" }],
        content_types: ["reading", "plugin", "practice_quiz", "graded_quiz"],
        videos: [
          { id: "v-1-3-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-1-3", title: "AI Market Landscape 2026", duration_minutes: 16, order: 1, is_handson: false, status: "pending" },
        ]
      },
    ],
  },
  {
    id: "mod-2",
    org_id: "00000000-0000-0000-0000-0000000000aa",
    course_id: "course-001",
    title: "Module 2: Prompt Engineering for Professionals",
    description: "Master the art and science of effective prompting to get reliable, high-quality outputs from AI systems.",
    duration_hours: 14,
    order: 2,
    is_capstone: false,
    is_project_milestone: false,
    learning_objectives: [
      { id: "lo-2-1", text: "Design effective prompts using structured frameworks (STAR, Chain-of-Thought)", bloom_level: "create" },
      { id: "lo-2-2", text: "Apply few-shot and zero-shot prompting techniques to business scenarios", bloom_level: "apply" },
      { id: "lo-2-3", text: "Analyze prompt failures and systematically improve output quality", bloom_level: "analyze" },
    ],
    lessons: [
      {
        id: "les-2-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-2", title: "Principles of Effective Prompting", description: "Core frameworks and mental models for prompt design", order: 1,
        learning_objectives: [{ id: "lo-les-2-1", text: "Apply the STAR framework to construct business-relevant prompts", bloom_level: "apply" }],
        content_types: ["reading", "discussion", "practice_quiz"],
        videos: [
          { id: "v-2-1-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-2-1", title: "The STAR Prompting Framework", duration_minutes: 20, order: 1, is_handson: false, status: "pending" },
          { id: "v-2-1-2", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-2-1", title: "Common Prompting Mistakes", duration_minutes: 12, order: 2, is_handson: false, status: "pending" },
        ]
      },
      {
        id: "les-2-2", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-2", title: "Advanced Prompting Techniques", description: "Chain-of-thought, few-shot, and system prompts for complex tasks", order: 2,
        learning_objectives: [{ id: "lo-les-2-2", text: "Implement chain-of-thought prompting for multi-step reasoning tasks", bloom_level: "apply" }],
        content_types: ["reading", "plugin", "practice_quiz"],
        videos: [
          { id: "v-2-2-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-2-2", title: "Chain-of-Thought Prompting", duration_minutes: 18, order: 1, is_handson: false, status: "pending" },
          { id: "v-2-2-2", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-2-2", title: "Few-Shot vs Zero-Shot: When to Use Each", duration_minutes: 15, order: 2, is_handson: false, status: "pending" },
        ]
      },
      {
        id: "les-2-3", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-2", title: "Prompt Engineering for Enterprise", description: "Building reusable prompt libraries for teams", order: 3,
        learning_objectives: [{ id: "lo-les-2-3", text: "Design a reusable prompt library for a business function", bloom_level: "create" }],
        content_types: ["reading", "practice_quiz", "graded_quiz"],
        videos: [
          { id: "v-2-3-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-2-3", title: "Building Your Prompt Library", duration_minutes: 22, order: 1, is_handson: false, status: "pending" },
        ]
      },
    ],
  },
  {
    id: "mod-3",
    org_id: "00000000-0000-0000-0000-0000000000aa",
    course_id: "course-001",
    title: "Module 3: AI Workflow Automation",
    description: "Design and implement AI-powered workflows that automate repetitive business processes.",
    duration_hours: 16,
    order: 3,
    is_capstone: false,
    is_project_milestone: false,
    learning_objectives: [
      { id: "lo-3-1", text: "Design AI automation workflows for common business processes", bloom_level: "create" },
      { id: "lo-3-2", text: "Evaluate build vs. buy decisions for AI workflow tools", bloom_level: "evaluate" },
      { id: "lo-3-3", text: "Implement an end-to-end AI automation using no-code/low-code tools", bloom_level: "apply" },
    ],
    lessons: [
      {
        id: "les-3-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-3", title: "Identifying Automation Opportunities", description: "Framework for finding high-value automation targets", order: 1,
        learning_objectives: [{ id: "lo-les-3-1", text: "Apply the automation ROI framework to identify high-impact workflow candidates", bloom_level: "apply" }],
        content_types: ["reading", "discussion", "practice_quiz"],
        videos: [
          { id: "v-3-1-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-3-1", title: "The Automation ROI Framework", duration_minutes: 16, order: 1, is_handson: false, status: "pending" },
          { id: "v-3-1-2", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-3-1", title: "Case Study: Automating Customer Support", duration_minutes: 20, order: 2, is_handson: false, status: "pending" },
        ]
      },
      {
        id: "les-3-2", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-3", title: "Building AI Workflows", description: "Hands-on: creating automation pipelines with AI tools", order: 2,
        learning_objectives: [{ id: "lo-les-3-2", text: "Build an AI workflow using Zapier/Make with LLM integration", bloom_level: "create" }],
        content_types: ["reading", "plugin", "case_study", "practice_quiz"],
        videos: [
          { id: "v-3-2-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-3-2", title: "Building Your First AI Workflow", duration_minutes: 25, order: 1, is_handson: true, status: "pending" },
        ]
      },
      {
        id: "les-3-3", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-3", title: "Scaling and Monitoring AI Automation", description: "Governance, monitoring, and scaling AI workflows", order: 3,
        learning_objectives: [{ id: "lo-les-3-3", text: "Design a monitoring and governance framework for AI automation", bloom_level: "create" }],
        content_types: ["reading", "practice_quiz", "graded_quiz"],
        videos: [
          { id: "v-3-3-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-3-3", title: "AI Governance for Automation", duration_minutes: 18, order: 1, is_handson: false, status: "pending" },
        ]
      },
    ],
  },
  {
    id: "mod-4",
    org_id: "00000000-0000-0000-0000-0000000000aa",
    course_id: "course-001",
    title: "Module 4: Responsible AI & Future Trends",
    description: "Navigate ethical considerations, bias mitigation, and prepare for the next wave of AI capabilities.",
    duration_hours: 10,
    order: 4,
    is_capstone: false,
    is_project_milestone: false,
    learning_objectives: [
      { id: "lo-4-1", text: "Evaluate AI outputs for bias, hallucination, and ethical concerns", bloom_level: "evaluate" },
      { id: "lo-4-2", text: "Design a responsible AI policy for an organization", bloom_level: "create" },
      { id: "lo-4-3", text: "Analyze emerging AI trends and their potential business impact", bloom_level: "analyze" },
    ],
    lessons: [
      {
        id: "les-4-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-4", title: "AI Ethics and Bias", description: "Understanding and mitigating AI bias in business applications", order: 1,
        learning_objectives: [{ id: "lo-les-4-1", text: "Identify common sources of bias in AI systems and propose mitigation strategies", bloom_level: "analyze" }],
        content_types: ["reading", "discussion", "practice_quiz"],
        videos: [
          { id: "v-4-1-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-4-1", title: "Understanding AI Bias", duration_minutes: 18, order: 1, is_handson: false, status: "pending" },
          { id: "v-4-1-2", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-4-1", title: "Bias Mitigation Strategies", duration_minutes: 15, order: 2, is_handson: false, status: "pending" },
        ]
      },
      {
        id: "les-4-2", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-4", title: "Building an AI Policy", description: "Practical guide to responsible AI governance", order: 2,
        learning_objectives: [{ id: "lo-les-4-2", text: "Draft a responsible AI usage policy for a department or organization", bloom_level: "create" }],
        content_types: ["reading", "plugin", "case_study", "practice_quiz"],
        videos: [
          { id: "v-4-2-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-4-2", title: "Components of an AI Policy", duration_minutes: 20, order: 1, is_handson: false, status: "pending" },
        ]
      },
      {
        id: "les-4-3", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", module_id: "mod-4", title: "The Future of AI in Business", description: "Emerging trends: agents, multimodal AI, and industry-specific models", order: 3,
        learning_objectives: [{ id: "lo-les-4-3", text: "Predict which AI trends will have the highest impact on your industry within 2 years", bloom_level: "evaluate" }],
        content_types: ["reading", "practice_quiz", "graded_quiz"],
        videos: [
          { id: "v-4-3-1", org_id: "00000000-0000-0000-0000-0000000000aa", course_id: "course-001", lesson_id: "les-4-3", title: "AI Trends Shaping 2027 and Beyond", duration_minutes: 22, order: 1, is_handson: false, status: "pending" },
        ]
      },
    ],
  },
];

export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Initialize with sample data
  const initial: AppState = {
    ...defaultState,
    courses: [SAMPLE_COURSE],
    modules: { "course-001": SAMPLE_MODULES },
  };
  saveState(initial);
  return initial;
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ─── COURSE OPERATIONS ───────────────────────────────────────────

export function addCourse(course: Course): void {
  const state = loadState();
  state.courses.push(course);
  saveState(state);
  if (typeof window !== "undefined") {
    fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(course),
    }).catch((e) => console.error("Course sync to Supabase failed:", e));
  }
}

export function updateCourse(courseId: string, updates: Partial<Course>): void {
  const state = loadState();
  const course = state.courses.find((c) => c.id === courseId);
  if (course) {
    Object.assign(course, updates, { updated_at: new Date().toISOString() });
    saveState(state);
  }
}

export function getCourseById(courseId: string): Course | undefined {
  const state = loadState();
  return state.courses.find((c) => c.id === courseId);
}

export function getAllCourses(): Course[] {
  const state = loadState();
  return state.courses;
}

// ─── MODULE OPERATIONS ───────────────────────────────────────────

export function getModulesByCourse(courseId: string): Module[] {
  const state = loadState();
  return state.modules[courseId] || [];
}

export function addModules(courseId: string, modules: Module[]): void {
  const state = loadState();
  state.modules[courseId] = modules;
  saveState(state);
}

export function updateModule(courseId: string, moduleId: string, updates: Partial<Module>): void {
  const state = loadState();
  const modules = state.modules[courseId];
  if (modules) {
    const module = modules.find((m) => m.id === moduleId);
    if (module) {
      Object.assign(module, updates);
      saveState(state);
    }
  }
}

// ─── LESSON OPERATIONS ───────────────────────────────────────────

export function getLessonById(courseId: string, lessonId: string): Lesson | undefined {
  const state = loadState();
  const modules = state.modules[courseId];
  if (!modules) return undefined;
  for (const mod of modules) {
    const lesson = mod.lessons.find((l) => l.id === lessonId);
    if (lesson) return lesson;
  }
  return undefined;
}

export function updateLesson(
  courseId: string,
  lessonId: string,
  updates: Partial<Lesson>
): void {
  const state = loadState();
  const modules = state.modules[courseId];
  if (!modules) return;
  for (const mod of modules) {
    const lesson = mod.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      Object.assign(lesson, updates);
      saveState(state);
      return;
    }
  }
}

// ─── VIDEO OPERATIONS ────────────────────────────────────────────

export function getVideoById(courseId: string, videoId: string): any {
  const state = loadState();
  const modules = state.modules[courseId];
  if (!modules) return undefined;
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      const video = lesson.videos.find((v) => v.id === videoId);
      if (video) return video;
    }
  }
  return undefined;
}

// ─── COMMENT OPERATIONS ──────────────────────────────────────────

export function addComment(comment: Comment): void {
  const state = loadState();
  state.comments.push(comment);
  saveState(state);
}

export function getCommentsByCourse(courseId: string): Comment[] {
  const state = loadState();
  return state.comments.filter((c) => c.course_id === courseId);
}

export function updateComment(commentId: string, updates: Partial<Comment>): void {
  const state = loadState();
  const comment = state.comments.find((c) => c.id === commentId);
  if (comment) {
    Object.assign(comment, updates, { updated_at: new Date().toISOString() });
    saveState(state);
  }
}

export function resolveComment(commentId: string): void {
  updateComment(commentId, { resolved: true });
}

// ─── CONTENT BRIEF OPERATIONS ───────────────────────────────────

export function addContentBrief(brief: ContentBrief): void {
  const state = loadState();
  state.contentBriefs.push(brief);
  saveState(state);
}

export function getContentBriefsByVideo(videoId: string): ContentBrief[] {
  const state = loadState();
  return state.contentBriefs.filter((b) => b.video_id === videoId);
}

export function updateContentBrief(briefId: string, updates: Partial<ContentBrief>): void {
  const state = loadState();
  const brief = state.contentBriefs.find((b) => b.id === briefId);
  if (brief) {
    Object.assign(brief, updates, { updated_at: new Date().toISOString() });
    saveState(state);
  }
}

// ─── PPT SLIDE OPERATIONS ──────────────────────────────────────

export function addPPTSlide(slide: PPTSlide): void {
  const state = loadState();
  state.pptSlides.push(slide);
  saveState(state);
}

export function getPPTSlidesByVideo(videoId: string): PPTSlide[] {
  const state = loadState();
  return state.pptSlides.filter((s) => s.video_id === videoId);
}

export function updatePPTSlide(slideId: string, updates: Partial<PPTSlide>): void {
  const state = loadState();
  const slide = state.pptSlides.find((s) => s.id === slideId);
  if (slide) {
    Object.assign(slide, updates);
    saveState(state);
  }
}

// ─── PPT UPLOAD OPERATIONS ────────────────────────────────────────

export function addPPTUpload(upload: PPTUpload): void {
  const state = loadState();
  state.pptUploads.push(upload);
  saveState(state);
}

export function getPPTUploadsByVideo(videoId: string): PPTUpload[] {
  const state = loadState();
  return state.pptUploads.filter((u) => u.video_id === videoId);
}

export function updatePPTUpload(uploadId: string, updates: Partial<PPTUpload>): void {
  const state = loadState();
  const upload = state.pptUploads.find((u) => u.id === uploadId);
  if (upload) {
    Object.assign(upload, updates);
    saveState(state);
  }
}

// ─── RECORDING OPERATIONS ────────────────────────────────────────

export function addRecording(recording: Recording): void {
  const state = loadState();
  state.recordings.push(recording);
  saveState(state);
}

export function getRecordingByVideo(videoId: string): Recording | undefined {
  const state = loadState();
  return state.recordings.find((r) => r.video_id === videoId);
}

export function updateRecording(recordingId: string, updates: Partial<Recording>): void {
  const state = loadState();
  const recording = state.recordings.find((r) => r.id === recordingId);
  if (recording) {
    Object.assign(recording, updates, { updated_at: new Date().toISOString() });
    saveState(state);
  }
}

// ─── TRANSCRIPT OPERATIONS ───────────────────────────────────────

export function addTranscript(transcript: Transcript): void {
  const state = loadState();
  state.transcripts.push(transcript);
  saveState(state);
}

export function getTranscriptByRecording(recordingId: string): Transcript | undefined {
  const state = loadState();
  return state.transcripts.find((t) => t.recording_id === recordingId);
}

export function updateTranscript(transcriptId: string, updates: Partial<Transcript>): void {
  const state = loadState();
  const transcript = state.transcripts.find((t) => t.id === transcriptId);
  if (transcript) {
    Object.assign(transcript, updates, { updated_at: new Date().toISOString() });
    saveState(state);
  }
}

// ─── CONTENT ITEM OPERATIONS ─────────────────────────────────────

export function addContentItem(item: ContentItem): void {
  const state = loadState();
  state.contentItems.push(item);
  saveState(state);
}

export function getContentItemsByLesson(lessonId: string): ContentItem[] {
  const state = loadState();
  return state.contentItems.filter((c) => c.lesson_id === lessonId);
}

export function updateContentItem(itemId: string, updates: Partial<ContentItem>): void {
  const state = loadState();
  const item = state.contentItems.find((c) => c.id === itemId);
  if (item) {
    Object.assign(item, updates);
    saveState(state);
  }
}

// ─── COACH INPUT OPERATIONS ──────────────────────────────────────

export function addCoachInput(input: CoachInput): void {
  const state = loadState();
  state.coachInputs.push(input);
  saveState(state);
}

export function getCoachInputByVideo(videoId: string): CoachInput | undefined {
  const state = loadState();
  return state.coachInputs.find((c) => c.video_id === videoId);
}

export function updateCoachInput(inputId: string, updates: Partial<CoachInput>): void {
  const state = loadState();
  const input = state.coachInputs.find((c) => c.id === inputId);
  if (input) {
    Object.assign(input, updates, { updated_at: new Date().toISOString() });
    saveState(state);
  }
}

// ─── COURSE RESEARCH OPERATIONS ──────────────────────────────────

export function setCourseResearch(courseId: string, research: CourseResearch): void {
  const state = loadState();
  state.courseResearch[courseId] = research;
  saveState(state);
}

export function getCourseResearch(courseId: string): CourseResearch | undefined {
  const state = loadState();
  return state.courseResearch[courseId];
}

// ─── ACTIVITY LOG OPERATIONS ─────────────────────────────────────

export function addActivityLog(log: ActivityLog): void {
  const state = loadState();
  state.activityLog.push(log);
  saveState(state);
}

export function getActivityLogByCourse(courseId: string): ActivityLog[] {
  const state = loadState();
  return state.activityLog.filter((log) => log.course_id === courseId);
}

// ─── NOTIFICATION OPERATIONS ────────────────────────────────────

export function addNotification(notification: Notification): void {
  const state = loadState();
  state.notifications.push(notification);
  saveState(state);
}

export function getNotificationsByUser(userId: string): Notification[] {
  const state = loadState();
  return state.notifications.filter((n) => n.user_id === userId);
}

export function markNotificationRead(notificationId: string): void {
  const state = loadState();
  const notification = state.notifications.find((n) => n.id === notificationId);
  if (notification) {
    notification.read_at = new Date().toISOString();
    saveState(state);
  }
}
