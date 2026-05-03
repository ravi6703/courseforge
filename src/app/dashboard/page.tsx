"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Course } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Plus, ArrowRight, BookOpen, Zap, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/Progress";
import { Skeleton } from "@/components/Skeleton";

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
      const res = await fetch("/api/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
      setIsLoading(false);
    };
    init();
  }, [router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-bi-navy-50">
        <div className="w-8 h-8 border-4 border-bi-blue-600 border-t-transparent rounded-full animate-spin" />
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
    <div className="flex h-screen bg-bi-navy-50">
      <Sidebar />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-bi-navy-700">Welcome back, {user.name}</h1>
              <p className="text-bi-navy-600 mt-1">
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            {user.role === "pm" && (
              <Link href="/create">
                <Button variant="primary" size="lg" className="flex items-center gap-2">
                  <Plus className="w-5 h-5" /> New Course
                </Button>
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Courses", value: stats.total, icon: BookOpen, color: "blue" },
              { label: "In Production", value: stats.inProgress, icon: Zap, color: "accent" },
              { label: "Pending Review", value: stats.inReview, icon: Clock, color: "blue" },
              { label: "Published", value: stats.published, icon: CheckCircle, color: "success" },
            ].map(s => (
              <Card key={s.label}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-bi-navy-600">{s.label}</p>
                    <p className="text-3xl font-bold text-bi-navy-700 mt-2">{s.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${
                    s.color === 'blue' ? 'bg-bi-blue-50 text-bi-blue-600' :
                    s.color === 'accent' ? 'bg-bi-accent-50 text-bi-accent-600' :
                    'bg-green-50 text-green-600'
                  } flex items-center justify-center`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Courses */}
          {courses.length === 0 ? (
            <Card>
              <EmptyState
                icon={<BookOpen className="w-16 h-16" />}
                title="No courses yet"
                description={user.role === "pm" ? "Create your first course to get started." : "No courses assigned yet. Check back soon!"}
                action={user.role === "pm" ? {
                  label: "Create First Course",
                  onClick: () => router.push("/create"),
                  variant: "primary"
                } : undefined}
              />
            </Card>
          ) : (
            <Card className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-bi-navy-50 border-b border-bi-navy-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-bi-navy-700">Course</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-bi-navy-700">Phase</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-bi-navy-700">Progress</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-bi-navy-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bi-navy-200">
                    {courses.map(course => {
                      const phase = statusToPhase[course.status] || 1;
                      return (
                        <tr key={course.id} className="hover:bg-bi-navy-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-bi-navy-700">{course.title}</p>
                            <p className="text-sm text-bi-navy-600 mt-0.5">{course.platform} · {course.domain || "General"}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="status">
                              {statusLabels[course.status] || course.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24">
                                <ProgressBar value={phase} max={13} size="sm" />
                              </div>
                              <span className="text-xs text-bi-navy-600 font-medium">{phase}/13</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/course/${course.id}`}>
                              <Button variant="secondary" size="sm" className="flex items-center gap-1">
                                Open <ArrowRight className="w-4 h-4" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
