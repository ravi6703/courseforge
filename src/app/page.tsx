import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[hsl(222,47%,6%)] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-[hsl(217,33%,17%)]">
        <h1 className="text-xl font-bold text-[hsl(217,91%,60%)]">
          Course<span className="text-[hsl(30,85%,50%)]">Forge</span>
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)] transition-all">
            Sign In
          </Link>
          <Link href="/signup" className="text-sm px-4 py-2 rounded-lg bg-[hsl(217,91%,60%)] text-white font-medium hover:bg-[hsl(217,91%,50%)] transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(217,91%,60%,0.1)] border border-[hsl(217,91%,60%,0.2)] text-[hsl(217,91%,60%)] text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(152,69%,40%)]" />
            AI-Powered Course Creation
          </div>

          <h2 className="text-5xl font-bold text-[hsl(210,40%,98%)] leading-tight mb-6">
            Build world-class courses{" "}
            <span className="text-[hsl(217,91%,60%)]">3x faster</span>
          </h2>

          <p className="text-lg text-[hsl(215,20%,65%)] mb-8 max-w-2xl mx-auto">
            CourseForge automates TOC generation, PPT creation, video recording, assessments, and content review — for Coursera, Udemy, and university platforms.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" className="px-8 py-3 rounded-lg bg-[hsl(217,91%,60%)] text-white font-medium hover:bg-[hsl(217,91%,50%)] transition-all text-sm">
              Start Building Courses
            </Link>
            <Link href="/login" className="px-8 py-3 rounded-lg border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] font-medium hover:bg-[hsl(217,33%,17%)] transition-all text-sm">
              Sign In
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-6 mt-16">
            {[
              { title: "AI TOC Generation", desc: "Generate structured TOC with Bloom's taxonomy objectives automatically" },
              { title: "Smart PPT Studio", desc: "AI creates presentations with templates, images, and speaker notes" },
              { title: "In-Browser Recording", desc: "Record videos with AI voice, scripts, or natural narration" },
            ].map((f, i) => (
              <div key={i} className="p-5 rounded-xl bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] text-left">
                <h3 className="text-sm font-semibold text-[hsl(210,40%,98%)] mb-2">{f.title}</h3>
                <p className="text-xs text-[hsl(215,20%,65%)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
