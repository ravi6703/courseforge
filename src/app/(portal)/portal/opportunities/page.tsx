export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function OpportunitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get courses in coach_review status without a coach assigned yet
  const { data: opportunities } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "coach_review")
    .is("coach_id", null)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[hsl(210,40%,98%)]">Opportunities</h1>
        <p className="text-[hsl(215,20%,65%)] text-sm mt-1">Review available courses and accept new assignments.</p>
      </div>

      {opportunities && opportunities.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {opportunities.map((course) => (
            <CourseOpportunityCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(217,33%,17%)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[hsl(215,20%,45%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4m0 0L4 7m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-9-4.5m0 0L4 7m9-4.5v13m9 4.5H3" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[hsl(210,40%,98%)] mb-2">No opportunities available</h3>
          <p className="text-[hsl(215,20%,65%)] text-sm">Check back soon for new courses to review.</p>
        </div>
      )}
    </div>
  );
}

function CourseOpportunityCard({ course }: { course: any }) {
  return (
    <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl overflow-hidden hover:border-[hsl(217,91%,60%)] transition-all">
      {/* Card Header */}
      <div className="p-6 border-b border-[hsl(217,33%,17%)]">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-[hsl(210,40%,98%)] flex-1 pr-4">{course.title}</h3>
          <span className="text-xs font-medium text-[hsl(215,20%,65%)] bg-[hsl(217,33%,17%)] px-2.5 py-1 rounded whitespace-nowrap">
            {course.platform}
          </span>
        </div>
        <p className="text-sm text-[hsl(215,20%,65%)]">{course.domain}</p>
      </div>

      {/* Card Details */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <DetailItem label="Level" value={course.course_level} />
          <DetailItem label="Platform" value={course.platform} />
          <DetailItem label="Target Audience" value={course.target_audience || "Not specified"} />
          <DetailItem label="Course Length" value={`${course.course_length || 0} hours`} />
          <DetailItem label="Modules" value={`${course.number_of_modules || 0} modules`} colSpan />
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-6 border-t border-[hsl(217,33%,17%)] bg-[hsl(217,33%,17%,0.3)]">
        <Link
          href={`/portal/courses/${course.id}`}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[hsl(217,91%,60%)] text-white font-medium hover:bg-[hsl(217,91%,50%)] transition-all text-sm w-full"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          View TOC & Accept
        </Link>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  colSpan,
}: {
  label: string;
  value: string | number;
  colSpan?: boolean;
}) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <p className="text-xs font-medium text-[hsl(215,20%,45%)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-[hsl(210,40%,98%)]">{value}</p>
    </div>
  );
}
