// Final TOC — read-only ordered tree as the learner will see it.
//
// Per coach feedback: after the videos in each lesson, list every
// non-video artifact (Reading, Practice quiz, Assessment, Worked
// example, Discussion, SCORM, AI Coach) — in canonical order. The
// editor TocTree above stays focused on outcomes; this surface is the
// deliverable preview.

import Link from "next/link";
import { CONTENT_KINDS, KIND_META } from "../content/types";
import { Video as VideoIcon, CheckCircle2, Circle, FileQuestion } from "lucide-react";

interface ModuleRow  { id: string; title: string; order: number }
interface LessonRow  { id: string; module_id: string; title: string; order: number }
interface VideoRow   { id: string; lesson_id: string; title: string; order: number }
interface ItemRow    { id: string; lesson_id: string; kind: string; status: string }

export function FinalToc({
  courseId, modules, lessons, videos, items,
}: {
  courseId: string;
  modules: ModuleRow[];
  lessons: LessonRow[];
  videos: VideoRow[];
  items: ItemRow[];
}) {
  if (!modules.length) return null;
  const lessonsByModule  = new Map<string, LessonRow[]>();
  const videosByLesson   = new Map<string, VideoRow[]>();
  const itemsByLesson    = new Map<string, ItemRow[]>();
  lessons.forEach((l) => { (lessonsByModule.get(l.module_id) ?? lessonsByModule.set(l.module_id, []).get(l.module_id)!).push(l); });
  videos.forEach((v)  => { (videosByLesson.get(v.lesson_id) ?? videosByLesson.set(v.lesson_id, []).get(v.lesson_id)!).push(v); });
  items.forEach((i)   => { (itemsByLesson.get(i.lesson_id) ?? itemsByLesson.set(i.lesson_id, []).get(i.lesson_id)!).push(i); });
  modules.sort((a, b) => a.order - b.order);
  for (const arr of lessonsByModule.values()) arr.sort((a, b) => a.order - b.order);
  for (const arr of videosByLesson.values())  arr.sort((a, b) => a.order - b.order);

  return (
    <section className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden">
      <header className="px-5 py-3 border-b border-bi-navy-100 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-bi-navy-900">Final table of contents</h3>
          <p className="text-[11.5px] text-bi-navy-500 mt-0.5">
            What the learner sees, in order. Videos first, then lesson artifacts (Reading → Practice quiz → Assessment → Worked example → Discussion → SCORM → AI Coach).
          </p>
        </div>
      </header>

      <ol className="divide-y divide-bi-navy-100">
        {modules.map((m, mi) => (
          <li key={m.id}>
            <header className="px-5 py-2.5 bg-bi-navy-50/40 border-b border-bi-navy-100">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-bi-navy-500">Module {mi + 1}</div>
              <div className="text-[14px] font-semibold text-bi-navy-900">{m.title}</div>
            </header>
            <ol className="divide-y divide-bi-navy-50">
              {(lessonsByModule.get(m.id) ?? []).map((l, li) => {
                const lvids = videosByLesson.get(l.id) ?? [];
                const litems = itemsByLesson.get(l.id) ?? [];
                return (
                  <li key={l.id} className="px-5 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-bi-navy-500">Lesson {li + 1}</div>
                    <div className="text-[13px] font-medium text-bi-navy-900">{l.title}</div>

                    {(lvids.length > 0 || litems.length > 0) ? (
                      <ul className="mt-2 space-y-0.5">
                        {/* Videos first */}
                        {lvids.map((v, vi) => (
                          <li key={v.id} className="flex items-center gap-2 text-[12.5px] text-bi-navy-700 px-2 py-1 rounded hover:bg-bi-navy-50">
                            <VideoIcon className="w-3 h-3 text-bi-navy-400 shrink-0" />
                            <span className="font-mono text-[10px] text-bi-navy-400 tabular-nums w-7">V{vi + 1}</span>
                            <span className="flex-1 truncate">{v.title}</span>
                            <span className="text-[10px] text-bi-navy-400 shrink-0">video</span>
                          </li>
                        ))}
                        {/* Then lesson-level artifacts in canonical order */}
                        {CONTENT_KINDS.map((k) => {
                          const it = litems.find((x) => x.kind === k);
                          if (!it) return null;
                          const meta = KIND_META[k];
                          return (
                            <li key={k}>
                              <Link
                                href={`/course/${courseId}/content/lesson/${l.id}/${k}`}
                                className="flex items-center gap-2 text-[12.5px] text-bi-navy-700 px-2 py-1 rounded hover:bg-bi-navy-50"
                              >
                                <span className={`text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded shrink-0 ${meta.tone}`}>{meta.icon}</span>
                                <span className="flex-1 truncate">{meta.label}</span>
                                <StatusGlyph status={it.status} />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="mt-1.5 text-[11.5px] text-bi-navy-400 italic flex items-center gap-1.5">
                        <FileQuestion className="w-3 h-3" /> No videos or artifacts yet.
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StatusGlyph({ status }: { status: string }) {
  if (status === "approved") return <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700"><CheckCircle2 className="w-3 h-3" /> approved</span>;
  if (status === "draft")    return <span className="inline-flex items-center gap-1 text-[10px] text-bi-blue-700"><Circle className="w-3 h-3" /> draft</span>;
  return                            <span className="inline-flex items-center gap-1 text-[10px] text-bi-navy-400">missing</span>;
}
