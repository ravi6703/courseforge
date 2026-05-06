// POST /api/courses/[id]/competitor-toc
//
// Body: { urls: string[] }  (1-3 competitor course landing-page URLs)
//
// Heuristic implementation: fetch the URL HTML and extract anything
// that looks like a TOC (h2/h3/h4 inside the body, plus lists). Skips
// the AI step for the moment — coaches just need the side-by-side
// comparison view; we don't need a perfect parser to ship value.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface CompetitorTOC {
  url: string;
  title: string | null;
  topics: string[];
  error: string | null;
}

const TOPIC_RE = /<(h2|h3|h4)\b[^>]*>([\s\S]*?)<\/\1>/gi;

export async function POST(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> },
) {
  void _params;
  const body = await req.json().catch(() => ({}));
  const urls = (body.urls as string[] | undefined) ?? [];
  if (urls.length === 0) return NextResponse.json({ competitors: [] });

  const out: CompetitorTOC[] = [];
  for (const url of urls.slice(0, 3)) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "CourseForge/1.0 competitor-toc-extractor" },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) {
        out.push({ url, title: null, topics: [], error: `HTTP ${r.status}` });
        continue;
      }
      const html = await r.text();
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? stripTags(titleMatch[1]).trim() : null;
      const topics: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = TOPIC_RE.exec(html)) && topics.length < 80) {
        const t = stripTags(m[2]).trim();
        if (t.length > 2 && t.length < 200) topics.push(t);
      }
      out.push({ url, title, topics: dedupe(topics), error: null });
    } catch (e) {
      out.push({ url, title: null, topics: [], error: (e as Error).message });
    }
  }

  return NextResponse.json({ competitors: out });
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ");
}
function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((s) => { const k = s.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}
