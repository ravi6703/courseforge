"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ContentItemDrawer } from "@/components/ContentItemDrawer";
import { StatusBadge } from "@/components/StatusBadge";
import { getContentType } from "@/lib/content-types";

interface ContentItem {
  id: string;
  title: string;
  item_type: string;
  status: string;
  duration_minutes?: number;
  description?: string;
  learning_objectives?: string[];
  config?: Record<string, unknown>;
  comments?: Array<{
    id: string;
    author: string;
    body: string;
    created_at: string;
    is_resolved: boolean;
  }>;
}

interface Lesson {
  id: string;
  title: string;
  learning_objectives?: string[];
  content_items: ContentItem[];
}

interface Module {
  id: string;
  name: string;
  description?: string;
  learning_objectives?: string[];
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  domain: string;
  platform: string;
  course_level: string;
  target_audience: string;
  status: string;
  learning_objectives?: string[];
  modules?: Module[];
}

interface Stats {
  total_items: number;
  completed: number;
  in_review: number;
  draft: number;
  completion_percentage: number;
}

export default function CoachCourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const courseId = params.id;
  const [activeTab, setActiveTab] = useState("overview");
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [courseRes, statsRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/courses/${courseId}/stats`),
        ]);

        if (!courseRes.ok || !statsRes.ok) {
          throw new Error("Failed to fetch course data");
        }

        const courseData = await courseRes.json();
        const statsData = await statsRes.json();

        setCourse(courseData.course);
        setModules(courseData.modules || []);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleOpenDrawer = (item: ContentItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedItem(null);
  };

  const handleAcceptOpportunity = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses/${courseId}/accept`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
        setError(null);
      } else {
        setError("Failed to accept opportunity");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !course) {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,6%)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-[hsl(217,33%,17%)] border-t-[hsl(217,91%,60%)] animate-spin mx-auto" />
          <p className="text-[hsl(215,20%,65%)]">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,6%)] flex items-center justify-center">
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg max-w-md">
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[hsl(222,47%,6%)]">
      {/* Header */}
      <div className="bg-[hsl(222,47%,8%)] border-b border-[hsl(217,33%,17%)] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[hsl(210,40%,98%)]">
                {course.title}
              </h1>
              <p className="text-[hsl(215,20%,65%)] mt-1">{course.domain}</p>
            </div>
            <StatusBadge status={course.status} />
          </div>

          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[hsl(215,20%,65%)] mb-1">Platform</p>
              <p className="text-[hsl(210,40%,98%)] capitalize">{course.platform}</p>
            </div>
            <div>
              <p className="text-[hsl(215,20%,65%)] mb-1">Level</p>
              <p className="text-[hsl(210,40%,98%)] capitalize">{course.course_level}</p>
            </div>
            <div>
              <p className="text-[hsl(215,20%,65%)] mb-1">Target Audience</p>
              <p className="text-[hsl(210,40%,98%)]">{course.target_audience}</p>
            </div>
            <div>
              <p className="text-[hsl(215,20%,65%)] mb-1">Modules</p>
              <p className="text-[hsl(210,40%,98%)]">{modules.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto">
        <div className="border-b border-[hsl(217,33%,17%)] flex gap-8 px-6 mt-6">
          {[
            { id: "overview", label: "Overview" },
            { id: "toc", label: "Table of Contents" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-4 font-medium text-sm border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-[hsl(217,91%,60%)] text-[hsl(217,91%,60%)]"
                  : "border-transparent text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="py-8 px-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Accept Opportunity Button */}
              {course.status === "coach_review" && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(210,40%,98%)]">
                      Course Opportunity
                    </h3>
                    <p className="text-sm text-[hsl(215,20%,65%)] mt-1">
                      This course is ready for your review. Click the button to accept and start working on it.
                    </p>
                  </div>
                  <button
                    onClick={handleAcceptOpportunity}
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex-shrink-0 ml-4"
                  >
                    {isLoading ? "Accepting..." : "Accept Opportunity"}
                  </button>
                </div>
              )}

              {/* Course Info Card */}
              <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                <h2 className="text-lg font-semibold text-[hsl(210,40%,98%)] mb-4">
                  Course Information
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[hsl(215,20%,65%)]">Title</span>
                    <span className="text-[hsl(210,40%,98%)]">{course.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(215,20%,65%)]">Domain</span>
                    <span className="text-[hsl(210,40%,98%)]">{course.domain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(215,20%,65%)]">Platform</span>
                    <span className="text-[hsl(210,40%,98%)] capitalize">
                      {course.platform}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(215,20%,65%)]">Level</span>
                    <span className="text-[hsl(210,40%,98%)] capitalize">
                      {course.course_level}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(215,20%,65%)]">Target Audience</span>
                    <span className="text-[hsl(210,40%,98%)]">
                      {course.target_audience}
                    </span>
                  </div>
                </div>
              </div>

              {/* Learning Objectives */}
              {course.learning_objectives && course.learning_objectives.length > 0 && (
                <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-[hsl(210,40%,98%)] mb-4">
                    Learning Objectives
                  </h2>
                  <ul className="space-y-2">
                    {course.learning_objectives.map((obj, idx) => (
                      <li
                        key={idx}
                        className="flex gap-3 text-[hsl(210,40%,98%)]"
                      >
                        <span className="text-[hsl(217,91%,60%)] flex-shrink-0">
                          ✓
                        </span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Stats Grid */}
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                    <p className="text-sm text-[hsl(215,20%,65%)] mb-2">
                      Total Items
                    </p>
                    <p className="text-2xl font-bold text-[hsl(210,40%,98%)]">
                      {stats.total_items}
                    </p>
                  </div>

                  <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                    <p className="text-sm text-[hsl(215,20%,65%)] mb-2">
                      Completed
                    </p>
                    <p className="text-2xl font-bold text-green-400">
                      {stats.completed}
                    </p>
                  </div>

                  <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                    <p className="text-sm text-[hsl(215,20%,65%)] mb-2">
                      In Review
                    </p>
                    <p className="text-2xl font-bold text-amber-400">
                      {stats.in_review}
                    </p>
                  </div>

                  <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                    <p className="text-sm text-[hsl(215,20%,65%)] mb-2">
                      Draft
                    </p>
                    <p className="text-2xl font-bold text-gray-400">
                      {stats.draft}
                    </p>
                  </div>

                  <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                    <p className="text-sm text-[hsl(215,20%,65%)] mb-2">
                      Completion
                    </p>
                    <p className="text-2xl font-bold text-[hsl(217,91%,60%)]">
                      {stats.completion_percentage}%
                    </p>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {stats && (
                <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[hsl(210,40%,98%)]">
                      Overall Progress
                    </h3>
                    <span className="text-sm text-[hsl(215,20%,65%)]">
                      {stats.completed} of {stats.total_items}
                    </span>
                  </div>
                  <div className="w-full bg-[hsl(217,33%,17%)] rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[hsl(217,91%,60%)] to-[hsl(30,85%,50%)] h-full transition-all duration-300"
                      style={{
                        width: `${stats.completion_percentage}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TOC Tab */}
          {activeTab === "toc" && (
            <div className="space-y-6">
              {/* TOC Accordion */}
              {modules.length > 0 ? (
                <div className="space-y-3">
                  {modules.map((module) => (
                    <div
                      key={module.id}
                      className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg overflow-hidden"
                    >
                      {/* Module Header */}
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-[hsl(217,33%,17%)] transition-colors"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <svg
                            className={cn(
                              "w-5 h-5 text-[hsl(215,20%,65%)] transition-transform",
                              expandedModules.has(module.id)
                                ? "rotate-90"
                                : ""
                            )}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                          <div>
                            <h3 className="font-semibold text-[hsl(210,40%,98%)]">
                              {module.name}
                            </h3>
                            {module.description && (
                              <p className="text-sm text-[hsl(215,20%,65%)]">
                                {module.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-[hsl(215,20%,65%)] bg-[hsl(217,33%,17%)] px-3 py-1 rounded-full">
                          {module.lessons.reduce(
                            (sum, lesson) =>
                              sum + lesson.content_items.length,
                            0
                          )}{" "}
                          items
                        </span>
                      </button>

                      {/* Module Content */}
                      {expandedModules.has(module.id) && (
                        <div className="border-t border-[hsl(217,33%,17%)] px-4 py-3 space-y-3 bg-[hsl(222,47%,6%)]">
                          {/* Learning Objectives */}
                          {module.learning_objectives &&
                            module.learning_objectives.length > 0 && (
                              <div className="pl-8 pb-3">
                                <p className="text-xs font-semibold text-[hsl(215,20%,65%)] uppercase tracking-wider mb-2">
                                  Learning Objectives
                                </p>
                                <ul className="space-y-1">
                                  {module.learning_objectives.map(
                                    (obj, idx) => (
                                      <li
                                        key={idx}
                                        className="text-xs text-[hsl(210,40%,98%)] flex gap-2"
                                      >
                                        <span className="text-[hsl(217,91%,60%)]">
                                          •
                                        </span>
                                        {obj}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {/* Lessons */}
                          {module.lessons.map((lesson) => (
                            <div key={lesson.id} className="pl-8 space-y-2">
                              <div className="border-l-2 border-[hsl(217,33%,17%)] pl-4">
                                <h4 className="text-sm font-medium text-[hsl(210,40%,98%)]">
                                  {lesson.title}
                                </h4>

                                {lesson.learning_objectives &&
                                  lesson.learning_objectives.length > 0 && (
                                    <ul className="mt-2 space-y-1">
                                      {lesson.learning_objectives.map(
                                        (obj, idx) => (
                                          <li
                                            key={idx}
                                            className="text-xs text-[hsl(215,20%,65%)]"
                                          >
                                            • {obj}
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  )}

                                {/* Content Items */}
                                <div className="mt-3 space-y-2">
                                  {lesson.content_items.map((item) => {
                                    const config = getContentType(item.item_type);
                                    return (
                                      <button
                                        key={item.id}
                                        onClick={() =>
                                          handleOpenDrawer(item)
                                        }
                                        className="w-full text-left p-3 bg-[hsl(222,47%,8%)] hover:bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,17%)] rounded-lg transition-colors"
                                      >
                                        <div className="flex items-start gap-3">
                                          <span className="text-xl flex-shrink-0">
                                            {config?.icon}
                                          </span>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[hsl(210,40%,98%)] truncate">
                                              {item.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                              <span className="text-xs px-2 py-1 bg-[hsl(217,33%,17%)] rounded text-[hsl(215,20%,65%)]">
                                                {config?.label}
                                              </span>
                                              <StatusBadge
                                                status={item.status}
                                                showIcon={false}
                                              />
                                              {item.duration_minutes && (
                                                <span className="text-xs text-[hsl(215,20%,65%)]">
                                                  {item.duration_minutes}m
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-12 text-center">
                  <p className="text-[hsl(215,20%,65%)]">
                    No modules available yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Content Item Drawer */}
      <ContentItemDrawer
        item={selectedItem}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        userRole="coach"
      />
    </div>
  );
}
