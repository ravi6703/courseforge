"use client";

// First-run onboarding wizard.
//
// Triggered automatically from the layout when a logged-in user has no
// `onboarding.completed_at` in their user_metadata. Four steps:
//   1. Welcome / role
//   2. Brand kit (logo url, primary + accent color)
//   3. Default platform
//   4. Start: blank vs. sample course
//
// State persists on auth.users.user_metadata.onboarding so we don't need
// a new table, and works for any auth provider.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronRight, ChevronLeft, Check, Loader2, Sparkles, Building2, Palette, Layers, BookOpen } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface WizardState {
  role: "pm" | "coach";
  org_name: string;
  brand_logo_url: string;
  brand_primary: string;
  brand_accent: string;
  default_platform: "coursera" | "udemy" | "university" | "infylearn" | "custom";
  starter: "blank" | "sample";
}

const DEFAULT: WizardState = {
  role: "pm",
  org_name: "",
  brand_logo_url: "",
  brand_primary: "#3F6FA8",
  brand_accent:  "#B68F2A",
  default_platform: "infylearn",
  starter: "blank",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<WizardState>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserEmail(user.email ?? "");
      setUserName(user.user_metadata?.name ?? user.email ?? "");
      // Pre-fill what we already know.
      setState((s) => ({
        ...s,
        role: (user.user_metadata?.role as "pm" | "coach") ?? "pm",
        org_name: user.user_metadata?.org_name ?? "",
      }));
      setLoading(false);
    };
    init();
  }, [router]);

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      const sb = createClient();
      const { error: upErr } = await sb.auth.updateUser({
        data: {
          role: state.role,
          org_name: state.org_name,
          onboarding: {
            completed_at: new Date().toISOString(),
            brand_logo_url: state.brand_logo_url || undefined,
            brand_primary: state.brand_primary,
            brand_accent:  state.brand_accent,
            default_platform: state.default_platform,
          },
        },
      });
      if (upErr) throw new Error(upErr.message);
      // Path the user to their first stop based on their starter pick.
      router.push(state.starter === "sample" ? "/dashboard?demo=1" : "/create");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-bi-navy-500" />
      </div>
    );
  }

  const next = () => setStep((s) => Math.min(4, s + 1) as Step);
  const back = () => setStep((s) => Math.max(1, s - 1) as Step);
  const canNext =
    step === 1 ? Boolean(state.org_name.trim()) :
    step === 2 ? true :
    step === 3 ? Boolean(state.default_platform) :
                 true;

  return (
    <div className="min-h-screen bg-bi-navy-50 grid place-items-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-bi-navy-100 shadow-bi-md p-8">
        <header className="flex items-start justify-between mb-6">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Welcome to CourseForge</div>
            <h1 className="text-[22px] font-extrabold text-bi-navy-900 tracking-tight">Let&apos;s set up your workspace, {userName.split(" ")[0]}</h1>
            <p className="text-[12.5px] text-bi-navy-500 mt-0.5">{userEmail} · {step}/4</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[12px] text-bi-navy-500 hover:text-bi-navy-900"
          >
            Skip for now
          </button>
        </header>

        <Stepper step={step} />

        <main className="min-h-[280px]">
          {step === 1 && (
            <Section icon={Building2} title="Tell us about your team" subtitle="Two quick details so we can label things correctly.">
              <Field label="Your role">
                <div className="flex gap-2">
                  {(["pm", "coach"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setState((s) => ({ ...s, role: r }))}
                      className={`px-4 py-2 rounded-md border text-[13px] font-semibold capitalize ${
                        state.role === r
                          ? "bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 border-bi-navy-900"
                          : "border-bi-navy-200 text-bi-navy-700 hover:bg-bi-navy-50"
                      }`}
                    >{r === "pm" ? "Program manager" : "Coach"}</button>
                  ))}
                </div>
              </Field>
              <Field label="Organization or workspace name">
                <input
                  value={state.org_name}
                  onChange={(e) => setState((s) => ({ ...s, org_name: e.target.value }))}
                  placeholder="e.g. Board Infinity, Acme L&D, Independent"
                  className="w-full px-3 py-2 border border-bi-navy-200 rounded-md text-[13.5px]"
                />
              </Field>
            </Section>
          )}

          {step === 2 && (
            <Section icon={Palette} title="Bring your brand" subtitle="Used on every slide deck, SCORM bundle, and reading export. Skip and add later if you don't have these yet.">
              <Field label="Logo URL">
                <input
                  type="url"
                  value={state.brand_logo_url}
                  onChange={(e) => setState((s) => ({ ...s, brand_logo_url: e.target.value }))}
                  placeholder="https://yourcompany.com/logo.png"
                  className="w-full px-3 py-2 border border-bi-navy-200 rounded-md text-[13.5px]"
                />
                <p className="text-[11px] text-bi-navy-500 mt-1">PNG or JPG, ≥256×256. Embedded in exported decks.</p>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Primary color">
                  <div className="flex items-center gap-2">
                    <input type="color" value={state.brand_primary} onChange={(e) => setState((s) => ({ ...s, brand_primary: e.target.value }))} className="h-10 w-12 rounded-md border border-bi-navy-200" />
                    <input value={state.brand_primary} onChange={(e) => setState((s) => ({ ...s, brand_primary: e.target.value }))} className="flex-1 px-3 py-2 border border-bi-navy-200 rounded-md text-[13.5px]" />
                  </div>
                </Field>
                <Field label="Accent color">
                  <div className="flex items-center gap-2">
                    <input type="color" value={state.brand_accent} onChange={(e) => setState((s) => ({ ...s, brand_accent: e.target.value }))} className="h-10 w-12 rounded-md border border-bi-navy-200" />
                    <input value={state.brand_accent} onChange={(e) => setState((s) => ({ ...s, brand_accent: e.target.value }))} className="flex-1 px-3 py-2 border border-bi-navy-200 rounded-md text-[13.5px]" />
                  </div>
                </Field>
              </div>
            </Section>
          )}

          {step === 3 && (
            <Section icon={Layers} title="Default delivery platform" subtitle="What you usually publish to. We tune defaults to that platform's conventions.">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {([
                  { id: "infylearn",  label: "InfyLearn",  desc: "Modules + lessons + items" },
                  { id: "coursera",   label: "Coursera",   desc: "Modules + weeks + lessons" },
                  { id: "udemy",      label: "Udemy",      desc: "Sections + lectures" },
                  { id: "university", label: "University", desc: "Modules + topics + lessons" },
                  { id: "custom",     label: "Custom",     desc: "Pick later, per course" },
                ] as const).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setState((s) => ({ ...s, default_platform: p.id }))}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      state.default_platform === p.id
                        ? "border-bi-blue-400 bg-bi-blue-50"
                        : "border-bi-navy-100 hover:border-bi-navy-200"
                    }`}
                  >
                    <div className="text-[13.5px] font-semibold text-bi-navy-900">{p.label}</div>
                    <div className="text-[11px] text-bi-navy-500 font-mono mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section icon={BookOpen} title="Start with…" subtitle="Pick what lands you on day one.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {([
                  { id: "blank",  label: "A blank course",   desc: "I'll set up my first course from scratch.", icon: Sparkles },
                  { id: "sample", label: "Tour a sample",    desc: "Show me a fully-built example to explore.", icon: BookOpen },
                ] as const).map((s) => {
                  const Icon = s.icon;
                  const on = state.starter === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setState((p) => ({ ...p, starter: s.id }))}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        on ? "border-bi-blue-400 bg-bi-blue-50" : "border-bi-navy-100 hover:border-bi-navy-200"
                      }`}
                    >
                      <Icon className="w-5 h-5 text-bi-blue-600 mb-2" />
                      <div className="text-[14px] font-bold text-bi-navy-900">{s.label}</div>
                      <div className="text-[12px] text-bi-navy-500 mt-1">{s.desc}</div>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}
        </main>

        {error && <div className="mt-4 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</div>}

        <footer className="flex items-center justify-between mt-6 pt-4 border-t border-bi-navy-100">
          <button
            onClick={back}
            disabled={step === 1}
            className="px-4 py-2 rounded-md border border-bi-navy-200 text-[13px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>

          {step < 4 ? (
            <button
              onClick={next}
              disabled={!canNext}
              className="px-5 py-2 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[13px] font-semibold hover:bg-bi-blue-200 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="px-5 py-2 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[13px] font-semibold hover:bg-bi-blue-200 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : "Finish setup"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="flex items-center flex-1">
          <span className={`w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold transition-colors ${
            n < step ? "bg-emerald-100 text-emerald-700" :
            n === step ? "bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200" :
                         "bg-bi-navy-100 text-bi-navy-500"
          }`}>
            {n < step ? <Check className="w-3 h-3" /> : n}
          </span>
          {n < 4 && <div className={`flex-1 h-0.5 mx-2 ${n < step ? "bg-emerald-200" : "bg-bi-navy-100"}`} />}
        </div>
      ))}
    </div>
  );
}

function Section({
  icon: Icon, title, subtitle, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-bi-blue-50 text-bi-blue-700 grid place-items-center shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-bi-navy-900">{title}</h2>
          <p className="text-[12px] text-bi-navy-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-bi-navy-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
