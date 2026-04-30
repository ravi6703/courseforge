"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Course } from "@/types";
import { loadState } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Plus, ArrowRight, BookOpen, Zap, Clock, CheckCircle } from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  toc_generation: "TOC Generation",
  toc_review: "TOC Review",
  toc_approved: "TOC Approved",
  content_briefs: "Content Briefs",
  ppt_generation: "PPT Generation",
  ppt_review: "PPT Review",
  recording: "Recording",
  transcription: "Transcription",
  content_generation: "Content Generation",
  content_review: "Content Review",
  final_review: "Final Review",
  published: "Published",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  toc_generation: "bg-blue-100 text-blue-700",
  toc_review: "bg-yellow-100 text-yellow-700",
  toc_approved: "bg-blue-100 text-blue-700",
  content_briefs: "bg-indigo-100 text-indigo-700",
  ppt_generation: "bg-purple-100 text-purple-700",
  ppt_review: "bg-purple-100 text-purple-700",
  recording: "bg-orange-100 text-orange-700",
  transcription: "bg-cyan-100 text-cyan-700",
  content_generation: "bg-teal-100 text-teal-700",
  content_review: "bg-teal-100 text-teal-700",
  final_review: "bg-green-100 text-green-700",
  published: "bg-green-100 text-green-800",
};

const statusToPhase: Record<string, number> = {
  draft: 1, toc_generation: 2, toc_review: 3, toc_approved: 4,
  content_briefs: 5, ppt_generation: 6, ppt_review: 7, recording: 8,
  transcription: 9, content_generation: 10, content_review: 11,
  final_review: 12, published: 13,
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }
      setUser({
        name: authUser.user_metadata?.name ?? authUser.email ?? "User",
        email: authUser.email ?? "",
        role: authUser.user_metadata?.role ?? "pm",
      });
      const state = loadState();
      setCourses(state.courses || []);
      setIsLoading(false);
    };
    init();
  }, [router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = {
    total: courses.length,
    inProgress: courses.filter(c => !["draft", "published"].includes(c.status)).length,
    inReview: courses.filter(c => c.status.includes("review")).length,
    published: courses.filter(c => c.status === "published").length,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}</h1>
              <p className="text-gray-500 mt-1">
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            {user.role === "pm" && (
              <Link href="/create">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                  <Plus className="w-5 h-5" /> New Course
                </button>
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Courses", value: stats.total, icon: BookOpen, color: "blue" },
              { label: "In Production", value: stats.inProgress, icon: Zap, color: "amber" },
              { label: "Pending Review", value: stats.inReview, icon: Clock, color: "yellow" },
              { label: "Published", value: stats.published, icon: CheckCircle, color: "green" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                  </div>
                  <s.icon className={`w-8 h-8 text-${s.color}-500 opacity-50`} />
                </div>
              </div>
            ))}
          </div>

          {/* Courses */}
          {courses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {user.role === "pm" ? "Create your first course to get started." : "No courses assigned yet. Check back soon!"}
              </p>
              {user.role === "pm" && (
                <Link href="/create">
                  <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Create First Course
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Course</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Phase</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Progress</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {courses.map(course => {
                    const phase = statusToPhase[course.status] || 1;
                    return (
                      <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{course.title}</p>
                          <p className="text-sm text-gray-500">{course.platform} &middot; {course.domain || "General"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusColors[course.status] || "bg-gray-100 text-gray-700"}`}>
                            {statusLabels[course.status] || course.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-20 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${(phase / 13) * 100}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{phase}/13</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/course/${course.id}`}>
                            <button className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                              Open <ArrowRight className="w-4 h-4" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
