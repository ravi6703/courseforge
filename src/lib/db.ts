// @ts-nocheck
// Supabase data layer for CourseForge
// All database operations go through this file

import { supabase, isSupabaseConfigured } from "./supabase";
import { Course, Module, Lesson, Video, TOCComment, User, ContentType, Platform } from "@/types";

// ===== PROFILES =====

export async function getProfiles(): Promise<User[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data || []).map(mapProfile);
}

export async function getProfileById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return mapProfile(data);
}

export async function getProfileByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();
  if (error) return null;
  return mapProfile(data);
}

function mapProfile(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as "pm" | "coach",
    avatar_url: (row.avatar_url as string) || undefined,
  };
}

// ===== COURSES =====

export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapCourse);
}

export async function getCourseById(id: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return mapCourse(data);
}

export async function createCourse(course: {
  title: string;
  description: string;
  platform: Platform;
  status: string;
  audience_level: string;
  duration_weeks: number;
  content_types: ContentType[];
  created_by: string;
  assigned_coach?: string;
}): Promise<Course> {
  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: course.title,
      description: course.description,
      platform: course.platform,
      status: course.status,
      audience_level: course.audience_level,
      duration_weeks: course.duration_weeks,
      content_types: course.content_types,
      created_by: course.created_by,
      assigned_coach: course.assigned_coach || null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCourse(data);
}

export async function updateCourseStatus(courseId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", courseId);
  if (error) throw error;
}

export async function lockTOC(courseId: string, lockedBy: string): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({
      status: "toc_locked",
      toc_locked: true,
      toc_locked_at: new Date().toISOString(),
      toc_locked_by: lockedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId);
  if (error) throw error;
}

function mapCourse(row: Record<string, unknown>): Course {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || "",
    platform: row.platform as Platform,
    status: row.status as Course["status"],
    audience_level: row.audience_level as Course["audience_level"],
    duration_weeks: row.duration_weeks as number,
    content_types: (row.content_types as ContentType[]) || [],
    created_by: row.created_by as string,
    assigned_coach: (row.assigned_coach as string) || undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// ===== MODULES =====

export async function getModulesByCourse(courseId: string): Promise<Module[]> {
  // Get modules
  const { data: modulesData, error: modulesError } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order");
  if (modulesError) throw modulesError;

  // Get lessons for this course
  const { data: lessonsData, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("order");
  if (lessonsError) throw lessonsError;

  // Get videos for this course
  const { data: videosData, error: videosError } = await supabase
    .from("videos")
    .select("*")
    .eq("course_id", courseId)
    .order("order");
  if (videosError) throw videosError;

  // Build nested structure
  const videosByLesson: Record<string, Video[]> = {};
  for (const v of videosData || []) {
    const lessonId = v.lesson_id as string;
    if (!videosByLesson[lessonId]) videosByLesson[lessonId] = [];
    videosByLesson[lessonId].push({
      id: v.id,
      lesson_id: v.lesson_id,
      title: v.title,
      duration_minutes: v.duration_minutes || 0,
      order: v.order,
      status: v.status,
      recording_mode: v.recording_mode || undefined,
    });
  }

  const lessonsByModule: Record<string, Lesson[]> = {};
  for (const l of lessonsData || []) {
    const moduleId = l.module_id as string;
    if (!lessonsByModule[moduleId]) lessonsByModule[moduleId] = [];
    lessonsByModule[moduleId].push({
      id: l.id,
      module_id: l.module_id,
      title: l.title,
      description: l.description || "",
      order: l.order,
      learning_objectives: l.learning_objectives || [],
      content_types: l.content_types || [],
      videos: videosByLesson[l.id] || [],
    });
  }

  return (modulesData || []).map((m) => ({
    id: m.id,
    course_id: m.course_id,
    title: m.title,
    description: m.description || "",
    order: m.order,
    learning_objectives: m.learning_objectives || [],
    lessons: lessonsByModule[m.id] || [],
  }));
}

export async function createModulesWithLessons(
  courseId: string,
  modules: Module[]
): Promise<void> {
  for (const mod of modules) {
    // Insert module
    const { data: modData, error: modError } = await supabase
      .from("modules")
      .insert({
        course_id: courseId,
        title: mod.title,
        description: mod.description,
        order: mod.order,
        learning_objectives: mod.learning_objectives,
      })
      .select()
      .single();
    if (modError) throw modError;

    const moduleId = modData.id;

    // Insert lessons
    for (const lesson of mod.lessons) {
      const { data: lesData, error: lesError } = await supabase
        .from("lessons")
        .insert({
          module_id: moduleId,
          course_id: courseId,
          title: lesson.title,
          description: lesson.description,
          order: lesson.order,
          learning_objectives: lesson.learning_objectives,
          content_types: lesson.content_types,
        })
        .select()
        .single();
      if (lesError) throw lesError;

      const lessonId = lesData.id;

      // Insert videos
      if (lesson.videos && lesson.videos.length > 0) {
        const videoInserts = lesson.videos.map((v) => ({
          lesson_id: lessonId,
          course_id: courseId,
          title: v.title,
          duration_minutes: v.duration_minutes,
          order: v.order,
          status: v.status || "pending",
        }));

        const { error: vidError } = await supabase
          .from("videos")
          .insert(videoInserts);
        if (vidError) throw vidError;
      }
    }
  }
}

// ===== TOC COMMENTS =====

export async function getCommentsByCourse(courseId: string): Promise<TOCComment[]> {
  const { data, error } = await supabase
    .from("toc_comments")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    course_id: row.course_id,
    author: row.author_name || row.author,
    author_role: row.author_role,
    text: row.text,
    target_type: row.target_type,
    target_id: row.target_id,
    resolved: row.resolved,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
  }));
}

export async function createComment(comment: {
  course_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  text: string;
  target_type: string;
  target_id: string;
}): Promise<TOCComment> {
  const { data, error } = await supabase
    .from("toc_comments")
    .insert(comment)
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    course_id: data.course_id,
    author: data.author_name || data.author,
    author_role: data.author_role,
    text: data.text,
    target_type: data.target_type,
    target_id: data.target_id,
    resolved: data.resolved,
    created_at: data.created_at,
    updated_at: data.updated_at || data.created_at,
  };
}

export async function resolveComment(commentId: string, resolvedBy: string): Promise<void> {
  const { error } = await supabase
    .from("toc_comments")
    .update({
      resolved: true,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", commentId);
  if (error) throw error;
}

// ===== UTILITY =====
export { isSupabaseConfigured };
