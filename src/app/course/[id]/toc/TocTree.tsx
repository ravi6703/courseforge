"use client";

// src/app/course/[id]/toc/TocTree.tsx — client tree with inline comments.
//
// Kept deliberately small: this is the *example* of what each tab component
// should look like after the refactor. Briefs / PPTs / Recording / etc. follow
// the same shape: server component for initial fetch, client component for
// interactions, generic comments table for threads.

import { useMemo, useState } from "react";

type Module = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  learning_objectives?: unknown;
};
type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description?: string | null;
  order: number;
  content_types?: string[];
};
type Comment = {
  id: string;
  target_type: string;
  target_id: string;
  text: string;
  author_name?: string | null;
  author_role?: string | null;
  resolved: boolean;
  is_ai_flag: boolean;
  created_at: string;
};

export function TocTree({
  courseId,
  modules,
  lessons,
  comments,
}: {
  courseId: string;
  modules: Module[];
  lessons: Lesson[];
  comments: Comment[];
}) {
  const lessonsByModule = useMemo(() => {
    const m: Record<string, Lesson[]> = {};
    lessons.forEach((l) => (m[l.module_id] = m[l.module_id] || []).push(l));
    return m;
  }, [lessons]);

  const commentsByTarget = useMemo(() => {
    const m: Record<string, Comment[]> = {};
    comments.forEach((c) => {
      const k = `${c.target_type}:${c.target_id}`;
      (m[k] = m[k] || []).push(c);
    });
    return m;
  }, [comments]);

  const [openModule, setOpenModule] = useState<string | null>(modules[0]?.id ?? null);

  const unresolvedTotal = comments.filter((c) => !c.resolved).length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Table of Contents</h2>
        <div className="flex items-center gap-2 text-sm">
          {unresolvedTotal > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">
              {unresolvedTotal} unresolved
            </span>
          )}
          <button
            className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs hover:bg-slate-800"
            onClick={async () => {
              await fetch("/api/ai/improve-toc", {
                method: "POST",
                body: JSON.stringify({ courseId }),
              });
              location.reload();
            }}
            disabled={unresolvedTotal === 0}
            title={
              unresolvedTotal === 0
                ? "Resolve at least one comment first"
                : "Send all unresolved comments to AI for rewrite"
            }
          >
            Send for AI Improvement
          </button>
        </div>
      </div>

      <ol className="divide-y divide-slate-100">
        {modules.map((m, idx) => {
          const open = openModule === m.id;
          const ls = lessonsByModule[m.id] || [];
          const moduleComments = commentsByTarget[`module:${m.id}`] || [];
          return (
            <li key={m.id}>
              <button
                onClick={() => setOpenModule(open ? null : m.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-slate-400">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium text-slate-900 truncate">
                    {m.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{ls.length} lessons</span>
                  {moduleComments.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      {moduleComments.filter((c) => !c.resolved).length} comments
                    </span>
                  )}
                  <span>{open ? "▾" : "▸"}</span>
                </div>
              </button>
              {open && (
                <ul className="bg-slate-50/50 border-t border-slate-100">
                  {ls.map((l) => {
                    const lc = commentsByTarget[`lesson:${l.id}`] || [];
                    return (
                      <li
                        key={l.id}
                        className="px-6 py-2.5 text-sm border-b border-slate-100 last:border-b-0 flex justify-between"
                      >
                        <span className="text-slate-800">{l.title}</span>
                        <span className="text-xs text-slate-500">
                          {(l.content_types || []).join(" · ") || "—"}
                          {lc.length > 0 && (
                            <span className="ml-2 text-amber-700">
                              {lc.filter((c) => !c.resolved).length}c
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
