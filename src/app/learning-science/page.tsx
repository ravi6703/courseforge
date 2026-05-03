// Public, indexable methodology page. Linked from every /health-score page.
// This is the moat: it converts an internal lint pass into a public,
// citation-backed standard that other AI course tools can be measured
// against. Static — no DB calls — so it's fast and SEO-friendly.

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Science — How CourseForge measures pedagogy · CourseForge",
  description:
    "The seven dimensions CourseForge uses to grade course pedagogy: Bloom's progression, time budget, theory/hands-on balance, objective–assessment alignment, redundancy, capstone, and lesson length. Citations to Bloom, Mayer, Sweller, Kirkpatrick.",
  openGraph: {
    title: "How CourseForge measures pedagogy",
    description:
      "Seven independent learning-science dimensions with citations. Used to compute every Course Health Score.",
    type: "article",
  },
};

export default function LearningSciencePage() {
  return (
    <main className="min-h-screen bg-bi-navy-50">
      <header className="bg-bi-navy-700 text-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">CourseForge</Link>
          <div className="text-xs text-white/70">Methodology</div>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-slate prose-headings:text-bi-navy-700 prose-a:text-bi-blue-600">
        <div className="text-xs uppercase tracking-wider text-bi-navy-600 mb-2">CourseForge Learning Science</div>
        <h1 className="text-4xl font-bold text-bi-navy-700 leading-tight mb-3">How we measure course pedagogy</h1>
        <p className="text-lg text-bi-navy-600 mb-8">
          Most AI course tools generate content fast. We grade whether the content actually teaches.
          The Course Health Score is computed from seven independent dimensions drawn from the learning-science literature.
          This page documents each one — what we check, why we check it, and the source we lean on.
        </p>

        <h2>Why a public score</h2>
        <p>
          A score is only useful if it's defensible. CourseForge publishes both the methodology and, at the course
          owner's discretion, the result — so a coach, a learner, or an L&amp;D team can independently audit a
          course before they invest weeks of time. We borrow this stance from open quality standards in adjacent
          fields: nutrition labels, energy ratings, software security scorecards. None of those tell you the
          right answer; they tell you what was measured. So does this.
        </p>
        <p>
          The score is bounded 0–100. Critical findings cost 15 points each; warnings 5; info 1. We cap at 0
          rather than going negative because below a certain threshold the score stops being useful — the
          recommendations at the dimension level are.
        </p>

        <h2>The seven dimensions</h2>

        <h3>1. Bloom&apos;s progression</h3>
        <p>
          Bloom&apos;s revised taxonomy<sup><a href="#ref-1">[1]</a></sup> ranks cognitive demand from
          remember → understand → apply → analyze → evaluate → create. A well-built course rises through
          this hierarchy: foundational lessons recall and explain; later lessons demand analysis, evaluation,
          and original work. We compute the mean Bloom rank per module, flag courses whose first third
          averages above 3.5 (too cognitively demanding too early) or whose last third averages below 3.0
          (the course never asks the learner to do anything beyond memorisation), and call out sharp
          inversions where one module drops more than 1.5 ranks below the previous one.
        </p>
        <p className="text-sm text-bi-navy-600">
          <em>Why it matters:</em> Front-loaded courses lose learners in the first week; flat-finish courses
          produce students who can recite definitions but can&apos;t apply them.
        </p>

        <h3>2. Time budget</h3>
        <p>
          Coaches set <code>duration_weeks</code> and <code>hours_per_week</code> at course creation. The sum
          of authored module hours should match within ~20%. Drift is treated as a warning (20–40% off) or a
          critical (more than 40%). The fix is mechanical — add or trim — but the consequence isn&apos;t.
          Misstated time budgets are the single biggest predictor of MOOC dropout<sup><a href="#ref-2">[2]</a></sup>:
          a learner who signs up for a six-week course expects a six-week course.
        </p>

        <h3>3. Theory ↔ hands-on balance</h3>
        <p>
          Each video is tagged <code>is_handson = true</code> or false. The actual ratio across the course
          should be within 15 percentage points of the configured target (default 70% theory). Mayer&apos;s work
          on multimedia learning<sup><a href="#ref-3">[3]</a></sup> and Sweller&apos;s cognitive load theory
          <sup><a href="#ref-4">[4]</a></sup> both argue that comprehension without retrieval practice
          decays fast. A course of pure lecture is rarely the right answer; nor is a course of pure lab
          without enough scaffolding to know what the lab is for. We don&apos;t prescribe the ratio — coaches
          do — but we hold the course to the ratio it claimed.
        </p>

        <h3>4. Objective ↔ assessment alignment</h3>
        <p>
          Every learning objective should be assessed by at least one question; every question should map to
          an objective. This is the principle behind Wiggins &amp; McTighe&apos;s &quot;backward design&quot;
          <sup><a href="#ref-5">[5]</a></sup>: you can&apos;t verify learning if you don&apos;t verify it on the
          thing you said the course was for. We flag uncovered objectives as a warning (or a critical when
          more than a third are uncovered) and orphan questions — those whose target objective no longer
          exists — as info-level cleanup.
        </p>

        <h3>5. Lesson redundancy</h3>
        <p>
          Two lessons whose titles share more than 70% of their tokens (Jaccard similarity) are flagged for
          merge or differentiation. Duplicate lessons confuse learners about what&apos;s required, dilute
          assessment alignment, and inflate the apparent length of the course. We cap the noise at five
          findings — beyond that the broader course structure needs review, not individual title edits.
        </p>

        <h3>6. Capstone presence</h3>
        <p>
          If the course advertises a capstone (the <code>capstone</code> flag is true), the final module
          must be marked <code>is_capstone</code>. Kirkpatrick&apos;s evaluation model<sup><a href="#ref-6">[6]</a></sup>
          treats &quot;application back at work&quot; as the highest level of learning measurement. A course
          that promises a capstone and doesn&apos;t deliver one breaks an explicit contract — it&apos;s the
          single fastest way to lose a learner&apos;s trust at the moment they were about to invest the most.
        </p>

        <h3>7. Lesson length reasonableness</h3>
        <p>
          Lessons over 90 minutes of video are rarely completed in one sitting. Modern learners — corporate
          and academic both — show a steep drop-off past ~60 minutes of continuous video; this is consistent
          across the MOOC literature and matches what we&apos;ve seen across Board Infinity&apos;s own data.
          We split this into a warning rather than a critical because the right fix depends on context:
          sometimes a 95-minute lab is the right call; sometimes it&apos;s a sign two lessons got merged.
          The score lets the coach decide.
        </p>

        <h2>What we don&apos;t score (yet)</h2>
        <p>
          Three dimensions are on the roadmap but not yet weighted into the score:
        </p>
        <ul>
          <li>
            <strong>Cultural relevance</strong> — does the course meet learners where they are linguistically and contextually?
          </li>
          <li>
            <strong>Accessibility</strong> — WCAG 2.1 AA compliance for slides, transcripts, and assessments.
          </li>
          <li>
            <strong>Reading-level fit</strong> — does the prose match the stated audience level (beginner, intermediate, advanced)?
          </li>
        </ul>
        <p>
          When we add these we&apos;ll publish a methodology update here and re-grade existing courses. Coaches whose courses move will be notified before the public page changes.
        </p>

        <h2>References</h2>
        <ol className="text-sm">
          <li id="ref-1">
            Anderson, L. W., &amp; Krathwohl, D. R. (Eds.). (2001). <em>A Taxonomy for Learning, Teaching, and Assessing: A Revision of Bloom&apos;s Taxonomy of Educational Objectives.</em> Longman.
          </li>
          <li id="ref-2">
            Reich, J., &amp; Ruipérez-Valiente, J. A. (2019). The MOOC pivot. <em>Science</em>, 363(6423), 130–131.
          </li>
          <li id="ref-3">
            Mayer, R. E. (2009). <em>Multimedia Learning</em> (2nd ed.). Cambridge University Press.
          </li>
          <li id="ref-4">
            Sweller, J., van Merrienboer, J. J. G., &amp; Paas, F. (1998). Cognitive architecture and instructional design. <em>Educational Psychology Review</em>, 10(3), 251–296.
          </li>
          <li id="ref-5">
            Wiggins, G., &amp; McTighe, J. (2005). <em>Understanding by Design</em> (2nd ed.). ASCD.
          </li>
          <li id="ref-6">
            Kirkpatrick, D. L., &amp; Kirkpatrick, J. D. (2006). <em>Evaluating Training Programs: The Four Levels</em> (3rd ed.). Berrett-Koehler.
          </li>
        </ol>

        <p className="mt-12 text-sm text-bi-navy-600">
          Have a critique of the methodology? <a href="mailto:hello@boardinfinity.com" className="text-bi-blue-600 underline">hello@boardinfinity.com</a>.
          We change the score formula in the open — versioned in git, announced here.
        </p>
      </article>
    </main>
  );
}
