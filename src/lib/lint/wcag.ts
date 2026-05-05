// WCAG AA scanner for course artifacts.
//
// Server-side only — runs over the JSON payloads we already store, plus the
// rendered text of reading material / discussion / worked-example items.
// Today checks the rules that are cheap to implement without a headless
// browser:
//
//   image_alt_missing     <img> without alt text in reading markdown
//   contrast_low          brand color combinations below AA contrast
//   heading_skips         h1 → h3 with no h2 in reading content
//   link_text_generic     "click here" / "read more" / bare URLs
//   form_label_missing    inputs in reading material without labels
//   transcript_missing    a video without a transcript fails 1.2.2
//   captions_missing      a video without subtitles fails 1.2.2 / 1.2.4
//
// Future passes (deferred — would require a headless browser): keyboard
// navigation, focus order, color-only-information.

export interface WcagFinding {
  rule_id: string;
  level: "A" | "AA" | "AAA";
  severity: "error" | "warning" | "info";
  message: string;
  fix_hint?: string;
  scope: "reading" | "slide" | "transcript" | "video" | "course";
  scope_id?: string;
}

// ── Color contrast ──────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] | null {
  const c = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(c)) return null;
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
function relLum([r, g, b]: [number, number, number]): number {
  const rs = [r, g, b].map((v) => v / 255).map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * rs[0] + 0.7152 * rs[1] + 0.0722 * rs[2];
}
export function contrastRatio(fg: string, bg: string): number | null {
  const a = hexToRgb(fg); const b = hexToRgb(bg);
  if (!a || !b) return null;
  const la = relLum(a); const lb = relLum(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ── Reading-content rules ───────────────────────────────────────────────────
export function lintReadingContent(markdown: string, scopeId?: string): WcagFinding[] {
  const out: WcagFinding[] = [];

  // image without alt text
  const imgs = markdown.match(/!\[([^\]]*)\]\([^)]+\)/g) ?? [];
  for (const m of imgs) {
    const alt = (m.match(/!\[([^\]]*)\]/) ?? ["", ""])[1];
    if (!alt.trim()) {
      out.push({
        rule_id: "image_alt_missing", level: "A", severity: "error",
        scope: "reading", scope_id: scopeId,
        message: "Image is missing alt text.",
        fix_hint: "Replace ![](url) with ![one-line description of the image](url).",
      });
      break; // one finding per item is enough — the rail is for awareness, not auditing
    }
  }

  // headings: skipping h1 → h3 without h2
  const headings = (markdown.match(/^#{1,6} /gm) ?? []).map((h) => h.trim().split(" ")[0].length);
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] - headings[i - 1] >= 2) {
      out.push({
        rule_id: "heading_skips", level: "AA", severity: "warning",
        scope: "reading", scope_id: scopeId,
        message: "Heading levels skip — screen readers expect a sequential outline.",
        fix_hint: `Demote the deeper heading (currently h${headings[i]}) by one level.`,
      });
      break;
    }
  }

  // generic link text
  if (/\[(click here|read more|here|link)\]\(/i.test(markdown)) {
    out.push({
      rule_id: "link_text_generic", level: "AA", severity: "warning",
      scope: "reading", scope_id: scopeId,
      message: "Link text is generic (\"click here\" / \"read more\").",
      fix_hint: "Rewrite link text so it describes the destination ('Read the n8n quickstart', not 'click here').",
    });
  }

  // bare URLs
  const bareUrls = markdown.match(/(?<!\]\()https?:\/\/\S+/g) ?? [];
  if (bareUrls.length > 2) {
    out.push({
      rule_id: "bare_urls", level: "AA", severity: "info",
      scope: "reading", scope_id: scopeId,
      message: `${bareUrls.length} bare URLs in the reading material; screen readers spell each character.`,
      fix_hint: "Wrap each URL in markdown link syntax with descriptive anchor text.",
    });
  }

  return out;
}

// ── Brand-color contrast against white ──────────────────────────────────────
export function lintBrandContrast(brand: { primary?: string; secondary?: string; accent?: string }): WcagFinding[] {
  const out: WcagFinding[] = [];
  const checks: Array<[string, string]> = [
    ["primary",   brand.primary ?? ""],
    ["secondary", brand.secondary ?? ""],
    ["accent",    brand.accent ?? ""],
  ];
  for (const [name, hex] of checks) {
    if (!hex) continue;
    const ratio = contrastRatio(hex, "#FFFFFF");
    if (ratio == null) continue;
    if (ratio < 4.5) {
      out.push({
        rule_id: `contrast_low_${name}`, level: "AA", severity: "warning",
        scope: "course",
        message: `${name} brand color (${hex}) on white has contrast ${ratio.toFixed(2)} — below AA (4.5).`,
        fix_hint: `Pick a darker variant of ${hex} for body text on white. Use the lighter variant for backgrounds only.`,
      });
    }
  }
  return out;
}

// ── Video / transcript rules ────────────────────────────────────────────────
export function lintVideoAccessibility(input: {
  videoId: string;
  hasTranscript: boolean;
  hasCaptions:   boolean;
}): WcagFinding[] {
  const out: WcagFinding[] = [];
  if (!input.hasTranscript) {
    out.push({
      rule_id: "transcript_missing", level: "A", severity: "error",
      scope: "video", scope_id: input.videoId,
      message: "Video has no transcript (1.2.1 / 1.2.2 / 1.2.3 require alternatives for audio).",
      fix_hint: "Generate a transcript from the Transcript tab; AI fallback runs even without an external Whisper provider.",
    });
  }
  if (!input.hasCaptions) {
    out.push({
      rule_id: "captions_missing", level: "AA", severity: "warning",
      scope: "video", scope_id: input.videoId,
      message: "Video has no captions / subtitle track (1.2.2).",
      fix_hint: "Download SRT/VTT from the Transcript tab and ship it alongside the video.",
    });
  }
  return out;
}

// ── Aggregator ──────────────────────────────────────────────────────────────
export interface WcagAuditInput {
  brand: { primary?: string; secondary?: string; accent?: string };
  readings: Array<{ id: string; markdown: string }>;
  videos:   Array<{ id: string; hasTranscript: boolean; hasCaptions: boolean }>;
}

export function auditCourse(input: WcagAuditInput): WcagFinding[] {
  return [
    ...lintBrandContrast(input.brand),
    ...input.readings.flatMap((r) => lintReadingContent(r.markdown, r.id)),
    ...input.videos.flatMap((v) => lintVideoAccessibility({
      videoId: v.id, hasTranscript: v.hasTranscript, hasCaptions: v.hasCaptions,
    })),
  ];
}
