// AI Coach preview — displays the system prompt that will power the
// in-course AI coach for this video. Schema: { system: <100-50000 chars> }

export function PreviewAICoach({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload) {
    return <div className="text-center py-12 text-sm text-slate-500">No AI Coach prompt yet.</div>;
  }
  const system = (payload.system as string | undefined) ?? "";
  if (!system) {
    return <div className="text-center py-12 text-sm text-slate-500">No AI Coach prompt yet.</div>;
  }
  const wordCount = system.trim().split(/\s+/).length;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-bold text-slate-700">System prompt</h3>
        <span className="text-xs text-slate-500">{wordCount} words · {system.length} chars</span>
      </div>
      <pre className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 whitespace-pre-wrap font-mono leading-relaxed max-h-[60vh] overflow-auto">
{system}
      </pre>
    </div>
  );
}
