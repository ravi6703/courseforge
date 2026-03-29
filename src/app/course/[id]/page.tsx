"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Course,
  Module,
  Comment,
  CourseStatus,
  PHASE_CONFIG,
  NEXT_PHASE,
  ContentBrief,
  PPTSlide,
  Recording,
  Transcript,
  ContentItem,
  Video,
  CoachInput,
  CourseResearch,
  ContentType,
  Lesson,
} from "@/types";
import {
  getCourseById,
  getModulesByCourse,
  getCommentsByCourse,
  addComment,
  updateCourse,
  generateId,
  getContentBriefsByVideo,
  addContentBrief,
  updateContentBrief,
  getPPTSlidesByVideo,
  addPPTSlide,
  updatePPTSlide,
  getRecordingByVideo,
  addRecording,
  updateRecording,
  getTranscriptByRecording,
  addTranscript,
  updateTranscript,
  getContentItemsByLesson,
  addContentItem,
  updateContentItem,
  getCoachInputByVideo,
  addCoachInput,
  updateCoachInput,
  getCourseResearch,
  setCourseResearch,
  DEMO_USERS,
  updatePPTUpload,
  getPPTUploadsByVideo,
  addPPTUpload,
} from "@/lib/store";
import { Sidebar } from "@/components/Sidebar";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import {
  Lock,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  Check,
  AlertCircle,
  Plus,
  FileText,
  CheckCircle2,
  Circle,
  BookOpen,
  Send,
  Edit2,
  Trash2,
  Play,
  Music,
  Copy,
  Settings,
  Upload,
  Download,
  Eye,
  Loader,
  CheckSquare,
  Square,
  Briefcase,
  Sparkles,
  Mic,
  ZoomIn,
  X,
} from "lucide-react";

// ─── TYPE DEFINITIONS ───────────────────────────────────────────

type TabType = "toc" | "briefs" | "ppts" | "recording" | "transcript" | "content" | "review";

interface ExpandedState {
  [key: string]: boolean;
}

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
  id: string;
}

interface SlideEditorState {
  videoId: string;
  slideIndex: number;
}

// ─── MAIN PAGE COMPONENT ────────────────────────────────────────

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id as string;

  // State management
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [expandedModules, setExpandedModules] = useState<ExpandedState>({});
  const [expandedLessons, setExpandedLessons] = useState<ExpandedState>({});
  const [activeTab, setActiveTab] = useState<TabType>("toc");
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [currentUser, setCurrentUser] = useState(DEMO_USERS.pm);
  const [loading, setLoading] = useState(true);
  const [courseResearch, setCourseResearchState] = useState<CourseResearch | null>(null);

  // Tab-specific state
  const [selectedVideoForBrief, setSelectedVideoForBrief] = useState<string>("");
  const [briefs, setBriefs] = useState<ContentBrief[]>([]);
  const [pptSlides, setPPTSlides] = useState<PPTSlide[]>([]);
  const [pptSubTab, setPPTSubTab] = useState<"ai" | "upload">("ai");
  const [slideEditor, setSlideEditor] = useState<SlideEditorState | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [zoomConnected, setZoomConnected] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedVideoForTranscript, setSelectedVideoForTranscript] = useState<string>("");
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [pptUploads, setPPTUploads] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ videoId: string; filename: string }[]>([]);
  const [contentGenerating, setContentGenerating] = useState<Record<string, boolean>>({});
  const [qualityChecklistItems, setQualityChecklistItems] = useState<Record<string, boolean>>({
    completeness: false,
    accuracy: false,
    engagement: false,
    accessibility: false,
    alignment: false,
    production: false,
    testing: false,
    documentation: false,
  });
  const [coachSignOff, setCoachSignOff] = useState(false);
  const [pmReview, setPmReview] = useState(false);
  const [authoritySubmission, setAuthoritySubmission] = useState(false);

  // Initialize data
  useEffect(() => {
    const courseData = getCourseById(courseId);
    if (!courseData) {
      router.push("/dashboard");
      return;
    }

    setCourse(courseData);
    const modulesData = getModulesByCourse(courseId);
    setModules(modulesData);

    const commentsData = getCommentsByCourse(courseId);
    setComments(commentsData);

    const research = getCourseResearch(courseId);
    if (research) setCourseResearchState(research);

    // Initialize other data
    const allBriefs: ContentBrief[] = [];
    const allSlides: PPTSlide[] = [];
    const allRecordings: Recording[] = [];
    const allTranscripts: Transcript[] = [];
    const allContentItems: ContentItem[] = [];
    const allUploads: any[] = [];

    for (const mod of modulesData) {
      for (const lesson of mod.lessons) {
        for (const video of lesson.videos) {
          const vBriefs = getContentBriefsByVideo(video.id);
          allBriefs.push(...vBriefs);

          const vSlides = getPPTSlidesByVideo(video.id);
          allSlides.push(...vSlides);

          const vRecording = getRecordingByVideo(video.id);
          if (vRecording) allRecordings.push(vRecording);

          const vTranscript = getTranscriptByRecording(
            vRecording?.id || "none"
          );
          if (vTranscript) allTranscripts.push(vTranscript);

          const vUploads = getPPTUploadsByVideo(video.id);
          allUploads.push(...vUploads);
        }

        const lItems = getContentItemsByLesson(lesson.id);
        allContentItems.push(...lItems);
      }
    }

    setBriefs(allBriefs);
    setPPTSlides(allSlides);
    setRecordings(allRecordings);
    setTranscripts(allTranscripts);
    setContentItems(allContentItems);
    setPPTUploads(allUploads);

    setLoading(false);
  }, [courseId, router]);

  // ─── HELPER FUNCTIONS ───────────────────────────────────────────

  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = generateId();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const toggleLessonExpand = (lessonId: string) => {
    setExpandedLessons((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  const handleAddComment = (
    targetId: string,
    targetType: string,
    text: string,
    isAskPM: boolean = false
  ) => {
    const newComment: Comment = {
      id: generateId(),
      course_id: courseId,
      author: currentUser.name,
      author_role: currentUser.role,
      text,
      target_type: targetType as any,
      target_id: targetId,
      resolved: false,
      is_ai_flag: false,
      is_ask_pm: isAskPM,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addComment(newComment);
    setComments([...comments, newComment]);
    addToast(
      isAskPM ? "Question sent to PM" : "Comment added",
      "success"
    );
  };

  const handleApproveAndAdvance = () => {
    if (!course) return;

    const nextStatus = NEXT_PHASE[course.status as CourseStatus] as CourseStatus;
    if (!nextStatus) {
      addToast("Course is already at final status", "error");
      return;
    }

    updateCourse(courseId, { status: nextStatus });
    setCourse({ ...course, status: nextStatus });
    addToast(`Course advanced to ${PHASE_CONFIG[nextStatus].label}`, "success");
  };

  const getTabUnlocked = (tab: TabType): boolean => {
    if (!course) return false;

    const phaseMap: Record<TabType, number[]> = {
      toc: [1, 2, 3],
      briefs: [4, 5],
      ppts: [5, 6, 7],
      recording: [7, 8],
      transcript: [8, 9],
      content: [9, 10, 11],
      review: [12, 13],
    };

    const requiredPhases = phaseMap[tab];
    return requiredPhases.includes(PHASE_CONFIG[course.status].phase);
  };

  const getAllVideos = (): { video: Video; lesson: Lesson; module: Module }[] => {
    const videos: { video: Video; lesson: Lesson; module: Module }[] = [];
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        for (const video of lesson.videos) {
          videos.push({ video, lesson, module: mod });
        }
      }
    }
    return videos;
  };

  const getVideoDetails = (videoId: string) => {
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        const video = lesson.videos.find((v) => v.id === videoId);
        if (video) return { video, lesson, module: mod };
      }
    }
    return null;
  };

  const getCommentsForTarget = (
    targetId: string,
    targetType: string
  ): Comment[] => {
    return comments.filter(
      (c) => c.target_id === targetId && c.target_type === targetType
    );
  };

  const generateMermaidDiagram = (): string => {
    let diagram = "graph TD\n";
    let nodeId = 0;

    for (const mod of modules) {
      const modNodeId = `M${nodeId}`;
      diagram += `  ${modNodeId}["${mod.title}"]\n`;
      const modIdx = nodeId;
      nodeId++;

      for (const lesson of mod.lessons) {
        const lessonNodeId = `L${nodeId}`;
        diagram += `  ${modNodeId} --> ${lessonNodeId}["${lesson.title}"]\n`;
        nodeId++;
      }
    }

    return diagram;
  };

  // ─── RENDER: LOADING STATE ──────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Course not found</h1>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ────────────────────────────────────────────────

  const phaseConfig = PHASE_CONFIG[course.status];
  const progressPercent = (phaseConfig.phase / 13) * 100;

  const tabLabels: Record<TabType, string> = {
    toc: "Table of Contents",
    briefs: "Content Briefs",
    ppts: "Presentations",
    recording: "Recording",
    transcript: "Transcript",
    content: "Content",
    review: "Final Review",
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 ml-16 overflow-auto">
        {/* ─── HEADER ─── */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">
                  {course.title}
                </h1>
                <p className="text-gray-600 mt-2">{course.description}</p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-4 py-2 rounded-lg font-semibold text-white ${
                    phaseConfig.color === "gray"
                      ? "bg-gray-500"
                      : phaseConfig.color === "blue"
                        ? "bg-blue-600"
                        : phaseConfig.color === "yellow"
                          ? "bg-yellow-500"
                          : phaseConfig.color === "green"
                            ? "bg-green-600"
                            : phaseConfig.color === "purple"
                              ? "bg-purple-600"
                              : phaseConfig.color === "orange"
                                ? "bg-orange-500"
                                : "bg-blue-600"
                  }`}
                >
                  {phaseConfig.label}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {(
                ["toc", "briefs", "ppts", "recording", "transcript", "content", "review"] as TabType[]
              ).map((tab) => {
                const unlocked = getTabUnlocked(tab);
                const isActive = activeTab === tab;

                return (
                  <button
                    key={tab}
                    onClick={() => unlocked && setActiveTab(tab)}
                    disabled={!unlocked}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : unlocked
                          ? "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {!unlocked && <Lock className="w-4 h-4" />}
                    {tabLabels[tab]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── CONTENT AREA ─── */}
        <div className="p-6">
          {/* Locked Tab Overlay */}
          {!getTabUnlocked(activeTab) && (
            <div className="bg-white rounded-lg p-12 border border-gray-200 text-center">
              <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {tabLabels[activeTab]} - Locked
              </h2>
              <p className="text-gray-600 mb-4">
                This tab will be available when the course reaches the appropriate phase.
              </p>
              <p className="text-sm text-gray-500">
                Current phase: {phaseConfig.label} (Phase {phaseConfig.phase}/13)
              </p>
            </div>
          )}

          {/* ─── TOC TAB ─── */}
          {activeTab === "toc" && getTabUnlocked("toc") && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-6">
                {course.status === "toc_generation" ? (
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      Research Progress
                    </h2>
                    <div className="space-y-4">
                      {[
                        {
                          label: "Market Research",
                          description: "Analyzing competitor courses",
                          status: "done" as const,
                        },
                        {
                          label: "Skills Gap Analysis",
                          description: "Identifying missing skills in market",
                          status: "done" as const,
                        },
                        {
                          label: "Curriculum Mapping",
                          description: "Structuring course modules",
                          status: "loading" as const,
                        },
                        {
                          label: "Learning Objectives",
                          description: "Defining learning outcomes",
                          status: "loading" as const,
                        },
                        {
                          label: "Content Outline",
                          description: "Creating detailed TOC",
                          status: "pending" as const,
                        },
                        {
                          label: "Resource Curation",
                          description: "Gathering reference materials",
                          status: "pending" as const,
                        },
                        {
                          label: "Quality Review",
                          description: "Final QA check",
                          status: "pending" as const,
                        },
                      ].map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {step.status === "done" && (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            )}
                            {step.status === "loading" && (
                              <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                            )}
                            {step.status === "pending" && (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {step.label}
                            </p>
                            <p className="text-sm text-gray-600">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Mermaid Diagram */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Learning Path
                      </h2>
                      <MermaidDiagram chart={generateMermaidDiagram()} />
                    </div>

                    {/* Module/Lesson Tree */}
                    <div className="space-y-4">
                      {modules.map((module) => (
                        <div
                          key={module.id}
                          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                        >
                          <button
                            onClick={() => toggleModuleExpand(module.id)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {expandedModules[module.id] ? (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                              )}
                              <div className="text-left">
                                <h3 className="font-bold text-gray-900">
                                  {module.title}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {module.lessons.length} lessons
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {module.duration_hours}h
                              </span>
                              <span className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                                <MessageSquare className="w-4 h-4" />
                                {getCommentsForTarget(module.id, "module").length}
                              </span>
                            </div>
                          </button>

                          {expandedModules[module.id] && (
                            <div className="border-t border-gray-200 divide-y divide-gray-200">
                              {module.lessons.map((lesson) => (
                                <div key={lesson.id}>
                                  <button
                                    onClick={() => toggleLessonExpand(lesson.id)}
                                    className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors bg-gray-50"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      {expandedLessons[lesson.id] ? (
                                        <ChevronDown className="w-4 h-4 text-gray-600" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                      )}
                                      <div className="text-left">
                                        <h4 className="font-semibold text-gray-900">
                                          {lesson.title}
                                        </h4>
                                      </div>
                                    </div>
                                    <span className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                                      <MessageSquare className="w-4 h-4" />
                                      {getCommentsForTarget(lesson.id, "lesson").length}
                                    </span>
                                  </button>

                                  {expandedLessons[lesson.id] && (
                                    <div className="divide-y divide-gray-200">
                                      {lesson.videos.map((video) => {
                                        const videoComments = getCommentsForTarget(
                                          video.id,
                                          "video"
                                        );

                                        return (
                                          <div
                                            key={video.id}
                                            className="px-12 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                                          >
                                            <div className="flex items-center gap-3 flex-1">
                                              <Play className="w-4 h-4 text-blue-600" />
                                              <div className="text-left">
                                                <p className="font-medium text-gray-900">
                                                  {video.title}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                  {video.duration_minutes} min
                                                  {video.is_handson && (
                                                    <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">
                                                      Hands-on
                                                    </span>
                                                  )}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                                                <MessageSquare className="w-4 h-4" />
                                                {videoComments.length}
                                              </span>
                                              <button
                                                onClick={() => {
                                                  const text = prompt(
                                                    "Add comment:"
                                                  );
                                                  if (text) {
                                                    handleAddComment(
                                                      video.id,
                                                      "video",
                                                      text
                                                    );
                                                  }
                                                }}
                                                className="p-1 hover:bg-gray-300 rounded"
                                              >
                                                <Plus className="w-4 h-4 text-gray-600" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {course.status !== "toc_generation" &&
                  currentUser.role === "pm" &&
                  comments.filter((c) => !c.resolved && c.course_id === courseId).length > 0 && (
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <button
                        onClick={handleApproveAndAdvance}
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Approve & Advance to Next Phase
                      </button>
                    </div>
                  )}
              </div>

              {/* Right sidebar - Research & competitive analysis */}
              {courseResearch && course.status !== "toc_generation" && (
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg p-6 border border-gray-200 sticky top-32">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Source Citations
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-2">
                          Best Existing Course
                        </h4>
                        <div className="bg-blue-50 p-3 rounded text-sm">
                          <p className="font-medium text-gray-900">
                            {courseResearch.best_existing_course.name}
                          </p>
                          <p className="text-gray-600 text-xs">
                            {courseResearch.best_existing_course.platform}
                          </p>
                          <p className="text-yellow-600 text-xs mt-1">
                            Rating: {courseResearch.best_existing_course.rating}/5
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-2">
                          Why We're Better
                        </h4>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {courseResearch.why_better
                            .slice(0, 3)
                            .map((reason, idx) => (
                              <li key={idx} className="flex gap-2">
                                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span>{reason}</span>
                              </li>
                            ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-2">
                          Market Skills
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {courseResearch.job_market_skills
                            .slice(0, 4)
                            .map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                              >
                                {skill}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── BRIEFS TAB ─── */}
          {activeTab === "briefs" && getTabUnlocked("briefs") && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Content Briefs Tracker
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          Video
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          Coach Input
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          Brief Status
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          Coach Review
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          PM Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getAllVideos().map(({ video }) => {
                        const brief = briefs.find(
                          (b) => b.video_id === video.id
                        );
                        const coachInput = getCoachInputByVideo(video.id);

                        return (
                          <tr
                            key={video.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() =>
                              setSelectedVideoForBrief(video.id)
                            }
                          >
                            <td className="py-3 px-4 text-gray-900 font-medium">
                              {video.title}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded ${
                                  coachInput?.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : coachInput?.status === "in_progress"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {coachInput?.status || "not_started"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded ${
                                  brief?.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : brief?.status === "generated"
                                      ? "bg-blue-100 text-blue-800"
                                      : brief?.status === "generating"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {brief?.status || "pending"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-gray-600 text-xs">
                                -
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-gray-600 text-xs">
                                -
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedVideoForBrief && (
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Coach Input - {getVideoDetails(selectedVideoForBrief)?.video.title}
                  </h2>

                  <div className="space-y-4">
                    {[
                      {
                        label: "Key Topics to Cover",
                        placeholder: "Enter main topics...",
                        field: "key_topics",
                      },
                      {
                        label: "Examples & Case Studies",
                        placeholder: "Real-world examples...",
                        field: "examples",
                      },
                      {
                        label: "Visual Requirements",
                        placeholder: "Describe needed visuals...",
                        field: "visual_requirements",
                      },
                      {
                        label: "Difficulty Notes",
                        placeholder: "Complexity level guidance...",
                        field: "difficulty_notes",
                      },
                      {
                        label: "References",
                        placeholder: "External resources...",
                        field: "references",
                      },
                      {
                        label: "Special Instructions",
                        placeholder: "Any other guidance...",
                        field: "special_instructions",
                      },
                    ].map((item) => (
                      <div key={item.field}>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          {item.label}
                        </label>
                        <textarea
                          placeholder={item.placeholder}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                    ))}

                    <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Submit & Generate Brief
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── PPT TAB ─── */}
          {activeTab === "ppts" && getTabUnlocked("ppts") && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="border-b border-gray-200 flex">
                  <button
                    onClick={() => setPPTSubTab("ai")}
                    className={`flex-1 px-6 py-4 font-semibold ${
                      pptSubTab === "ai"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600"
                    }`}
                  >
                    AI Generated
                  </button>
                  <button
                    onClick={() => setPPTSubTab("upload")}
                    className={`flex-1 px-6 py-4 font-semibold ${
                      pptSubTab === "upload"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600"
                    }`}
                  >
                    Upload External
                  </button>
                </div>

                <div className="p-6">
                  {pptSubTab === "ai" ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          Presentation Generation Tracker
                        </h3>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                                  Video
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                                  Slides
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                                  Generation
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                                  Coach Edit
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                                  Images
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                                  PM Review
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {getAllVideos().map(({ video }) => {
                                const slides = pptSlides.filter(
                                  (s) => s.video_id === video.id
                                );

                                return (
                                  <tr key={video.id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 text-gray-900 font-medium">
                                      {video.title}
                                    </td>
                                    <td className="py-3 px-4">
                                      <input
                                        type="number"
                                        defaultValue="5"
                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                      />
                                    </td>
                                    <td className="py-3 px-4">
                                      <button className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700">
                                        {slides.length > 0
                                          ? "Regenerate"
                                          : "Generate"}
                                      </button>
                                    </td>
                                    <td className="py-3 px-4">
                                      {slides.length > 0 && (
                                        <button
                                          onClick={() =>
                                            setSlideEditor({
                                              videoId: video.id,
                                              slideIndex: 0,
                                            })
                                          }
                                          className="text-blue-600 font-semibold text-sm hover:text-blue-700"
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      <button className="text-xs text-gray-600 hover:text-gray-900">
                                        Request
                                      </button>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="text-xs text-gray-600">
                                        -
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {slideEditor && (
                        <div className="border-t border-gray-200 pt-6">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">
                              Slide Editor
                            </h3>
                            <button
                              onClick={() => setSlideEditor(null)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <X className="w-6 h-6" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                              {pptSlides
                                .filter(
                                  (s) =>
                                    s.video_id ===
                                    slideEditor.videoId
                                )
                                .map((slide, idx) => (
                                  <div
                                    key={slide.id}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                      slideEditor.slideIndex === idx
                                        ? "border-blue-600 bg-blue-50"
                                        : "border-gray-300"
                                    }`}
                                    onClick={() =>
                                      setSlideEditor({
                                        ...slideEditor,
                                        slideIndex: idx,
                                      })
                                    }
                                  >
                                    <h4 className="font-semibold text-gray-900">
                                      Slide {slide.slide_number}:{" "}
                                      {slide.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {slide.content.substring(0, 100)}
                                      ...
                                    </p>
                                  </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                              {pptSlides
                                .filter(
                                  (s) =>
                                    s.video_id ===
                                    slideEditor.videoId
                                )
                                .slice(slideEditor.slideIndex, slideEditor.slideIndex + 1)
                                .map((slide) => (
                                  <div
                                    key={slide.id}
                                    className="bg-gray-50 p-4 rounded-lg"
                                  >
                                    <h4 className="font-semibold text-gray-900 mb-2">
                                      Content
                                    </h4>
                                    <textarea
                                      defaultValue={slide.content}
                                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      rows={4}
                                    />

                                    <h4 className="font-semibold text-gray-900 mt-4 mb-2">
                                      Speaker Notes
                                    </h4>
                                    <textarea
                                      defaultValue={slide.notes || ""}
                                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      rows={3}
                                    />

                                    <h4 className="font-semibold text-gray-900 mt-4 mb-2">
                                      Layout
                                    </h4>
                                    <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                                      {[
                                        "title",
                                        "content",
                                        "two_column",
                                        "diagram",
                                        "summary",
                                        "code",
                                      ].map((type) => (
                                        <option
                                          key={type}
                                          value={type}
                                          selected={
                                            slide.layout_type === type
                                          }
                                        >
                                          {type}
                                        </option>
                                      ))}
                                    </select>

                                    <button className="w-full mt-4 bg-purple-600 text-white font-semibold py-2 rounded hover:bg-purple-700 flex items-center justify-center gap-2">
                                      <Sparkles className="w-4 h-4" />
                                      AI Improve
                                    </button>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-900 font-semibold mb-1">
                          Drag and drop your presentations
                        </p>
                        <p className="text-gray-600 text-sm">
                          or click to browse
                        </p>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="space-y-3">
                          {uploadedFiles.map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {file.filename}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {getVideoDetails(file.videoId)?.video
                                      .title || "Unknown"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button className="p-2 hover:bg-gray-300 rounded">
                                  <Edit2 className="w-4 h-4 text-gray-600" />
                                </button>
                                <button className="p-2 hover:bg-gray-300 rounded">
                                  <Sparkles className="w-4 h-4 text-purple-600" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── RECORDING TAB ─── */}
          {activeTab === "recording" && getTabUnlocked("recording") && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setZoomConnected(!zoomConnected)}
                  className={`p-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    zoomConnected
                      ? "bg-green-50 text-green-700 border border-green-300"
                      : "bg-blue-600 text-white border border-blue-700 hover:bg-blue-700"
                  }`}
                >
                  <ZoomIn className="w-5 h-5" />
                  {zoomConnected ? "Zoom Connected" : "Connect Zoom"}
                </button>
                <button className="p-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 bg-white text-blue-600 border border-blue-600 hover:bg-blue-50">
                  <Upload className="w-5 h-5" />
                  Upload Video
                </button>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Recording Dashboard
                </h3>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Recorded", value: "0", icon: Music },
                    { label: "Total Duration", value: "0h 0m", icon: Clock },
                    {
                      label: "Scheduled",
                      value: "0",
                      icon: CheckCircle2,
                    },
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="w-5 h-5 text-blue-600" />
                          <p className="text-sm text-gray-600">
                            {stat.label}
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                          {stat.value}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          Video
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          Source
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          Duration
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          Quality
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getAllVideos().map(({ video }) => {
                        const recording = recordings.find(
                          (r) => r.video_id === video.id
                        );

                        return (
                          <tr key={video.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-900 font-medium">
                              {video.title}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                {recording?.source || "zoom"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs px-2 py-1 rounded font-semibold ${
                                  recording?.status === "ready"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {recording?.status || "not_started"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-xs">
                              {recording?.duration_seconds
                                ? `${Math.floor(recording.duration_seconds / 60)}m`
                                : "-"}
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-xs">
                              {recording?.quality || "-"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
                                  Schedule
                                </button>
                                {zoomConnected && (
                                  <button className="text-xs text-green-600 hover:text-green-700 font-semibold">
                                    Join
                                  </button>
                                )}
                                <button className="text-xs text-orange-600 hover:text-orange-700 font-semibold">
                                  Upload
                                </button>
                                <button className="text-xs text-purple-600 hover:text-purple-700 font-semibold">
                                  Preview
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TRANSCRIPT TAB ─── */}
          {activeTab === "transcript" && getTabUnlocked("transcript") && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-900">Videos</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {getAllVideos().map(({ video }) => {
                      const transcript = transcripts.find(
                        (t) => t.video_id === video.id
                      );
                      const isSelected = selectedVideoForTranscript === video.id;

                      return (
                        <button
                          key={video.id}
                          onClick={() =>
                            setSelectedVideoForTranscript(video.id)
                          }
                          className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                            isSelected ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {video.title}
                            </p>
                            <div className="flex gap-1 mt-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                  transcript?.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : transcript?.status === "edited"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {transcript?.status || "pending"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {selectedVideoForTranscript && (
                <div className="lg:col-span-3">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-900">
                        Transcript Editor
                      </h3>
                      <button className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        Transcribe
                      </button>
                    </div>

                    <textarea
                      defaultValue="Click 'Transcribe' to generate the transcript..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                      rows={10}
                    />

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {[
                        { label: "Word Count", value: "0" },
                        { label: "Confidence", value: "-" },
                        { label: "Language", value: "English" },
                      ].map((stat, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-600">
                            {stat.label}
                          </p>
                          <p className="text-lg font-bold text-gray-900">
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button className="flex-1 bg-green-600 text-white font-semibold py-3 rounded hover:bg-green-700 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Approve Transcript
                      </button>
                      <button className="flex-1 bg-purple-600 text-white font-semibold py-3 rounded hover:bg-purple-700 flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        AI Polish
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── CONTENT TAB ─── */}
          {activeTab === "content" && getTabUnlocked("content") && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Content Generation
                </h2>

                {modules.map((module) => (
                  <div key={module.id} className="mb-8 pb-8 border-b border-gray-200 last:border-b-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      {module.title}
                    </h3>

                    <div className="space-y-6">
                      {module.lessons.map((lesson) => (
                        <div key={lesson.id} className="pl-6">
                          <h4 className="font-semibold text-gray-900 mb-3">
                            {lesson.title}
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                              "reading",
                              "practice_quiz",
                              "graded_quiz",
                              "case_study",
                              "discussion",
                            ].map((contentType) => {
                              const existing = contentItems.find(
                                (ci) =>
                                  ci.lesson_id === lesson.id &&
                                  ci.type === contentType
                              );

                              return (
                                <button
                                  key={contentType}
                                  onClick={() => {
                                    if (!existing) {
                                      const newItem: ContentItem = {
                                        id: generateId(),
                                        lesson_id: lesson.id,
                                        type: contentType as ContentType,
                                        title: `${contentType} for ${lesson.title}`,
                                        status: "generating",
                                        order: contentItems.filter(
                                          (c) => c.lesson_id === lesson.id
                                        ).length + 1,
                                      };
                                      addContentItem(newItem);
                                      setContentItems([
                                        ...contentItems,
                                        newItem,
                                      ]);

                                      setTimeout(() => {
                                        updateContentItem(newItem.id, {
                                          status: "generated",
                                          content: `Sample ${contentType} content...`,
                                        });
                                        setContentItems((prev) =>
                                          prev.map((c) =>
                                            c.id === newItem.id
                                              ? {
                                                  ...c,
                                                  status: "generated",
                                                  content: `Sample ${contentType} content...`,
                                                }
                                              : c
                                          )
                                        );
                                      }, 2000);
                                    }
                                  }}
                                  className={`p-4 rounded-lg border-2 text-center transition-colors ${
                                    existing
                                      ? existing.status === "generated"
                                        ? "border-green-300 bg-green-50"
                                        : existing.status === "generating"
                                          ? "border-yellow-300 bg-yellow-50"
                                          : "border-gray-300 bg-gray-50"
                                      : "border-gray-300 hover:border-blue-300"
                                  }`}
                                >
                                  <p className="font-semibold text-gray-900 capitalize text-sm">
                                    {contentType.replace("_", " ")}
                                  </p>
                                  {existing && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      {existing.status}
                                    </p>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── REVIEW TAB ─── */}
          {activeTab === "review" && getTabUnlocked("review") && (
            <div className="space-y-6">
              {/* Completion Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Videos",
                    value: getAllVideos().length,
                    total: getAllVideos().length,
                  },
                  {
                    label: "Transcripts",
                    value: transcripts.filter((t) => t.status === "approved").length,
                    total: getAllVideos().length,
                  },
                  {
                    label: "Content Items",
                    value: contentItems.filter((c) => c.status === "approved")
                      .length,
                    total: contentItems.length,
                  },
                  {
                    label: "Slides",
                    value: pptSlides.filter((s) => s.status === "approved")
                      .length,
                    total: pptSlides.length,
                  },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg p-4 border border-gray-200"
                  >
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}/{stat.total}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quality Checklist */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Quality Checklist
                </h3>

                <div className="space-y-3">
                  {[
                    { key: "completeness", label: "Course completeness verified" },
                    { key: "accuracy", label: "Content accuracy checked" },
                    { key: "engagement", label: "Engagement level reviewed" },
                    { key: "accessibility", label: "Accessibility standards met" },
                    { key: "alignment", label: "Learning objectives aligned" },
                    { key: "production", label: "Production quality approved" },
                    { key: "testing", label: "Functionality tested" },
                    { key: "documentation", label: "Documentation complete" },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={qualityChecklistItems[item.key]}
                        onChange={(e) =>
                          setQualityChecklistItems((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="font-medium text-gray-900">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Approval Status */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Approval Status
                </h3>

                <div className="space-y-3">
                  {[
                    { key: "coachSignOff", label: "Coach Sign-off", state: coachSignOff, setter: setCoachSignOff },
                    { key: "pmReview", label: "PM Review", state: pmReview, setter: setPmReview },
                    {
                      key: "authoritySubmission",
                      label: "Authority Submission",
                      state: authoritySubmission,
                      setter: setAuthoritySubmission,
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.state}
                        onChange={(e) => item.setter(e.target.checked)}
                        className="w-5 h-5 text-green-600 rounded"
                      />
                      <span className="font-semibold text-gray-900">
                        {item.label}
                      </span>
                      {item.state && (
                        <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />
                      )}
                    </label>
                  ))}
                </div>

                <button
                  disabled={
                    !Object.values(qualityChecklistItems).every(Boolean) ||
                    !coachSignOff ||
                    !pmReview ||
                    !authoritySubmission
                  }
                  className={`w-full mt-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                    Object.values(qualityChecklistItems).every(Boolean) &&
                    coachSignOff &&
                    pmReview &&
                    authoritySubmission
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-300 text-gray-600 cursor-not-allowed"
                  }`}
                  onClick={handleApproveAndAdvance}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Publish Course
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 space-y-3 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-lg font-semibold text-white shadow-lg animate-in fade-in slide-in-from-bottom-4 ${
              toast.type === "success"
                ? "bg-green-600"
                : toast.type === "error"
                  ? "bg-red-600"
                  : "bg-blue-600"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
