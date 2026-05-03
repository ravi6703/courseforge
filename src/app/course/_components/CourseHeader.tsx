import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { ProgressBar } from "@/components/Progress";
import { Badge } from "@/components/Badge";
import { ChevronLeft } from "lucide-react";

const PHASE_LABEL: Record<string, { label: string; n: number }> = {
  draft: { label: "Draft", n: 0 },
  toc_generation: { label: "TOC Generation", n: 1 },
  toc_review: { label: "TOC Review", n: 2 },
  toc_approved: { label: "TOC Approved", n: 3 },
  content_briefs: { label: "Content Briefs", n: 4 },
  ppt_generation: { label: "PPT Generation", n: 5 },
  ppt_review: { label: "PPT Review", n: 6 },
  recording: { label: "Recording", n: 7 },
  transcription: { label: "Transcription", n: 8 },
  content_generation: { label: "Content Generation", n: 9 },
  content_review: { label: "Content Review", n: 10 },
  final_review: { label: "Final Review", n: 11 },
  published: { label: "Published", n: 12 },
};

export async function CourseHeader({ courseId }: { courseId: string }) {
  const supabase = await getServerSupabase();

  const { data: course } = await supabase
    .from("courses")
    .select("title, description, status, platform, domain")
    .eq("id", courseId)
    .single();

  if (!course)
    return (
      <header className="bg-white border-b border-bi-navy-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-bi-navy-600 hover:text-bi-navy-700"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <p className="mt-2 text-bi-navy-600">Course not found.</p>
        </div>
      </header>
    );

  const phase = PHASE_LABEL[course.status] || { label: course.status, n: 0 };
  const pct = Math.round((phase.n / 12) * 100);

  return (
    <header className="bg-white border-b border-bi-navy-200 shadow-bi-sm">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-bi-navy-600 hover:text-bi-navy-700 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Dashboard
        </Link>

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-bi-navy-700 truncate">
                {course.title}
              </h1>
              {course.description && (
                <p className="mt-2 text-sm text-bi-navy-600 line-clamp-2 max-w-2xl">
                  {course.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {course.platform && (
                  <Badge variant="status">{course.platform}</Badge>
                )}
                {course.domain && (
                  <Badge variant="status">{course.domain}</Badge>
                )}
                <Badge variant="accent">{phase.label}</Badge>
              </div>
            </div>

            <div className="w-56 shrink-0">
              <div className="text-xs font-medium text-bi-navy-700 mb-2 flex justify-between">
                <span>Progress</span>
                <span className="text-bi-accent-600">{pct}%</span>
              </div>
              <ProgressBar value={pct} max={100} size="md" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
