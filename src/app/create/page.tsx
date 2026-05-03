"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { User, Platform, ContentType, Course } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Globe,
  Zap,
  Users,
  Settings,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Code,
  Layers,
  ArrowRight,
  Check,
  AlertCircle,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

const PLATFORMS: { id: Platform; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "coursera",
    label: "Coursera",
    description: "Modules map to weeks, readings + videos + quizzes per lesson",
    icon: <BookOpen className="w-6 h-6" />,
  },
  {
    id: "udemy",
    label: "Udemy",
    description: "Short punchy lectures (8-15 min), lots of exercises",
    icon: <Zap className="w-6 h-6" />,
  },
  {
    id: "infylearn",
    label: "InfyLearn",
    description: "Board Infinity standard: structured modules, case studies, mentor discussions",
    icon: <Layers className="w-6 h-6" />,
  },
  {
    id: "university",
    label: "University",
    description: "Academic rigor, semester pacing, research-oriented assignments",
    icon: <Globe className="w-6 h-6" />,
  },
  {
    id: "custom",
    label: "Custom",
    description: "Flexible format, customize everything",
    icon: <Settings className="w-6 h-6" />,
  },
];

const CONTENT_TYPES: { id: ContentType; label: string }[] = [
  { id: "reading", label: "Reading Materials" },
  { id: "practice_quiz", label: "Practice Quiz" },
  { id: "graded_quiz", label: "Graded Quiz" },
  { id: "discussion", label: "Discussion Forum" },
  { id: "case_study", label: "Case Study" },
  { id: "ai_dialogue", label: "AI Dialogue" },
  { id: "peer_review", label: "Peer Review" },
];

const SAMPLE_AI_PROJECTS = [
  {
    title: "Build an AI-Powered Chatbot",
    description: "Create a fully functional chatbot using prompt engineering and API integration",
    difficulty: "Intermediate",
  },
  {
    title: "Analyze Business Documents",
    description: "Use LLMs to extract insights and summaries from business documents",
    difficulty: "Beginner",
  },
  {
    title: "Automation Workflow Implementation",
    description: "Build an end-to-end automation workflow using AI tools and integrations",
    difficulty: "Advanced",
  },
];

const STEP_NAMES = ["Platform & Reference", "Course Details", "Content Configuration", "Review & Generate"];

interface FormState {
  platform: Platform | null;
  referenceUrl: string;
  title: string;
  description: string;
  audienceLevel: "beginner" | "intermediate" | "advanced" | "mixed";
  durationWeeks: number;
  hoursPerWeek: number;
  domain: string;
  prerequisites: string;
  targetJobRoles: string[];
  certificationGoal: string;
  assignedCoach: string;
  coachExpertise: string;
  contentTypes: ContentType[];
  theoryRatio: number;
  projectBased: boolean;
  capstone: boolean;
  moduleHours: Record<number, number>;
}

export default function CreateCoursePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generationError, setGenerationError] = useState("");

  const [formState, setFormState] = useState<FormState>({
    platform: null,
    referenceUrl: "",
    title: "",
    description: "",
    audienceLevel: "beginner",
    durationWeeks: 6,
    hoursPerWeek: 5,
    domain: "",
    prerequisites: "",
    targetJobRoles: [],
    certificationGoal: "",
    assignedCoach: "",
    coachExpertise: "",
    contentTypes: ["reading", "practice_quiz", "graded_quiz", "discussion"],
    theoryRatio: 60,
    projectBased: false,
    capstone: false,
    moduleHours: { 0: 0, 1: 0, 2: 0, 3: 0 },
  });

  const [currentJobRoleInput, setCurrentJobRoleInput] = useState("");
  const [generatedModules, setGeneratedModules] = useState<any[]>([]);

  // Auth check
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }
      const role = (authUser.user_metadata?.role ?? "pm") as "pm" | "coach";
      if (role !== "pm") { router.push("/dashboard"); return; }
      setUser({
        id: authUser.id,
        name: authUser.user_metadata?.name ?? authUser.email ?? "User",
        email: authUser.email ?? "",
        role,
      } as User);
      setIsLoading(false);
    };
    init();
  }, [router]);

  // Calculate total hours from module hours
  const totalHours = Object.values(formState.moduleHours).reduce((a, b) => a + b, 0) || formState.durationWeeks * formState.hoursPerWeek;

  // Initialize module hours when duration changes
  useEffect(() => {
    const totalHours = formState.durationWeeks * formState.hoursPerWeek;
    const hoursPerModule = Math.floor(totalHours / 4);
    const remainder = totalHours % 4;

    const newModuleHours: Record<number, number> = {};
    for (let i = 0; i < 4; i++) {
      newModuleHours[i] = hoursPerModule + (i < remainder ? 1 : 0);
    }
    setFormState((prev) => ({ ...prev, moduleHours: newModuleHours }));
  }, [formState.durationWeeks, formState.hoursPerWeek]);

  const updateFormField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddJobRole = () => {
    if (currentJobRoleInput.trim() && !formState.targetJobRoles.includes(currentJobRoleInput.trim())) {
      updateFormField("targetJobRoles", [...formState.targetJobRoles, currentJobRoleInput.trim()]);
      setCurrentJobRoleInput("");
    }
  };

  const handleRemoveJobRole = (index: number) => {
    updateFormField("targetJobRoles", formState.targetJobRoles.filter((_, i) => i !== index));
  };

  const toggleContentType = (type: ContentType) => {
    const updated = formState.contentTypes.includes(type)
      ? formState.contentTypes.filter((t) => t !== type)
      : [...formState.contentTypes, type];
    updateFormField("contentTypes", updated);
  };

  const handleGenerateTOC = async () => {
    if (!formState.platform || !formState.title) return;

    setIsGenerating(true);
    setGenerationError("");

    try {
      const response = await fetch("/api/generate-toc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formState.title,
          description: formState.description,
          platform: formState.platform,
          audience_level: formState.audienceLevel,
          duration_weeks: formState.durationWeeks,
          hours_per_week: formState.hoursPerWeek,
          domain: formState.domain,
          prerequisites: formState.prerequisites,
          target_job_roles: formState.targetJobRoles,
          certification_goal: formState.certificationGoal,
          content_types: formState.contentTypes,
          theory_handson_ratio: formState.theoryRatio,
          project_based: formState.projectBased,
          capstone: formState.capstone,
          reference_course_url: formState.referenceUrl,
          assigned_coach: formState.assignedCoach || undefined,
          coach_expertise: formState.coachExpertise || undefined,
        }),
      });

      const data = await response.json();
      if (data.success && data.modules) {
        setGeneratedModules(data.modules);
        // SEC/UX: when AI errored mid-generation we got fallback modules + an
        // ai_error field. Surface it so the user knows the TOC is templated.
        if (data.ai_error) {
          setGenerationError(`AI generation degraded: ${data.ai_error}. Showing template TOC — try Regenerate, or contact support if this persists.`);
        }
      } else {
        setGenerationError(data.error || "Failed to generate course structure");
      }
    } catch (err) {
      console.error("TOC generation error:", err);
      setGenerationError("Network error. Please try again.");
    }
    setIsGenerating(false);
  };

  const handleCreateCourse = async () => {
    if (!formState.platform || !formState.title || !user || generatedModules.length === 0) return;

    setIsSaving(true);
    try {
      const courseId = crypto.randomUUID();
      const now = new Date().toISOString();

      const course: Course = {
        id: courseId,
        org_id: "00000000-0000-0000-0000-0000000000aa",
        toc_locked: false,
        title: formState.title,
        description: formState.description,
        platform: formState.platform,
        status: "toc_generation",
        audience_level: formState.audienceLevel,
        duration_weeks: formState.durationWeeks,
        hours_per_week: formState.hoursPerWeek,
        domain: formState.domain,
        prerequisites: formState.prerequisites,
        target_job_roles: formState.targetJobRoles,
        certification_goal: formState.certificationGoal,
        theory_handson_ratio: formState.theoryRatio,
        project_based: formState.projectBased,
        capstone: formState.capstone,
        reference_course_url: formState.referenceUrl,
        created_by: user.id,
        assigned_coach: formState.assignedCoach || undefined,
        content_types: formState.contentTypes,
        module_hours: formState.moduleHours,
        created_at: now,
        updated_at: now,
      };

      // SEC-7 / CORRECT-1: Supabase is the single source of truth. We
      // await the upsert so the user can't navigate to /course/[id] before
      // the row exists, and we await sync-toc so the TOC tab has rows.
      const courseRes = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(course),
      });
      if (!courseRes.ok) {
        const err = await courseRes.json().catch(() => ({}));
        throw new Error(err.error || `Course create failed (${courseRes.status})`);
      }

      const modulesWithCourseId = generatedModules.map((m) => ({ ...m, course_id: courseId }));
      const syncRes = await fetch(`/api/courses/${courseId}/sync-toc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: modulesWithCourseId }),
      });
      if (!syncRes.ok) {
        const err = await syncRes.json().catch(() => ({}));
        throw new Error(err.error || `TOC sync failed (${syncRes.status})`);
      }

      router.push(`/course/${courseId}`);
    } catch (err) {
      console.error("Course creation error:", err);
      setGenerationError("Failed to create course. Please try again.");
      setIsSaving(false);
    }
  };

  const isStep1Valid = !!formState.platform;
  const isStep2Valid = formState.title.trim().length > 0 && formState.description.trim().length > 0;
  const isStep3Valid = formState.contentTypes.length > 0;
  const isStep4Valid = generatedModules.length > 0;

  const canProceed = {
    1: isStep1Valid,
    2: isStep2Valid,
    3: isStep3Valid,
    4: isStep4Valid,
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleNext = () => {
    if (currentStep < 4 && canProceed[currentStep]) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 ml-16 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a New Course</h1>
            <p className="text-gray-600">Follow these steps to set up your course with AI-powered structure</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      step < currentStep
                        ? "bg-green-600 text-white"
                        : step === currentStep
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  {step < 4 && (
                    <div className={`flex-1 h-1 mx-3 transition-all ${step < currentStep ? "bg-green-600" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs font-medium text-gray-600">
              {STEP_NAMES.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </div>

          {/* Step 1: Platform & Reference */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Platform</h2>
                <p className="text-gray-600 mb-6">Choose where this course will be published</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => updateFormField("platform", platform.id)}
                      className={`p-6 rounded-xl border-2 text-left transition-all duration-200 ${
                        formState.platform === platform.id
                          ? "border-blue-600 bg-blue-50 shadow-md"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className={`p-2 rounded-lg transition-colors ${
                            formState.platform === platform.id
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {platform.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{platform.label}</h3>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{platform.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference URL */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Reference Course (Optional)</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Paste the URL of an existing course for competitive analysis and structure reference
                    </p>
                  </div>
                </div>
                <input
                  type="url"
                  placeholder="https://www.coursera.org/courses/..."
                  value={formState.referenceUrl}
                  onChange={(e) => updateFormField("referenceUrl", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 2: Course Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Details</h2>

                {/* Title & Description */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Course Title *</label>
                      <input
                        type="text"
                        placeholder="e.g., Mastering Generative AI for Business"
                        value={formState.title}
                        onChange={(e) => updateFormField("title", e.target.value)}
                        maxLength={100}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">{formState.title.length}/100</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Description *</label>
                      <textarea
                        placeholder="Describe what students will learn, target audience, and key outcomes..."
                        value={formState.description}
                        onChange={(e) => updateFormField("description", e.target.value)}
                        maxLength={500}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        rows={4}
                      />
                      <p className="text-xs text-gray-500 mt-1">{formState.description.length}/500</p>
                    </div>
                  </div>
                </div>

                {/* Audience & Duration */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Audience & Duration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Audience Level</label>
                      <div className="space-y-2">
                        {(["beginner", "intermediate", "advanced", "mixed"] as const).map((level) => (
                          <label key={level} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="audience"
                              value={level}
                              checked={formState.audienceLevel === level}
                              onChange={(e) => updateFormField("audienceLevel", e.target.value as typeof level)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700 capitalize">{level}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Weeks)</label>
                        <input
                          type="number"
                          min="1"
                          max="52"
                          value={formState.durationWeeks}
                          onChange={(e) => updateFormField("durationWeeks", parseInt(e.target.value) || 6)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hours per Week</label>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={formState.hoursPerWeek}
                          onChange={(e) => updateFormField("hoursPerWeek", parseInt(e.target.value) || 5)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Domain, Prerequisites & Job Roles */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Curriculum Details</h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Domain / Category</label>
                      <select
                        value={formState.domain}
                        onChange={(e) => updateFormField("domain", e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Select a domain</option>
                        <option value="Data Science">Data Science</option>
                        <option value="Web Development">Web Development</option>
                        <option value="Cloud Computing">Cloud Computing</option>
                        <option value="AI/ML">AI/ML</option>
                        <option value="Business">Business</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Prerequisites</label>
                      <textarea
                        placeholder="e.g., Basic Python knowledge, familiarity with APIs..."
                        value={formState.prerequisites}
                        onChange={(e) => updateFormField("prerequisites", e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target Job Roles</label>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g., Data Scientist, ML Engineer..."
                            value={currentJobRoleInput}
                            onChange={(e) => setCurrentJobRoleInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddJobRole();
                              }
                            }}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <button
                            onClick={handleAddJobRole}
                            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                          >
                            Add
                          </button>
                        </div>
                        {formState.targetJobRoles.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formState.targetJobRoles.map((role, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-blue-100 text-blue-900 px-3 py-1.5 rounded-full text-sm font-medium">
                                {role}
                                <button
                                  onClick={() => handleRemoveJobRole(idx)}
                                  className="text-blue-600 hover:text-blue-900 font-bold"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Certification Goal (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., AWS Solutions Architect Associate"
                        value={formState.certificationGoal}
                        onChange={(e) => updateFormField("certificationGoal", e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* AI Coach Assignment */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-1">AI Coach Assignment</h3>
                  <p className="text-sm text-gray-500 mb-4">Assign an AI coach persona to guide content brief generation</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Coach Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., Dr. Sarah Chen, Senior Data Scientist"
                        value={formState.assignedCoach}
                        onChange={(e) => updateFormField("assignedCoach", e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Coach Expertise & Style Notes (Optional)</label>
                      <textarea
                        placeholder="e.g., Expert in ML pipelines with 10 years industry experience. Prefers practical examples over theory, uses real-world case studies from FAANG companies..."
                        value={formState.coachExpertise}
                        onChange={(e) => updateFormField("coachExpertise", e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Content Configuration */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Content Configuration</h2>

                {/* Content Types */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Content Types</h3>
                  <p className="text-sm text-gray-600 mb-4">Select which content types to include in lessons</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CONTENT_TYPES.map((type) => (
                      <label
                        key={type.id}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formState.contentTypes.includes(type.id)
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formState.contentTypes.includes(type.id)}
                          onChange={() => toggleContentType(type.id)}
                          className="w-5 h-5 text-blue-600 rounded"
                        />
                        <span className="ml-3 font-medium text-gray-900 text-sm">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Theory vs Hands-on Ratio */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Learning Balance</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">Theory vs Hands-on Ratio</label>
                        <span className="text-sm font-semibold text-blue-600">
                          Theory: {formState.theoryRatio}% / Hands-on: {100 - formState.theoryRatio}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formState.theoryRatio}
                        onChange={(e) => updateFormField("theoryRatio", parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>100% Theory</span>
                        <span>50/50 Balance</span>
                        <span>100% Hands-on</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project-Based Learning & Capstone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Project-Based */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Project-Based Learning</h3>
                        <p className="text-sm text-gray-600 mt-1">Hands-on projects throughout the course</p>
                      </div>
                      <button
                        onClick={() => updateFormField("projectBased", !formState.projectBased)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formState.projectBased ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formState.projectBased ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Capstone */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Capstone Project</h3>
                        <p className="text-sm text-gray-600 mt-1">Final project that synthesizes all learning</p>
                      </div>
                      <button
                        onClick={() => updateFormField("capstone", !formState.capstone)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formState.capstone ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formState.capstone ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI-Suggested Projects */}
                {formState.projectBased && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mb-6">
                    <div className="flex items-start gap-3 mb-4">
                      <Code className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">AI-Suggested Projects</h3>
                        <p className="text-sm text-gray-600 mt-1">Consider these project ideas for your course</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {SAMPLE_AI_PROJECTS.map((project, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900 text-sm">{project.title}</h4>
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                              {project.difficulty}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{project.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Distribution */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Time Distribution Across Modules</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Total: {totalHours} hours ({formState.durationWeeks} weeks × {formState.hoursPerWeek} hours/week)
                  </p>
                  <div className="space-y-4">
                    {[0, 1, 2, 3].map((moduleIdx) => (
                      <div key={moduleIdx}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">Module {moduleIdx + 1}</label>
                          <span className="text-sm font-semibold text-blue-600">{formState.moduleHours[moduleIdx] || 0} hours</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={totalHours}
                          value={formState.moduleHours[moduleIdx] || 0}
                          onChange={(e) => {
                            const newHours = { ...formState.moduleHours };
                            newHours[moduleIdx] = parseInt(e.target.value);
                            updateFormField("moduleHours", newHours);
                          }}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">
                      <strong>Allocated:</strong> {Object.values(formState.moduleHours).reduce((a, b) => a + b, 0)} hours
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Generate */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Generate</h2>

                {generationError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900">Generation Error</h4>
                      <p className="text-sm text-red-800 mt-1">{generationError}</p>
                    </div>
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" /> Course Info
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-gray-600">Title:</span> <span className="font-medium text-gray-900">{formState.title}</span>
                      </p>
                      <p>
                        <span className="text-gray-600">Platform:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {PLATFORMS.find((p) => p.id === formState.platform)?.label}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-600">Audience:</span>{" "}
                        <span className="font-medium text-gray-900 capitalize">{formState.audienceLevel}</span>
                      </p>
                      <p>
                        <span className="text-gray-600">Duration:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {formState.durationWeeks} weeks × {formState.hoursPerWeek} hrs/week
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-600">Domain:</span> <span className="font-medium text-gray-900">{formState.domain || "—"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-600" /> Curriculum
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-gray-600">Content Types:</span>{" "}
                        <span className="font-medium text-gray-900">{formState.contentTypes.length} selected</span>
                      </p>
                      <p>
                        <span className="text-gray-600">Theory/Hands-on:</span>{" "}
                        <span className="font-medium text-gray-900">{formState.theoryRatio}% / {100 - formState.theoryRatio}%</span>
                      </p>
                      <p>
                        <span className="text-gray-600">Project-Based:</span>{" "}
                        <span className="font-medium text-gray-900">{formState.projectBased ? "Yes" : "No"}</span>
                      </p>
                      <p>
                        <span className="text-gray-600">Capstone:</span> <span className="font-medium text-gray-900">{formState.capstone ? "Yes" : "No"}</span>
                      </p>
                      <p>
                        <span className="text-gray-600">Job Roles:</span>{" "}
                        <span className="font-medium text-gray-900">{formState.targetJobRoles.length || 0} roles</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Generation Section */}
                {!generatedModules.length ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    {isGenerating ? (
                      <div className="space-y-4">
                        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                        <p className="text-gray-600 font-medium">Generating course structure with AI...</p>
                        <p className="text-sm text-gray-500">Aligning to Bloom's Taxonomy and Board Infinity format</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">Ready to generate your course?</h3>
                          <p className="text-gray-600 text-sm">
                            Our AI will create a complete course structure with modules, lessons, and learning objectives
                          </p>
                        </div>
                        <button
                          onClick={handleGenerateTOC}
                          disabled={isGenerating}
                          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          Generate with AI
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
                      <Check className="w-6 h-6 text-green-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Course Structure Generated</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {generatedModules.length} modules with {generatedModules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0)} lessons
                        </p>
                      </div>
                    </div>

                    {/* Modules Preview */}
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {generatedModules.slice(0, 4).map((module: any, idx: number) => (
                        <div key={module.id || idx} className="border-l-4 border-blue-600 pl-4 py-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm">{module.title}</h4>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-1">{module.description}</p>
                              {module.duration_hours && (
                                <p className="text-xs text-gray-500 mt-2">Duration: {module.duration_hours} hours</p>
                              )}
                            </div>
                            {module.lessons && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium ml-3 flex-shrink-0">
                                {module.lessons.length} lessons
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={handleGenerateTOC}
                        disabled={isGenerating}
                        className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                      >
                        {isGenerating ? "Regenerating..." : "Regenerate"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 mt-12 pt-8 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-6 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>

              {currentStep === 4 ? (
                <button
                  onClick={handleCreateCourse}
                  disabled={!isStep4Valid || isSaving}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? "Creating..." : "Create Course"}
                  <Check className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canProceed[currentStep]}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
