"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { User, Platform, ContentType, Module } from "@/types";
import { createCourse, createModulesWithLessons, isSupabaseConfigured } from "@/lib/db";
import { loadState, saveState, generateId } from "@/lib/store";

type Step = 1 | 2 | 3 | 4;

const platforms: Platform[] = ["coursera", "udemy", "infylearn", "university", "custom"];
const platformLabels: Record<Platform, string> = {
  coursera: "Coursera",
  udemy: "Udemy",
  infylearn: "InfyLearn",
  university: "University",
  custom: "Custom Platform",
};
const platformDescriptions: Record<Platform, string> = {
  coursera: "Modules map to weeks, readings + videos + quizzes per lesson",
  udemy: "Short punchy lectures (8-15 min), lots of exercises",
  infylearn: "Board Infinity standard: structured modules, case studies, mentor discussions",
  university: "Academic rigor, semester pacing, research-oriented assignments",
  custom: "Flexible format, customize everything",
};

const contentTypes: ContentType[] = ["reading", "practice_quiz", "graded_quiz", "discussion", "plugin", "case_study", "glossary", "ai_dialogue"];
const contentTypeLabels: Record<ContentType, string> = {
  reading: "Reading Materials",
  practice_quiz: "Practice Quiz",
  graded_quiz: "Graded Quiz",
  discussion: "Discussion Forum",
  plugin: "Interactive Plugin",
  case_study: "Case Study",
  glossary: "Glossary",
  ai_dialogue: "AI Dialogue",
};

export default function CreateCoursePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTOC, setGeneratedTOC] = useState<Module[] | null>(null);
  const [genError, setGenError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [audienceLevel, setAudienceLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [durationWeeks, setDurationWeeks] = useState(6);
  const [videoLength, setVideoLength] = useState<"5-10 min" | "10-15 min" | "15-20 min" | "20-30 min">("10-15 min");
  const [theoryRatio, setTheoryRatio] = useState<"80:20" | "70:30" | "60:40" | "50:50">("70:30");
  const [selectedContentTypes, setSelectedContentTypes] = useState<ContentType[]>(["reading", "practice_quiz", "graded_quiz", "discussion"]);

  useEffect(() => {
    const storedUser = localStorage.getItem("courseforge_user");
    if (!storedUser) { router.push("/"); return; }
    try { setUser(JSON.parse(storedUser)); } catch { router.push("/"); return; }
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("courseforge_user");
    router.push("/");
  };

  const handleContentTypeToggle = (type: ContentType) => {
    setSelectedContentTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleGenerateTOC = async () => {
    setIsGenerating(true);
    setGenError("");
    try {
      const res = await fetch("/api/generate-toc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: courseTitle,
          description: courseDescription,
          platform: selectedPlatform,
          audience_level: audienceLevel,
          duration_weeks: durationWeeks,
          content_types: selectedContentTypes,
          video_length: videoLength,
          theory_ratio: theoryRatio,
        }),
      });

      const data = await res.json();
      if (data.success && data.modules) {
        setGeneratedTOC(data.modules as Module[]);
      } else {
        setGenError(data.error || "Failed to generate TOC");
      }
    } catch (err) {
      console.error("TOC generation error:", err);
      setGenError("Network error. Please try again.");
    }
    setIsGenerating(false);
  };

  const handleNext = () => {
    if (currentStep === 1 && !selectedPlatform) return;
    if (currentStep === 2 && (!courseTitle.trim() || !courseDescription.trim())) return;
    if (currentStep === 3 && selectedContentTypes.length === 0) return;
    if (currentStep < 4) setCurrentStep((currentStep + 1) as Step);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as Step);
  };

  const handleSubmit = async () => {
    if (!generatedTOC || !user || !selectedPlatform) return;
    setIsSaving(true);

    try {
      if (isSupabaseConfigured) {
        // Save to Supabase
        const newCourse = await createCourse({
          title: courseTitle,
          description: courseDescription,
          platform: selectedPlatform,
          status: "toc_generation",
          audience_level: audienceLevel,
          duration_weeks: durationWeeks,
          content_types: selectedContentTypes,
          created_by: user.id,
        });

        // Save modules, lessons, videos
        await createModulesWithLessons(newCourse.id, generatedTOC);
        router.push(`/course/${newCourse.id}`);
      } else {
        // Fallback to localStorage
        const courseId = generateId();
        const state = loadState();
        const newCourse = {
          id: courseId,
          title: courseTitle,
          description: courseDescription,
          platform: selectedPlatform,
          status: "toc_generation" as const,
          audience_level: audienceLevel,
          duration_weeks: durationWeeks,
          created_by: user.id,
          content_types: selectedContentTypes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        saveState({
          ...state,
          courses: [...state.courses, newCourse],
          modules: { ...state.modules, [courseId]: generatedTOC.map((m) => ({ ...m, course_id: courseId })) },
        });
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Save error:", err);
      setGenError("Failed to save course. Please try again.");
      setIsSaving(false);
    }
  };

  if (isLoading || !user) {
    return <div className="flex items-center justify-center h-screen bg-gray-50"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  const stepValid = {
    1: !!selectedPlatform,
    2: courseTitle.trim().length > 0 && courseDescription.trim().length > 0,
    3: selectedContentTypes.length > 0,
    4: !!generatedTOC,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 md:ml-64 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a New Course</h1>
            <p className="text-gray-600">Follow the steps below to set up your course</p>
          </div>

          {/* Step Indicator */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex-1 flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                    step < currentStep ? "bg-green-600 text-white" : step === currentStep ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}>
                    {step < currentStep ? "✓" : step}
                  </div>
                  {step < 4 && <div className={`flex-1 h-1 mx-2 ${step < currentStep ? "bg-green-600" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Platform</span><span>Details</span><span>Content</span><span>Generate TOC</span>
            </div>
          </div>

          {/* Step 1: Platform */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Select Your Platform</h2>
              <p className="text-gray-600 mb-6">Choose where this course will be published</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {platforms.map((p) => (
                  <button key={p} onClick={() => setSelectedPlatform(p)} className={`p-5 rounded-lg border-2 text-left transition-all ${
                    selectedPlatform === p ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                    <h3 className="font-semibold text-gray-900 mb-1">{platformLabels[p]}</h3>
                    <p className="text-sm text-gray-500">{platformDescriptions[p]}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Course Details</h2>
              <p className="text-gray-600 mb-6">Provide basic information about your course</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Title *</label>
                  <input type="text" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="e.g., Mastering Cloud FinOps" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Description *</label>
                  <textarea value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} placeholder="Describe what students will learn, target audience, and key outcomes..." className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={5} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Audience Level</label>
                    <select value={audienceLevel} onChange={(e) => setAudienceLevel(e.target.value as typeof audienceLevel)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (weeks)</label>
                    <input type="number" min="2" max="52" value={durationWeeks} onChange={(e) => setDurationWeeks(parseInt(e.target.value) || 6)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Video Length</label>
                    <select value={videoLength} onChange={(e) => setVideoLength(e.target.value as typeof videoLength)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="5-10 min">5-10 min</option>
                      <option value="10-15 min">10-15 min</option>
                      <option value="15-20 min">15-20 min</option>
                      <option value="20-30 min">20-30 min</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Theory : Hands-on Ratio</label>
                    <select value={theoryRatio} onChange={(e) => setTheoryRatio(e.target.value as typeof theoryRatio)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="80:20">80:20</option>
                      <option value="70:30">70:30</option>
                      <option value="60:40">60:40</option>
                      <option value="50:50">50:50</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Content Types */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Content Types</h2>
              <p className="text-gray-600 mb-6">Select which content types to include in lessons</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {contentTypes.map((type) => (
                  <label key={type} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedContentTypes.includes(type) ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                    <input type="checkbox" checked={selectedContentTypes.includes(type)} onChange={() => handleContentTypeToggle(type)} className="w-5 h-5 text-blue-600 rounded" />
                    <span className="ml-3 font-medium text-gray-900">{contentTypeLabels[type]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Generate TOC */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Generate Table of Contents</h2>
              <p className="text-gray-600 mb-6">AI will create a Bloom&apos;s Taxonomy-aligned course structure matching Board Infinity format</p>

              {genError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{genError}</div>
              )}

              {!generatedTOC ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  {isGenerating ? (
                    <div className="space-y-4">
                      <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                      <p className="text-gray-600 font-medium">Generating TOC with AI...</p>
                      <p className="text-gray-400 text-sm">Aligning to Bloom&apos;s Taxonomy & Board Infinity format</p>
                    </div>
                  ) : (
                    <>
                      {/* Summary card */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-6 mx-8 text-left">
                        <p className="text-sm text-gray-700"><strong>Title:</strong> {courseTitle}</p>
                        <p className="text-sm text-gray-700 mt-1"><strong>Platform:</strong> {selectedPlatform && platformLabels[selectedPlatform]}</p>
                        <p className="text-sm text-gray-700 mt-1"><strong>Audience:</strong> {audienceLevel} &middot; {durationWeeks} weeks</p>
                        <p className="text-sm text-gray-700 mt-1"><strong>Content:</strong> {selectedContentTypes.map((t) => contentTypeLabels[t]).join(", ")}</p>
                      </div>
                      <button onClick={handleGenerateTOC} className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        Generate with AI
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    <span className="font-medium text-gray-900">
                      TOC Generated — {generatedTOC.length} modules, {generatedTOC.reduce((a, m) => a + m.lessons.length, 0)} lessons, {generatedTOC.reduce((a, m) => a + m.lessons.reduce((la: number, l: any) => la + (l.content_items?.length || 0), 0), 0)} content items
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {generatedTOC.map((mod: any) => (
                      <div key={mod.id} className="border-l-4 border-blue-600 pl-4 py-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-gray-900">{mod.title}</h4>
                          {mod.duration && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{mod.duration}</span>}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{mod.description}</p>
                        {/* Bloom badges */}
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {mod.learning_objectives.map((lo: any) => (
                            <span key={lo.id} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              {remember:"bg-red-100 text-red-700",understand:"bg-orange-100 text-orange-700",apply:"bg-yellow-100 text-yellow-700",analyze:"bg-green-100 text-green-700",evaluate:"bg-blue-100 text-blue-700",create:"bg-purple-100 text-purple-700"}[lo.bloom_level as string] || "bg-gray-100 text-gray-700"
                            }`}>
                              {lo.bloom_level}
                            </span>
                          ))}
                        </div>
                        {/* Lessons with content items */}
                        <div className="mt-3 space-y-2">
                          {mod.lessons.map((les: any) => (
                            <div key={les.id} className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-semibold text-gray-800">{les.title}</p>
                              {les.content_items && les.content_items.length > 0 && (
                                <div className="mt-2 space-y-0.5">
                                  {les.content_items.slice(0, 8).map((item: any, idx: number) => (
                                    <p key={item.id || idx} className="text-xs text-gray-600 pl-3 flex items-start gap-1.5">
                                      <span className="flex-shrink-0 mt-0.5">
                                        {item.type === "video" ? "▶" : item.type === "reading" ? "📖" : item.type === "practice_quiz" || item.type === "graded_quiz" ? "✏️" : item.type === "discussion" ? "💬" : item.type === "ungraded_lab" ? "🧪" : "•"}
                                      </span>
                                      <span>{item.title}</span>
                                    </p>
                                  ))}
                                  {les.content_items.length > 8 && (
                                    <p className="text-xs text-gray-400 pl-3">+ {les.content_items.length - 8} more items</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleGenerateTOC} disabled={isGenerating} className="mt-4 w-full px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium border border-blue-600 disabled:opacity-50">
                    {isGenerating ? "Regenerating..." : "Regenerate"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Nav Buttons */}
          <div className="flex items-center justify-between gap-4 mt-10 pt-6 border-t border-gray-200">
            <button onClick={handleBack} disabled={currentStep === 1} className="px-6 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              Back
            </button>
            <div className="flex gap-3">
              <button onClick={() => router.push("/dashboard")} className="px-6 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                Cancel
              </button>
              {currentStep === 4 ? (
                <button onClick={handleSubmit} disabled={!generatedTOC || isSaving} className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                  {isSaving ? "Saving..." : "Create Course"}
                </button>
              ) : (
                <button onClick={handleNext} disabled={!stepValid[currentStep]} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
