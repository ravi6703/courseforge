"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { User, Course, Module, Lesson } from "@/types";
import { loadState } from "@/lib/store";

interface ContentItem {
  id: string;
  type: "reading" | "quiz" | "ai_dialogue" | "case_study" | "plugin";
  title: string;
  status: "draft" | "generated" | "approved";
  questionCount?: number;
  scenario?: string;
}

interface LessonWithContent {
  lesson: Lesson;
  module: Module;
  transcriptReady: boolean;
  contentItems: ContentItem[];
}

const contentTypeConfig = {
  reading: {
    label: "Reading Material",
    icon: "M12 6.253v13m0-13C6.228 6.228 2 10.428 2 15.5c0 5.072 4.228 9.272 10 9.272s10-4.2 10-9.272c0-5.072-4.228-9.247-10-9.247z",
    color: "blue",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  quiz: {
    label: "Quiz/Assessment",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "orange",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    badgeColor: "bg-orange-100 text-orange-700",
  },
  ai_dialogue: {
    label: "AI Dialogue",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    color: "purple",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    badgeColor: "bg-purple-100 text-purple-700",
  },
  case_study: {
    label: "Case Study",
    icon: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z",
    color: "green",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    badgeColor: "bg-green-100 text-green-700",
  },
  plugin: {
    label: "Plugin Exercise",
    icon: "M10 20l4-16m4 4l4 4m-4-4l-4 4m4-4l4-4",
    color: "teal",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    badgeColor: "bg-teal-100 text-teal-700",
  },
};

// Mock content item generation
const generateMockContentItems = (lessonId: string): ContentItem[] => {
  return [
    {
      id: `reading-${lessonId}`,
      type: "reading",
      title: "Lesson Notes & Readings",
      status: "draft",
    },
    {
      id: `quiz-${lessonId}`,
      type: "quiz",
      title: "Practice Quiz",
      status: "draft",
      questionCount: 5,
    },
    {
      id: `dialogue-${lessonId}`,
      type: "ai_dialogue",
      title: "Interactive AI Dialogue",
      status: "draft",
      scenario: "Q&A Session",
    },
    {
      id: `case-${lessonId}`,
      type: "case_study",
      title: "Real-World Case Study",
      status: "draft",
    },
    {
      id: `plugin-${lessonId}`,
      type: "plugin",
      title: "Hands-On Exercise",
      status: "draft",
    },
  ];
};

export default function ContentStudioPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [contentItems, setContentItems] = useState<Record<string, ContentItem[]>>({});

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem("courseforge_user");
      if (!storedUser) {
        router.push("/");
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        const state = loadState();
        setCourses(state.courses);

        if (state.courses.length > 0) {
          const firstCourse = state.courses[0];
          setSelectedCourseId(firstCourse.id);
          setModules(state.modules[firstCourse.id] || []);

          // Initialize content items for all lessons
          const items: Record<string, ContentItem[]> = {};
          (state.modules[firstCourse.id] || []).forEach((mod) => {
            mod.lessons.forEach((lesson) => {
              items[lesson.id] = generateMockContentItems(lesson.id);
            });
          });
          setContentItems(items);
        }
      } catch (err) {
        console.error("Content Studio load error:", err);
        router.push("/");
        return;
      }

      setIsLoading(false);
    };

    init();
  }, [router]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const state = loadState();
    setModules(state.modules[courseId] || []);

    // Initialize content items for selected course
    const items: Record<string, ContentItem[]> = {};
    (state.modules[courseId] || []).forEach((mod) => {
      mod.lessons.forEach((lesson) => {
        items[lesson.id] = generateMockContentItems(lesson.id);
      });
    });
    setContentItems(items);
  };

  const handleGenerateContent = async (itemId: string) => {
    setGeneratingId(itemId);
    // Simulate generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update the content item status
    const updates: Record<string, ContentItem[]> = { ...contentItems };
    Object.keys(updates).forEach((lessonId) => {
      updates[lessonId] = updates[lessonId].map((item) =>
        item.id === itemId ? { ...item, status: "generated" as const } : item
      );
    });
    setContentItems(updates);
    setGeneratingId(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("courseforge_user");
    router.push("/");
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading Content Studio...</p>
        </div>
      </div>
    );
  }

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 md:ml-64 overflow-auto">
        <div className="p-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <button onClick={() => router.push("/dashboard")} className="hover:text-gray-900">
              Dashboard
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">Content Studio</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Content Studio</h1>
            <p className="text-gray-600 mt-2">AI-generated content from video transcripts</p>
          </div>

          {/* Redirect Banner */}
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">Content generation is now integrated in the Course Detail page</p>
              <p className="text-sm text-blue-800 mt-1">Select a course below, then use the &quot;Content&quot; tab in the course view for full AI-powered content generation from transcripts.</p>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-600 mb-4">No courses available.</p>
              <button
                onClick={() => router.push("/create")}
                className="text-blue-600 font-medium hover:underline"
              >
                Create your first course
              </button>
            </div>
          ) : (
            <>
              {/* Course Selector */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-900 mb-2">Select Course</label>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedCourseId || ""}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a course --</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  {selectedCourseId && (
                    <a
                      href={`/course/${selectedCourseId}`}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      Open Full Course View
                    </a>
                  )}
                </div>
              </div>

              {/* Content Items by Module/Lesson */}
              {selectedCourse && modules.length > 0 ? (
                <div className="space-y-8">
                  {modules.map((module) => (
                    <div key={module.id}>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">{module.title}</h2>

                      {module.lessons.map((lesson) => {
                        const transcriptReady = lesson.videos.some((v) => v.status !== "pending");
                        const lessonContentItems = contentItems[lesson.id] || [];

                        return (
                          <div key={lesson.id} className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-bold text-gray-900">{lesson.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{module.title}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {transcriptReady ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                    <span className="w-2 h-2 bg-green-600 rounded-full" />
                                    Ready
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full" />
                                    Not Available
                                  </span>
                                )}
                              </div>
                            </div>

                            {transcriptReady ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                {lessonContentItems.map((item) => {
                                  const config = contentTypeConfig[item.type];
                                  const isGenerating = generatingId === item.id;

                                  return (
                                    <div
                                      key={item.id}
                                      className={`rounded-lg border-2 p-4 flex flex-col h-full transition-colors ${
                                        config.borderColor
                                      } ${isGenerating ? "bg-gray-50" : config.bgColor}`}
                                    >
                                      {/* Icon */}
                                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3`} style={{
                                        backgroundColor: `var(--color-${config.color}-100)`,
                                      }}>
                                        <svg
                                          className={`w-6 h-6`}
                                          style={{ color: `var(--color-${config.color}-600)` }}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d={config.icon}
                                          />
                                        </svg>
                                      </div>

                                      {/* Content Type Label */}
                                      <h4 className="font-semibold text-gray-900 text-sm mb-2">{config.label}</h4>

                                      {/* Additional Info */}
                                      {item.questionCount && (
                                        <p className="text-xs text-gray-600 mb-3">{item.questionCount} questions</p>
                                      )}
                                      {item.scenario && (
                                        <p className="text-xs text-gray-600 mb-3">{item.scenario}</p>
                                      )}

                                      {/* Status Badge */}
                                      <div className="mb-4">
                                        <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${
                                          item.status === "approved"
                                            ? "bg-green-100 text-green-700"
                                            : item.status === "generated"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-gray-100 text-gray-700"
                                        }`}>
                                          {item.status === "approved" ? "Approved" : item.status === "generated" ? "Generated" : "Draft"}
                                        </span>
                                      </div>

                                      {/* Actions */}
                                      <div className="mt-auto space-y-2">
                                        {isGenerating ? (
                                          <button
                                            disabled
                                            className="w-full py-2 px-3 bg-gray-200 text-gray-600 rounded text-xs font-medium flex items-center justify-center gap-2"
                                          >
                                            <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                            Generating...
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleGenerateContent(item.id)}
                                            className={`w-full py-2 px-3 rounded text-xs font-medium transition-colors ${
                                              item.status === "draft"
                                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                            }`}
                                          >
                                            {item.status === "draft" ? "Generate" : "Regenerate"}
                                          </button>
                                        )}
                                        {item.status !== "draft" && (
                                          <>
                                            <button className="w-full py-2 px-3 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors">
                                              Edit
                                            </button>
                                            <button className="w-full py-2 px-3 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors">
                                              Approve
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                {lessonContentItems.map((item) => {
                                  const config = contentTypeConfig[item.type];

                                  return (
                                    <div
                                      key={item.id}
                                      className={`rounded-lg border-2 ${config.borderColor} bg-gray-50 p-4 flex flex-col items-center justify-center h-32 opacity-50`}
                                    >
                                      <svg
                                        className="w-8 h-8 text-gray-400 mb-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d={config.icon}
                                        />
                                      </svg>
                                      <p className="text-xs text-gray-600 text-center">{config.label}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {!transcriptReady && (
                              <div className="mt-4 p-4 bg-gray-100 rounded border border-gray-200">
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">Upload video and wait for transcript to generate content</span>
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : selectedCourseId ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="text-gray-600">No modules found for this course.</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
