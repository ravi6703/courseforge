"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { loadState } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getCourses } from "@/lib/db";

type Role = "pm" | "coach";
type CourseStatus =
  | "draft"
  | "toc_generation"
  | "toc_review"
  | "toc_locked"
  | "content_generation"
  | "ppt_generation"
  | "video_recording"
  | "review"
  | "completed";

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  order: number;
  content_types: string[];
  videos: any[];
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order: number;
  learning_objectives: any[];
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  platform: string;
  status: CourseStatus;
  audience_level: string;
  duration_weeks: number;
  created_by: string;
  assigned_coach?: string;
  content_types: string[];
  created_at: string;
  updated_at: string;
}

interface ExpandedState {
  [courseId: string]: boolean;
}

export default function TOCBuilderPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [editingMessage, setEditingMessage] = useState<string | null>(null);

  useEffect(() => {
    const initializePage = async () => {
      // Check localStorage for user
      const userString = localStorage.getItem("courseforge_user");
      if (!userString) {
        router.push("/");
        return;
      }

      try {
        const userData: User = JSON.parse(userString);
        setUser(userData);

        // Load courses and modules from store
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

  const toggleCourseExpand = (courseId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMessage("Inline editing coming soon");
    setTimeout(() => setEditingMessage(null), 3000);
  };

  const getStatusBadgeColor = (
    status: CourseStatus
  ): { bg: string; text: string } => {
    switch (status) {
      case "draft":
      case "toc_generation":
        return { bg: "bg-blue-100", text: "text-blue-700" };
      case "toc_review":
        return { bg: "bg-yellow-100", text: "text-yellow-700" };
      case "toc_locked":
      case "content_generation":
      case "ppt_generation":
        return { bg: "bg-orange-100", text: "text-orange-700" };
      case "video_recording":
      case "review":
        return { bg: "bg-purple-100", text: "text-purple-700" };
      case "completed":
        return { bg: "bg-green-100", text: "text-green-700" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700" };
    }
  };

  const getActionBadge = (status: CourseStatus) => {
    if (status === "draft" || status === "toc_generation") {
      return (
        <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Edit TOC
        </span>
      );
    }
    if (status === "toc_locked" || status > "toc_locked") {
      return (
        <span className="inline-block bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
          Locked
        </span>
      );
    }
    return null;
  };

  const courseModules = (courseId: string): Module[] => {
    return modules[courseId] || [];
  };

  const handleLogout = () => {
    localStorage.removeItem("courseforge_user");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 overflow-auto">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            {/* Breadcrumb */}
            <div className="mb-4 text-sm text-gray-600">
              <a href="/dashboard" className="hover:text-gray-900">
                Dashboard
              </a>
              <span className="mx-2">/</span>
              <span className="text-gray-900 font-medium">TOC Builder</span>
            </div>

            {/* Page Title */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TOC Builder</h1>
              <p className="text-gray-600 mt-1">
                Edit and manage course table of contents
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-8 py-8">
          {editingMessage && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
              {editingMessage}
            </div>
          )}

          {courses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                No courses found. Create your first course to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {courses.map((course) => {
                const courseModulesList = courseModules(course.id);
                const totalLessons = courseModulesList.reduce(
                  (sum, mod) => sum + (mod.lessons?.length || 0),
                  0
                );
                const isExpanded = expanded[course.id];
                const statusBadge = getStatusBadgeColor(course.status);

                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Course Card Header */}
                    <div
                      onClick={() => toggleCourseExpand(course.id)}
                      className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-xl font-bold text-gray-900">
                              {course.title}
                            </h2>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}
                            >
                              {course.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-4">
                            {course.description}
                          </p>

                          {/* Course Meta Information */}
                          <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {courseModulesList.length}
                              </span>
                              <span>
                                {courseModulesList.length === 1
                                  ? "Module"
                                  : "Modules"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {totalLessons}
                              </span>
                              <span>
                                {totalLessons === 1 ? "Lesson" : "Lessons"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {course.duration_weeks}
                              </span>
                              <span>
                                {course.duration_weeks === 1
                                  ? "Week"
                                  : "Weeks"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">
                                Level:{" "}
                                <span className="text-gray-900 font-medium">
                                  {course.audience_level}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Action Badges */}
                          <div className="flex items-center gap-2">
                            {getActionBadge(course.status)}
                          </div>
                        </div>

                        {/* Expand Icon */}
                        <div className="ml-4 text-gray-400">
                          <svg
                            className={`w-6 h-6 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Expanded TOC Tree */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-6">
                        {courseModulesList.length === 0 ? (
                          <p className="text-gray-600 text-sm italic">
                            No modules created yet
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {courseModulesList
                              .sort((a, b) => a.order - b.order)
                              .map((module, moduleIndex) => (
                                <div key={module.id} className="space-y-2">
                                  {/* Module */}
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                        {moduleIndex + 1}
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900">
                                        {module.title}
                                      </h4>
                                      {module.description && (
                                        <p className="text-sm text-gray-600 mt-1">
                                          {module.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Lessons */}
                                  {module.lessons && module.lessons.length > 0 && (
                                    <div className="ml-9 space-y-2">
                                      {module.lessons
                                        .sort((a, b) => a.order - b.order)
                                        .map((lesson, lessonIndex) => (
                                          <div
                                            key={lesson.id}
                                            className="flex items-start gap-3 p-3 bg-white rounded border border-gray-200"
                                          >
                                            <div className="flex-shrink-0 text-xs font-medium text-gray-500 pt-0.5">
                                              L{lessonIndex + 1}
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-gray-900">
                                                {lesson.title}
                                              </p>
                                              {lesson.description && (
                                                <p className="text-xs text-gray-600 mt-0.5">
                                                  {lesson.description}
                                                </p>
                                              )}
                                              {lesson.content_types &&
                                                lesson.content_types.length >
                                                  0 && (
                                                  <div className="flex gap-1 mt-2">
                                                    {lesson.content_types.map(
                                                      (type) => (
                                                        <span
                                                          key={type}
                                                          className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                                                        >
                                                          {type}
                                                        </span>
                                                      )
                                                    )}
                                                  </div>
                                                )}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              ))}

                            {/* Edit TOC Button */}
                            {(course.status === "draft" ||
                              course.status === "toc_generation") && (
                              <div className="mt-6 pt-4 border-t border-gray-200">
                                <button
                                  onClick={handleEditClick}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                  Edit TOC
                                </button>
                              </div>
                            )}
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
