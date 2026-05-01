// src/app/page.tsx — drop-in replacement for the marketing landing page.
//
// Why this file replaces the old one:
//   - Old page sold a generic "AI-Powered Course Creation" tool. That story
//     loses to Coursebox at $30/mo. The actual product is a PM↔SME production
//     OS, which is a much sharper wedge — so the page now leads with that.
//   - Shows the 9-phase pipeline as the headline mechanism (the moat).
//   - Embeds a real sample TOC (artifact-first conversion).
//   - Calls out target ICP (ed-tech course factories, university online-learning
//     teams, course agencies) instead of "for Coursera, Udemy, and university
//     platforms" generic.
//
// Style: Tailwind 4 (already in deps), no extra libs. lucide-react icons.

import Link from "next/link";
import {
  ArrowRight,
  Users,
  Workflow,
  Search,
  FileText,
  Presentation,
  Mic,
  Languages,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const PHASES = [
  { num: 1, name: "Setup", who: "PM", note: "Wizard: platform, audience, hours, theory/hands-on, project & capstone toggles." },
  { num: 2, name: "TOC + Research", who: "AI", note: "Live competitor scan, curriculum gaps, job-market alignment, Bloom's mapping." },
  { num: 3, name: "TOC Review", who: "Coach + AI + PM", note: "Comments, Ask-PM threads, AI auto-improvement loop, validate & approve." },
  { num: 4, name: "Content Briefs", who: "Coach + AI", note: "Coach Input form per video → AI generates talking points, visuals, script outline." },
  { num: 5, name: "Slide Generation", who: "AI + Coach", note: "Slide count adapts to hands-on ratio; coach edits inline or with AI assist." },
  { num: 6, name: "Slide Upload + Edit", who: "Coach + AI", note: "Drop your existing .pptx — AI reformats, restructures, adds speaker notes." },
  { num: 7, name: "Recording", who: "Coach", note: "Zoom session, direct upload, or ElevenLabs voice for drafts." },
  { num: 8, name: "Transcribe + Generate", who: "AI", note: "Whisper transcription → readings, quizzes, case studies, discussion prompts." },
  { num: 9, name: "Final Review + Publish", who: "PM", note: "Quality checklist, authority approval, ship to Coursera / Udemy / Canvas / your LMS." },
];

const SAMPLE_TOC = {
  title: "Applied Generative AI for Business",
  modules: [
    { title: "Foundations of Generative AI", lessons: 3, hours: 12 },
    { title: "Prompt Engineering for Professionals", lessons: 3, hours: 14 },
    { title: "AI Workflow Automation", lessons: 3, hours: 16 },
    { title: "Responsible AI & Future Trends", lessons: 3, hours: 10 },
  ],
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200/70 sticky top-0 bg-white/80 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold">
              CF
            </div>
            <span className="font-semibold tracking-tight">CourseForge</span>
            <span className="hidden sm:inline text-xs text-slate-500 ml-2">
              by Board Infinity
            </span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="#workflow" className="text-slate-600 hover:text-slate-900">
              How it works
            </Link>
            <Link href="#built-for" className="text-slate-600 hover:text-slate-900">
              Built for
            </Link>
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
            >
              Book a demo
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 mb-5">
              <Sparkles size={14} />
              Production OS for course creation teams
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
              The end-to-end pipeline
              <br />
              <span className="text-slate-500">from idea to published course.</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-xl">
              CourseForge is a 9-phase production workflow purpose-built for{" "}
              <strong className="text-slate-900">Project Managers</strong> and{" "}
              <strong className="text-slate-900">Subject-Matter Coaches</strong>{" "}
              to ship Coursera, Udemy, university, and corporate L&D courses in
              weeks, not quarters.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800"
              >
                Book a demo <ArrowRight size={16} />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-slate-300 font-medium hover:bg-slate-50"
              >
                Get started free
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              No credit card required.
            </p>
          </div>

          {/* Sample TOC artifact preview */}
          <div className="rounded-xl border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white p-5">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-medium text-slate-500 uppercase tracking-wider">
                Generated TOC preview
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                TOC Review · 3/13
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">
              {SAMPLE_TOC.title}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              infylearn · Generative AI · 4 modules · 12 lessons · 52 hours
            </p>
            <ul className="space-y-2">
              {SAMPLE_TOC.modules.map((m, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm border border-slate-200 rounded-md px-3 py-2 bg-white"
                >
                  <span className="text-slate-800">
                    Module {i + 1}: {m.title}
                  </span>
                  <span className="text-xs text-slate-500">
                    {m.lessons} lessons · {m.hours}h
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
              <Search size={12} />
              <span>
                Benchmarked against 7 competitor courses · Bloom&apos;s aligned · Job-market
                validated
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Why we exist */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-6">
            <Stat label="Avg course timeline before" value="6–8 weeks" sub="emails + spreadsheets + Loom + Zoom" />
            <Stat label="With CourseForge" value="2–3 weeks" sub="single pipeline, AI at every gate" />
            <Stat label="PM ↔ Coach handoff time" value="-70%" sub="structured inputs, no more chase emails" />
          </div>
        </div>
      </section>

      {/* The 9-phase workflow */}
      <section id="workflow" className="max-w-6xl mx-auto px-6 py-16">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl font-bold tracking-tight">
            One pipeline. Nine gates. Two roles.
          </h2>
          <p className="mt-3 text-slate-600">
            Every course moves through the same nine phases. AI does the heavy
            lift; the PM owns quality gates; the Coach owns subject expertise.
            Phase advancement requires explicit PM approval — no surprises in
            week six.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {PHASES.map((p) => (
            <div
              key={p.num}
              className="rounded-lg border border-slate-200 p-4 bg-white hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400">
                  PHASE {p.num.toString().padStart(2, "0")}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500">
                  {p.who}
                </span>
              </div>
              <div className="font-semibold text-slate-900">{p.name}</div>
              <div className="mt-1 text-sm text-slate-600 leading-snug">
                {p.note}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Two roles */}
      <section className="bg-slate-900 text-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-8">
          <RoleCard
            tag="PM"
            title="Project Manager"
            desc="Orchestrates the production. Sees every coach action live, owns quality gates, approves phase advancement, and ships."
            bullets={[
              "Live activity feed across every coach in every course",
              "Phase tracker dashboards for briefs, slides, recordings",
              "AI improvement loop on TOC comments",
              "Final-review checklist before publish",
            ]}
          />
          <RoleCard
            tag="Coach"
            title="Subject-Matter Expert"
            desc="Brings the domain knowledge. Reviews TOCs, fills coach-input forms, edits slides, records via Zoom or upload, signs off on accuracy."
            bullets={[
              "Structured Coach Input form per video",
              "Inline AI assist on every slide and brief",
              "Zoom + direct upload + AI voice for recordings",
              "Edit auto-transcripts before content generation",
            ]}
          />
        </div>
      </section>

      {/* Capabilities grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight mb-8">
          Everything a course factory needs
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Capability
            icon={<Workflow size={18} />}
            title="9-phase pipeline"
            desc="Setup → TOC → Briefs → Slides → Recording → Transcribe → Generate → Review → Publish."
          />
          <Capability
            icon={<Search size={18} />}
            title="AI competitive research"
            desc="Live scan of competing courses + job-market signal + curriculum gap analysis before TOC generation."
          />
          <Capability
            icon={<FileText size={18} />}
            title="Bloom's-aligned objectives"
            desc="Every module gets learning objectives at the right cognitive level, automatically."
          />
          <Capability
            icon={<Presentation size={18} />}
            title="Slides with speaker notes"
            desc="AI-generated decks plus drag-and-drop .pptx upload + AI reformatting."
          />
          <Capability
            icon={<Mic size={18} />}
            title="Recording, three ways"
            desc="Zoom integration, direct upload, or ElevenLabs voice for prototype narration."
          />
          <Capability
            icon={<Languages size={18} />}
            title="Multi-platform export"
            desc="One click → Coursera lecture pack, Udemy upload pack, SCORM 1.2 / xAPI zip, YouTube cut."
          />
          <Capability
            icon={<Users size={18} />}
            title="Comment-driven AI rewrite"
            desc="Comments aggregate. PM clicks Send for AI Improvement. The TOC comes back fixed."
          />
          <Capability
            icon={<ShieldCheck size={18} />}
            title="Pedagogy linting"
            desc="Bloom's progression checks, time-budget compliance, assessment-objective alignment, accessibility flags."
          />
          <Capability
            icon={<Sparkles size={18} />}
            title="Brand kits per client"
            desc="Agencies serving multiple ed-tech brands keep each client's templates, voice, and palette isolated."
          />
        </div>
      </section>

      {/* Built for */}
      <section id="built-for" className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold tracking-tight mb-8">
            Built for course production teams
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <BuiltFor
              title="Ed-tech course factories"
              desc="upGrad, Simplilearn, Scaler, Emeritus, Eruditus, Newton School, Great Learning — anyone running PM + SME production at MOOC scale."
            />
            <BuiltFor
              title="University online-learning teams"
              desc="Centers for online learning at top universities running structured course production for Coursera / edX partnerships and internal LMS."
            />
            <BuiltFor
              title="Course agencies & studios"
              desc="Production studios building branded courses for B2B clients who need brand kits, multi-platform export, and a clean handoff."
            />
          </div>
          <p className="mt-8 text-sm text-slate-500 max-w-3xl">
            We are <strong>not</strong> a marketplace, an LMS, or a course-hosting
            platform. Coursera, Udemy, Canvas, and your internal LMS already do
            that well. CourseForge is the production layer that feeds them.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Stop chasing coaches in spreadsheets.
        </h2>
        <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
          Run your next course through the pipeline. See the dashboards, the AI
          handoffs, the quality gates — on your real subject matter.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800"
          >
            Book a demo <ArrowRight size={16} />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-slate-300 font-medium hover:bg-slate-50"
          >
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 text-sm text-slate-500">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} CourseForge · Board Infinity</span>
          <span>Powered by Claude · Whisper · ElevenLabs</span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600">{sub}</div>
    </div>
  );
}

function RoleCard({
  tag,
  title,
  desc,
  bullets,
}: {
  tag: string;
  title: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-700 p-6">
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-white text-slate-900 font-bold mb-4">
        {tag}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-slate-300">{desc}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-slate-300">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-slate-500">›</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Capability({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 bg-white">
      <div className="w-9 h-9 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-slate-600 mt-1">{desc}</div>
    </div>
  );
}

function BuiltFor({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="font-semibold text-slate-900">{title}</div>
      <p className="text-sm text-slate-600 mt-2">{desc}</p>
    </div>
  );
}
