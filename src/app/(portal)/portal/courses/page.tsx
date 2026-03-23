export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function CoachCoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get courses where coach_id = current user
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("coach_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[hsl(210,40%,98%)]">My Courses</h1>
        <p className="text-[hsl(215,20%,65%)] text-sm mt-1">View and manage your assigned courses.</p>
      </div>

      {courses && courses.length > 0 ? (
        <div className="space-y-4">
          {courses.map((course) => (
            <CourseRow key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(217,33%,17%)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[hsl(215,20%,45%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[hsl(210,40%,98%)] mb-2">No courses assigned yet</h3>
          <p className="text-[hsl(215,20%,65%)] text-sm mb-6">View available opportunities to accept new course assignments.</p>
          <Link
            href="/portal/opportunities"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[hsl(217,91%,60%)] text-white font-medium hover:bg-[hsl(217,91%,50%)] transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            View Opportunities
          </Link>
        </div>
      )}
    </div>
  );
}

function CourseRow({ course }: { course: any }) {
  const lastUpdated = new Date(course.updated_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/courses/${course.id}`}
      className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-4 hover:border-[hsl(217,91%,60%)] transition-all group"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-[hsl(217,91%,60%)/0.1] flex items-center justify-center flex-shrink-0">
            <span className="text-[hsl(217,91%,60%)] text-sm font-bold">
              {course.platform?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[hsl(210,40%,98%)] group-hover:text-[hsl(217,91%,60%)] transition-all truncate">
              {course.title}
            </h3>
            <p className="text-xs text-[hsl(215,20%,65%)] mt-1">
              {course.platform} · {course.domain} · Last updated {lastUpdated}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <StatusBadge status={course.status} />
          <svg className="w-5 h-5 text-[hsl(215,20%,65%)] group-hover:text-[hsl(217,91%,60%)] transition-all">
            <path fill="none" stroke="currentColor" strokeWidth={2} d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    toc_generated: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    toc_pm_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    toc_pm_approved: "bg-green-500/10 text-green-400 border-green-500/20",
    coach_assigned: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    coach_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
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
    coach_review: "Coach Review",
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
