// Worked example artifact preview.
//
// Schema: { problem, steps: { text, reasoning?, formula? }[], final_answer, gotchas? }

interface Step {
  text: string;
  reasoning?: string;
  formula?: string;
}
interface WorkedExamplePayload {
  problem?: string;
  steps?: Step[];
  final_answer?: string;
  gotchas?: string[];
}

export function PreviewWorkedExample({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload) return <Empty />;
  const p = payload as WorkedExamplePayload;
  if (!p.problem) return <Empty />;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-bi-navy-100 bg-bi-blue-50/40 p-3">
        <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-bi-blue-700 mb-1">Problem</div>
        <p className="text-[13.5px] text-bi-navy-900">{p.problem}</p>
      </div>

      {(p.steps ?? []).length > 0 && (
        <ol className="space-y-2">
          {(p.steps ?? []).map((s, i) => (
            <li key={i} className="rounded-lg border border-bi-navy-100 p-3">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[10.5px] font-bold text-bi-navy-500">STEP {i + 1}</span>
              </div>
              <p className="text-[13px] text-bi-navy-900">{s.text}</p>
              {s.formula && <pre className="mt-1.5 text-[12px] font-mono bg-bi-navy-50 border border-bi-navy-100 rounded px-2 py-1 inline-block">{s.formula}</pre>}
              {s.reasoning && <p className="text-[12px] text-bi-navy-600 italic mt-1.5">{s.reasoning}</p>}
            </li>
          ))}
        </ol>
      )}

      {p.final_answer && (
        <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/60 p-3">
          <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-emerald-700 mb-1">Final answer</div>
          <p className="text-[13.5px] font-semibold text-emerald-900">{p.final_answer}</p>
        </div>
      )}

      {(p.gotchas ?? []).length > 0 && (
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-bi-navy-500 mb-1">Common mistakes</div>
          <ul className="space-y-1">
            {(p.gotchas ?? []).map((g, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] text-bi-navy-700">
                <span className="text-amber-500">⚠</span>{g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <div className="text-center py-12 text-sm text-bi-navy-500">No worked example yet.</div>;
}
