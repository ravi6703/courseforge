"use client";

// Per-lesson workspace. Tabs across the 7 artifact kinds, with the
// preview + AI Edit + Suggestions panels for whichever is active.
//
// Reuses the existing previews and AiEditPanel / SuggestionsRail by
// passing in a synthetic ContentVideoRow shape (the components don't
// actually need video_id, just an item with id + kind + payload).

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { CONTENT_KINDS, KIND_META, type ContentKindKey } from "../../types";
import { AiEditPanel } from "../../AiEditPanel";
import { SuggestionsRail } from "../../SuggestionsRail";
import { ApprovalBar } from "../../ApprovalBar";
import { PreviewReading } from "../../previews/PreviewReading";
import { PreviewPQ } from "../../previews/PreviewPQ";
import { PreviewGQ } from "../../previews/PreviewGQ";
import { PreviewSCORM } from "../../previews/PreviewSCORM";
import { PreviewAICoach } from "../../previews/PreviewAICoach";
import { PreviewDiscussion } from "../../previews/PreviewDiscussion";
import { PreviewWorkedExample } from "../../previews/PreviewWorkedExample";

interface LessonItem {
  id: string;
  kind: string;
  status: string;
  payload: Record<string, unknown>;
  generated_at: string | null;
  approved_at: string | null;
  generation_error: string | null;
}

export function LessonWorkspaceClient({
  courseId, lessonId, lessonTitle, moduleTitle, items,
}: {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  items: LessonItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  void courseId; void moduleTitle;

  const activeKindRaw = sp.get("k") as ContentKindKey | null;
  const activeKind: ContentKindKey =
    activeKindRaw && (CONTENT_KINDS as readonly string[]).includes(activeKindRaw)
      ? (activeKindRaw as ContentKindKey)
      : "reading";
  const item = items.find((i) => i.kind === activeKind) ?? null;

  const setKind = (k: ContentKindKey) => {
    const next = new URLSearchParams(sp.toString());
    next.set("k", k);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const generate = async () => {
    const res = await fetch("/api/content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_id: lessonId, kind: activeKind }),
    });
    if (res.ok) startTransition(() => router.refresh());
  };

  return (
    <section className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-[200px_1fr] min-h-[640px]">
      {/* Vertical artifact rail */}
      <aside className="border-r border-bi-navy-100 bg-bi-navy-50/40 py-3">
        <div className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-bi-navy-500 truncate" title={lessonTitle}>
          Lesson · {lessonTitle}
        </div>
        <ul>
          {CONTENT_KINDS.map((kind) => {
            const it = items.find((i) => i.kind === kind);
            const isSel = activeKind === kind;
            const meta = KIND_META[kind];
            const status = it ? it.status : "missing";
            const pillCls = status === "approved" ? "bg-emerald-100 text-emerald-700"
                          : status === "draft"    ? "bg-amber-100 text-amber-700"
                                                    : "bg-bi-navy-100 text-bi-navy-500";
            const pillTxt = status === "approved" ? "OK" : status === "draft" ? "Draft" : "—";
            return (
              <li key={kind}>
                <button
                  onClick={() => setKind(kind)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] border-l-[3px] ${
                    isSel
                      ? "bg-white border-l-bi-navy-700 text-bi-navy-900 font-bold"
                      : "border-l-transparent text-bi-navy-700 hover:bg-white"
                  }`}
                >
                  <span className={`shrink-0 text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded ${meta.tone}`}>
                    {meta.icon}
                  </span>
                  <span className="flex-1 text-left truncate">{meta.label}</span>
                  <span className={`shrink-0 font-mono text-[10px] font-bold px-1.5 py-px rounded-full ${pillCls}`}>{pillTxt}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Workspace body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-bi-navy-900 inline-flex items-center gap-2">
              <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded ${KIND_META[activeKind].tone}`}>{KIND_META[activeKind].icon}</span>
              {KIND_META[activeKind].label}
            </h2>
            <p className="text-[12px] text-bi-navy-500 mt-1">{KIND_META[activeKind].sub}</p>
          </div>
          <Link
            href={`/course/${courseId}/content/lesson/${lessonId}/${activeKind}`}
            className="text-[12px] text-bi-blue-700 hover:underline shrink-0"
          >
            Open in focused editor →
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden">
            <div className="p-4 min-h-[300px]">
              <Preview kind={activeKind} payload={item?.payload ?? null} />
              {!item && (
                <div className="mt-4 text-center">
                  <button
                    onClick={generate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[12.5px] font-semibold hover:bg-bi-blue-200"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Generate {KIND_META[activeKind].label.toLowerCase()}
                  </button>
                </div>
              )}
            </div>
            <ApprovalBar
              itemId={item?.id ?? null}
              status={item ? item.status : "missing"}
              approvedAt={item?.approved_at ?? null}
              generatedAt={item?.generated_at ?? null}
              videoId=""
              kind={activeKind}
            />
            {item?.generation_error && (
              <div className="mx-4 mb-4 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5">
                Last generation error: {item.generation_error}
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <AiEditPanel
              contentItemId={item?.id ?? null}
              onApplied={() => startTransition(() => router.refresh())}
            />
            <SuggestionsRail
              contentItemId={item?.id ?? null}
              kind={activeKind}
              onApplied={() => startTransition(() => router.refresh())}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}

function Preview({ kind, payload }: { kind: ContentKindKey; payload: Record<string, unknown> | null }) {
  // Each preview component renders its own empty state when payload
  // is null, so we delegate without a wrapper here.
  switch (kind) {
    case "reading":        return <PreviewReading       payload={payload} />;
    case "pq":             return <PreviewPQ            payload={payload} />;
    case "gq":             return <PreviewGQ            payload={payload} />;
    case "scorm":          return <PreviewSCORM         payload={payload} />;
    case "ai_coach":       return <PreviewAICoach       payload={payload} />;
    case "discussion":     return <PreviewDiscussion    payload={payload} />;
    case "worked_example": return <PreviewWorkedExample payload={payload} />;
  }
}
