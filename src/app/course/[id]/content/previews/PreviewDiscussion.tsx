// Discussion artifact preview.
//
// Schema: { prompt, scaffolds: string[], rubric_text, target_minutes }
// Coach asks an open question; learners reply asynchronously.

interface DiscussionPayload {
  prompt?: string;
  scaffolds?: string[];
  rubric_text?: string;
  target_minutes?: number;
}

export function PreviewDiscussion({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload) return <Empty />;
  const p = payload as DiscussionPayload;
  if (!p.prompt) return <Empty />;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-bi-navy-100 bg-bi-navy-50/50 p-4">
        <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-bi-navy-500 mb-1">Prompt</div>
        <p className="text-[14px] text-bi-navy-900 leading-relaxed">{p.prompt}</p>
      </div>

      {(p.scaffolds ?? []).length > 0 && (
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-bi-navy-500 mb-1">Scaffolds for thoughtful replies</div>
          <ul className="space-y-1">
            {(p.scaffolds ?? []).map((s, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-bi-navy-700">
                <span className="text-bi-blue-400">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.rubric_text && (
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-bi-navy-500 mb-1">Rubric</div>
          <p className="text-[12.5px] text-bi-navy-700 whitespace-pre-wrap">{p.rubric_text}</p>
        </div>
      )}

      {typeof p.target_minutes === "number" && (
        <div className="text-[11px] text-bi-navy-500">Target reply length · ~{p.target_minutes} min</div>
      )}
    </div>
  );
}

function Empty() {
  return <div className="text-center py-12 text-sm text-bi-navy-500">No discussion prompt yet.</div>;
}
