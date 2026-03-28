"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Course, User } from "@/types";
import { getCourses, getProfileById } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadState } from "@/lib/store";
import Link from "next/link";

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
  toc_locked: 40,
  content_generation: 55,
  ppt_generation: 65,
  video_recording: 75,
  review: 90,
  completed: 100,
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coachNames, setCoachNames] = useState<Record<string, string>>({});
  const [currentView, setCurrentView] = useState("dashboard");
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

        if (isSupabaseConfigured) {
          // Load from Supabase
          const allCourses = await getCourses();
          setCourses(allCourses);

          // Resolve coach names
          const coachIds = [...new Set(allCourses.map((c) => c.assigned_coach).filter(Boolean))] as string[];
          const names: Record<string, string> = {};
          for (const id of coachIds) {
            const profile = await getProfileById(id);
            if (profile) names[id] = profile.name;
          }
          setCoachNames(names);
        } else {
          // Fallback to localStorage
          const state = loadState();
          setCourses(state.courses);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
        router.push("/");
        return;
      }

      setIsLoading(false);
    };

    init();
  }, [router]);

  const handleNavigate = (view: string) => {
    if (view === "dashboard") setCurrentView("dashboard");
    else if (view === "create-course") router.push("/create");
    else if (view === "review-queue") router.push("/review");
    else setCurrentView(view);
  };

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
    inProgress: courses.filter((c) => !["draft", "completed", "review"].includes(c.status)).length,
    completed: courses.filter((c) => c.status === "completed").length,
    pendingReview: courses.filter((c) => c.status === "review" || c.status === "toc_review").length,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} user={user} onLogout={handleLogout} />

      <main className="flex-1 md:ml-64 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {user.name}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Courses", value: stats.total, color: "blue", icon: "M12 6.253v13m0-13C6.228 6.228 2 10.428 2 15.5c0 5.072 4.228 9.272 10 9.272s10-4.2 10-9.272c0-5.072-4.228-9.247-10-9.247z" },
              { label: "In Progress", value: stats.inProgress, color: "orange", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { label: "Completed", value: stats.completed, color: "green", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
              { label: "Pending Review", value: stats.pendingReview, color: "amber", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
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

          {/* Action */}
          {user.role === "pm" && (
            <div className="mb-8">
              <button
                onClick={() => router.push("/create")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Course
              </button>
            </div>
          )}

          {/* Courses Grid */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {user.role === "coach" ? "Assigned Courses" : "All Courses"}
            </h2>
            {courses.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-gray-600 mb-4">No courses yet.</p>
                {user.role === "pm" && (
                  <button onClick={() => router.push("/create")} className="text-blue-600 font-medium hover:underline">
                    Create your first course
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => {
                  const colors = statusBadgeColors[course.status] || { bg: "bg-gray-100", text: "text-gray-700" };
                  const progress = statusProgress[course.status] || 0;
                  const coachName = course.assigned_coach ? coachNames[course.assigned_coach] || "Assigned" : "Unassigned";

                  return (
                    <Link key={course.id} href={`/course/${course.id}`}>
                      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-bold text-gray-900 flex-1 line-clamp-2">{course.title}</h3>
                          </div>

                          <div className="flex items-center gap-2 mb-4">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${platformBadgeColors[course.platform] || "bg-gray-100 text-gray-700"}`}>
                              {course.platform.charAt(0).toUpperCase() + course.platform.slice(1)}
                            </span>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                              {course.status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                          <div className="space-y-2 mb-4 text-sm">
                            <div className="flex justify-between text-gray-700">
                              <span>Coach:</span>
                              <span className="font-medium">{coachName}</span>
                            </div>
                            <div className="flex justify-between text-gray-700">
                              <span>Duration:</span>
                              <span className="font-medium">{course.duration_weeks} weeks</span>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-200">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Progress: {progress}%</p>
                          </div>
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
