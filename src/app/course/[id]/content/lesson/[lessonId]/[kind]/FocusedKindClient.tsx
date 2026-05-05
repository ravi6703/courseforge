"use client";

// Focused single-kind editor. Locks the kind from the URL — coach can't
// accidentally tab away. Reuses the same preview + AI Edit + Suggestions
// + ApprovalBar building blocks.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { KIND_META, type ContentKindKey } from "../../../types";
import { AiEditPanel } from "../../../AiEditPanel";
import { SuggestionsRail } from "../../../SuggestionsRail";
import { ApprovalBar } from "../../../ApprovalBar";
import { PreviewReading } from "../../../previews/PreviewReading";
import { PreviewPQ } from "../../../previews/PreviewPQ";
import { PreviewGQ } from "../../../previews/PreviewGQ";
import { PreviewSCORM } from "../../../previews/PreviewSCORM";
import { PreviewAICoach } from "../../../previews/PreviewAICoach";
import { PreviewDiscussion } from "../../../previews/PreviewDiscussion";
import { PreviewWorkedExample } from "../../../previews/PreviewWorkedExample";

interface LessonItem {
  id: string;
  kind: string;
  status: string;
  payload: Record<string, unknown>;
  generated_at: string | null;
  approved_at: string | null;
  generation_error: string | null;
}

export function FocusedKindClient({
  lessonId, lessonTitle, items, kind,
}: {
  lessonId: string;
  lessonTitle: string;
  items: LessonItem[];
  kind: ContentKindKey;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  void lessonTitle;
  const item = items.find((i) => i.kind === kind) ?? null;

  const generate = async () => {
    const res = await fetch("/api/content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_id: lessonId, kind }),
    });
    if (res.ok) startTransition(() => router.refresh());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
      <div className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden">
        <div className="p-5 min-h-[400px]">
          <Preview kind={kind} payload={item?.payload ?? null} />
          {!item && (
            <div className="mt-6 text-center">
              <button
                onClick={generate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[12.5px] font-semibold hover:bg-bi-blue-200"
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate {KIND_META[kind].label.toLowerCase()}
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
          kind={kind}
        />
        {item?.generation_error && (
          <div className="mx-5 mb-4 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5">
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
          kind={kind}
          onApplied={() => startTransition(() => router.refresh())}
        />
      </aside>
    </div>
  );
}

function Preview({ kind, payload }: { kind: ContentKindKey; payload: Record<string, unknown> | null }) {
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
