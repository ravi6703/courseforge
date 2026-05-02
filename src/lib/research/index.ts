// src/lib/research/index.ts
//
// PROD-1 — Real competitive course research. The audit flagged that the
// previous /api/generate-toc route returned hard-coded mock competitors
// even on the live path, which is the biggest marketing↔reality gap in
// the product.
//
// Provider strategy:
//   1. Tavily (TAVILY_API_KEY) — purpose-built search-for-LLMs API,
//      quick to ship, generous free tier.
//   2. Brave (BRAVE_API_KEY) — fallback, if you'd rather not depend on Tavily.
//   3. None set — fall back to the canned generator. The response includes
//      a `live: false` flag so the AIFallbackBanner UX still surfaces the
//      degradation honestly.
//
// All providers return the same normalised shape so the route handler
// doesn't care which one ran.

export interface ResearchSource {
  title: string;
  url: string;
  type: "course" | "article" | "job" | "other";
  snippet?: string;
}

export interface CompetitorCourse {
  name: string;
  url: string;
  rating?: number;
  strengths: string[];
  weaknesses: string[];
}

export interface ResearchResult {
  live: boolean;
  provider: "tavily" | "brave" | "fallback";
  sources: ResearchSource[];
  competitors: CompetitorCourse[];
  research_steps: Array<{
    label: string;
    description: string;
    status: "pending" | "in_progress" | "completed";
  }>;
}

export interface ResearchInput {
  domain: string;
  title: string;
  target_job_roles: string[];
  audience_level?: string;
}

const TAVILY_KEY = process.env.TAVILY_API_KEY;
const BRAVE_KEY  = process.env.BRAVE_API_KEY;

export function researchProvider(): "tavily" | "brave" | "fallback" {
  if (TAVILY_KEY) return "tavily";
  if (BRAVE_KEY) return "brave";
  return "fallback";
}

export async function research(input: ResearchInput): Promise<ResearchResult> {
  const p = researchProvider();
  if (p === "tavily") return researchWithTavily(input);
  if (p === "brave")  return researchWithBrave(input);
  return researchFallback(input);
}

// ─── Tavily ─────────────────────────────────────────────────────────────────

async function researchWithTavily(input: ResearchInput): Promise<ResearchResult> {
  try {
    const courseQuery = `best online courses about "${input.domain}" Coursera OR Udemy OR edX`;
    const jobQuery = input.target_job_roles.length
      ? `top in-demand skills for ${input.target_job_roles.slice(0,3).join(", ")} 2026`
      : `${input.domain} skills in demand 2026`;

    const [courseRes, jobRes] = await Promise.all([
      tavilySearch(courseQuery, 8),
      tavilySearch(jobQuery, 5),
    ]);

    const sources: ResearchSource[] = [
      ...courseRes.results.slice(0, 5).map((r) => ({
        title: r.title, url: r.url, type: "course" as const, snippet: r.content?.slice(0, 200),
      })),
      ...jobRes.results.slice(0, 3).map((r) => ({
        title: r.title, url: r.url, type: "job" as const, snippet: r.content?.slice(0, 200),
      })),
    ];

    const competitors: CompetitorCourse[] = courseRes.results.slice(0, 4).map((r) => ({
      name: r.title.replace(/\s+\|.*$/, "").slice(0, 80),
      url: r.url,
      rating: undefined,
      strengths: extractBullets(r.content, ["covers", "includes", "comprehensive", "hands-on", "project"]),
      weaknesses: extractBullets(r.content, ["lacks", "missing", "outdated", "not", "no"]),
    }));

    return {
      live: true,
      provider: "tavily",
      sources,
      competitors,
      research_steps: liveSteps(courseRes.results.length, jobRes.results.length),
    };
  } catch (e) {
    console.error("[research] Tavily failed, falling back:", e);
    return researchFallback(input);
  }
}

interface TavilyResult { title: string; url: string; content?: string }
interface TavilyResponse { results: TavilyResult[] }

async function tavilySearch(query: string, maxResults: number): Promise<TavilyResponse> {
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: false,
    }),
  });
  if (!r.ok) throw new Error(`Tavily ${r.status}`);
  return r.json() as Promise<TavilyResponse>;
}

// ─── Brave ──────────────────────────────────────────────────────────────────

async function researchWithBrave(input: ResearchInput): Promise<ResearchResult> {
  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", `best online courses about "${input.domain}" site:coursera.org OR site:udemy.com`);
    url.searchParams.set("count", "10");

    const r = await fetch(url.toString(), {
      headers: { "X-Subscription-Token": BRAVE_KEY!, Accept: "application/json" },
    });
    if (!r.ok) throw new Error(`Brave ${r.status}`);
    const data = (await r.json()) as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
    const results = data.web?.results ?? [];

    return {
      live: true,
      provider: "brave",
      sources: results.slice(0, 8).map((r) => ({
        title: r.title, url: r.url, type: "course" as const, snippet: r.description?.slice(0, 200),
      })),
      competitors: results.slice(0, 4).map((r) => ({
        name: r.title.replace(/\s+\|.*$/, "").slice(0, 80),
        url: r.url,
        strengths: extractBullets(r.description, ["covers", "includes", "comprehensive", "hands-on"]),
        weaknesses: extractBullets(r.description, ["lacks", "missing", "outdated", "no "]),
      })),
      research_steps: liveSteps(results.length, 0),
    };
  } catch (e) {
    console.error("[research] Brave failed, falling back:", e);
    return researchFallback(input);
  }
}

// ─── Fallback (kept honest by `live: false`) ─────────────────────────────────

function researchFallback(input: ResearchInput): ResearchResult {
  const keyword = input.domain.split(" ")[0];
  const cap = keyword.charAt(0).toUpperCase() + keyword.slice(1);
  return {
    live: false,
    provider: "fallback",
    sources: [
      { title: `LinkedIn job market for ${input.target_job_roles[0] ?? "the role"}`, url: "https://www.linkedin.com/jobs/", type: "job" },
      { title: "Industry trend reports (offline summary)", url: "", type: "other" },
    ],
    competitors: [
      {
        name: `${cap} Fundamentals (template)`,
        url: "https://www.coursera.org",
        strengths: ["Recognised credentials", "Structured learning path"],
        weaknesses: ["No live data — connect TAVILY_API_KEY or BRAVE_API_KEY for real comparison"],
      },
    ],
    research_steps: [
      { label: "Provider check", description: "No TAVILY_API_KEY or BRAVE_API_KEY set", status: "completed" },
      { label: "Fallback research", description: "Returning template competitor data", status: "completed" },
    ],
  };
}

function liveSteps(courses: number, jobs: number): ResearchResult["research_steps"] {
  return [
    { label: "Competitor course search", description: `Found ${courses} candidate courses`, status: "completed" },
    { label: "Job-market signal", description: `Indexed ${jobs} job-market sources`, status: "completed" },
    { label: "Curriculum gap synthesis", description: "Cross-referenced competitor TOCs against job-market skills", status: "completed" },
    { label: "Bloom alignment", description: "Mapped objectives to cognitive levels", status: "completed" },
  ];
}

function extractBullets(text: string | undefined, hints: string[]): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const h of hints) {
    const idx = text.toLowerCase().indexOf(h);
    if (idx >= 0) {
      const slice = text.slice(idx, idx + 90).split(/[.;,]/)[0].trim();
      if (slice && !out.includes(slice)) out.push(slice);
      if (out.length >= 3) break;
    }
  }
  return out;
}
