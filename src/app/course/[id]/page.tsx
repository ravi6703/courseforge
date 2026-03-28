"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Course, Module, User, TOCComment } from "@/types";
import { getCourseById, getModulesByCourse, getCommentsByCourse, createComment, lockTOC, updateCourseStatus } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadState, saveState } from "@/lib/store";
import Link from "next/link";

const bloomColors: Record<string, string> = {
  remember: "bg-red-100 text-red-700",
  understand: "bg-orange-100 text-orange-700",
  apply: "bg-yellow-100 text-yellow-700",
  analyze: "bg-green-100 text-green-700",
  evaluate: "bg-blue-100 text-blue-700",
  create: "bg-purple-100 text-purple-700",
};

const statusBadgeColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700" },
  toc_generation: { bg: "bg-blue-100", text: "text-blue-700" },
  toc_review: { bg: "bg-yellow-100", text: "text-yellow-700" },
  toc_locked: { bg: "bg-indigo-100", text: "text-indigo-700" },
  content_generation: { bg: "bg-purple-100", text: "text-purple-700" },
  ppt_generation: { bg: "bg-pink-100", text: "text-pink-700" },
  video_recording: { bg: "bg-orange-100", text: "text-orange-700" },
  review: { bg: "bg-amber-100", text: "text-amber-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
};

const contentTypeColors: Record<string, string> = {
  reading: "bg-blue-100 text-blue-700",
  practice_quiz: "bg-purple-100 text-purple-700",
  graded_quiz: "bg-red-100 text-red-700",
  discussion: "bg-green-100 text-green-700",
  plugin: "bg-yellow-100 text-yellow-700",
  case_study: "bg-indigo-100 text-indigo-700",
  glossary: "bg-pink-100 text-pink-700",
  ai_dialogue: "bg-teal-100 text-teal-700",
};

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [comments, setComments] = useState<TOCComment[]>([]);
  const [currentView, setCurrentView] = useState("course-detail");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem("courseforge_user");
      if (!storedUser) { router.push("/"); return; }

      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if (isSupabaseConfigured) {
          const [foundCourse, courseModules, courseComments] = await Promise.all([
            getCourseById(courseId),
            getModulesByCourse(courseId),
            getCommentsByCourse(courseId),
          ]);
          if (!foundCourse) { router.push("/dashboard"); return; }
          setCourse(foundCourse);
          setModules(courseModules);
          setComments(courseComments);
        } else {
          const state = loadState();
          const foundCourse = state.courses.find((c) => c.id === courseId);
          if (!foundCourse) { router.push("/dashboard"); return; }
          setCourse(foundCourse);
          setModules(state.modules[courseId] || []);
          setComments(state.comments.filter((c) => c.target_id));
        }
      } catch (err) {
        console.error("Course load error:", err);
        router.push("/dashboard");
        return;
      }

      setIsLoading(false);
    };

    init();
  }, [courseId, router]);

  const handleNavigate = (view: string) => {
    if (view === "dashboard") router.push("/dashboard");
    else setCurrentView(view);
  };

  const handleLogout = () => {
    localStorage.removeItem("courseforge_user");
    router.push("/");
  };

  const toggleModuleExpand = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) newExpanded.delete(moduleId);
    else newExpanded.add(moduleId);
    setExpandedModules(newExpanded);
  };

  const expandAll = () => {
    setExpandedModules(new Set(modules.map((m) => m.id)));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  const handleLockTOC = async () => {
    if (!course || !user) return;
    setActionLoading(true);
    try {
      if (isSupabaseConfigured) {
        await lockTOC(courseId, user.id);
      } else {
        const state = loadState();
        const updated = { ...course, status: "toc_locked" as const };
        saveState({ ...state, courses: state.courses.map((c) => (c.id === courseId ? updated : c)) });
      }
      setCourse({ ...course, status: "toc_locked" });
    } catch (err) {
      console.error("Lock TOC error:", err);
    }
    setActionLoading(false);
  };

  const handleSendToReview = async () => {
    if (!course) return;
    setActionLoading(true);
    try {
      if (isSupabaseConfigured) {
        await updateCourseStatus(courseId, "toc_review");
      } else {
        const state = loadState();
        const updated = { ...course, status: "toc_review" as const };
        saveState({ ...state, courses: state.courses.map((c) => (c.id === courseId ? updated : c)) });
      }
      setCourse({ ...course, status: "toc_review" });
    } catch (err) {
      console.error("Send to review error:", err);
    }
    setActionLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!comment.trim() || !user || !course) return;
    setActionLoading(true);
    try {
      if (isSupabaseConfigured) {
        const newComment = await createComment({
          course_id: courseId,
          author_id: user.id,
          author_name: user.name,
          author_role: user.role,
          text: comment,
          target_type: "course",
          target_id: courseId,
        });
        setComments([newComment, ...comments]);
      } else {
        const newComment: TOCComment = {
          id: Math.random().toString(36).substring(7),
          author: user.name,
          author_role: user.role,
          text: comment,
          target_type: "module",
          target_id: modules[0]?.id || "",
          resolved: false,
          created_at: new Date().toISOString(),
        };
        setComments([newComment, ...comments]);
      }
      setComment("");
    } catch (err) {
      console.error("Comment error:", err);
    }
    setActionLoading(false);
  };

  if (isLoading || !course) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading course...</p>
        </div>
      </div>
    );
  }

  const statusColors = statusBadgeColors[course.status] || { bg: "bg-gray-100", text: "text-gray-700" };
  const totalVideos = modules.reduce((acc, m) => acc + m.lessons.reduce((a, l) => a + l.videos.length, 0), 0);
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} user={user} onLogout={handleLogout} />

      <main className="flex-1 md:ml-64 overflow-auto">
        <div className="p-8 max-w-5xl">
          {/* Back */}
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          {/* Course Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
            <p className="text-gray-600 mb-4">{course.description}</p>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${statusColors.bg} ${statusColors.text}`}>
                {course.status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
              </span>
              <span className="text-xs text-gray-500">{modules.length} modules</span>
              <span className="text-xs text-gray-500">{totalLessons} lessons</span>
              <span className="text-xs text-gray-500">{totalVideos} videos</span>
              <span className="text-xs text-gray-500">{course.duration_weeks} weeks</span>
              <span className="text-xs text-gray-500 capitalize">{course.audience_level}</span>
            </div>

            {/* Content Types */}
            {course.content_types.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Content Types</p>
                <div className="flex flex-wrap gap-2">
                  {course.content_types.map((type) => (
                    <span key={type} className={`text-xs font-medium px-2.5 py-1 rounded-full ${contentTypeColors[type] || "bg-gray-100 text-gray-700"}`}>
                      {type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Module Controls */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Course Modules</h2>
            <div className="flex gap-2">
              <button onClick={expandAll} className="text-xs text-blue-600 hover:underline">Expand All</button>
              <span className="text-gray-300">|</span>
              <button onClick={collapseAll} className="text-xs text-blue-600 hover:underline">Collapse All</button>
            </div>
          </div>

          {/* Modules */}
          <div className="space-y-4 mb-8">
            {modules.map((module) => (
              <div key={module.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button onClick={() => toggleModuleExpand(module.id)} className="w-full p-5 flex items-start justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-gray-900 mb-1">{module.title}</h3>
                    <p className="text-gray-500 text-sm mb-3">{module.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {module.learning_objectives.map((obj) => (
                        <span key={obj.id} className={`text-xs px-2 py-0.5 rounded-full ${bloomColors[obj.bloom_level] || "bg-gray-100 text-gray-700"}`}>
                          {obj.bloom_level.charAt(0).toUpperCase() + obj.bloom_level.slice(1)}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400 ml-2">{module.lessons.length} lessons</span>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ml-4 mt-1 ${expandedModules.has(module.id) ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedModules.has(module.id) && (
                  <div className="border-t border-gray-200 p-5 bg-gray-50 space-y-4">
                    {/* Module Learning Objectives */}
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Module Learning Objectives</p>
                      <ul className="space-y-1.5">
                        {module.learning_objectives.map((obj) => (
                          <li key={obj.id} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${bloomColors[obj.bloom_level] || "bg-gray-100 text-gray-700"} mt-0.5 shrink-0`}>
                              {obj.bloom_level.slice(0, 3).toUpperCase()}
                            </span>
                            <span>{obj.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Lessons */}
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id} className="bg-white rounded-lg p-4 border border-gray-100">
                        <h4 className="font-semibold text-gray-900 mb-1">{lesson.title}</h4>
                        <p className="text-sm text-gray-500 mb-3">{lesson.description}</p>

                        {/* Lesson LOs */}
                        {lesson.learning_objectives.length > 0 && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-1">
                              {lesson.learning_objectives.map((obj) => (
                                <span key={obj.id} className={`text-xs px-2 py-0.5 rounded ${bloomColors[obj.bloom_level] || "bg-gray-100 text-gray-700"}`} title={obj.text}>
                                  {obj.bloom_level.slice(0, 3).toUpperCase()}: {obj.text.slice(0, 60)}...
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Content Types */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {lesson.content_types.map((type) => (
                            <span key={type} className={`text-xs px-2 py-0.5 rounded ${contentTypeColors[type] || "bg-gray-100 text-gray-700"}`}>
                              {type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                            </span>
                          ))}
                        </div>

                        {/* Videos */}
                        {lesson.videos.length > 0 && (
                          <div className="bg-gray-50 rounded p-3">
                            <p className="text-xs font-medium text-gray-600 mb-2">Videos ({lesson.videos.length})</p>
                            <div className="space-y-1.5">
                              {lesson.videos.map((video) => (
                                <div key={video.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    <span className="text-gray-700">{video.title}</span>
                                  </div>
                                  <span className="text-gray-400 text-xs">{video.duration_minutes} min</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* TOC Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
            <div className="flex flex-wrap gap-3 mb-6">
              {user?.role === "pm" && course.status === "toc_generation" && (
                <button onClick={handleSendToReview} disabled={actionLoading} className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium disabled:opacity-50">
                  Send to Review
                </button>
              )}
              {user?.role === "pm" && course.status === "toc_review" && (
                <button onClick={handleLockTOC} disabled={actionLoading} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                  Lock TOC
                </button>
              )}
              {course.status === "toc_locked" && user?.role === "pm" && (
                <button onClick={async () => {
                  setActionLoading(true);
                  if (isSupabaseConfigured) await updateCourseStatus(courseId, "content_generation");
                  setCourse({ ...course, status: "content_generation" });
                  setActionLoading(false);
                }} disabled={actionLoading} className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50">
                  Start Content Generation
                </button>
              )}
            </div>

            {/* Comments */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Comments & Feedback ({comments.length})</h3>

              {/* Comment input */}
              <div className="mb-4">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add your feedback..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  rows={3}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!comment.trim() || actionLoading}
                  className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 text-sm"
                >
                  Submit Comment
                </button>
              </div>

              {/* Comment list */}
              {comments.length > 0 && (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{c.author}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.author_role === "pm" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {c.author_role === "pm" ? "PM" : "Coach"}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-700">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
