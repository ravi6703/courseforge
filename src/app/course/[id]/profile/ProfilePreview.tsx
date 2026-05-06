"use client";

// Live "AI sees this" preview panel. As the coach edits the profile,
// we POST to /api/courses/[id]/profile-preview which returns short
// rendered samples (brief intro + slide bullet) shaped by the current
// profile fields. Debounced so typing doesn't spam the endpoint.

import { useEffect, useState } from "react";
import { Sparkles, Loader2, FileText, Presentation } from "lucide-react";
import type { CourseProfile } from "@/types/course-profile";

interface PreviewData {
  fragment: string;
  samples: { briefIntro: string; slideBullet: string };
  summary: { tone: string; pedagogy: string; handsOnPct: number; mustInclude: string; banned: string };
}

export function ProfilePreview({ courseId, profile }: { courseId: string; profile: CourseProfile }) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/courses/${courseId}/profile-preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
          signal: controller.signal,
        });
        if (r.ok) setData(await r.json());
      } catch {} finally {
        setLoading(false);
      }
    }, 350);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [courseId, profile]);

  return (
    <aside className="self-start bg-white border border-slate-200 rounded-[10px] overflow-hidden">
      <header className="px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-bi-blue-600" />
        <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">AI sees this</div>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-slate-400 ml-auto" />}
      </header>
      <div className="p-4 space-y-4">
        <SamplePane
          icon={FileText}
          label="Sample brief intro"
          body={data?.samples.briefIntro ?? "…"}
        />
        <SamplePane
          icon={Presentation}
          label="Sample slide bullet"
          body={data?.samples.slideBullet ?? "…"}
        />
        <details>
          <summary className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500 cursor-pointer hover:text-slate-700">
            Raw prompt fragment
          </summary>
          <pre className="text-[10.5px] text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-3 mt-2 whitespace-pre-wrap font-mono leading-relaxed max-h-[40vh] overflow-auto">
{data?.fragment ?? ""}
          </pre>
        </details>
      </div>
    </aside>
  );
}

function SamplePane({ icon: Icon, label, body }: { icon: React.ComponentType<{ className?: string }>; label: string; body: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3 text-slate-500" />
        <span className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">{label}</span>
      </div>
      <p className="text-[12.5px] text-slate-800 leading-relaxed bg-bi-blue-50/40 border border-bi-blue-100 rounded-md px-3 py-2.5">
        {body}
      </p>
    </div>
  );
}
