"use client";

// Module-first TOC editor.
//
// Hierarchy: Course → Module → Lesson → Video.
//   - Module rows are collapsible. Click to reveal lessons.
//   - Lesson rows are collapsible. Click to reveal videos.
//   - Each level (course / module / lesson) has its own learning objectives.
//   - Manual add / edit / delete at every level.
//   - When objectives change, an "AI re-edit downstream" affordance appears
//     so the coach can ask the AI to refresh dependent artifacts.
//   - Each video row has an inline "Open brief" link so navigation matches
//     the same hierarchy as the rest of the product.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check, X, Loader2, MessageSquare, ChevronDown, ChevronRight,
  Plus, Trash2, Pencil, FileText, Wand2,
} from "lucide-react";

type LearningObjective = {
  id: string;
  text: string;
  bloom_level: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
};

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
  learning_objectives?: unknown;
};
type Video = {
  id: string;
  lesson_id: string;
  title: string;
  order: number;
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

const BLOOMS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;

function asObjectives(x: unknown): LearningObjective[] {
  if (!Array.isArray(x)) return [];
  return x.filter((o): o is LearningObjective =>
    !!o && typeof (o as LearningObjective).text === "string"
  );
}

export function TocTree({
  courseId,
  courseTitle,
  courseObjectives = [],
  modules,
  lessons,
  videos = [],
  comments,
  videoCountByModule,
}: {
  courseId: string;
  courseTitle?: string;
  courseObjectives?: unknown[];
  modules: Module[];
  lessons: Lesson[];
  videos?: Video[];
  comments: Comment[];
  videoCountByModule?: Record<string, number>;
}) {
  const [localModules, setLocalModules] = useState<Module[]>(modules);
  const [localLessons, setLocalLessons] = useState<Lesson[]>(lessons);
  const [localVideos, setLocalVideos]   = useState<Video[]>(videos);
  const [localCourseObj, setLocalCourseObj] = useState<LearningObjective[]>(asObjectives(courseObjectives));
  const [openModule, setOpenModule] = useState<string | null>(modules[0]?.id ?? null);
  const [openLesson, setOpenLesson] = useState<string | null>(null);

  const lessonsByModule = useMemo(() => {
    const m: Record<string, Lesson[]> = {};
    localLessons.forEach((l) => (m[l.module_id] = m[l.module_id] || []).push(l));
    return m;
  }, [localLessons]);

  const videosByLesson = useMemo(() => {
    const m: Record<string, Video[]> = {};
    localVideos.forEach((v) => (m[v.lesson_id] = m[v.lesson_id] || []).push(v));
    return m;
  }, [localVideos]);

  const commentsByTarget = useMemo(() => {
    const m: Record<string, Comment[]> = {};
    comments.forEach((c) => {
      const k = `${c.target_type}:${c.target_id}`;
      (m[k] = m[k] || []).push(c);
    });
    return m;
  }, [comments]);

  const unresolvedTotal = comments.filter((c) => !c.resolved).length;

  // ── Mutators ─────────────────────────────────────────────────────────────
  async function patch(table: "courses" | "modules" | "lessons" | "videos", id: string, fields: Record<string, unknown>) {
    await fetch(`/api/courses/${courseId}/update-item`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id, ...fields }),
    });
  }
  async function createRow(table: "modules" | "lessons" | "videos", body: Record<string, unknown>): Promise<string | null> {
    const res = await fetch(`/api/courses/${courseId}/update-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, ...body }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.id ?? null;
  }
  async function deleteRow(table: "modules" | "lessons" | "videos", itemId: string) {
    await fetch(`/api/courses/${courseId}/update-item?table=${table}&itemId=${itemId}`, { method: "DELETE" });
  }

  // Module CRUD
  const addModule = async () => {
    const id = await createRow("modules", {
      title: `Module ${localModules.length + 1}`,
      order: localModules.length,
      learning_objectives: [],
    });
    if (!id) return;
    const next: Module = { id, title: `Module ${localModules.length + 1}`, description: "", order: localModules.length, learning_objectives: [] };
    setLocalModules((prev) => [...prev, next]);
    setOpenModule(id);
  };
  const updateModule = (m: Module, patchFields: Partial<Module>) => {
    setLocalModules((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...patchFields } : x)));
    void patch("modules", m.id, patchFields as Record<string, unknown>);
  };
  const removeModule = async (m: Module) => {
    if (!confirm(`Delete module "${m.title}" and all its lessons/videos?`)) return;
    await deleteRow("modules", m.id);
    setLocalModules((prev) => prev.filter((x) => x.id !== m.id));
  };

  // Lesson CRUD
  const addLesson = async (moduleId: string) => {
    const siblings = lessonsByModule[moduleId] || [];
    const id = await createRow("lessons", {
      module_id: moduleId,
      title: `Lesson ${siblings.length + 1}`,
      order: siblings.length,
      learning_objectives: [],
      content_types: [],
    });
    if (!id) return;
    const next: Lesson = { id, module_id: moduleId, title: `Lesson ${siblings.length + 1}`, description: "", order: siblings.length, content_types: [], learning_objectives: [] };
    setLocalLessons((prev) => [...prev, next]);
    setOpenLesson(id);
  };
  const updateLesson = (l: Lesson, patchFields: Partial<Lesson>) => {
    setLocalLessons((prev) => prev.map((x) => (x.id === l.id ? { ...x, ...patchFields } : x)));
    void patch("lessons", l.id, patchFields as Record<string, unknown>);
  };
  const removeLesson = async (l: Lesson) => {
    if (!confirm(`Delete lesson "${l.title}"?`)) return;
    await deleteRow("lessons", l.id);
    setLocalLessons((prev) => prev.filter((x) => x.id !== l.id));
  };

  // Video CRUD
  const addVideo = async (lessonId: string) => {
    const siblings = videosByLesson[lessonId] || [];
    const id = await createRow("videos", {
      lesson_id: lessonId,
      title: `Video ${siblings.length + 1}`,
      order: siblings.length,
    });
    if (!id) return;
    const next: Video = { id, lesson_id: lessonId, title: `Video ${siblings.length + 1}`, order: siblings.length };
    setLocalVideos((prev) => [...prev, next]);
  };
  const updateVideo = (v: Video, patchFields: Partial<Video>) => {
    setLocalVideos((prev) => prev.map((x) => (x.id === v.id ? { ...x, ...patchFields } : x)));
    void patch("videos", v.id, patchFields as Record<string, unknown>);
  };
  const removeVideo = async (v: Video) => {
    if (!confirm(`Delete video "${v.title}"?`)) return;
    await deleteRow("videos", v.id);
    setLocalVideos((prev) => prev.filter((x) => x.id !== v.id));
  };

  // Course-level objectives
  const updateCourseObjectives = async (next: LearningObjective[]) => {
    setLocalCourseObj(next);
    await patch("courses", courseId, { learning_objectives: next });
  };

  // AI re-edit on objective change at any level
  const reEditDownstream = async (level: "course" | "module" | "lesson", id: string) => {
    await fetch("/api/ai/improve-toc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, level, targetId: id }),
    }).catch(() => {});
    location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Course-level header */}
      <section className="rounded-lg border border-bi-navy-200 bg-white">
        <header className="px-4 py-3 border-b border-bi-navy-100 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Course</div>
            <h2 className="font-semibold text-bi-navy-900 text-[15px] truncate">{courseTitle || "Untitled course"}</h2>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {unresolvedTotal > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">
                {unresolvedTotal} unresolved
              </span>
            )}
            <button
              className="px-3 py-1.5 rounded-md bg-bi-navy-700 text-white text-xs hover:bg-bi-navy-800 disabled:opacity-40"
              onClick={async () => {
                await fetch("/api/ai/improve-toc", { method: "POST", body: JSON.stringify({ courseId }) });
                location.reload();
              }}
              disabled={unresolvedTotal === 0}
              title={unresolvedTotal === 0 ? "Resolve at least one comment first" : "Send all unresolved comments to AI for rewrite"}
            >
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Apply All Feedback
            </button>
          </div>
        </header>

        <div className="px-4 py-3">
          <ObjectivesEditor
            level="Course"
            objectives={localCourseObj}
            onChange={updateCourseObjectives}
            onReEditDownstream={() => reEditDownstream("course", courseId)}
          />
        </div>
      </section>

      {/* Modules */}
      <section className="rounded-lg border border-bi-navy-200 bg-white">
        <div className="px-4 py-3 border-b border-bi-navy-100 flex items-center justify-between">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Modules</div>
            <p className="text-xs text-bi-navy-500 mt-0.5">Click a module to view lessons. Click a lesson to view videos.</p>
          </div>
          <button
            onClick={addModule}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-600 text-white text-xs font-semibold hover:bg-bi-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add module
          </button>
        </div>

        <ol className="divide-y divide-slate-100">
          {localModules.length === 0 && (
            <li className="px-6 py-10 text-center text-sm text-bi-navy-500">
              No modules yet — click <span className="font-semibold">Add module</span> to start.
            </li>
          )}
          {localModules.map((m, idx) => {
            const open = openModule === m.id;
            const ls = lessonsByModule[m.id] || [];
            const moduleComments = commentsByTarget[`module:${m.id}`] || [];
            const moduleObj = asObjectives(m.learning_objectives);
            const videoCount = videoCountByModule?.[m.id] ?? 0;

            return (
              <li key={m.id}>
                <ModuleRow
                  index={idx}
                  module={m}
                  lessonCount={ls.length}
                  videoCount={videoCount}
                  open={open}
                  unresolvedComments={moduleComments.filter((c) => !c.resolved).length}
                  onToggle={() => setOpenModule(open ? null : m.id)}
                  onTitleChange={(v) => updateModule(m, { title: v })}
                  onDescriptionChange={(v) => updateModule(m, { description: v })}
                  onDelete={() => removeModule(m)}
                />

                {open && (
                  <div className="bg-bi-navy-50/40 border-t border-bi-navy-100 px-5 py-4 space-y-4">
                    {/* Module objectives */}
                    <ObjectivesEditor
                      level="Module"
                      objectives={moduleObj}
                      onChange={(next) => updateModule(m, { learning_objectives: next as unknown[] as LearningObjective[] })}
                      onReEditDownstream={() => reEditDownstream("module", m.id)}
                    />

                    {/* Lessons */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Lessons</div>
                        <button
                          onClick={() => addLesson(m.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-bi-navy-200 bg-white text-[11px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
                        >
                          <Plus className="w-3 h-3" /> Add lesson
                        </button>
                      </div>
                      <ul className="space-y-2">
                        {ls.map((l) => {
                          const lOpen = openLesson === l.id;
                          const lComments = commentsByTarget[`lesson:${l.id}`] || [];
                          const lObj = asObjectives(l.learning_objectives);
                          const vids = videosByLesson[l.id] || [];
                          return (
                            <li key={l.id} className="rounded-md border border-bi-navy-200 bg-white">
                              <LessonRow
                                lesson={l}
                                videoCount={vids.length}
                                open={lOpen}
                                unresolvedComments={lComments.filter((c) => !c.resolved).length}
                                onToggle={() => setOpenLesson(lOpen ? null : l.id)}
                                onTitleChange={(v) => updateLesson(l, { title: v })}
                                onDescriptionChange={(v) => updateLesson(l, { description: v })}
                                onDelete={() => removeLesson(l)}
                              />
                              {lOpen && (
                                <div className="border-t border-bi-navy-100 px-4 py-3 space-y-3 bg-bi-navy-50/40">
                                  {/* Lesson objectives */}
                                  <ObjectivesEditor
                                    level="Lesson"
                                    objectives={lObj}
                                    onChange={(next) => updateLesson(l, { learning_objectives: next as unknown[] as LearningObjective[] })}
                                    onReEditDownstream={() => reEditDownstream("lesson", l.id)}
                                  />

                                  {/* Videos */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Videos</div>
                                      <button
                                        onClick={() => addVideo(l.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-bi-navy-200 bg-white text-[11px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
                                      >
                                        <Plus className="w-3 h-3" /> Add video
                                      </button>
                                    </div>
                                    {vids.length === 0 ? (
                                      <div className="text-[12px] text-bi-navy-500 italic">No videos in this lesson.</div>
                                    ) : (
                                      <ul className="divide-y divide-slate-100 rounded-md border border-bi-navy-100 bg-white">
                                        {vids.map((v, vi) => (
                                          <VideoRow
                                            key={v.id}
                                            video={v}
                                            index={vi}
                                            courseId={courseId}
                                            onTitleChange={(t) => updateVideo(v, { title: t })}
                                            onDelete={() => removeVideo(v)}
                                          />
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                        {ls.length === 0 && (
                          <li className="text-[12px] text-bi-navy-500 italic px-1 py-2">
                            No lessons yet — click <span className="font-semibold">Add lesson</span> to start.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

// ─── Row components ──────────────────────────────────────────────────────────

function ModuleRow({
  index, module: m, lessonCount, videoCount, open, unresolvedComments, onToggle, onTitleChange, onDescriptionChange, onDelete,
}: {
  index: number;
  module: Module;
  lessonCount: number;
  videoCount: number;
  open: boolean;
  unresolvedComments: number;
  onToggle: () => void;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 text-bi-navy-500 hover:text-bi-navy-900">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <span className="text-xs font-mono text-bi-navy-400 mt-1.5">{String(index + 1).padStart(2, "0")}</span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <InlineEdit
              value={m.title}
              description={m.description ?? ""}
              onSave={(t, d) => { onTitleChange(t); onDescriptionChange(d); setEditing(false); }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <button onClick={onToggle} className="w-full text-left">
              <div className="font-semibold text-bi-navy-900 truncate">{m.title}</div>
              {m.description && <div className="text-xs text-bi-navy-500 mt-0.5 truncate">{m.description}</div>}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-bi-navy-500 shrink-0">
          <span>{lessonCount} lessons</span>
          <span>·</span>
          <span>{videoCount} videos</span>
          {unresolvedComments > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{unresolvedComments}c</span>
          )}
          {!editing && (
            <>
              <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-bi-navy-100" title="Edit">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-red-600" title="Delete module">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonRow({
  lesson: l, videoCount, open, unresolvedComments, onToggle, onTitleChange, onDescriptionChange, onDelete,
}: {
  lesson: Lesson;
  videoCount: number;
  open: boolean;
  unresolvedComments: number;
  onToggle: () => void;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="px-3 py-2.5 flex items-start gap-3">
      <button onClick={onToggle} className="mt-0.5 text-bi-navy-500 hover:text-bi-navy-900">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      <div className="flex-1 min-w-0">
        {editing ? (
          <InlineEdit
            value={l.title}
            description={l.description ?? ""}
            onSave={(t, d) => { onTitleChange(t); onDescriptionChange(d); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <button onClick={onToggle} className="w-full text-left">
            <div className="font-medium text-bi-navy-900 text-[13.5px] truncate">{l.title}</div>
            {l.description && <div className="text-[11.5px] text-bi-navy-500 mt-0.5 truncate">{l.description}</div>}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[11.5px] text-bi-navy-500 shrink-0">
        <span>{videoCount} videos</span>
        {unresolvedComments > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{unresolvedComments}c</span>
        )}
        {!editing && (
          <>
            <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-bi-navy-100" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-red-600" title="Delete lesson">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function VideoRow({
  video: v, index, courseId, onTitleChange, onDelete,
}: {
  video: Video;
  index: number;
  courseId: string;
  onTitleChange: (v: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(v.title);
  return (
    <li className="px-3 py-2 flex items-center gap-3 hover:bg-bi-navy-50/60">
      <span className="text-[10px] font-mono font-bold text-bi-navy-400 w-6 tabular-nums">V{index + 1}</span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { if (draft.trim()) onTitleChange(draft.trim()); setEditing(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { if (draft.trim()) onTitleChange(draft.trim()); setEditing(false); }
              if (e.key === "Escape") { setDraft(v.title); setEditing(false); }
            }}
            className="w-full text-[12.5px] border border-bi-blue-300 rounded px-2 py-1"
          />
        ) : (
          <span className="text-[12.5px] text-bi-navy-800 truncate block">{v.title}</span>
        )}
      </div>
      <Link
        href={`/course/${courseId}/briefs?focus=${v.id}`}
        className="inline-flex items-center gap-1 text-[11px] text-bi-blue-700 hover:underline shrink-0"
      >
        <FileText className="w-3 h-3" /> Brief
      </Link>
      {!editing && (
        <>
          <button onClick={() => { setDraft(v.title); setEditing(true); }} className="p-1 rounded hover:bg-bi-navy-100" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-red-600" title="Delete video">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </li>
  );
}

// ─── Inline edit & objectives editor ─────────────────────────────────────────

function InlineEdit({
  value, description, onSave, onCancel,
}: {
  value: string;
  description: string;
  onSave: (title: string, description: string) => void;
  onCancel: () => void;
}) {
  const [t, setT] = useState(value);
  const [d, setD] = useState(description);
  return (
    <div className="space-y-1.5">
      <input
        autoFocus
        value={t}
        onChange={(e) => setT(e.target.value)}
        className="w-full text-[13.5px] font-semibold border border-bi-blue-300 rounded px-2 py-1"
        placeholder="Title"
      />
      <textarea
        value={d}
        rows={2}
        onChange={(e) => setD(e.target.value)}
        className="w-full text-[12px] border border-bi-blue-200 rounded px-2 py-1 resize-none"
        placeholder="Short description (optional)"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(t.trim() || value, d.trim())}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700"
        >
          <Check className="w-3 h-3" /> Save
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-bi-navy-200 text-[11px] text-bi-navy-700 hover:bg-bi-navy-50"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    </div>
  );
}

function ObjectivesEditor({
  level, objectives, onChange, onReEditDownstream,
}: {
  level: "Course" | "Module" | "Lesson";
  objectives: LearningObjective[];
  onChange: (next: LearningObjective[]) => void;
  onReEditDownstream: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [bloom, setBloom] = useState<LearningObjective["bloom_level"]>("understand");
  const [dirty, setDirty] = useState(false);
  const [reediting, setReediting] = useState(false);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    const next = [...objectives, { id: crypto.randomUUID(), text, bloom_level: bloom }];
    onChange(next);
    setDraft("");
    setDirty(true);
  };
  const update = (id: string, patch: Partial<LearningObjective>) => {
    onChange(objectives.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    setDirty(true);
  };
  const remove = (id: string) => {
    onChange(objectives.filter((o) => o.id !== id));
    setDirty(true);
  };

  const triggerAi = async () => {
    setReediting(true);
    try { await onReEditDownstream(); } finally { setReediting(false); setDirty(false); }
  };

  return (
    <div className="rounded-md border border-bi-navy-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">{level} learning objectives</div>
          <p className="text-[11px] text-bi-navy-500 mt-0.5">
            What learners should be able to do after this {level.toLowerCase()}. Bloom level shapes downstream content depth.
          </p>
        </div>
        {dirty && (
          <button
            onClick={triggerAi}
            disabled={reediting}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-600 text-white text-[11px] font-semibold hover:bg-purple-700 disabled:opacity-50"
            title="Regenerate dependent items with AI"
          >
            {reediting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            Re-edit downstream with AI
          </button>
        )}
      </div>

      <ul className="space-y-1.5">
        {objectives.map((o) => (
          <li key={o.id} className="flex items-center gap-2">
            <select
              value={o.bloom_level}
              onChange={(e) => update(o.id, { bloom_level: e.target.value as LearningObjective["bloom_level"] })}
              className="text-[11px] border border-bi-navy-200 rounded px-1.5 py-1 bg-white capitalize"
            >
              {BLOOMS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <input
              value={o.text}
              onChange={(e) => update(o.id, { text: e.target.value })}
              className="flex-1 text-[12.5px] border border-bi-navy-200 rounded px-2 py-1"
            />
            <button onClick={() => remove(o.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
        {objectives.length === 0 && (
          <li className="text-[12px] text-bi-navy-500 italic">No objectives yet — add at least one to anchor the AI.</li>
        )}
      </ul>

      <div className="mt-2 flex items-center gap-2">
        <select
          value={bloom}
          onChange={(e) => setBloom(e.target.value as LearningObjective["bloom_level"])}
          className="text-[11px] border border-bi-navy-200 rounded px-1.5 py-1 bg-white capitalize"
        >
          {BLOOMS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="e.g. Apply STP framework to a SaaS positioning brief"
          className="flex-1 text-[12.5px] border border-bi-navy-200 rounded px-2 py-1"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-bi-navy-700 text-white text-[11.5px] font-semibold hover:bg-bi-navy-800 disabled:opacity-40"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  );
}

