// src/lib/exporters/pptx.ts — converts CourseForge slide JSON into a real .pptx
//
// pptxgenjs runs entirely in JS (no system office install). Returns a Node
// Buffer suitable for streaming back from a Next.js Route Handler.
//
// Install:  npm i pptxgenjs
//
// Honors the layout_type values your DB already uses:
//   'title' | 'content' | 'two_column' | 'diagram' | 'summary' | 'code'
//
// Speaker notes are written as PowerPoint speaker notes (visible in presenter
// view, also picked up by Coursera's lecture-pack importer).

import PPTXGenJS from "pptxgenjs";

export type SlideJSON = {
  slide_number: number;
  title: string;
  content: unknown; // string | string[] | { ... } depending on layout
  speaker_notes?: string | null;
  layout_type:
    | "title"
    | "content"
    | "two_column"
    | "diagram"
    | "summary"
    | "code";
};

export type CourseMetaForExport = {
  title: string;
  description?: string | null;
  org_name?: string | null;
  brand_color_hex?: string | null; // e.g. "1F2937"
};

/** Build a .pptx for a single video. Returns the file as a Uint8Array (works in
 *  both Next.js Edge and Node runtimes). */
export async function renderSlidesToPptx(
  course: CourseMetaForExport,
  videoTitle: string,
  slides: SlideJSON[]
): Promise<Uint8Array> {
  const pptx = new PPTXGenJS();
  pptx.author = course.org_name || "CourseForge";
  pptx.company = course.org_name || "CourseForge";
  pptx.title = `${course.title} — ${videoTitle}`;
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches, matches Coursera/Udemy template

  const brand = course.brand_color_hex || "1F2937";
  const accent = "0EA5E9";
  const ink = "0F172A";
  const muted = "64748B";

  // Master with footer
  pptx.defineSlideMaster({
    title: "CF_MASTER",
    background: { color: "FFFFFF" },
    objects: [
      {
        rect: {
          x: 0,
          y: 7.0,
          w: 13.33,
          h: 0.05,
          fill: { color: brand },
        },
      },
      {
        text: {
          text: course.title,
          options: {
            x: 0.5,
            y: 7.1,
            w: 8,
            h: 0.3,
            fontSize: 9,
            color: muted,
          },
        },
      },
      {
        text: {
          text: `Slide {slidenum} / ${slides.length}`,
          options: {
            x: 11.5,
            y: 7.1,
            w: 1.5,
            h: 0.3,
            fontSize: 9,
            color: muted,
            align: "right",
          },
        },
      },
    ],
  });

  // Sort by slide_number to be safe
  const sorted = [...slides].sort((a, b) => a.slide_number - b.slide_number);

  for (const s of sorted) {
    const slide = pptx.addSlide({ masterName: "CF_MASTER" });
    if (s.speaker_notes) slide.addNotes(s.speaker_notes);

    switch (s.layout_type) {
      case "title":
        slide.addText(s.title, {
          x: 0.6,
          y: 2.6,
          w: 12,
          h: 1.6,
          fontSize: 44,
          bold: true,
          color: ink,
        });
        slide.addText(toString(s.content), {
          x: 0.6,
          y: 4.2,
          w: 12,
          h: 0.8,
          fontSize: 18,
          color: muted,
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.6,
          y: 5.4,
          w: 1.5,
          h: 0.06,
          fill: { color: accent },
          line: { type: "none" },
        });
        break;

      case "two_column": {
        slide.addText(s.title, headingStyle(ink));
        const items = toBullets(s.content);
        const half = Math.ceil(items.length / 2);
        slide.addText(items.slice(0, half).map(b => ({ text: b, options: { bullet: true } })), {
          x: 0.6,
          y: 1.8,
          w: 6,
          h: 5,
          fontSize: 18,
          color: ink,
        });
        slide.addText(items.slice(half).map(b => ({ text: b, options: { bullet: true } })), {
          x: 7,
          y: 1.8,
          w: 6,
          h: 5,
          fontSize: 18,
          color: ink,
        });
        break;
      }

      case "code":
        slide.addText(s.title, headingStyle(ink));
        slide.addText(toString(s.content), {
          x: 0.6,
          y: 1.8,
          w: 12.1,
          h: 5,
          fontSize: 14,
          fontFace: "Courier New",
          color: ink,
          fill: { color: "F1F5F9" },
          valign: "top",
        });
        break;

      case "summary":
        slide.addText(s.title, headingStyle(ink));
        slide.addText(toBullets(s.content).map(b => ({ text: b, options: { bullet: { code: "25CF" } } })), {
          x: 0.6,
          y: 1.8,
          w: 12.1,
          h: 5,
          fontSize: 20,
          color: ink,
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.6,
          y: 6.6,
          w: 12.1,
          h: 0.05,
          fill: { color: accent },
          line: { type: "none" },
        });
        break;

      case "diagram":
        slide.addText(s.title, headingStyle(ink));
        slide.addText(`(Diagram: ${toString(s.content)})`, {
          x: 0.6,
          y: 1.8,
          w: 12.1,
          h: 5,
          fontSize: 16,
          italic: true,
          color: muted,
          align: "center",
          valign: "middle",
          fill: { color: "F8FAFC" },
        });
        break;

      case "content":
      default:
        slide.addText(s.title, headingStyle(ink));
        slide.addText(toBullets(s.content).map(b => ({ text: b, options: { bullet: true } })), {
          x: 0.6,
          y: 1.8,
          w: 12.1,
          h: 5,
          fontSize: 18,
          color: ink,
          valign: "top",
        });
        break;
    }
  }

  // pptxgenjs writes to a Node Buffer; convert to Uint8Array for portability
  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function headingStyle(ink: string) {
  return {
    x: 0.6,
    y: 0.5,
    w: 12.1,
    h: 0.9,
    fontSize: 28,
    bold: true,
    color: ink,
  };
}

function toString(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join("\n");
  if (v && typeof v === "object") return JSON.stringify(v);
  return String(v ?? "");
}

function toBullets(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => toString(x)).filter(Boolean);
  if (typeof v === "string") {
    return v
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  }
  return [toString(v)];
}
