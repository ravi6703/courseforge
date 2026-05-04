import Link from "next/link";
import { ChevronLeft, Settings, Send } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { Tag } from "@/components/ui/Tag";
import { HealthPill } from "@/components/ui/HealthPill";
import { AvatarMini } from "@/components/ui/AvatarStack";

const STATUS_PCT: Record<string, number> = {
  draft: 4, toc_generation: 12, toc_review: 18, toc_approved: 24, content_briefs: 32,
  ppt_generation: 44, ppt_review: 50, recording: 60, transcription: 68,
  content_generation: 76, content_review: 84, final_review: 92, published: 100,
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", toc_generation: "TOC Generation", toc_review: "TOC Review",
  toc_approved: "TOC Approved", content_briefs: "Briefs", ppt_generation: "Presentations",
  ppt_review: "Presentations", recording: "Recording", transcription: "Transcripts",
  content_generation: "Content", content_review: "Content", final_review: "Final review",
  published: "Published",
};

// Cheap deterministic placeholder until /api/lint is wired here.
function pseudoHealth(courseId: string): number {
  let s = 0;
  for (const c of courseId) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return 60 + (s % 40);
}

export async function CourseHeader({ courseId }: { courseId: string }) {
  const supabase = await getServerSupabase();
  const { data: course } = await supabase
    .from("courses")
    .select("title, description, status, platform, domain, duration_weeks, audience_level, created_at")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    return (
      <div className="bg-white border-b border-bi-navy-100 px-7 py-5">
        <Link href="/dashboard" className="text-[13px] text-bi-navy-600 hover:text-bi-navy-900 flex items-center gap-1.5 w-fit">
          <ChevronLeft className="w-3.5 h-3.5" />Back to dashboard
        </Link>
        <div className="mt-2 text-[14px] text-red-700">Course not found.</div>
      </div>
    );
  }

  const pct = STATUS_PCT[course.status] ?? 0;
  const phase = STATUS_LABEL[course.status] ?? "Draft";
  const health = pseudoHealth(courseId);
  const created = new Date(course.created_at);
  const days = Math.max(1, Math.floor((Date.now() - created.getTime()) / 86_400_000));

  return (
    <div className="bg-white border-b border-bi-navy-100 px-7 pt-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10.5px] uppercase tracking-[.06em] font-bold text-bi-navy-500">
            {course.platform || "internal"}
            {course.domain && ` · ${course.domain}`}
            {course.duration_weeks && ` · ${course.duration_weeks} weeks`}
          </div>
          <h1 className="text-[22px] font-extrabold text-bi-navy-900 tracking-tight mt-1">{course.title}</h1>
          <div className="mt-1.5 flex items-center gap-3 text-[13px] text-bi-navy-500 flex-wrap">
            <span className="inline-flex items-center gap-1.5"><AvatarMini name="Ravi Bohra" /> Ravi Bohra <span className="text-bi-navy-400">· coach</span></span>
            <span className="w-[3px] h-[3px] bg-bi-navy-300 rounded-full" />
            <span>Created {created.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {days}d in production</span>
            <span className="w-[3px] h-[3px] bg-bi-navy-300 rounded-full" />
            <span className="text-emerald-700 font-semibold inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-700 rounded-full" /> Health <HealthPill score={health} />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-[180px]">
            <div className="flex-1 h-1.5 rounded-full bg-bi-navy-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-bi-blue-600 to-bi-accent-600" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[12px] font-bold text-bi-navy-700">{pct}%</span>
          </div>
          <Link href={`/dashboard?settings=${courseId}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bi-navy-100 text-[13px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50">
            <Settings className="w-3.5 h-3.5" />Settings
          </Link>
          <button
            disabled={phase !== "Final review" && phase !== "Published"}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-bi-navy-900 text-white text-[13px] font-semibold hover:bg-bi-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />Publish
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <Tag tone={phase === "Published" ? "emerald" : "blue"}>{phase}</Tag>
        {course.audience_level && <Tag tone="navy">{course.audience_level}</Tag>}
      </div>
    </div>
  );
}
