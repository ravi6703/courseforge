"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, BookOpen, Clock, Heart, Zap, Search, ChevronRight, MoreHorizontal,
  Copy, Archive, Trash2, ChevronDown,
} from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { KpiCard } from "@/components/ui/KpiCard";
import { Tag } from "@/components/ui/Tag";
import { HealthPill } from "@/components/ui/HealthPill";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { HealthScoreInfo } from "@/components/HealthScoreInfo";
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_production" | "review" | "draft" | "published">("in_production");

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
      <div className="min-h-screen grid place-items-center bg-bi-navy-50">
        <div className="w-8 h-8 border-4 border-bi-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
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

  const matchesStatus = (c: Course) => {
    switch (statusFilter) {
      case "all":           return true;
      case "in_production": return !["draft","published"].includes(c.status);
      case "review":        return c.status.includes("review");
      case "draft":         return c.status === "draft";
      case "published":     return c.status === "published";
    }
  };
  const filtered = courses.filter((c) =>
    (!search || c.title.toLowerCase().includes(search.toLowerCase())) && matchesStatus(c)
  );

  const removeCourseLocally = (id: string) =>
    setCourses((prev) => prev.filter((c) => c.id !== id));
  const addCourseLocally = (c: Course) => setCourses((prev) => [c, ...prev]);

  return (
    <AppShell title="Dashboard" rightSlot={null}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold text-bi-navy-900 tracking-tight">{greet}, {user.name.split(" ")[0]}</h1>
          <p className="text-[13.5px] text-bi-navy-500 mt-0.5">Here&apos;s what needs your attention</p>
        </div>
        {user.role === "pm" && (
          <Link href="/create" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[13px] font-semibold hover:bg-bi-blue-200 hover:text-bi-blue-800 transition-colors">
            <Plus className="w-4 h-4" /> New course
          </Link>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <KpiCard label="Courses in production" value={inProduction.length} icon={BookOpen} tone="blue" />
        <KpiCard label="Awaiting your review"  value={queue.length} icon={Clock} tone="amber" />
        <div className="relative">
          <KpiCard label="Health score · avg"    value={courses.length ? Math.round(courses.reduce((s,c) => s + pseudoHealth(c), 0) / courses.length) : 0} icon={Heart} tone="emerald" delta={courses.length ? "B grade" : ""} />
          <span className="absolute top-2.5 right-2.5"><HealthScoreInfo compact /></span>
        </div>
        <KpiCard label="Published"             value={published.length} icon={Zap} tone="violet" />
      </div>

      {/* Recent + Queue side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-5">
        <RecentCourses courses={inProduction.slice(0,3)} />
        <YourQueue courses={queue} />
      </div>

      {/* All courses */}
      <div className="bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-bi-navy-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[15px] font-bold text-bi-navy-900 tracking-tight">All courses</h2>
            <div className="text-[12px] text-bi-navy-500 mt-0.5">{courses.length} total · {inProduction.length} in production · {published.length} published</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 border border-bi-navy-100 bg-white rounded-lg px-3 py-1.5 w-72">
              <Search className="w-3.5 h-3.5 text-bi-navy-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses…"
                className="flex-1 bg-transparent outline-none text-[13px] text-bi-navy-900 placeholder:text-bi-navy-400"
              />
            </div>
            <StatusFilter value={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>
        <div className="p-5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-bi-navy-500">
              {search ? `No courses match "${search}".` : "No courses yet — click \"New course\" to get started."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filtered.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  onDeleted={removeCourseLocally}
                  onDuplicated={addCourseLocally}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function CourseCard({
  course, onDeleted, onDuplicated,
}: {
  course: Course;
  onDeleted: (id: string) => void;
  onDuplicated: (c: Course) => void;
}) {
  const pct = STATUS_PCT[course.status] ?? 0;
  const phase = STATUS_LABEL[course.status] ?? "Draft";
  const health = pseudoHealth(course);
  return (
    <div className="relative bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm hover:shadow-bi-md hover:border-bi-navy-200 hover:-translate-y-px transition-all">
      <span className="absolute top-3.5 right-10 z-10"><HealthPill score={health} /></span>
      <span className="absolute top-2.5 right-2.5 z-10">
        <CourseCardMenu course={course} onDeleted={onDeleted} onDuplicated={onDuplicated} />
      </span>
      <Link href={`/course/${course.id}/toc`} className="block p-4">
        <h3 className="font-bold text-[15px] text-bi-navy-900 tracking-tight leading-snug pr-24 line-clamp-2">{course.title}</h3>
        <p className="text-[12.5px] text-bi-navy-500 mt-1.5 leading-relaxed line-clamp-2">{course.description || "No description yet."}</p>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <Tag tone="blue">{course.platform || "internal"}</Tag>
          {course.domain && <Tag tone="violet">{course.domain}</Tag>}
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-bi-navy-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-bi-blue-600 to-bi-accent-600" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-bi-navy-100">
          <AvatarStack avatars={[{ name: "Ravi Bohra" }]} />
          <span className="text-[11px] font-bold text-bi-navy-700">{pct}% · {phase}</span>
        </div>
      </Link>
    </div>
  );
}

function CourseCardMenu({
  course, onDeleted, onDuplicated,
}: {
  course: Course;
  onDeleted: (id: string) => void;
  onDuplicated: (c: Course) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const duplicate = async () => {
    setBusy("dup");
    try {
      const newCourse = {
        ...course,
        id: crypto.randomUUID(),
        title: `${course.title} (copy)`,
        status: "draft",
      };
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCourse),
      });
      if (res.ok) onDuplicated(newCourse as unknown as Course);
    } finally { setBusy(null); setOpen(false); }
  };

  const archive = async () => {
    setBusy("arc");
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      if (res.ok) onDeleted(course.id);
    } finally { setBusy(null); setOpen(false); }
  };

  const remove = async () => {
    if (!confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    setBusy("del");
    try {
      const res = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
      if (res.ok || res.status === 404) onDeleted(course.id);
    } finally { setBusy(null); setOpen(false); }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        className="p-1.5 rounded-md text-bi-navy-500 hover:bg-bi-navy-100 hover:text-bi-navy-900"
        aria-label="More actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <ul
          onClick={(e) => e.preventDefault()}
          className="absolute right-0 top-full mt-1 z-20 min-w-[180px] bg-white border border-bi-navy-200 rounded-md shadow-lg py-1"
        >
          <MenuItem icon={Copy}    label={busy === "dup" ? "Duplicating…" : "Duplicate"}        onClick={duplicate} />
          <MenuItem icon={Archive} label={busy === "arc" ? "Archiving…"  : "Archive"}           onClick={archive} />
          <MenuItem icon={Trash2}  label={busy === "del" ? "Deleting…"   : "Delete"} danger onClick={remove} />
        </ul>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon, label, onClick, danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <li>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
        className={`w-full text-left px-3 py-1.5 text-[12.5px] flex items-center gap-2 ${danger ? "text-red-700 hover:bg-red-50" : "text-bi-navy-700 hover:bg-bi-navy-50"}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
      </button>
    </li>
  );
}

function StatusFilter({
  value, onChange,
}: {
  value: "all" | "in_production" | "review" | "draft" | "published";
  onChange: (v: "all" | "in_production" | "review" | "draft" | "published") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const labels: Record<typeof value, string> = {
    all: "All",
    in_production: "In production",
    review: "Awaiting review",
    draft: "Drafts",
    published: "Published",
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bi-navy-200 bg-white text-[12.5px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
      >
        Status: {labels[value]}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <ul className="absolute right-0 top-full mt-1 z-20 min-w-[180px] bg-white border border-bi-navy-200 rounded-md shadow-lg py-1">
          {(Object.keys(labels) as Array<typeof value>).map((k) => (
            <li key={k}>
              <button
                onClick={() => { onChange(k); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bi-navy-50 ${k === value ? "font-bold text-bi-navy-900" : "text-bi-navy-700"}`}
              >
                {labels[k]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentCourses({ courses }: { courses: Course[] }) {
  return (
    <div className="bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-bi-navy-100 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-bi-navy-900 tracking-tight">Recent courses</h2>
          <div className="text-[12px] text-bi-navy-500 mt-0.5">In production</div>
        </div>
        <Link href="/dashboard" className="text-[12px] font-semibold text-bi-navy-500 hover:text-bi-navy-900">View all →</Link>
      </div>
      <div className="px-5 py-2">
        {courses.length === 0 && <div className="py-8 text-center text-[13px] text-bi-navy-500">Nothing in production right now.</div>}
        {courses.map((c) => (
          <Link key={c.id} href={`/course/${c.id}/toc`}
                className="flex items-center justify-between py-2.5 border-b border-bi-navy-50 last:border-0 hover:bg-bi-navy-50 -mx-2 px-2 rounded-md">
            <div className="min-w-0">
              <div className="font-semibold text-[13.5px] text-bi-navy-900 truncate">{c.title}</div>
              <div className="text-[11.5px] mt-0.5"><Tag tone="blue">{c.platform || "internal"}</Tag></div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <div className="font-bold text-[13px] text-bi-navy-900">{STATUS_PCT[c.status] ?? 0}%</div>
              <div className="text-[11px] text-bi-navy-500">{STATUS_LABEL[c.status] ?? "Draft"}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function YourQueue({ courses }: { courses: Course[] }) {
  return (
    <div className="bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-bi-navy-100">
        <h2 className="text-[15px] font-bold text-bi-navy-900 tracking-tight">Your queue</h2>
        <div className="text-[12px] text-bi-navy-500 mt-0.5">
          {courses.length === 0 ? "Nothing waiting on you" : `${courses.length} item${courses.length > 1 ? "s" : ""} waiting on you`}
        </div>
      </div>
      <div className="px-5 py-2">
        {courses.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-bi-navy-500">Inbox zero ✨</div>
        ) : courses.map((c) => (
          <Link key={c.id} href={`/course/${c.id}/review`}
                className="flex items-center gap-3 py-2.5 border-b border-bi-navy-50 last:border-0 hover:bg-bi-navy-50 -mx-2 px-2 rounded-md">
            <Tag tone="amber">{STATUS_LABEL[c.status] ?? "Review"}</Tag>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] text-bi-navy-900 truncate">{c.title}</div>
              <div className="text-[11px] text-bi-navy-500 mt-0.5">{c.platform || "internal"}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-bi-navy-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}
