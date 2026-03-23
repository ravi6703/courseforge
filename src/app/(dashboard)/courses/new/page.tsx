"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const PLATFORMS = [
  { id: "coursera", name: "Coursera", desc: "AI Dialogues, Role Plays enabled. Coursera template auto-applied.", icon: "🎓" },
  { id: "udemy", name: "Udemy", desc: "AI Dialogues, Role Plays disabled. Udemy-optimized structure.", icon: "📚" },
  { id: "university", name: "University", desc: "Custom LMS format. AI Dialogues, Role Plays disabled.", icon: "🏛️" },
  { id: "other", name: "Other", desc: "Flexible structure. Configure all components manually.", icon: "⚙️" },
];

const DEFAULT_CONTENT_MIX = {
  video: 30, reading: 20, practice_quiz: 15, graded_quiz: 10,
  plugin: 8, discussion_prompt: 5, case_study: 5, ai_dialogue: 4, role_play: 3,
};

const THRESHOLDS: Record<string, { min: number; max: number; label: string }> = {
  video: { min: 20, max: 50, label: "Video" },
  reading: { min: 10, max: 30, label: "Reading" },
  practice_quiz: { min: 8, max: 20, label: "Practice Quiz" },
  graded_quiz: { min: 5, max: 15, label: "Graded Quiz" },
  plugin: { min: 3, max: 12, label: "Plugin (Interactive)" },
  discussion_prompt: { min: 1, max: 5, label: "Discussion Prompt" },
  case_study: { min: 2, max: 8, label: "Case Study" },
  ai_dialogue: { min: 0, max: 8, label: "AI Dialogue" },
  role_play: { min: 0, max: 6, label: "Role Play" },
};

export default function NewCoursePage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Platform
  const [platform, setPlatform] = useState("coursera");

  // Step 2: Configuration
  const [config, setConfig] = useState({
    title: "",
    domain: "",
    course_level: "intermediate",
    target_audience: "Working professionals",
    theory_percent: 60,
    capstone_required: true,
    total_length_hours: 30,
    video_length_minutes: 10,
  });

  // Step 3: Content Mix
  const [contentMix, setContentMix] = useState({ ...DEFAULT_CONTENT_MIX });

  // Step 4: Components Toggle
  const [components, setComponents] = useState({
    video: true, practice_quiz: true, graded_quiz: true, reading: true,
    plugin: true, coding_exercise: false, ai_dialogue: true,
    discussion_prompt: true, case_study: true, role_play: true, glossary: true,
  });

  // Update components based on platform
  function handlePlatformSelect(p: string) {
    setPlatform(p);
    if (p === "udemy" || p === "university") {
      setComponents((prev) => ({ ...prev, ai_dialogue: false, role_play: false }));
      setContentMix((prev) => {
        const freed = prev.ai_dialogue + prev.role_play;
        return { ...prev, ai_dialogue: 0, role_play: 0, video: prev.video + freed };
      });
    } else {
      setComponents((prev) => ({ ...prev, ai_dialogue: true, role_play: true }));
      setContentMix({ ...DEFAULT_CONTENT_MIX });
    }
  }

  function handleSliderChange(key: string, value: number) {
    const threshold = THRESHOLDS[key];
    const clamped = Math.max(threshold.min, Math.min(threshold.max, value));
    const oldValue = contentMix[key as keyof typeof contentMix];
    const diff = clamped - oldValue;

    // Adjust video to compensate (keeps total at 100)
    const newVideo = contentMix.video - diff;
    if (newVideo >= THRESHOLDS.video.min && newVideo <= THRESHOLDS.video.max) {
      setContentMix((prev) => ({ ...prev, [key]: clamped, video: newVideo }));
    }
  }

  const totalMix = Object.values(contentMix).reduce((a, b) => a + b, 0);

  async function handleCreate() {
    setLoading(true);

    // Get the current user's ID for created_by
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to create a course.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("courses")
      .insert({
        created_by: user.id,
        title: config.title,
        short_description: `${config.domain} course for ${config.target_audience}`,
        platform,
        domain: config.domain,
        course_level: config.course_level,
        target_audience: config.target_audience,
        theory_hands_ratio: { theory: config.theory_percent, hands_on: 100 - config.theory_percent },
        capstone_required: config.capstone_required,
        total_length_hours: config.total_length_hours,
        video_length_minutes: config.video_length_minutes,
        content_mix: contentMix,
        enabled_components: components,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      router.push(`/courses/${data.id}`);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              s <= step ? "bg-[hsl(217,91%,60%)] text-white" : "bg-[hsl(217,33%,17%)] text-[hsl(215,20%,45%)]"
            }`}>
              {s}
            </div>
            <span className={`text-xs hidden sm:block ${s <= step ? "text-[hsl(210,40%,98%)]" : "text-[hsl(215,20%,45%)]"}`}>
              {s === 1 ? "Platform" : s === 2 ? "Configure" : s === 3 ? "Content Mix" : "Components"}
            </span>
            {s < 4 && <div className={`flex-1 h-0.5 ${s < step ? "bg-[hsl(217,91%,60%)]" : "bg-[hsl(217,33%,17%)]"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl p-8">
        {/* Step 1: Platform Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-[hsl(210,40%,98%)] mb-2">Select Target Platform</h2>
            <p className="text-sm text-[hsl(215,20%,65%)] mb-6">This determines the course skeleton, templates, and available content types.</p>
            <div className="grid grid-cols-2 gap-4">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlatformSelect(p.id)}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    platform === p.id
                      ? "border-[hsl(217,91%,60%)] bg-[hsl(217,91%,60%,0.05)]"
                      : "border-[hsl(217,33%,17%)] hover:border-[hsl(215,20%,45%)]"
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <h3 className="mt-2 font-semibold text-[hsl(210,40%,98%)]">{p.name}</h3>
                  <p className="text-xs text-[hsl(215,20%,65%)] mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Course Configuration */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-[hsl(210,40%,98%)] mb-6">Course Configuration</h2>
            <div className="space-y-5">
              <InputField label="Course Topic / Title" value={config.title} onChange={(v) => setConfig({ ...config, title: v })} placeholder="e.g., Data Science Fundamentals" required />
              <InputField label="Domain" value={config.domain} onChange={(v) => setConfig({ ...config, domain: v })} placeholder="e.g., Data Science, Marketing, Finance" required />

              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Course Level" value={config.course_level} onChange={(v) => setConfig({ ...config, course_level: v })}
                  options={[
                    { value: "beginner", label: "Beginner" },
                    { value: "intermediate", label: "Intermediate" },
                    { value: "advanced", label: "Advanced" },
                    { value: "mixed", label: "Mixed" },
                  ]}
                />
                <InputField label="Target Audience" value={config.target_audience} onChange={(v) => setConfig({ ...config, target_audience: v })} placeholder="Working professionals" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[hsl(215,20%,65%)] mb-1.5">Total Course Length (hrs)</label>
                  <input type="number" value={config.total_length_hours} onChange={(e) => setConfig({ ...config, total_length_hours: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-lg bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] focus:outline-none focus:ring-2 focus:ring-[hsl(217,91%,60%)] transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(215,20%,65%)] mb-1.5">Avg Video Length (min)</label>
                  <input type="number" value={config.video_length_minutes} onChange={(e) => setConfig({ ...config, video_length_minutes: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-lg bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] focus:outline-none focus:ring-2 focus:ring-[hsl(217,91%,60%)] transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(215,20%,65%)] mb-1.5">Theory / Hands-on Split</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={20} max={80} value={config.theory_percent} onChange={(e) => setConfig({ ...config, theory_percent: Number(e.target.value) })}
                      className="flex-1 accent-[hsl(217,91%,60%)]" />
                    <span className="text-sm text-[hsl(210,40%,98%)] w-20 text-right">{config.theory_percent}/{100 - config.theory_percent}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)]">
                <input type="checkbox" checked={config.capstone_required} onChange={(e) => setConfig({ ...config, capstone_required: e.target.checked })}
                  className="w-4 h-4 rounded accent-[hsl(217,91%,60%)]" />
                <div>
                  <p className="text-sm font-medium text-[hsl(210,40%,98%)]">Include Capstone Project</p>
                  <p className="text-xs text-[hsl(215,20%,65%)]">Adds a final capstone module with hands-on project work</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Content Mix Sliders */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-[hsl(210,40%,98%)] mb-2">Content Distribution</h2>
            <p className="text-sm text-[hsl(215,20%,65%)] mb-6">Adjust the percentage split of content types. Total must equal 100%.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {Object.entries(THRESHOLDS).map(([key, threshold]) => {
                  const value = contentMix[key as keyof typeof contentMix];
                  const isDisabled = !components[key as keyof typeof components];
                  return (
                    <div key={key} className={`flex items-center gap-4 ${isDisabled ? "opacity-30" : ""}`}>
                      <span className="text-sm text-[hsl(215,20%,65%)] w-32 text-right">{threshold.label}</span>
                      <input
                        type="range"
                        min={threshold.min}
                        max={threshold.max}
                        value={value}
                        onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                        disabled={isDisabled}
                        className="flex-1 accent-[hsl(217,91%,60%)] h-1.5"
                      />
                      <span className="text-sm font-mono text-[hsl(210,40%,98%)] w-12 text-right">{value}%</span>
                      <div className="w-24 h-2 rounded-full bg-[hsl(217,33%,17%)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[hsl(217,91%,60%)] transition-all"
                          style={{ width: `${(value / threshold.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sidebar */}
              <div className="bg-[hsl(222,47%,6%)] rounded-lg p-5 border border-[hsl(217,33%,17%)]">
                <h3 className="text-sm font-semibold text-[hsl(210,40%,98%)] mb-3">Summary</h3>
                <div className={`text-2xl font-bold mb-2 ${totalMix === 100 ? "text-green-400" : "text-red-400"}`}>
                  {totalMix}%
                </div>
                <p className="text-xs text-[hsl(215,20%,65%)] mb-4">
                  {totalMix === 100 ? "Valid distribution" : `Adjust to reach 100% (${totalMix > 100 ? "over" : "under"} by ${Math.abs(100 - totalMix)}%)`}
                </p>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[hsl(215,20%,45%)] uppercase">Ideal Benchmarks</p>
                  <p className="text-xs text-[hsl(215,20%,65%)]">Video: 25-35%</p>
                  <p className="text-xs text-[hsl(215,20%,65%)]">Reading: 15-25%</p>
                  <p className="text-xs text-[hsl(215,20%,65%)]">Practice Quiz: 12-18%</p>
                  <p className="text-xs text-[hsl(215,20%,65%)]">Graded Quiz: 8-12%</p>
                </div>

                <button
                  onClick={() => setContentMix({ ...DEFAULT_CONTENT_MIX })}
                  className="mt-4 w-full py-2 rounded-lg border border-[hsl(217,33%,17%)] text-xs text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)] transition-all"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Toggle Components */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold text-[hsl(210,40%,98%)] mb-2">Toggle Content Components</h2>
            <p className="text-sm text-[hsl(215,20%,65%)] mb-6">Enable or disable content types for this course.</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(components).map(([key, enabled]) => {
                const isPlatformForced = (key === "ai_dialogue" || key === "role_play") && (platform === "udemy" || platform === "university");
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                      enabled ? "border-[hsl(217,91%,60%,0.3)] bg-[hsl(217,91%,60%,0.05)]" : "border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)]"
                    } ${isPlatformForced ? "opacity-40" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setComponents({ ...components, [key]: e.target.checked })}
                      disabled={isPlatformForced}
                      className="w-4 h-4 rounded accent-[hsl(217,91%,60%)]"
                    />
                    <div>
                      <p className="text-sm font-medium text-[hsl(210,40%,98%)] capitalize">
                        {key.replace(/_/g, " ")}
                      </p>
                      {isPlatformForced && (
                        <p className="text-xs text-[hsl(30,85%,50%)]">Disabled for {platform}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[hsl(217,33%,17%)]">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="px-6 py-2.5 rounded-lg border border-[hsl(217,33%,17%)] text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)] transition-all text-sm">
              Back
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && (!config.title || !config.domain)}
              className="px-6 py-2.5 rounded-lg bg-[hsl(217,91%,60%)] text-white font-medium hover:bg-[hsl(217,91%,50%)] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading || totalMix !== 100}
              className="px-6 py-2.5 rounded-lg bg-[hsl(152,69%,40%)] text-white font-medium hover:bg-[hsl(152,69%,35%)] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-2"
            >
              {loading ? "Creating..." : "Create Course & Generate TOC"}
              {!loading && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[hsl(215,20%,65%)] mb-1.5">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-4 py-2.5 rounded-lg bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder-[hsl(215,20%,45%)] focus:outline-none focus:ring-2 focus:ring-[hsl(217,91%,60%)] transition-all" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[hsl(215,20%,65%)] mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] focus:outline-none focus:ring-2 focus:ring-[hsl(217,91%,60%)] transition-all">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
