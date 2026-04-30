// src/app/course/[id]/transcript/page.tsx — transcript view + word-count audit.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function TranscriptTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: transcripts } = await supabase
    .from("transcripts")
    .select("id, video_id, language, confidence, word_count, status, text_content, videos!inner(title)")
    .eq("course_id", id);

  const totalWords = (transcripts || []).reduce((s, t) => s + (t.word_count || 0), 0);
  const ready = (transcripts || []).filter((t) => t.status === "ready" || t.status === "approved").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Transcripts" value={String((transcripts || []).length)} />
        <Stat label="Ready / Approved" value={String(ready)} />
        <Stat label="Words across course" value={totalWords.toLocaleString()} />
      </div>
      <div className="space-y-3">
        {(transcripts || []).map((t) => {
          const v = (t as { videos?: { title?: string } }).videos;
          return (
            <details
              key={t.id}
              className="rounded-lg border border-slate-200 bg-white"
            >
              <summary className="cursor-pointer px-4 py-3 text-sm flex items-center justify-between">
                <span className="font-medium">{v?.title ?? "(untitled video)"}</span>
                <span className="text-xs text-slate-500">
                  {t.language ?? "en"} · {t.word_count ?? 0} words ·{" "}
                  {Math.round((t.confidence ?? 0) * 100)}% conf · {t.status}
                </span>
              </summary>
              <pre className="px-4 py-3 text-xs whitespace-pre-wrap font-mono text-slate-700 bg-slate-50 border-t border-slate-200">
                {t.text_content || "(empty)"}
              </pre>
            </details>
          );
        })}
        {(transcripts || []).length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No transcripts yet. Record videos to generate transcripts.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}
