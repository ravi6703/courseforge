// Reading preview — list of curated further-reading links, each with a
// summary, why-it-matters, and read time estimate. Schema:
//   { items: [{ title, summary, url, why_it_matters, reading_time_min }] }

interface ReadingItem {
  title: string;
  summary: string;
  url: string;
  why_it_matters: string;
  reading_time_min: number;
}

export function PreviewReading({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload) return <Empty />;
  const items = (payload.items as ReadingItem[] | undefined) ?? [];
  if (items.length === 0) return <Empty />;

  const totalRead = items.reduce((s, i) => s + (i.reading_time_min ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-bold text-bi-navy-700">Reading list · {items.length} items</h3>
        <span className="text-xs text-bi-navy-500">~{totalRead} min total</span>
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

function Empty() {
  return (
    <div className="text-center py-12 text-sm text-bi-navy-500">
      No reading list generated yet.
    </div>
  );
}
