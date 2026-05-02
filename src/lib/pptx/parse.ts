// src/lib/pptx/parse.ts
//
// Minimal .pptx text extractor. A .pptx is a ZIP archive; the slides
// live at ppt/slides/slideN.xml as Office Open XML. We pull the visible
// text out of <a:t> elements and ignore everything else (themes,
// transitions, embedded media). Speaker notes, when present, live at
// ppt/notesSlides/notesSlideN.xml.
//
// We use jszip (already in deps for export pipeline) so no new deps.
//
// Tradeoffs vs a real parser like 'pptx2json':
//   + zero new deps, ~80 LOC, works in Node + Edge
//   + good enough for AI rewrite (text in / text out)
//   - no shape positions, no images, no tables — we can't fully
//     reconstruct the deck from this. That's fine: rewrite stores the
//     improved text back to the slide_text column + ppt_slides rows;
//     the original .pptx in storage stays canonical.

import JSZip from "jszip";

export interface ParsedSlide {
  slide_number: number;
  title: string;
  bullets: string[];
  notes: string;
}

export async function parsePptx(buf: Buffer | ArrayBuffer | Uint8Array): Promise<ParsedSlide[]> {
  const zip = await JSZip.loadAsync(buf);
  const slides: ParsedSlide[] = [];

  // Slide files are ppt/slides/slide1.xml … slideN.xml. Sort numerically.
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => slideNum(a) - slideNum(b));

  for (const path of slidePaths) {
    const num = slideNum(path);
    const xml = await zip.file(path)!.async("string");
    const texts = extractText(xml);

    // Heuristic: first text run is the title; everything else are bullets.
    const title = texts[0] ?? `Slide ${num}`;
    const bullets = texts.slice(1).filter((t) => t.trim().length > 0);

    let notes = "";
    const notesPath = `ppt/notesSlides/notesSlide${num}.xml`;
    if (zip.file(notesPath)) {
      const notesXml = await zip.file(notesPath)!.async("string");
      notes = extractText(notesXml).join("\n").trim();
    }

    slides.push({ slide_number: num, title, bullets, notes });
  }

  return slides;
}

function slideNum(path: string): number {
  const m = path.match(/slide(\d+)\.xml$/);
  return m ? parseInt(m[1], 10) : 0;
}

// Pull the text from every <a:t>…</a:t> in document order. Office uses
// the 'a:' namespace prefix for drawing-text elements. We don't bother
// with a full XML parser — the regex is robust enough for the standard
// PowerPoint output, and it's faster than spinning up a DOM parser
// (which is also not available in Edge runtime).
function extractText(xml: string): string[] {
  const out: string[] = [];
  const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const text = decodeEntities(m[1]).trim();
    if (text) out.push(text);
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
