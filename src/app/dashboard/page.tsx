"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Course, User } from "@/types";
import { loadState, AppState } from "@/lib/store";

// Status badge colors - clean professional palette
const statusBadgeColors: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
  toc_generation: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  toc_review: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  toc_approved: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  content_briefs: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  ppt_generation: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  ppt_review: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  recording: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  transcription: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  content_generation: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  content_review: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  final_review: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  published: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
};

// Platform badge colors
const platformBadgeColors: Record<string, { bg: string; text: string }> = {
  coursera: { bg: "bg-blue-100", text: "text-blue-700" },
  udemy: { bg: "bg-purple-100", text: "text-purple-700" },
  university: { bg: "bg-amber-100", text: "text-amber-700" },
  infylearn: { bg: "bg-teal-100", text: "text-teal-700" },
  custom: { bg: "bg-gray-100", text: "text-gray-700" },
};

// Status to phase number mapping (out of 13)
const statusToPhase: Record<string, number> = {
  draft: 1,
  toc_generation: 2,
  toc_review: 3,
  toc_approved: 4,
  content_briefs: 5,
  ppt_generation: 6,
  ppt_review: 7,
  recording: 8,
  transcription: 9,
  content_generation: 10,
  content_review: 11,
  final_review: 12,
  published: 13,
};

// Format status text
const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

// Format timestamp
const formatTimestamp = (date?: string | Date): string => {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem("courseforge_user");
      if (!storedUser) {
        router.push("/");
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        const state = loadState();
        setCourses(state.courses || []);
        setAppState(state);
      } catch (err) {
        console.error("Dashboard load error:", err);
        router.push("/");
        return;
      }

      setIsLoading(false);
    };

    init();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("courseforge_user");
    router.push("/");
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const stats = {
    total: courses.length,
    inProgress: courses.filter((c) => c.status !== "draft" && c.status !== "published").length,
    inReview: courses.filter((c) => c.status.includes("review")).length,
    published: courses.filter((c) => c.status === "published").length,
  };

  // Get recent activity
  const recentActivity = courses
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
    .slice(0, 5);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 md:ml-64 overflow-auto">
        <div className="min-h-screen p-6 md:p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Welcome back, {user.name}</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-700 capitalize">{user.role}</span>
                </span>
                <p className="text-gray-600">Manage your course creation and publishing workflow</p>
              </div>
            </div>
            {user.role === "pm" && (
              <Link href="/create">
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors">
                  + Create Course
                </button>
              </Link>
            )}
          </div>

          {/* Stats Row - 4 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                label: "Total Courses",
                value: stats.total,
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.228 6.228 2 10.428 2 15.5c0 5.072 4.228 9.272 10 9.272s10-4.2 10-9.272c0-5.072-4.228-9.247-10-9.247z" />
                  </svg>
                ),
                bgColor: "bg-blue-50",
                iconColor: "text-blue-600",
                borderColor: "border-blue-200",
              },
              {
                label: "In Progress",
                value: stats.inProgress,
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                bgColor: "bg-amber-50",
                iconColor: "text-amber-600",
                borderColor: "border-amber-200",
              },
              {
                label: "In Review",
                value: stats.inReview,
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                bgColor: "bg-yellow-50",
                iconColor: "text-yellow-600",
                borderColor: "border-yellow-200",
              },
              {
                label: "Published",
                value: stats.published,
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ),
                bgColor: "bg-emerald-50",
                iconColor: "text-emerald-600",
                borderColor: "border-emerald-200",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`${stat.bgColor} rounded-lg border ${stat.borderColor} p-6 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.iconColor} opacity-80`}>{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {courses.length === 0 ? (
            // Empty State
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
              <div className="mb-6">
                <svg className="w-20 h-20 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C6.228 6.228 2 10.428 2 15.5c0 5.072 4.228 9.272 10 9.272s10-4.2 10-9.272c0-5.072-4.228-9.247-10-9.247z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Your First Course</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start building engaging online courses with our intuitive course creation platform. Let's get started!
              </p>
              {user.role === "pm" && (
                <Link href="/create">
                  <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-2">
                    <span>Create Your First Course</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Course Cards Grid - 2 Columns */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Courses</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {courses.map((course) => {
                    const phase = statusToPhase[course.status] || 1;
                    const statusColor = statusBadgeColors[course.status] || statusBadgeColors.draft;
                    const platformColor = platformBadgeColors[course.platform] || platformBadgeColors.custom;

                    return (
                      <Link key={course.id} href={`/course/${course.id}`}>
                        <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden cursor-pointer h-full">
                          {/* Card Header with Status Badge */}
                          <div className="p-6 pb-4 border-b border-gray-200">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{course.title}</h3>
                              </div>
                              <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColor.bg} ${statusColor.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                                {formatStatus(course.status)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{course.description || "No description provided"}</p>
                          </div>

                          {/* Platform & Quick Stats */}
                          <div className="px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${platformColor.bg} ${platformColor.text}`}>
                                {formatStatus(course.platform)}
                              </span>
                            </div>
                            <div className="flex gap-6 text-sm">
                              <div>
                                <p className="text-gray-600">Modules</p>
                                <p className="font-semibold text-gray-900">{(appState?.modules[course.id] || []).length}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Lessons</p>
                                <p className="font-semibold text-gray-900">{(appState?.modules[course.id] || []).reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0)}</p>
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar - Phase */}
                          <div className="px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-600">Progress</span>
                              <span className="text-xs font-semibold text-gray-700">
                                Phase {phase} of 13
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(phase / 13) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Footer with Last Updated */}
                          <div className="px-6 py-3 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
                            <span>Last updated {formatTimestamp(course.updated_at)}</span>
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity Section */}
              {recentActivity.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h3>
                  <div className="space-y-4">
                    {recentActivity.map((course, idx) => {
                      const statusColor = statusBadgeColors[course.status] || statusBadgeColors.draft;
                      return (
                        <div key={course.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="mt-1.5">
                            <div className={`w-3 h-3 rounded-full ${statusColor.dot}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                              <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                                {formatStatus(course.status)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">{formatTimestamp(course.updated_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
