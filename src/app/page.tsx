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
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

const PHASES = [
  { num: 1, name: "Setup", who: "PM", note: "Wizard: platform, audience, hours, theory/hands-on, project & capstone toggles." },
  { num: 2, name: "TOC + Research", who: "AI", note: "Live competitor scan, curriculum gaps, job-market alignment, Bloom's mapping." },
  { num: 3, name: "TOC Review", who: "Coach + AI + PM", note: "Comments, Ask-PM threads, AI auto-improvement loop, validate & approve." },
  { num: 4, name: "Content Briefs", who: "Coach + AI", note: "Coach Input form per video → AI generates talking points, visuals, script outline." },
  { num: 5, name: "Slide Generation", who: "AI + Coach", note: "Slide count adapts to hands-on ratio; coach edits inline or with AI assist." },
  { num: 6, name: "Slide Upload + Edit", who: "Coach + AI", note: "Drop your existing .pptx — parsed, AI rewrites titles + bullets + speaker notes." },
  { num: 7, name: "Recording", who: "Coach", note: "Zoom OAuth + auto-imported recordings, direct upload, or ElevenLabs voice." },
  { num: 8, name: "Transcribe + Generate", who: "AI", note: "OpenAI Whisper transcription → readings, quizzes, case studies, discussion prompts." },
  { num: 9, name: "Final Review + Publish", who: "PM", note: "Quality checklist, authority approval, ship to Coursera / Udemy / Canvas / your LMS." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-bi-navy-50 text-bi-navy-700">
      {/* Header */}
      <header className="border-b border-bi-navy-200 sticky top-0 bg-white/95 backdrop-blur z-10 shadow-bi-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-bi-navy-700 text-white flex items-center justify-center font-bold">
              CF
            </div>
            <span className="font-bold tracking-tight text-bi-navy-700">CourseForge</span>
            <span className="hidden sm:inline text-xs text-bi-navy-600 ml-2">
              by Board Infinity
            </span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="#workflow" className="text-bi-navy-600 hover:text-bi-navy-700">
              How it works
            </Link>
            <Link href="#built-for" className="text-bi-navy-600 hover:text-bi-navy-700">
              Built for
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm">
                Book a demo
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-bi-blue-700 bg-bi-blue-50 border border-bi-blue-200 rounded-full px-4 py-2 mb-6">
              <Sparkles size={14} />
              Production OS for course creators
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] text-bi-navy-700 mb-6">
              The 9-phase pipeline
              <br />
              <span className="text-bi-blue-600">from idea to published course.</span>
            </h1>
            <p className="text-lg text-bi-navy-600 mb-8 max-w-lg">
              Board Infinity's CourseForge is the production OS used by course creators to deliver world-class training for Coursera, Udemy, universities, and corporate learning teams.
            </p>
            <div className="flex gap-4">
              <Link href="/signup">
                <Button variant="primary" size="lg" className="gap-2">
                  Get started <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="#workflow">
                <Button variant="secondary" size="lg">
                  Learn more
                </Button>
              </Link>
            </div>
          </div>
          <Card className="border-2 border-bi-blue-200 bg-gradient-to-br from-bi-blue-50 to-white">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-bi-navy-700 mb-4">Sample Course</h3>
              <p className="text-sm text-bi-navy-600 mb-6">Applied Generative AI for Business</p>
              <div className="space-y-3">
                {[
                  { title: "Foundations of Generative AI", lessons: 3, hours: 12 },
                  { title: "Prompt Engineering for Professionals", lessons: 3, hours: 14 },
                  { title: "AI Workflow Automation", lessons: 3, hours: 16 },
                ].map((m, i) => (
                  <div key={i} className="text-sm text-bi-navy-600">
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-bi-navy-500">{m.lessons} lessons • {m.hours}h</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-bi-navy-700 mb-4">The 9-Phase Pipeline</h2>
          <p className="text-lg text-bi-navy-600 max-w-2xl mx-auto">
            Every course follows the same proven workflow, from ideation to publication.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PHASES.map((phase) => (
            <Card key={phase.num}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-bi-accent-100 text-bi-accent-700 flex items-center justify-center font-bold">
                  {phase.num}
                </div>
                <h3 className="font-semibold text-bi-navy-700">{phase.name}</h3>
              </div>
              <p className="text-sm text-bi-navy-600 mb-3">{phase.note}</p>
              <p className="text-xs font-medium text-bi-blue-600 bg-bi-blue-50 px-2 py-1 rounded w-fit">
                {phase.who}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-bi-navy-700 mb-12 text-center">Why CourseForge</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: Workflow, title: "End-to-End Pipeline", desc: "From ideation to publication, manage every phase in one place." },
            { icon: Users, title: "Built for Teams", desc: "PM, coach, and AI work in seamless collaboration." },
            { icon: FileText, title: "AI-Powered Generation", desc: "Auto-generate briefs, slides, quizzes, and more." },
            { icon: ShieldCheck, title: "Quality Assured", desc: "Built-in checklists and peer review at every stage." },
          ].map((feature, i) => (
            <Card key={i} className="flex gap-4">
              <feature.icon className="w-8 h-8 text-bi-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-bi-navy-700 mb-2">{feature.title}</h3>
                <p className="text-sm text-bi-navy-600">{feature.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <Card className="bg-gradient-to-r from-bi-navy-700 to-bi-blue-600 text-white border-0 p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to build your course?</h2>
          <p className="text-lg mb-8 opacity-90">Join the world-class course creation teams using CourseForge.</p>
          <Link href="/signup">
            <Button variant="primary" size="lg" className="bg-bi-accent-600 hover:bg-bi-accent-700 text-bi-navy-700 gap-2">
              Get started free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-bi-navy-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-bi-navy-600">
          <p>&copy; 2025 Board Infinity. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
