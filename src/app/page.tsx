import Link from "next/link";
import {
  ArrowRight, Sparkles, Layers, FileText, Presentation,
  Mic, ShieldCheck, Languages, Check, BookOpen,
} from "lucide-react";

// Marketing landing page — default copy, ship now, edit later.
//
// Positioning (default until product team rewrites): "L&D leads at Indian
// edtechs and corporates ship branded video courses 10× faster than their
// existing production pipeline." The page leans on three proofs:
//   1. The pipeline is opinionated and pedagogy-aware
//   2. Brand kit travels through every artifact end-to-end
//   3. There's a hard quality gate before publish (audit + WCAG)

const PIPELINE = [
  { name: "Course profile",    icon: BookOpen,     note: "Set audience, tone, brand, vocabulary, difficulty arc once." },
  { name: "AI table of contents", icon: Layers,    note: "Modules → lessons → videos drafted by Claude with Bloom's progression." },
  { name: "Content briefs",    icon: FileText,     note: "Per-video coach input → tightened by AI; tone, intensity, time-fit metered." },
  { name: "Slides + recording", icon: Presentation, note: "Branded slide decks, Zoom OAuth, partial-segment re-record, AI noise removal." },
  { name: "Transcript + content", icon: Mic,       note: "Whisper transcripts, glossary, SRT/VTT subtitles, en→hi/es/ar translation." },
  { name: "Audit + publish",   icon: ShieldCheck,  note: "Pedagogy lint + WCAG AA audit + Coursera-ready zip export." },
];

const DIFFERENTIATORS = [
  { title: "Pedagogy-aware, not just generative", body: "Every artifact is graded against Bloom's progression, time budget, objective coverage, and reading level. Publish is hard-gated until the score clears 80." },
  { title: "Brand kit travels end-to-end",        body: "Logo, primary + accent, font face — applied automatically to every slide deck, SCORM bundle and reading export. Set it once, ship it everywhere." },
  { title: "AI Edit chat over every artifact",    body: "Plain-English instruction → unified diff → accept or revert. Every accepted edit is recorded, so you can roll back any artifact to any prior state." },
  { title: "Multi-AI provider routing",           body: "Route to Anthropic, OpenAI, Azure OpenAI or Bedrock per workspace. Built-in failover keeps the pipeline running through any single-provider outage." },
];

const PROOF = [
  { stat: "30–60 sec", caption: "to draft a 4-module TOC with research, Bloom progression and time budget." },
  { stat: "10×",       caption: "faster than a traditional team of one PM + one coach + one editor." },
  { stat: "WCAG AA",   caption: "accessibility scanner runs over every artifact before you publish." },
  { stat: "Zero black", caption: "boxes — every AI call logs the model, the prompt, and the diff." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-bi-navy-50 text-bi-navy-700">
      {/* Header */}
      <header className="border-b border-bi-navy-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 grid place-items-center font-black text-[13px]">∞</div>
            <span className="font-bold text-bi-navy-900 tracking-tight text-[15px]">
              Course<span className="text-bi-blue-700">Forge</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="text-[13px] font-semibold text-bi-navy-700 hover:text-bi-navy-900 px-3 py-1.5">Sign in</Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[13px] font-semibold hover:bg-bi-blue-200"
            >
              Start free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-bi-blue-700 bg-bi-blue-50 border border-bi-blue-100 rounded-full px-3 py-1 mb-5">
              <Sparkles className="w-3 h-3" /> Built for L&D teams shipping branded video courses
            </div>
            <h1 className="text-[40px] leading-[1.1] font-extrabold text-bi-navy-900 tracking-tight">
              Ship branded video courses
              <br />
              <span className="text-bi-blue-700">10× faster</span> — without losing pedagogy.
            </h1>
            <p className="mt-5 text-[15px] text-bi-navy-700 leading-relaxed max-w-[560px]">
              CourseForge is the opinionated production pipeline for L&D teams at edtechs, corporates and academies.
              Set your brand and audience once. Generate the TOC, briefs, slides, transcripts, readings and assessments
              with one model context. Audit before you publish.
            </p>

            <div className="mt-7 flex items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[14px] font-semibold hover:bg-bi-blue-200"
              >
                Start free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-bi-navy-700 border border-bi-navy-200 text-[14px] font-semibold hover:bg-bi-navy-50"
              >
                See a sample course
              </Link>
            </div>

            <ul className="mt-7 grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] text-bi-navy-700">
              {[
                "No credit card",
                "Bring your own AI keys",
                "Coursera / SCORM ready",
                "WCAG AA scanner built-in",
              ].map((b) => (
                <li key={b} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right column: stylized product surfaces */}
          <div className="space-y-3">
            <div className="rounded-xl border border-bi-navy-100 bg-white p-4 shadow-bi-md">
              <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Course health · A · 92</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {[
                  { k: "Modules", v: "4" },
                  { k: "Videos",  v: "32" },
                  { k: "Audit",   v: "0 critical" },
                ].map((c) => (
                  <div key={c.k} className="rounded-lg border border-bi-navy-100 p-2.5">
                    <div className="text-[18px] font-extrabold text-bi-navy-900">{c.v}</div>
                    <div className="text-[10px] uppercase tracking-wider text-bi-navy-500">{c.k}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-2 rounded-full bg-bi-navy-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-bi-blue-500 to-bi-accent-500" style={{ width: "76%" }} />
              </div>
              <div className="mt-1.5 text-[11px] text-bi-navy-500">76% to publish · brand applied to all 32 decks</div>
            </div>

            <div className="rounded-xl border border-bi-navy-100 bg-white p-4 shadow-bi-md">
              <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">AI Edit · accepted just now</div>
              <div className="mt-2 rounded-md border border-bi-navy-100 bg-bi-navy-50 p-2 font-mono text-[11px] text-bi-navy-700 leading-relaxed">
                <div className="text-emerald-700">+ "Apply STP framework to a SaaS positioning brief"</div>
                <div className="text-red-700">- "Understand STP at a high level"</div>
                <div className="text-bi-navy-500">— rationale: tighter, action-oriented</div>
              </div>
            </div>

            <div className="rounded-xl border border-bi-navy-100 bg-white p-4 shadow-bi-md">
              <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Translation · en → hi</div>
              <div className="mt-2 text-[12.5px] text-bi-navy-700">
                <span className="font-semibold">Original.</span> Welcome to module 1: positioning frameworks.
              </div>
              <div className="mt-1 text-[12.5px] text-bi-navy-500">
                <span className="font-semibold text-bi-navy-700">हिन्दी.</span> मॉड्यूल 1 में आपका स्वागत है: पोज़िशनिंग फ़्रेमवर्क्स।
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section className="border-y border-bi-navy-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {PROOF.map((p) => (
            <div key={p.stat}>
              <div className="text-[24px] font-extrabold text-bi-navy-900 tracking-tight">{p.stat}</div>
              <div className="text-[12.5px] text-bi-navy-500 mt-1 leading-relaxed">{p.caption}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="text-[11px] font-bold uppercase tracking-[.06em] text-bi-blue-700">The pipeline</div>
          <h2 className="text-[28px] font-extrabold text-bi-navy-900 tracking-tight mt-2">
            One context. Six stages. Zero stage-to-stage drift.
          </h2>
          <p className="text-[14px] text-bi-navy-500 mt-3 leading-relaxed">
            Every stage reads from your Course Profile, so your brand voice, audience, and pedagogy travel intact
            from the first module brief to the final SCORM bundle.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PIPELINE.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.name} className="rounded-xl border border-bi-navy-100 bg-white p-5 hover:border-bi-navy-200 hover:shadow-bi-sm transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-bi-blue-50 text-bi-blue-700 grid place-items-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Stage {i + 1}</div>
                    <h3 className="text-[15px] font-bold text-bi-navy-900 mt-0.5">{p.name}</h3>
                    <p className="text-[12.5px] text-bi-navy-500 mt-1 leading-relaxed">{p.note}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Differentiators */}
      <section className="bg-white border-y border-bi-navy-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-[11px] font-bold uppercase tracking-[.06em] text-bi-blue-700">Why CourseForge</div>
            <h2 className="text-[28px] font-extrabold text-bi-navy-900 tracking-tight mt-2">
              Generative is table stakes. Pedagogy + governance is the moat.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.title} className="rounded-xl border border-bi-navy-100 p-5">
                <h3 className="text-[15.5px] font-bold text-bi-navy-900">{d.title}</h3>
                <p className="text-[13px] text-bi-navy-500 mt-1.5 leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multilingual + accessibility callouts */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-bi-navy-100 bg-white p-6">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 grid place-items-center mb-3">
            <Languages className="w-4 h-4" />
          </div>
          <h3 className="text-[16px] font-bold text-bi-navy-900">15-language transcript translation</h3>
          <p className="text-[13px] text-bi-navy-500 mt-1.5 leading-relaxed">
            One click on any transcript translates to Hindi, Spanish, Arabic, French, German, Portuguese, Japanese,
            Mandarin, Korean, Russian, Indonesian, Vietnamese, Turkish — preserving paragraph breaks and technical
            terminology.
          </p>
        </div>
        <div className="rounded-xl border border-bi-navy-100 bg-white p-6">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 grid place-items-center mb-3">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-[16px] font-bold text-bi-navy-900">WCAG AA before you publish</h3>
          <p className="text-[13px] text-bi-navy-500 mt-1.5 leading-relaxed">
            Every artifact gets scanned for missing alt text, generic link text, heading-level skips, low contrast,
            and missing transcripts/captions. Findings drop into the Final Review tab grouped by severity, with one-line fix hints.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-bi-blue-100 bg-gradient-to-br from-bi-blue-50 to-bi-accent-50 text-bi-navy-900 p-10 text-center">
          <h2 className="text-[28px] font-semibold tracking-tight">Build your first branded course this afternoon.</h2>
          <p className="mt-3 text-[14px] text-bi-navy-600 max-w-xl mx-auto leading-relaxed">
            Free while you&apos;re building your first course. Bring your own Anthropic / OpenAI key when you&apos;re ready to publish.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-bi-blue-700 border border-bi-blue-200 text-[14px] font-semibold hover:bg-bi-blue-50"
            >
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-bi-navy-200 text-bi-navy-700 text-[14px] font-semibold hover:bg-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-bi-navy-100 py-8 text-center text-[11.5px] text-bi-navy-500">
        © CourseForge · Built on Next.js, Supabase, Anthropic Claude.
      </footer>
    </div>
  );
}
