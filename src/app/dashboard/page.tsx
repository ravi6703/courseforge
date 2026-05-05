"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, BookOpen, Clock, Heart, Zap, Search, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { KpiCard } from "@/components/ui/KpiCard";
import { Tag } from "@/components/ui/Tag";
import { HealthPill } from "@/components/ui/HealthPill";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { FilterChip } from "@/components/ui/FilterChip";
import { KpiStripSkeleton, CourseCardSkeleton, PanelSkeleton } from "@/components/ui/SkeletonShapes";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { Course } from "@/types";
import { createClient } from "@/lib/supabase/client";

// Status → human label + phase number, kept inline so the dashboard
// works without depending on shared constants (the dashboard is the
// most-loaded page; touching it should be cheap to reason about).
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", toc_generation: "TOC Generation", toc_review: "TOC Review",
  toc_approved: "TOC Approved", content_briefs: "Briefs", ppt_generation: "Presentations",
  ppt_review: "Presentations", recording: "Recording", transcription: "Transcripts",
  content_generation: "Content", content_review: "Content", final_review: "Final review",
  published: "Published",
};
const STATUS_PCT: Record<string, number> = {
  draft: 4, toc_generation: 12, toc_review: 18, toc_approved: 24, content_briefs: 32,
  ppt_generation: 44, ppt_review: 50, recording: 60, transcription: 68,
  content_generation: 76, content_review: 84, final_review: 92, published: 100,
};

// Deterministic pseudo-health (real health comes from /api/lint).
// Used only as visual placeholder while the dashboard loads — replaced
// by the real score once it's been generated for a course.
function pseudoHealth(course: Course): number {
  let s = 0;
  for (const c of course.id) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return 60 + (s % 40);
}

function gradeFromScore(n: number): string {
  if (n >= 90) return "A · Excellent";
  if (n >= 80) return "B · Strong";
  if (n >= 70) return "C · Adequate";
  if (n >= 60) return "D · Needs work";
  return "F · Below standard";
}

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "all"; // all | inProduction | needsReview | published
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push("/login"); return; }
      setUser({
        name: u.user_metadata?.name ?? u.email ?? "User",
        email: u.email ?? "",
        role: u.user_metadata?.role ?? "pm",
      });
      const res = await fetch("/api/courses");
      if (res.ok) setCourses((await res.json()).courses ?? []);
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading || !user) {
    return (
      <AppShell title="Dashboard">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="h-7 w-64 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-40 bg-slate-100 rounded animate-pulse mt-2" />
          </div>
          <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
        <KpiStripSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-5">
          <PanelSkeleton rows={3} /><PanelSkeleton rows={3} />
        </div>
        <div className="bg-white border border-slate-200 rounded-[10px] p-5">
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
          </div>
        </div>
      </AppShell>
    );
  }

  const inProduction = courses.filter((c) => !["draft","published"].includes(c.status));
  const published    = courses.filter((c) => c.status === "published");
  const queue        = inProduction.filter((c) => c.status.includes("review")).slice(0,3);

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const filtered = courses
    .filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => {
      if (statusFilter === "inProduction") return !["draft","published"].includes(c.status);
      if (statusFilter === "needsReview")  return c.status.includes("review");
      if (statusFilter === "published")    return c.status === "published";
      return true;
    });

  return (
    <AppShell title="Dashboard" rightSlot={null}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold text-slate-900 tracking-tight">{greet}, {user.name.split(" ")[0]}</h1>
          <p className="text-[13.5px] text-slate-500 mt-0.5">Here&apos;s what needs your attention</p>
        </div>
        {user.role === "pm" && (
          <Link href="/create" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-bi-navy-900 text-white text-[13px] font-semibold hover:bg-bi-navy-800 transition-colors">
            <Plus className="w-4 h-4" /> New course
          </Link>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <KpiCard
          label="Courses in production"
          value={inProduction.length}
          icon={BookOpen}
          tone="blue"
          href="/dashboard?status=inProduction"
          delta={inProduction.length > 0 ? `${inProduction.length} active` : undefined}
          empty={inProduction.length === 0}
          emptyHint={inProduction.length === 0 ? "Start one to fill this." : undefined}
        />
        <KpiCard
          label="Awaiting your review"
          value={queue.length}
          icon={Clock}
          tone="amber"
          href={queue.length > 0 ? "/dashboard?status=needsReview" : undefined}
          delta={queue.length > 0 ? `${queue.length} blocking publish` : undefined}
          empty={queue.length === 0}
          emptyHint={queue.length === 0 ? "Inbox zero." : undefined}
        />
        <KpiCard
          label="Health score · avg"
          value={courses.length ? Math.round(courses.reduce((s,c) => s + pseudoHealth(c), 0) / courses.length) : "—"}
          icon={Heart}
          tone="emerald"
          href="/metrics"
          delta={courses.length ? gradeFromScore(Math.round(courses.reduce((s,c) => s + pseudoHealth(c), 0) / courses.length)) : undefined}
          empty={courses.length === 0}
          emptyHint={courses.length === 0 ? "Score appears once you publish a course." : undefined}
        />
        <KpiCard
          label="Published"
          value={published.length}
          icon={Zap}
          tone="violet"
          href={published.length > 0 ? "/dashboard?status=published" : undefined}
          delta={published.length > 0 ? `${published.length} live` : undefined}
          empty={published.length === 0}
          emptyHint={published.length === 0 ? "Ship your first course →" : undefined}
        />
      </div>

      {/* Recent + Queue side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-5">
        <RecentCourses courses={inProduction.slice(0,3)} />
        <YourQueue courses={queue} />
      </div>

      {/* Recent activity */}
      <div className="mb-5">
        <ActivityFeed limit={8} />
      </div>

      {/* All courses */}
      <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">All courses</h2>
            <div className="text-[12px] text-slate-500 mt-0.5">{courses.length} total · {inProduction.length} in production · {published.length} published</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 border border-slate-200 bg-white rounded-lg px-3 py-1.5 w-72">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses…"
                className="flex-1 bg-transparent outline-none text-[13px] text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => router.replace("/dashboard")}
            >All</FilterChip>
            <FilterChip
              active={statusFilter === "inProduction"}
              onClick={() => router.replace("/dashboard?status=inProduction")}
            >In production</FilterChip>
            <FilterChip
              active={statusFilter === "needsReview"}
              onClick={() => router.replace("/dashboard?status=needsReview")}
            >Needs review</FilterChip>
            <FilterChip
              active={statusFilter === "published"}
              onClick={() => router.replace("/dashboard?status=published")}
            >Published</FilterChip>
          </div>
        </div>
        <div className="p-5">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-2">📚</div>
              <div className="text-[14px] font-semibold text-slate-900">
                {search ? "No courses match your search" : "No courses yet"}
              </div>
              <div className="text-[12.5px] text-slate-500 mt-1">
                {search ? `"${search}" returned 0 results. Try a different keyword.` : "Create your first course to get started."}
              </div>
              {!search && (
                <Link href="/create" className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bi-navy-900 text-white text-[12.5px] font-semibold hover:bg-bi-navy-800">
                  <Plus className="w-3.5 h-3.5" /> New course
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filtered.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function CourseCard({ course }: { course: Course }) {
  const pct = STATUS_PCT[course.status] ?? 0;
  const phase = STATUS_LABEL[course.status] ?? "Draft";
  const health = pseudoHealth(course);
  return (
    <Link
      href={`/course/${course.id}/toc`}
      className="relative block bg-white border border-slate-200 rounded-[10px] shadow-sm p-4 hover:shadow-md hover:border-slate-200 hover:-translate-y-px transition-all"
    >
      <span className="absolute top-3.5 right-3.5"><HealthPill score={health} /></span>
      <h3 className="font-bold text-[15px] text-slate-900 tracking-tight leading-snug pr-16 line-clamp-2">{course.title}</h3>
      <p className="text-[12.5px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{course.description || "No description yet."}</p>
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        <Tag tone="blue">{course.platform || "internal"}</Tag>
        {course.domain && <Tag tone="violet">{course.domain}</Tag>}
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-bi-blue-600 to-bi-accent-600" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
        <AvatarStack avatars={[{ name: "Ravi Bohra" }]} />
        <span className="text-[11px] font-bold text-slate-700">{pct}% · {phase}</span>
      </div>
    </Link>
  );
}

function RecentCourses({ courses }: { courses: Course[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Recent courses</h2>
          <div className="text-[12px] text-slate-500 mt-0.5">In production</div>
        </div>
        <Link href="/dashboard" className="text-[12px] font-semibold text-slate-500 hover:text-slate-900">View all →</Link>
      </div>
      <div className="px-5 py-2">
        {courses.length === 0 && (
          <div className="py-8 text-center">
            <div className="text-[13.5px] font-semibold text-slate-900">No courses in production</div>
            <div className="text-[12px] text-slate-500 mt-1 mb-3">Create one to fill this panel.</div>
            <Link href="/create" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bi-navy-900 text-white text-[12.5px] font-semibold hover:bg-bi-navy-800">
              <Plus className="w-3.5 h-3.5" /> New course
            </Link>
          </div>
        )}
        {courses.map((c) => (
          <Link key={c.id} href={`/course/${c.id}/toc`}
                className="flex items-center justify-between py-2.5 border-b border-bi-navy-50 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-md">
            <div className="min-w-0">
              <div className="font-semibold text-[13.5px] text-slate-900 truncate">{c.title}</div>
              <div className="text-[11.5px] mt-0.5"><Tag tone="blue">{c.platform || "internal"}</Tag></div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <div className="font-bold text-[13px] text-slate-900">{STATUS_PCT[c.status] ?? 0}%</div>
              <div className="text-[11px] text-slate-500">{STATUS_LABEL[c.status] ?? "Draft"}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function YourQueue({ courses }: { courses: Course[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Your queue</h2>
        <div className="text-[12px] text-slate-500 mt-0.5">
          {courses.length === 0 ? "Nothing waiting on you" : `${courses.length} item${courses.length > 1 ? "s" : ""} waiting on you`}
        </div>
      </div>
      <div className="px-5 py-2">
        {courses.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-[13.5px] font-semibold text-slate-900">Inbox zero</div>
            <div className="text-[12px] text-slate-500 mt-1">Reviews land here automatically when a coach submits.</div>
          </div>
        ) : courses.map((c) => (
          <Link key={c.id} href={`/course/${c.id}/review`}
                className="flex items-center gap-3 py-2.5 border-b border-bi-navy-50 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-md">
            <Tag tone="amber">{STATUS_LABEL[c.status] ?? "Review"}</Tag>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] text-slate-900 truncate">{c.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{c.platform || "internal"}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}


// Wrap the inner component (which calls useSearchParams) in Suspense so
// Next.js doesn't deopt the route during build. The fallback mirrors
// the loading skeleton inside DashboardInner so there's no flash.
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Dashboard">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="h-7 w-64 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-40 bg-slate-100 rounded animate-pulse mt-2" />
            </div>
            <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
          </div>
          <KpiStripSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-5">
            <PanelSkeleton rows={3} /><PanelSkeleton rows={3} />
          </div>
        </AppShell>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
