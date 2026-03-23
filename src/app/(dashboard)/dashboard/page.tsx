import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  const courseCount = courses?.length || 0;
  const activeCourses = courses?.filter((c) => !["completed", "exported"].includes(c.status)).length || 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(210,40%,98%)]">Dashboard</h1>
          <p className="text-[hsl(215,20%,65%)] text-sm mt-1">Welcome back. Here&apos;s your course overview.</p>
        </div>
        <Link
          href="/courses/new"
          className="px-4 py-2.5 rounded-lg bg-[hsl(217,91%,60%)] text-white font-medium hover:bg-[hsl(217,91%,50%)] transition-all flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Course
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Courses" value={courseCount} icon="book" color="blue" />
        <StatCard label="Active Courses" value={activeCourses} icon="zap" color="green" />
        <StatCard label="Coaches Assigned" value={0} icon="users" color="orange" />
        <StatCard label="Completed" value={courseCount - activeCourses} icon="check" color="purple" />
      </div>

      {/* Recent Courses */}
      <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl">
        <div className="p-6 border-b border-[hsl(217,33%,17%)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[hsl(210,40%,98%)]">Recent Courses</h2>
          <Link href="/courses" className="text-sm text-[hsl(217,91%,60%)] hover:underline">
            View all
          </Link>
        </div>

        {courseCount === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(217,33%,17%)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[hsl(215,20%,45%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[hsl(210,40%,98%)] mb-2">No courses yet</h3>
            <p className="text-[hsl(215,20%,65%)] text-sm mb-6">Create your first course to get started with AI-powered content generation.</p>
            <Link
              href="/courses/new"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[hsl(217,91%,60%)] text-white font-medium hover:bg-[hsl(217,91%,50%)] transition-all text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Course
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(217,33%,17%)]">
            {courses?.slice(0, 5).map((course) => (
              <div key={course.id} className="p-4 px-6 flex items-center justify-between hover:bg-[hsl(217,33%,17%)/0.3] transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(217,91%,60%)/0.1] flex items-center justify-center">
                    <span className="text-[hsl(217,91%,60%)] text-sm font-bold">
                      {course.platform?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[hsl(210,40%,98%)]">{course.title}</h3>
                    <p className="text-xs text-[hsl(215,20%,65%)]">
                      {course.platform} · {course.domain} · {course.course_level}
                    </p>
                  </div>
                </div>
                <StatusBadge status={course.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "hsl(217,91%,60%)",
    green: "hsl(152,69%,40%)",
    orange: "hsl(30,85%,50%)",
    purple: "hsl(270,70%,60%)",
  };
  const bgColors: Record<string, string> = {
    blue: "hsl(217,91%,60%,0.1)",
    green: "hsl(152,69%,40%,0.1)",
    orange: "hsl(30,85%,50%,0.1)",
    purple: "hsl(270,70%,60%,0.1)",
  };

  return (
    <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[hsl(215,20%,65%)] uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bgColors[color] }}>
          <svg className="w-4 h-4" style={{ color: colors[color] }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={
              icon === "book" ? "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" :
              icon === "zap" ? "M13 10V3L4 14h7v7l9-11h-7z" :
              icon === "users" ? "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" :
              "M5 13l4 4L19 7"
            } />
          </svg>
        </div>
      </div>
      <p className="text-3xl font-bold text-[hsl(210,40%,98%)]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    toc_generated: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    toc_pm_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    toc_pm_approved: "bg-green-500/10 text-green-400 border-green-500/20",
    coach_assigned: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    toc_coach_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    toc_locked: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    in_production: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    content_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    completed: "bg-green-500/10 text-green-400 border-green-500/20",
    exported: "bg-green-500/10 text-green-400 border-green-500/20",
  };

  const labels: Record<string, string> = {
    draft: "Draft",
    toc_generated: "TOC Generated",
    toc_pm_review: "PM Review",
    toc_pm_approved: "PM Approved",
    coach_assigned: "Coach Assigned",
    toc_coach_review: "Coach Review",
    toc_locked: "TOC Locked",
    in_production: "In Production",
    content_review: "Content Review",
    completed: "Completed",
    exported: "Exported",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}
