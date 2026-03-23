export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";

export default async function CoursesPage(
  props: {
    searchParams?: Promise<{
      status?: string;
      search?: string;
      view?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const filterStatus = searchParams?.status || "all";
  const searchQuery = searchParams?.search || "";
  const viewMode = searchParams?.view || "grid";

  const supabase = await createClient();

  // Fetch all courses
  let query = supabase.from("courses").select("*, profiles(full_name)");

  // Apply status filter
  if (filterStatus !== "all") {
    query = query.eq("status", filterStatus);
  }

  // Apply search filter
  if (searchQuery) {
    query = query.ilike("title", `%${searchQuery}%`);
  }

  const { data: courses } = await query.order("created_at", { ascending: false });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(210,40%,98%)]">Courses</h1>
          <p className="text-[hsl(215,20%,65%)] text-sm mt-1">
            {courses?.length || 0} course{courses?.length !== 1 ? "s" : ""} in your library
          </p>
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

      {/* Filters and Controls */}
      <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl p-4 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="flex-1 md:max-w-xs">
            <form className="relative">
              <input
                type="text"
                placeholder="Search courses..."
                defaultValue={searchQuery}
                name="search"
                className="w-full px-4 py-2.5 rounded-lg bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder-[hsl(215,20%,45%)] focus:outline-none focus:ring-2 focus:ring-[hsl(217,91%,60%)] focus:border-transparent transition-all text-sm"
              />
              <svg className="absolute right-3 top-3 w-5 h-5 text-[hsl(215,20%,45%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </form>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[hsl(215,20%,65%)]">Status:</span>
            <select
              defaultValue={filterStatus}
              name="status"
              onChange={(e) => {
                const url = new URL(window.location.href);
                if (e.target.value === "all") {
                  url.searchParams.delete("status");
                } else {
                  url.searchParams.set("status", e.target.value);
                }
                window.location.href = url.toString();
              }}
              className="px-3 py-2 rounded-lg bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] focus:outline-none focus:ring-2 focus:ring-[hsl(217,91%,60%)] focus:border-transparent transition-all text-sm"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="toc_pm_review">In Review</option>
              <option value="toc_locked">Locked</option>
              <option value="in_production">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 border border-[hsl(217,33%,17%)] rounded-lg p-1">
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("view", "grid");
                window.location.href = url.toString();
              }}
              className={`p-2 rounded transition-all ${
                viewMode === "grid"
                  ? "bg-[hsl(217,91%,60%)] text-white"
                  : "text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)]"
              }`}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("view", "list");
                window.location.href = url.toString();
              }}
              className={`p-2 rounded transition-all ${
                viewMode === "list"
                  ? "bg-[hsl(217,91%,60%)] text-white"
                  : "text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)]"
              }`}
              title="List view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Courses Display */}
      {courses && courses.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <CourseListRow key={course.id} course={course} />
            ))}
          </div>
        )
      ) : (
        <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(217,33%,17%)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[hsl(215,20%,45%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[hsl(210,40%,98%)] mb-2">No courses found</h3>
          <p className="text-[hsl(215,20%,65%)] text-sm mb-6">
            {searchQuery ? "Try adjusting your search criteria." : "Create your first course to get started."}
          </p>
          <Link
            href="/courses/new"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[hsl(217,91%,60%)] text-white font-medium hover:bg-[hsl(217,91%,50%)] transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create New Course
          </Link>
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: any }) {
  const createdDate = new Date(course.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const progress = calculateProgress(course.status);

  return (
    <Link
      href={`/courses/${course.id}`}
      className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl overflow-hidden hover:border-[hsl(217,91%,60%)] transition-all group"
    >
      <div className="p-6 border-b border-[hsl(217,33%,17%)]">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-semibold text-[hsl(210,40%,98%)] group-hover:text-[hsl(217,91%,60%)] transition-all line-clamp-2">
            {course.title}
          </h3>
          <span className="text-xs font-medium text-[hsl(215,20%,65%)] bg-[hsl(217,33%,17%)] px-2.5 py-1 rounded ml-2 whitespace-nowrap flex-shrink-0">
            {course.platform}
          </span>
        </div>
        <p className="text-xs text-[hsl(215,20%,65%)] mb-4">{course.domain}</p>

        <StatusBadge status={course.status} />
      </div>

      <div className="p-6 space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[hsl(215,20%,65%)]">Progress</span>
            <span className="text-xs text-[hsl(215,20%,45%)]">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-[hsl(217,33%,17%)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[hsl(217,91%,60%)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Coach and Date */}
        <div className="space-y-2">
          <div>
            <p className="text-xs text-[hsl(215,20%,45%)] mb-1">Coach</p>
            <p className="text-sm text-[hsl(210,40%,98%)]">
              {course.profiles?.full_name || "Unassigned"}
            </p>
          </div>
          <div>
            <p className="text-xs text-[hsl(215,20%,45%)] mb-1">Created</p>
            <p className="text-sm text-[hsl(210,40%,98%)]">{createdDate}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CourseListRow({ course }: { course: any }) {
  const createdDate = new Date(course.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const progress = calculateProgress(course.status);

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
            <h3 className="text-sm font-semibold text-[hsl(210,40%,98%)] group-hover:text-[hsl(217,91%,60%)] transition-all truncate">
              {course.title}
            </h3>
            <p className="text-xs text-[hsl(215,20%,65%)] mt-1">
              {course.platform} · {course.domain}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="w-32">
            <div className="w-full h-2 bg-[hsl(217,33%,17%)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[hsl(217,91%,60%)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[hsl(215,20%,45%)] mt-1 text-center">{progress}%</p>
          </div>

          {/* Status */}
          <StatusBadge status={course.status} />

          {/* Coach */}
          <div className="w-32 text-right">
            <p className="text-xs text-[hsl(215,20%,45%)]">Coach</p>
            <p className="text-sm text-[hsl(210,40%,98%)] truncate">
              {course.profiles?.full_name || "Unassigned"}
            </p>
          </div>

          {/* Date */}
          <div className="w-24 text-right">
            <p className="text-xs text-[hsl(215,20%,45%)]">Created</p>
            <p className="text-sm text-[hsl(210,40%,98%)]">{createdDate}</p>
          </div>

          <svg className="w-5 h-5 text-[hsl(215,20%,65%)] group-hover:text-[hsl(217,91%,60%)] transition-all flex-shrink-0">
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

function calculateProgress(status: string): number {
  const progressMap: Record<string, number> = {
    draft: 5,
    toc_generated: 20,
    toc_pm_review: 30,
    toc_pm_approved: 40,
    coach_assigned: 50,
    coach_review: 60,
    toc_locked: 70,
    in_production: 80,
    content_review: 90,
    completed: 100,
    exported: 100,
  };

  return progressMap[status] || 0;
}
