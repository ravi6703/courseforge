// src/app/course/_components/CourseHeader.tsx
//
// Header row shared across all course tabs. Pulls the course's status, phase,
// and progress directly from Supabase so it's always fresh.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";

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
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
    }
  );

  const { data: course } = await supabase
    .from("courses")
    .select("title, description, status, platform, domain")
    .eq("id", courseId)
    .single();

  if (!course)
    return (
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="text-sm text-slate-500">
            ← Back to dashboard
          </Link>
          <p className="mt-2 text-slate-500">Course not found.</p>
        </div>
      </header>
    );

  const phase = PHASE_LABEL[course.status] || { label: course.status, n: 0 };
  const pct = Math.round((phase.n / 12) * 100);

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-700">
          ← Dashboard
        </Link>
        <div className="mt-2 flex flex-wrap items-start gap-4 justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">
              {course.title}
            </h1>
            {course.description && (
              <p className="mt-1 text-sm text-slate-600 line-clamp-2 max-w-3xl">
                {course.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded bg-slate-100">
                {course.platform}
              </span>
              {course.domain && (
                <span className="px-2 py-0.5 rounded bg-slate-100">
                  {course.domain}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">
                {phase.label}
              </span>
            </div>
          </div>
          <div className="w-44 shrink-0">
            <div className="text-xs text-slate-500 mb-1 flex justify-between">
              <span>Progress</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
