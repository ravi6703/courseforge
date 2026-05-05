"use client";

// Visual slide preview canvas. Renders a 16:9 wireframe of the slide as
// it would actually appear, with the brand colors when supplied. Not
// pixel-perfect — the goal is "I can see what I'm building" without
// downloading a .pptx every time.
//
// Layouts mirror what the PPTX exporter produces:
//   title       hero with subtitle + accent rule
//   content     title + bullets
//   two_column  title + two bullet columns
//   summary     title + numbered bullets
//   diagram     title + image + caption
//   code        title + monospace block

interface SlideShape {
  title: string;
  content: unknown;
  speaker_notes: string | null;
  layout_type: string;
  image_url?: string | null;
}

interface Brand {
  primary?: string;
  accent?: string;
  font?: string;
}

function bullets(c: unknown): string[] {
  if (Array.isArray(c)) return c.map(String);
  if (typeof c === "string") return c.split("\n").filter(Boolean);
  return [];
}

export function SlideCanvas({ slide, brand, slideNumber, slideCount }: {
  slide: SlideShape;
  brand?: Brand;
  slideNumber: number;
  slideCount: number;
}) {
  const primary = brand?.primary || "#3F6FA8";
  const accent  = brand?.accent  || "#B68F2A";
  const font    = brand?.font    || "Inter, system-ui, sans-serif";
  const items   = bullets(slide.content);

  return (
    <div
      className="relative w-full rounded-lg border border-bi-navy-200 shadow-bi-sm overflow-hidden bg-white"
      style={{ aspectRatio: "16 / 9", fontFamily: font }}
    >
      {/* Top accent bar in primary brand color */}
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: primary }} />

      <div className="absolute inset-0 px-6 sm:px-10 pt-6 sm:pt-10 pb-4 sm:pb-6 flex flex-col">
        {/* Title */}
        <h2
          className="text-[18px] sm:text-[22px] font-bold leading-tight"
          style={{ color: primary }}
        >
          {slide.title || "Untitled"}
        </h2>

        {/* Body — varies by layout */}
        <div className="flex-1 mt-3 sm:mt-4 min-h-0 overflow-hidden">
          {slide.layout_type === "title" && (
            <div className="h-full flex flex-col justify-center">
              <p className="text-[13px] sm:text-[15px] text-bi-navy-700">{items[0] ?? "Subtitle"}</p>
              <span className="mt-3 inline-block w-12 h-0.5" style={{ background: accent }} />
            </div>
          )}

          {slide.layout_type === "content" && (
            <ul className="space-y-1.5 text-[12px] sm:text-[13.5px] text-bi-navy-800">
              {items.length === 0 && <li className="text-bi-navy-400 italic">No bullets yet.</li>}
              {items.slice(0, 6).map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: accent }} />
                  <span className="line-clamp-2">{b}</span>
                </li>
              ))}
            </ul>
          )}

          {slide.layout_type === "two_column" && (
            <div className="grid grid-cols-2 gap-4 h-full">
              {[items.slice(0, Math.ceil(items.length / 2)), items.slice(Math.ceil(items.length / 2))].map((col, ci) => (
                <ul key={ci} className="space-y-1.5 text-[11.5px] sm:text-[12.5px] text-bi-navy-800">
                  {col.slice(0, 4).map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: accent }} />
                      <span className="line-clamp-2">{b}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          )}

          {slide.layout_type === "summary" && (
            <ol className="space-y-1.5 text-[12px] sm:text-[13.5px] text-bi-navy-800 list-decimal pl-5">
              {items.slice(0, 6).map((b, i) => (
                <li key={i} className="line-clamp-2">{b}</li>
              ))}
            </ol>
          )}

          {slide.layout_type === "diagram" && (
            <div className="h-full grid grid-cols-[1fr_1fr] gap-4">
              {slide.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={slide.image_url} alt="" className="w-full h-full object-contain rounded border border-bi-navy-100" />
              ) : (
                <div className="rounded border border-dashed border-bi-navy-200 bg-bi-navy-50 grid place-items-center text-bi-navy-300 text-[11px]">
                  Image placeholder
                </div>
              )}
              <ul className="space-y-1.5 text-[12px] text-bi-navy-800 self-center">
                {items.slice(0, 4).map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: accent }} />
                    <span className="line-clamp-2">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {slide.layout_type === "code" && (
            <pre className="text-[11px] font-mono whitespace-pre-wrap bg-bi-navy-50 border border-bi-navy-100 rounded p-3 overflow-hidden">
              {items.join("\n") || "// no code yet"}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between text-[10px] text-bi-navy-400 pt-2 border-t border-bi-navy-100">
          <span>{slide.layout_type.replace("_", " ")}</span>
          <span className="tabular-nums">{slideNumber} / {slideCount}</span>
        </div>
      </div>
    </div>
  );
}
