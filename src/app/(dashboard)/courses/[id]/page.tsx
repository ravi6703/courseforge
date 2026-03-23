"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ContentItemDrawer } from "@/components/ContentItemDrawer";
import { StatusBadge } from "@/components/StatusBadge";
import { getContentType, getStatusBadgeVariant } from "@/lib/content-types";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  status: string;
  duration?: number;
  description?: string;
  learning_objectives?: string[];
  metadata?: Record<string, any>;
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
  level: string;
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

interface ContentDistribution {
  [key: string]: {
    count: number;
    percentage: number;
    duration: number;
  };
}

export default function CourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const courseId = params.id;
  const [activeTab, setActiveTab] = useState("overview");
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [distribution, setDistribution] = useState<ContentDistribution>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [userRole, setUserRole] = useState<"pm" | "coach" | "content_creator">(
    "content_creator"
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [courseRes, statsRes, distributionRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/courses/${courseId}/stats`),
          fetch(`/api/courses/${courseId}/distribution`),
        ]);

        if (!courseRes.ok || !statsRes.ok || !distributionRes.ok) {
          throw new Error("Failed to fetch course data");
        }

        const courseData = await courseRes.json();
        const statsData = await statsRes.json();
        const distributionData = await distributionRes.json();

        setCourse(courseData.course);
        setModules(courseData.modules || []);
        setStats(statsData);
        setDistribution(distributionData.distribution || {});
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

  const handleGenerateTOC = async () => {
    if (!course) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses/${courseId}/generate-toc`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || []);
        setError(null);
      } else {
        setError("Failed to generate TOC");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTOC = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses/${courseId}/approve-toc`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
        setError(null);
      } else {
        setError("Failed to approve TOC");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestChange = async () => {
    if (!changeReason || changeReason.length < 20) {
      setError("Please provide a reason with at least 20 characters");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses/${courseId}/request-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: changeReason }),
      });

      if (response.ok) {
        setChangeReason("");
        setError(null);
      } else {
        setError("Failed to request change");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestDistribution = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses/${courseId}/suggest-distribution`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setDistribution(data.distribution || {});
        setError(null);
      } else {
        setError("Failed to suggest distribution");
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
            <StatusBadge status={course.status as any} />
          </div>

          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[hsl(215,20%,65%)] mb-1">Platform</p>
              <p className="text-[hsl(210,40%,98%)] capitalize">{course.platform}</p>
            </div>
            <div>
              <p className="text-[hsl(215,20%,65%)] mb-1">Level</p>
              <p className="text-[hsl(210,40%,98%)] capitalize">{course.level}</p>
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
            { id: "distribution", label: "Content Distribution" },
            { id: "settings", label: "Settings" },
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
                      {course.level}
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
              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                {course.status === "draft" && (
                  <button
                    onClick={handleGenerateTOC}
                    disabled={isLoading}
                    className="px-4 py-2 bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? "Generating..." : "Generate TOC with AI"}
                  </button>
                )}

                {course.status === "toc_review" && userRole === "pm" && (
                  <button
                    onClick={handleApproveTOC}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    Approve TOC
                  </button>
                )}

                {course.status === "coach_review" && userRole === "coach" && (
                  <button
                    onClick={handleApproveTOC}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    Accept & Lock TOC
                  </button>
                )}

                {course.status === "toc_locked" && (
                  <div className="flex items-center gap-2 text-sm text-[hsl(215,20%,65%)]">
                    <span>🔒</span>
                    <span>Table of Contents is locked</span>
                  </div>
                )}
              </div>

              {/* Request Change Form */}
              {course.status === "toc_locked" && (
                <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-[hsl(210,40%,98%)] mb-4">
                    Request a Change
                  </h3>
                  <div className="space-y-4">
                    <textarea
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="Describe the changes needed (minimum 20 characters)..."
                      className="w-full p-3 bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)] rounded-lg text-sm text-[hsl(210,40%,98%)] placeholder-[hsl(215,20%,45%)] focus:outline-none focus:border-[hsl(217,91%,60%)]"
                      rows={4}
                    />
                    <button
                      onClick={handleRequestChange}
                      disabled={
                        !changeReason || changeReason.length < 20 || isLoading
                      }
                      className="px-4 py-2 bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      Submit Request
                    </button>
                  </div>
                </div>
              )}

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
                                    const config = getContentType(item.type);
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
                                                status={
                                                  item.status as any
                                                }
                                                showIcon={false}
                                              />
                                              {item.duration && (
                                                <span className="text-xs text-[hsl(215,20%,65%)]">
                                                  {item.duration}m
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
                    No modules yet. Generate a table of contents to get started.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Content Distribution Tab */}
          {activeTab === "distribution" && (
            <div className="space-y-6">
              <div className="flex gap-3">
                <button
                  onClick={handleSuggestDistribution}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Loading..." : "Suggest Distribution"}
                </button>
              </div>

              {Object.keys(distribution).length > 0 ? (
                <div className="space-y-4">
                  {/* Distribution Chart */}
                  <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-[hsl(210,40%,98%)] mb-6">
                      Content Type Distribution
                    </h3>

                    <div className="space-y-4">
                      {Object.entries(distribution).map(
                        ([type, data]: [string, any]) => {
                          const config = getContentType(type);
                          return (
                            <div key={type} className="space-y-2">
                              <div className="flex items-center gap-3 justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">
                                    {config?.icon}
                                  </span>
                                  <span className="text-sm font-medium text-[hsl(210,40%,98%)]">
                                    {config?.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-[hsl(215,20%,65%)]">
                                    {data.count}
                                  </span>
                                  <div className="flex gap-1">
                                    <button className="p-1 hover:bg-[hsl(217,33%,17%)] rounded text-xs text-[hsl(215,20%,65%)]">
                                      −
                                    </button>
                                    <button className="p-1 hover:bg-[hsl(217,33%,17%)] rounded text-xs text-[hsl(215,20%,65%)]">
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-[hsl(217,33%,17%)] rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-[hsl(217,91%,60%)] h-full"
                                    style={{
                                      width: `${data.percentage}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-[hsl(215,20%,65%)] w-12 text-right">
                                  {data.percentage}%
                                </span>
                              </div>

                              <p className="text-xs text-[hsl(215,20%,65%)]">
                                Total: {data.duration} minutes
                              </p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Summary Statistics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                      <p className="text-sm text-[hsl(215,20%,65%)] mb-2">
                        Total Duration
                      </p>
                      <p className="text-2xl font-bold text-[hsl(217,91%,60%)]">
                        {Object.values(distribution).reduce(
                          (sum: number, item: any) =>
                            sum + (item.duration || 0),
                          0
                        )}{" "}
                        min
                      </p>
                    </div>

                    <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                      <p className="text-sm text-[hsl(215,20%,65%)] mb-2">
                        Video Time
                      </p>
                      <p className="text-2xl font-bold text-blue-400">
                        {(distribution.video?.duration || 0)} min
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-12 text-center">
                  <p className="text-[hsl(215,20%,65%)]">
                    Click "Suggest Distribution" to view content recommendations.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl">
              {/* Assign Coach */}
              <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[hsl(210,40%,98%)] mb-4">
                  Assign Coach
                </h3>
                <input
                  type="email"
                  placeholder="Enter coach email..."
                  className="w-full p-3 bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)] rounded-lg text-sm text-[hsl(210,40%,98%)] placeholder-[hsl(215,20%,45%)] focus:outline-none focus:border-[hsl(217,91%,60%)]"
                />
                <button className="mt-4 px-4 py-2 bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white rounded-lg text-sm font-medium transition-colors">
                  Assign Coach
                </button>
              </div>

              {/* Content Types Toggle */}
              <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[hsl(210,40%,98%)] mb-4">
                  Content Types
                </h3>
                <p className="text-sm text-[hsl(215,20%,65%)] mb-4">
                  Enable or disable content types for this course.
                </p>
                <div className="space-y-3">
                  {[
                    "video",
                    "reading",
                    "practice_quiz",
                    "graded_quiz",
                    "plugin",
                    "ai_dialogue",
                  ].map((type) => {
                    const config = getContentType(type);
                    return (
                      <label
                        key={type}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-4 h-4 rounded border-[hsl(217,33%,17%)] accent-[hsl(217,91%,60%)]"
                        />
                        <span className="text-sm text-[hsl(210,40%,98%)]">
                          {config?.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[hsl(210,40%,98%)] mb-4">
                  Course Metadata
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[hsl(215,20%,65%)] mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      defaultValue={course.title}
                      className="w-full p-3 bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)] rounded-lg text-sm text-[hsl(210,40%,98%)] focus:outline-none focus:border-[hsl(217,91%,60%)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[hsl(215,20%,65%)] mb-2">
                      Domain
                    </label>
                    <input
                      type="text"
                      defaultValue={course.domain}
                      className="w-full p-3 bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)] rounded-lg text-sm text-[hsl(210,40%,98%)] focus:outline-none focus:border-[hsl(217,91%,60%)]"
                    />
                  </div>

                  <button className="mt-4 px-4 py-2 bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white rounded-lg text-sm font-medium transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
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
        userRole={userRole}
      />
    </div>
  );
}
