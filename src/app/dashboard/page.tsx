"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Course, User } from "@/types";
import { loadState, AppState, getCommentsByCourse } from "@/lib/store";

// Phase badge colors for status
const phaseColors: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
  toc_generation: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  toc_review: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  toc_approved: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  content_briefs: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  ppt_generation: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  ppt_review: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  recording: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  transcription: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  content_generation: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  content_review: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  final_review: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  published: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
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

// Format date
const formatDate = (): string => {
  const today = new Date();
  return today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

  // Get action items (unresolved comments)
  const actionItems = courses.flatMap((course) =>
    getCommentsByCourse(course.id)
      .filter((c) => !c.resolved)
      .map((c) => ({ ...c, courseName: course.title }))
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />

      <main className="flex-1 md:ml-64 overflow-auto">
        <div className="min-h-screen p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Welcome back, {user.name}</h1>
            <p className="text-gray-600 mt-2">{formatDate()}</p>
          </div>

          {/* Stats Row - 4 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                label: "In Production",
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
                label: "Pending Review",
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

          {/* Action Items Callout */}
          {actionItems.length > 0 && (
            <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="text-yellow-600 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-900">Action Items</h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    You have {actionItems.length} unresolved feedback item{actionItems.length !== 1 ? "s" : ""} requiring attention.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Courses Section */}
          {courses.length === 0 ? (
            // Empty State
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
              <div className="mb-6">
                <svg className="w-20 h-20 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C6.228 6.228 2 10.428 2 15.5c0 5.072 4.228 9.272 10 9.272s10-4.2 10-9.272c0-5.072-4.228-9.247-10-9.247z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {user.role === "pm"
                  ? "Create your first course to get started building engaging content."
                  : "Awaiting course creation from your PM. Check back soon!"}
              </p>
              {user.role === "pm" && (
                <Link href="/create">
                  <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-2">
                    <span>+ Create Course</span>
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Course Table */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Course</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Phase</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Coach</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Progress</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {courses.map((course) => {
                        const phase = statusToPhase[course.status] || 1;
                        const colors = phaseColors[course.status] || phaseColors.draft;

                        return (
                          <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <p className="font-medium text-gray-900">{course.title}</p>
                                <p className="text-sm text-gray-600 mt-0.5">{course.platform}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                                {formatStatus(course.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-700">
                                {course.assigned_coach ? "Dr. Priya" : "Unassigned"}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${(phase / 13) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                                  {phase}/13
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Link href={`/course/${course.id}`}>
                                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                                  View
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
