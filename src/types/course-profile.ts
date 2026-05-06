// Canonical Course Profile — the system context every AI prompt sees.
// A coach sets these fields once on /course/[id]/profile; downstream
// generators read them via getProfile(courseId). Adding a new field here
// is fine — the default is filled in for courses that don't have it yet.

export type ToneId =
  | "concise" | "detailed" | "professional"
  | "educational" | "conversational" | "storytelling";

export type DifficultyArc =
  | "beginner_only" | "beginner_to_intermediate" | "mixed" | "advanced";

export type PedagogyPreset =
  | "bloom_strict" | "project_led" | "lecture_led" | "case_based";

export interface ReadingItem {
  title: string;
  url: string;
  why: string;
}

export interface BrandKit {
  logo_url?: string;
  primary_color: string;       // hex, e.g. "#0B1F4D"
  secondary_color: string;
  accent_color?: string;
  typography: string;          // font family name
  slide_template?: "minimal" | "editorial" | "vibrant" | "academic";
}

export type MonetizationTier = "free" | "paid" | "premium" | "enterprise";

export type BloomLevel =
  | "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";

export interface OutcomesSection {
  /** Action-verb statements: "Learner will be able to <verb> <object>". */
  outcomes: string[];
  /** Prerequisites — what the learner should know coming in. */
  prerequisites: string[];
  /** Success criteria — how we know the learner mastered the course. */
  success_criteria: string[];
  /** Highest Bloom level the course targets. */
  bloom_cap: BloomLevel;
}

export interface MonetizationSection {
  tier: MonetizationTier;
  /** Target list price in USD if paid/premium. */
  price_usd?: number;
}

export interface TimelineSection {
  /** Days the coach gives themselves to ship the course. Drives the Gantt. */
  target_days?: number;
  /** Hard deadline (date string, ISO yyyy-mm-dd). */
  target_date?: string;
}

export interface CourseProfile {
  audience: {
    primary_persona: string;     // free text — "Backend dev, 2-5y, comfortable with REST"
    level: "beginner" | "intermediate" | "advanced";
    secondary_personas: string[]; // optional
  };
  outcomes: OutcomesSection;
  monetization: MonetizationSection;
  timeline: TimelineSection;
  tone: {
    primary: ToneId;
    locale: string;              // BCP-47, e.g. "en-IN"
  };
  pedagogy: {
    preset: PedagogyPreset;
    theory_handson_ratio: number; // 0-100, % theory
  };
  vocabulary: {
    must_include: string[];   // domain terms the AI should keep using
    banned: string[];         // terms to avoid (jargon, brand-conflicting)
  };
  brand: BrandKit;
  reading_list: ReadingItem[];
  difficulty_arc: DifficultyArc;
}

export const DEFAULT_PROFILE: CourseProfile = {
  audience: {
    primary_persona: "",
    level: "intermediate",
    secondary_personas: [],
  },
  outcomes: {
    outcomes: [],
    prerequisites: [],
    success_criteria: [],
    bloom_cap: "apply",
  },
  monetization: {
    tier: "paid",
  },
  timeline: {},
  tone: {
    primary: "educational",
    locale: "en-US",
  },
  pedagogy: {
    preset: "bloom_strict",
    theory_handson_ratio: 70,
  },
  vocabulary: {
    must_include: [],
    banned: [],
  },
  brand: {
    primary_color: "#0B1F4D",
    secondary_color: "#2B6FED",
    accent_color: "#FFB800",
    typography: "Inter",
    slide_template: "minimal",
  },
  reading_list: [],
  difficulty_arc: "mixed",
};

export const BLOOM_LEVELS: Array<{ id: BloomLevel; label: string; verbs: string[] }> = [
  { id: "remember",   label: "Remember",   verbs: ["recall", "list", "name", "define"] },
  { id: "understand", label: "Understand", verbs: ["explain", "summarize", "interpret"] },
  { id: "apply",      label: "Apply",      verbs: ["use", "implement", "execute"] },
  { id: "analyze",    label: "Analyze",    verbs: ["compare", "diagnose", "differentiate"] },
  { id: "evaluate",   label: "Evaluate",   verbs: ["critique", "assess", "judge"] },
  { id: "create",     label: "Create",     verbs: ["design", "build", "compose"] },
];

export const MONETIZATION_TIERS: Array<{ id: MonetizationTier; label: string; what: string }> = [
  { id: "free",       label: "Free",       what: "Lead-gen / community / open course." },
  { id: "paid",       label: "Paid",       what: "Standard tier — typically $49–$299." },
  { id: "premium",    label: "Premium",    what: "High-touch — cohort, mentorship, certificate." },
  { id: "enterprise", label: "Enterprise", what: "Sold to teams; SCORM/LMS delivery." },
];

// Tone presets are canonical labels used by the brief tone selector,
// the AI Coach generator, and any other surface that lets the coach
// re-skin a generated artifact.
export const TONE_PRESETS: Array<{ id: ToneId; label: string; what: string }> = [
  { id: "concise",        label: "Concise",        what: "Short sentences. No filler. Bullets favored over prose." },
  { id: "detailed",       label: "Detailed",       what: "Long form. Explanatory. Multiple examples per concept." },
  { id: "professional",   label: "Professional",   what: "Neutral, formal register. Industry-standard terminology." },
  { id: "educational",    label: "Educational",    what: "Pedagogical scaffolding. Concept → example → check-for-understanding." },
  { id: "conversational", label: "Conversational", what: "Direct address (\"you\"). Contractions. Plain language." },
  { id: "storytelling",   label: "Storytelling",   what: "Narrative-led. Anecdotes. Concept introduced through scenarios." },
];
