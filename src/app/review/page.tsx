"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Course, User } from "@/types";
import { getCourses } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadState } from "@/lib/store";
import Link from "next/link";

const statusBadgeColors: Record<string, { bg: string; text: string }> = {
  toc_review: { bg: "bg-yellow-100", text: "text-yellow-700" },
  review: { bg: "bg-amber-100", text: "text-amber-700" },
  content_generation: { bg: "bg-purple-100", text: "text-purple-700" },
  video_recording: { bg: "bg-orange-100", text: "text-orange-700" },
};

export default function ReviewQueuePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem("courseforge_user");
      if (!storedUser) { router.push("/"); return; }

      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        let allCourses: Course[] = [];
        if (isSupabaseConfigured) {
          allCourses = await getCourses();
        } else {
          const state = loadState();
          allCourses = state.courses;
        }

        // Filter to reviewable statuses
        const reviewable = allCourses.filter((c) =>
          ["toc_review", "review", "content_generation", "video_recording"].includes(c.status)
        );
        setCourses(reviewable);
      } catch (err) {
        console.error("Review queue error:", err);
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
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 md:ml-64 overflow-auto">
        <div className="p-8 max-w-5xl">
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-8">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <span>&gt;</span>
            <span>Review Queue</span>
          </nav>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Review Queue</h1>
            <p className="text-gray-600 mt-2">
              {user.role === "coach"
                ? "Courses assigned to you for review"
                : "Courses needing attention"}
            </p>
          </div>

          {courses.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-600">No courses pending review. All clear!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => {
                const colors = statusBadgeColors[course.status] || { bg: "bg-gray-100", text: "text-gray-700" };
                return (
                  <Link key={course.id} href={`/course/${course.id}`}>
                    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">{course.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-1">{course.description}</p>
                        </div>
                        <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${colors.bg} ${colors.text} ml-4 shrink-0`}>
                          {course.status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                        <span>{course.platform.charAt(0).toUpperCase() + course.platform.slice(1)}</span>
                        <span>{course.duration_weeks} weeks</span>
                        <span className="capitalize">{course.audience_level}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
