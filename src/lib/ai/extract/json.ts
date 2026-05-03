// src/lib/ai/extract/json.ts
//
// Robust JSON extraction from LLM text output. Handles all the common
// failure modes:
//
//   1. Raw JSON                           → parse directly
//   2. Wrapped in ```json …```            → strip fence
//   3. Wrapped in plain ``` … ```         → strip fence
//   4. Trailing prose after the JSON      → bracket-counted slice
//   5. Leading prose before the JSON      → seek to first { or [
//   6. Mixed (prose, fence, prose)        → combination of the above
//
// Returns either { ok: true, value } or { ok: false, raw, error } so the
// caller can log Claude's full response when parsing fails. The route
// previously did `JSON.parse(content.match(/\[[\s\S]*\]/)[0])` which
// silently returned undefined on any of cases 2–6 and crashed in others.

export type ExtractResult<T> =
  | { ok: true; value: T }
  | { ok: false; raw: string; error: string };

export function extractJson<T = unknown>(text: string, kind: "object" | "array" = "array"): ExtractResult<T> {
  if (!text) return { ok: false, raw: text, error: "empty response" };

  // 1) Strip markdown code fences if present
  let body = text.trim();
  const fence = body.match(/^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/);
  if (fence) body = fence[1].trim();

  // 2) Find the first opening bracket of the requested kind
  const open = kind === "array" ? "[" : "{";
  const close = kind === "array" ? "]" : "}";
  const start = body.indexOf(open);
  if (start === -1) return { ok: false, raw: text, error: `no '${open}' found` };

  // 3) Walk forward from the open bracket, counting nesting until we
  //    find the matching close. Respect string literals so brackets
  //    inside strings don't mess up the count.
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return { ok: false, raw: text, error: `unbalanced ${open}${close}` };

  const slice = body.slice(start, end + 1);
  try {
    return { ok: true, value: JSON.parse(slice) as T };
  } catch (e) {
    return { ok: false, raw: text, error: `JSON.parse failed: ${(e as Error).message}` };
  }
}
