"use client";

// Reading preview — list of curated further-reading links + an inline
// "Open editor" toggle that swaps in the markdown editor (RTE) so coaches
// can author/edit reading material right here, then export with the
// company logo embedded.

import { useState } from "react";
import { Pencil, Eye } from "lucide-react";
import { ReadingEditor } from "../ReadingEditor";

interface ReadingItem {
  title: string;
  summary: string;
  url: string;
  why_it_matters: string;
  reading_time_min: number;
}

export function PreviewReading({ payload }: { payload: Record<string, unknown> | null }) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const items = (payload?.items as ReadingItem[] | undefined) ?? [];
  const seedMd = (payload?.markdown as string | undefined)
    ?? itemsAsMarkdown(items);

  if (mode === "edit") {
    return (
      <div className="space-y-2">
        <div className="flex justify-end">
          <button
            onClick={() => setMode("view")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-bi-navy-200 text-[11.5px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
          >
            <Eye className="w-3 h-3" /> Switch to preview
          </button>
        </div>
        <ReadingEditor initialMarkdown={seedMd} />
      </div>
    );
  }

  if (items.length === 0 && !seedMd) {
    return (
      <div className="space-y-2">
        <Empty />
        <div className="flex justify-center">
          <button
            onClick={() => setMode("edit")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[12px] font-semibold hover:bg-bi-blue-200"
          >
            <Pencil className="w-3 h-3" /> Open editor
          </button>
        </div>
      </div>
    );
  }

  const totalRead = items.reduce((s, i) => s + (i.reading_time_min ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-bold text-bi-navy-700">
          {items.length > 0 ? `Reading list · ${items.length} items` : "Reading material"}
        </h3>
        <div className="flex items-center gap-2">
          {items.length > 0 && <span className="text-xs text-bi-navy-500">~{totalRead} min total</span>}
          <button
            onClick={() => setMode("edit")}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-bi-navy-200 text-[11px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-lg border border-bi-navy-100 p-3 hover:border-bi-blue-300 transition-colors">
            <div className="flex items-baseline justify-between gap-3">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-bi-blue-600 hover:underline truncate"
              >
                {item.title}
              </a>
              <span className="text-xs text-bi-navy-500 shrink-0">{item.reading_time_min} min</span>
            </div>
            <p className="mt-1 text-sm text-bi-navy-700">{item.summary}</p>
            <p className="mt-1.5 text-xs text-bi-navy-600 italic">
              <span className="font-semibold not-italic">Why it matters: </span>
              {item.why_it_matters}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function itemsAsMarkdown(items: ReadingItem[]): string {
  if (!items.length) return "";
  return items
    .map((i) => `## ${i.title}\n\n${i.summary}\n\n**Why it matters:** ${i.why_it_matters}\n\n[Read more](${i.url}) · ~${i.reading_time_min} min\n`)
    .join("\n");
}

function Empty() {
  return (
    <div className="text-center py-12 text-sm text-bi-navy-500">
      No reading material yet.
    </div>
  );
}
