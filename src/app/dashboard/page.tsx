"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Course, User } from "@/types";
import { loadState } from "@/lib/store";
import Link from "next/link";

const statusBadgeColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700" },
  toc_generation: { bg: "bg-blue-100", text: "text-blue-700" },
  toc_review: { bg: "bg-yellow-100", text: "text-yellow-700" },
  toc_approved: { bg: "bg-indigo-100", text: "text-indigo-700" },
  content_briefs: { bg: "bg-purple-100", text: "text-purple-700" },
  ppt_generation: { bg: "bg-pink-100", text: "text-pink-700" },
  ppt_review: { bg: "bg-pink-100", text: "text-pink-700" },
  recording: { bg: "bg-orange-100", text: "text-orange-700" },
  transcription: { bg: "bg-orange-100", text: "text-orange-700" },
  content_generation: { bg: "bg-purple-100", text: "text-purple-700" },
  content_review: { bg: "bg-amber-100", text: "text-amber-700" },
  final_review: { bg: "bg-amber-100", text: "text-amber-700" },
  published: { bg: "bg-green-100", text: "text-green-700" },
};

const platformBadgeColors: Record<string, string> = {
  coursera: "bg-blue-100 text-blue-700",
  udemy: "bg-purple-100 text-purple-700",
  infylearn: "bg-orange-100 text-orange-700",
  university: "bg-teal-100 text-teal-700",
  custom: "bg-gray-100 text-gray-700",
};

const statusProgress: Record<string, number> = {
  draft: 5,
  toc_generation: 15,
  toc_review: 30,
  toc_approved: 40,
  content_briefs: 50,
  ppt_generation: 60,
  ppt_review: 65,
  recording: 75,
  transcription: 80,
  content_generation: 85,
  content_review: 90,
  final_review: 95,
  published: 100,
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
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

        // Load from localStorage
        const state = loadState();
        setCourses(state.courses);
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
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: courses.length,
    inProgress: courses.filter((c) => !["draft", "published"].includes(c.status)).length,
    published: courses.filter((c) => c.status === "published").length,
    inReview: courses.filter((c) => c.status.includes("review")).length,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 md:ml-64 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {user.name}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Total Courses", value: stats.total, color: "blue", icon: "M12 6.253v13m0-13C6.228 6.228 2 10.428 2 15.5c0 5.072 4.228 9.272 10 9.272s10-4.2 10-9.272c0-5.072-4.228-9.247-10-9.247z" },
              { label: "In Progress", value: stats.inProgress, color: "orange", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { label: "In Review", value: stats.inReview, color: "yellow", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
              { label: "Published", value: stats.published, color: "green", icon: "M5 13l4 4L19 7" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                    <svg className={`w-6 h-6 text-${stat.color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Courses */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Courses</h2>
              {user.role === "pm" && (
                <p className="text-gray-600 mt-2">Create and manage your courses here.</p>
              )}
            </div>

            {courses.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C6.228 6.228 2 10.428 2 15.5c0 5.072 4.228 9.272 10 9.272s10-4.2 10-9.272c0-5.072-4.228-9.247-10-9.247z" />
                </svg>
                <p className="text-gray-600 font-medium">No courses yet</p>
                <p className="text-gray-400 text-sm mt-1">Create your first course to get started</p>
                {user.role === "pm" && (
                  <Link href="/create">
                    <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                      Create Course
                    </button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => {
                  const progress = statusProgress[course.status] || 0;
                  const statusColor = statusBadgeColors[course.status] || { bg: "bg-gray-100", text: "text-gray-700" };

                  return (
                    <Link key={course.id} href={`/course/${course.id}`}>
                      <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden cursor-pointer">
                        {/* Header */}
                        <div className="p-6 pb-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 line-clamp-2">{course.title}</h3>
                            </div>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ml-2 flex-shrink-0 ${statusColor.bg} ${statusColor.text}`}>
                              {course.status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").substring(0, 20)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">Progress</span>
                            <span className="text-xs text-gray-500">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="px-6 py-4 border-t border-gray-200 space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Platform</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${platformBadgeColors[course.platform]}`}>
                              {course.platform.charAt(0).toUpperCase() + course.platform.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Audience Level</span>
                            <span className="text-xs font-medium text-gray-700 capitalize">{course.audience_level}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Duration</span>
                            <span className="text-xs font-medium text-gray-700">{course.duration_weeks} weeks</span>
                          </div>
                          {course.assigned_coach && (
                            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                              <span className="text-gray-600">Assigned Coach</span>
                              <span className="text-xs font-medium text-gray-700">Coach</span>
                            </div>
                          )}
                        </div>

                        {/* CTA */}
                        <div className="px-6 py-3 bg-blue-50 border-t border-gray-200">
                          <button className="w-full text-sm font-medium text-blue-600 hover:text-blue-700">
                            View Details →
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
