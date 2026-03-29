"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { loadState } from "@/lib/store";

import type { CourseStatus, Role, Module as TypeModule, Lesson as TypeLesson } from "@/types";

// Re-export for this component
type PageRole = Role;
type PageCourseStatus = CourseStatus;

interface User {
  id: string;
  email: string;
  name: string;
  role: PageRole;
}

interface ContentItem {
  id?: string;
  type: string;
  title: string;
  duration: string;
  order: number;
}

// Use types from the types file - local interfaces are causing conflicts
type Lesson = TypeLesson;
type Module = TypeModule;

interface Course {
  id: string;
  title: string;
  description: string;
  platform: string;
  status: PageCourseStatus;
  audience_level: string;
  duration_weeks: number;
  created_by: string;
  assigned_coach?: string;
  content_types: string[];
  created_at: string;
  updated_at: string;
}

interface ExpandedState {
  [key: string]: boolean;
}

const contentItemIcon: Record<string, { icon: string; color: string; bg: string }> = {
  video: { icon: "▶", color: "text-blue-700", bg: "bg-blue-50" },
  reading: { icon: "📖", color: "text-green-700", bg: "bg-green-50" },
  practice_quiz: { icon: "✏️", color: "text-orange-700", bg: "bg-orange-50" },
  graded_quiz: { icon: "📝", color: "text-red-700", bg: "bg-red-50" },
  assignment: { icon: "📝", color: "text-red-700", bg: "bg-red-50" },
  discussion: { icon: "💬", color: "text-purple-700", bg: "bg-purple-50" },
  glossary: { icon: "📚", color: "text-teal-700", bg: "bg-teal-50" },
  case_study: { icon: "🔍", color: "text-emerald-700", bg: "bg-emerald-50" },
  ai_dialogue: { icon: "🤖", color: "text-violet-700", bg: "bg-violet-50" },
  ungraded_lab: { icon: "🧪", color: "text-cyan-700", bg: "bg-cyan-50" },
  ungraded_plugin: { icon: "🔌", color: "text-amber-700", bg: "bg-amber-50" },
};

export default function TOCBuilderPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState<ExpandedState>({});
  const [expandedModules, setExpandedModules] = useState<ExpandedState>({});
  const [expandedLessons, setExpandedLessons] = useState<ExpandedState>({});
  const [editingMessage, setEditingMessage] = useState<string | null>(null);

  useEffect(() => {
    const initializePage = async () => {
      const userString = localStorage.getItem("courseforge_user");
      if (!userString) { router.push("/"); return; }

      try {
        const userData: User = JSON.parse(userString);
        setUser(userData);
        const state = loadState();
        setCourses(state.courses);
        setModules(state.modules);
      } catch (error) {
        console.error("Error initializing page:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [router]);

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons((prev) => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMessage("Inline editing coming soon — you will be able to add, remove, and reorder items directly");
    setTimeout(() => setEditingMessage(null), 3000);
  };

  const getStatusColor = (status: CourseStatus): string => {
    if (["draft", "toc_generation"].includes(status)) return "bg-blue-100 text-blue-700";
    if (["toc_review", "toc_approved"].includes(status)) return "bg-yellow-100 text-yellow-700";
    if (["content_briefs", "ppt_generation", "ppt_review"].includes(status)) return "bg-orange-100 text-orange-700";
    if (["recording", "transcription", "content_generation", "content_review", "final_review"].includes(status)) return "bg-purple-100 text-purple-700";
    if (status === "published") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700";
  };

  const courseModules = (courseId: string): Module[] => modules[courseId] || [];

  const handleLogout = () => { localStorage.removeItem("courseforge_user"); router.push("/"); };

  const getItemStyle = (type: string) => contentItemIcon[type] || { icon: "•", color: "text-gray-700", bg: "bg-gray-50" };

  const countContentItems = (mods: Module[]): number => {
    return mods.reduce((sum, mod) =>
      sum + mod.lessons.reduce((lSum, les) =>
        lSum + (les.content_items?.length || les.videos?.length || 0), 0
      ), 0
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="mb-4 text-sm text-gray-600">
              <a href="/dashboard" className="hover:text-gray-900">Dashboard</a>
              <span className="mx-2">/</span>
              <span className="text-gray-900 font-medium">TOC Builder</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">TOC Builder</h1>
            <p className="text-gray-600 mt-1">Detailed course structure with all content items — Board Infinity format</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {/* Redirect Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Full TOC editing is now available in the Course Detail page</p>
              <p className="text-xs text-blue-700 mt-1">Click on any course below to open its detailed view with all production phases</p>
            </div>
          </div>

          {editingMessage && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">{editingMessage}</div>
          )}

          {courses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No courses found. Create your first course to get started.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {courses.map((course) => {
                const mods = courseModules(course.id);
                const totalLessons = mods.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0);
                const totalItems = countContentItems(mods);
                const isCourseExpanded = expandedCourses[course.id];

                return (
                  <div key={course.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* Course Header */}
                    <div onClick={() => toggleCourse(course.id)} className="p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <a href={`/course/${course.id}`} className="text-xl font-bold text-blue-700 hover:text-blue-900 hover:underline">{course.title}</a>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(course.status)}`}>
                              {course.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{course.description}</p>
                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <span><strong className="text-gray-900">{mods.length}</strong> Modules</span>
                            <span><strong className="text-gray-900">{totalLessons}</strong> Lessons</span>
                            <span><strong className="text-gray-900">{totalItems}</strong> Content Items</span>
                            <span><strong className="text-gray-900">{course.duration_weeks}</strong> Weeks</span>
                            <span>Level: <strong className="text-gray-900">{course.audience_level}</strong></span>
                          </div>
                        </div>
                        <div className="ml-4 text-gray-400">
                          <svg className={`w-5 h-5 transition-transform ${isCourseExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Course → Modules */}
                    {isCourseExpanded && (
                      <div className="border-t border-gray-200">
                        {mods.length === 0 ? (
                          <div className="p-6 text-gray-500 italic">No modules created yet</div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {mods.sort((a, b) => a.order - b.order).map((mod) => {
                              const isModExpanded = expandedModules[mod.id];

                              return (
                                <div key={mod.id}>
                                  {/* Module Row */}
                                  <div onClick={() => toggleModule(mod.id)} className="px-6 py-4 cursor-pointer hover:bg-blue-50/50 transition-colors flex items-start gap-4">
                                    <div className="flex-shrink-0 mt-0.5">
                                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                                        {mod.order}
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-gray-900">{mod.title}</h3>
                                        {mod.duration_hours && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{mod.duration_hours}</span>}
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{mod.description}</p>
                                      {/* Learning Objectives */}
                                      {mod.learning_objectives && mod.learning_objectives.length > 0 && isModExpanded && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                          <p className="text-xs font-semibold text-gray-700 mb-1.5">Learning Objectives</p>
                                          <ul className="space-y-1">
                                            {mod.learning_objectives.map((lo: any) => (
                                              <li key={lo.id} className="text-xs text-gray-600 flex items-start gap-2">
                                                <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                  ({ remember: "bg-red-100 text-red-700", understand: "bg-orange-100 text-orange-700", apply: "bg-yellow-100 text-yellow-700", analyze: "bg-green-100 text-green-700", evaluate: "bg-blue-100 text-blue-700", create: "bg-purple-100 text-purple-700" } as Record<string, string>)[lo.bloom_level as string] || "bg-gray-100 text-gray-700"
                                                }`}>
                                                  {lo.bloom_level}
                                                </span>
                                                <span>{lo.text}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      <div className="mt-2 text-xs text-gray-500">
                                        {mod.lessons?.length || 0} lessons
                                      </div>
                                    </div>
                                    <svg className={`w-4 h-4 text-gray-400 mt-1 transition-transform flex-shrink-0 ${isModExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>

                                  {/* Expanded Module → Lessons */}
                                  {isModExpanded && mod.lessons && (
                                    <div className="bg-gray-50/50">
                                      {mod.lessons.sort((a, b) => a.order - b.order).map((lesson) => {
                                        const isLessonExpanded = expandedLessons[lesson.id];
                                        const items = lesson.content_items || [];

                                        return (
                                          <div key={lesson.id} className="border-t border-gray-100">
                                            {/* Lesson Row */}
                                            <div onClick={() => toggleLesson(lesson.id)} className="pl-16 pr-6 py-3 cursor-pointer hover:bg-white transition-colors flex items-start gap-3">
                                              <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-semibold">
                                                {lesson.order}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900">{lesson.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{items.length} content items</p>
                                              </div>
                                              <svg className={`w-3.5 h-3.5 text-gray-400 mt-1 transition-transform flex-shrink-0 ${isLessonExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                              </svg>
                                            </div>

                                            {/* Expanded Lesson → Content Items */}
                                            {isLessonExpanded && (
                                              <div className="pl-24 pr-6 pb-4 space-y-1">
                                                {items.length > 0 ? (
                                                  items.sort((a, b) => a.order - b.order).map((item, idx) => {
                                                    const style = getItemStyle(item.type);
                                                    return (
                                                      <div key={item.id || idx} className={`flex items-start gap-2.5 px-3 py-2 rounded-md ${style.bg} transition-colors`}>
                                                        <span className="flex-shrink-0 text-sm mt-0.5">{style.icon}</span>
                                                        <span className={`text-xs font-medium ${style.color} flex-1`}>{item.title}</span>
                                                      </div>
                                                    );
                                                  })
                                                ) : (
                                                  <p className="text-xs text-gray-400 italic">No content items yet</p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Edit TOC button */}
                        {(course.status === "draft" || course.status === "toc_generation") && (
                          <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <button onClick={handleEditClick} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit TOC
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
