export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function CoachDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get coach's assigned courses
  const { data: coachCourses } = await supabase
    .from("courses")
    .select("*")
    .eq("coach_id", user.id)
    .order("updated_at", { ascending: false });

  const myCourses = coachCourses?.length || 0;
  const pendingReview = coachCourses?.filter((c) => c.status === "coach_review").length || 0;
  const inProduction = coachCourses?.filter((c) => c.status === "in_production").length || 0;
  const completed = coachCourses?.filter((c) => c.status === "completed").length || 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(210,40%,98%)]">Coach Dashboard</h1>
          <p className="text-[hsl(215,20%,65%)] text-sm mt-1">Manage your assigned courses and opportunities.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="My Courses" value={myCourses} icon="book" color="blue" />
        <StatCard label="Pending Review" value={pendingReview} icon="clock" color="orange" />
        <StatCard label="In Production" value={inProduction} icon="zap" color="purple" />
        <StatCard label="Completed" value={completed} icon="check" color="green" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <QuickActionCard
          title="View Opportunities"
          description="Find new courses to review and accept"
          href="/portal/opportunities"
          icon="briefcase"
          color="blue"
        />
        <QuickActionCard
          title="My Courses"
          description="View and manage your assigned courses"
          href="/portal/courses"
          icon="book"
          color="green"
        />
      </div>

      {/* Recent Assigned Courses */}
      <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl">
        <div className="p-6 border-b border-[hsl(217,33%,17%)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[hsl(210,40%,98%)]">Recent Assigned Courses</h2>
          <Link href="/portal/courses" className="text-sm text-[hsl(217,91%,60%)] hover:underline">
            View all
          </Link>
        </div>

        {myCourses === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(217,33%,17%)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[hsl(215,20%,45%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[hsl(210,40%,98%)] mb-2">No courses assigned yet</h3>
            <p className="text-[hsl(215,20%,65%)] text-sm mb-6">View available opportunities to review and accept new courses.</p>
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
        ) : (
          <div className="divide-y divide-[hsl(217,33%,17%)]">
            {coachCourses?.slice(0, 5).map((course) => (
              <div key={course.id} className="p-4 px-6 flex items-center justify-between hover:bg-[hsl(217,33%,17%)/0.3] transition-all">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(217,91%,60%)/0.1] flex items-center justify-center">
                    <span className="text-[hsl(217,91%,60%)] text-sm font-bold">
                      {course.platform?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-[hsl(210,40%,98%)]">{course.title}</h3>
                    <p className="text-xs text-[hsl(215,20%,65%)]">
                      {course.platform} · {course.domain}
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

  const iconPaths: Record<string, string> = {
    book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    zap: "M13 10V3L4 14h7v7l9-11h-7z",
    check: "M5 13l4 4L19 7",
  };

  return (
    <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[hsl(215,20%,65%)] uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bgColors[color] }}>
          <svg className="w-4 h-4" style={{ color: colors[color] }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[icon] || iconPaths.book} />
          </svg>
        </div>
      </div>
      <p className="text-3xl font-bold text-[hsl(210,40%,98%)]">{value}</p>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "hsl(217,91%,60%)",
    green: "hsl(152,69%,40%)",
  };

  const bgColors: Record<string, string> = {
    blue: "hsl(217,91%,60%,0.1)",
    green: "hsl(152,69%,40%,0.1)",
  };

  const iconPaths: Record<string, string> = {
    briefcase: "M20 7l-8-4m0 0L4 7m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-9-4.5m0 0L4 7m9-4.5v13m9 4.5H3",
    book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  };

  return (
    <Link
      href={href}
      className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl p-6 hover:border-[hsl(217,91%,60%)] transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bgColors[color] }}>
          <svg className="w-6 h-6" style={{ color: colors[color] }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[icon]} />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[hsl(210,40%,98%)] group-hover:text-[hsl(217,91%,60%)] transition-all">{title}</h3>
          <p className="text-sm text-[hsl(215,20%,65%)] mt-1">{description}</p>
        </div>
        <svg className="w-5 h-5 text-[hsl(215,20%,65%)] group-hover:text-[hsl(217,91%,60%)] transition-all flex-shrink-0 mt-1">
          <path fill="none" stroke="currentColor" strokeWidth={2} d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
