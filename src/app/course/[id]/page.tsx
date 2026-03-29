"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { User, Course, Module, Comment, ContentBrief, PPTSlide, Recording, Transcript, ContentItem } from "@/types";
import {
  getCourseById,
  getModulesByCourse,
  getCommentsByCourse,
  addComment,
  resolveComment,
  updateCourse,
  generateId,
  addContentBrief,
  getContentBriefsByVideo,
  updateContentBrief,
  addPPTSlide,
  getPPTSlidesByVideo,
  updatePPTSlide,
  addRecording,
  getRecordingByVideo,
  updateRecording,
  addTranscript,
  getTranscriptByRecording,
  updateTranscript,
  addContentItem,
  getContentItemsByLesson,
  updateContentItem,
} from "@/lib/store";
import Link from "next/link";

type PhaseTab = "toc" | "briefs" | "ppts" | "recording" | "transcript" | "content" | "review";

const PHASE_TABS: Record<string, PhaseTab[]> = {
  draft: ["toc"],
  toc_generation: ["toc"],
  toc_review: ["toc"],
  toc_approved: ["toc", "briefs"],
  content_briefs: ["toc", "briefs"],
  ppt_generation: ["toc", "briefs", "ppts"],
  ppt_review: ["toc", "briefs", "ppts"],
  recording: ["toc", "briefs", "ppts", "recording"],
  transcription: ["toc", "briefs", "ppts", "recording", "transcript"],
  content_generation: ["toc", "briefs", "ppts", "recording", "transcript", "content"],
  content_review: ["toc", "briefs", "ppts", "recording", "transcript", "content"],
  final_review: ["toc", "briefs", "ppts", "recording", "transcript", "content", "review"],
  published: ["toc", "briefs", "ppts", "recording", "transcript", "content", "review"],
};

const PHASE_LABELS: Record<string, string> = {
  draft: "Draft",
  toc_generation: "Generating TOC",
  toc_review: "Review TOC",
  toc_approved: "TOC Approved",
  content_briefs: "Content Briefs",
  ppt_generation: "Generating PPTs",
  ppt_review: "Review PPTs",
  recording: "Recording",
  transcription: "Transcription",
  content_generation: "Generating Content",
  content_review: "Review Content",
  final_review: "Final Review",
  published: "Published",
};

const CONTENT_TYPES = ["reading", "practice_quiz", "graded_quiz", "discussion", "case_study", "glossary"] as const;

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white font-medium shadow-lg animate-pulse ${
      type === "success" ? "bg-green-600" : "bg-red-600"
    }`}>
      {message}
    </div>
  );
}

// Status badge helper
function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    generating: "bg-blue-100 text-blue-700",
    ready: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    completed: "bg-green-100 text-green-700",
    "in-progress": "bg-blue-100 text-blue-700",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
    </span>
  );
}

// Loading spinner component
function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  return <div className={`${sizes[size]} border-3 border-blue-600 border-t-transparent rounded-full animate-spin`} />;
}

export default function CoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeTab, setActiveTab] = useState<PhaseTab>("toc");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<{
    type: "module" | "lesson" | "video" | "brief" | "ppt" | "content";
    id: string;
  } | null>(null);

  // State for briefs, ppts, recordings, transcripts, content
  const [contentBriefs, setContentBriefs] = useState<ContentBrief[]>([]);
  const [pptSlides, setPptSlides] = useState<PPTSlide[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);

  // UI state
  const [expandedVideos, setExpandedVideos] = useState<Record<string, boolean>>({});
  const [loadingVideos, setLoadingVideos] = useState<Record<string, boolean>>({});
  const [editingBrief, setEditingBrief] = useState<string | null>(null);
  const [briefEdits, setBriefEdits] = useState<Record<string, Partial<ContentBrief>>>({});
  const [editingTranscript, setEditingTranscript] = useState<string | null>(null);
  const [transcriptEdits, setTranscriptEdits] = useState<Record<string, string>>({});
  const [selectedContentType, setSelectedContentType] = useState<Record<string, string>>({});
  const [generatingContent, setGeneratingContent] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Load initial data
  useEffect(() => {
    const storedUser = localStorage.getItem("courseforge_user");
    if (!storedUser) {
      router.push("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      const foundCourse = getCourseById(courseId);
      if (!foundCourse) {
        router.push("/dashboard");
        return;
      }

      setCourse(foundCourse);
      const foundModules = getModulesByCourse(courseId);
      setModules(foundModules);
      const foundComments = getCommentsByCourse(courseId);
      setComments(foundComments);

      // Load briefs, ppts, recordings, transcripts
      const allBriefs: ContentBrief[] = [];
      const allSlides: PPTSlide[] = [];
      const allRecordings: Recording[] = [];
      const allTranscripts: Transcript[] = [];
      const allContentItems: ContentItem[] = [];

      for (const module of foundModules) {
        for (const lesson of module.lessons) {
          for (const video of lesson.videos) {
            allBriefs.push(...getContentBriefsByVideo(video.id));
            allSlides.push(...getPPTSlidesByVideo(video.id));
            const rec = getRecordingByVideo(video.id);
            if (rec) {
              allRecordings.push(rec);
              const trans = getTranscriptByRecording(rec.id);
              if (trans) allTranscripts.push(trans);
            }
          }
          allContentItems.push(...getContentItemsByLesson(lesson.id));
        }
      }

      setContentBriefs(allBriefs);
      setPptSlides(allSlides);
      setRecordings(allRecordings);
      setTranscripts(allTranscripts);
      setContentItems(allContentItems);

      const availableTabs = PHASE_TABS[foundCourse.status] || ["toc"];
      if (!availableTabs.includes(activeTab)) {
        setActiveTab(availableTabs[0] as PhaseTab);
      }
    } catch (err) {
      console.error("Course load error:", err);
      router.push("/");
      return;
    }

    setIsLoading(false);
  }, [courseId, router]);

  const handleLogout = () => {
    localStorage.removeItem("courseforge_user");
    router.push("/");
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedTarget || !user || !course) return;

    const comment: Comment = {
      id: generateId(),
      course_id: courseId,
      author: user.id,
      author_role: user.role,
      text: newComment,
      target_type: selectedTarget.type,
      target_id: selectedTarget.id,
      resolved: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addComment(comment);
    setComments([...comments, comment]);
    setNewComment("");
    setSelectedTarget(null);
    setToast({ message: "Comment added successfully", type: "success" });
  };

  const handleResolveComment = (commentId: string) => {
    resolveComment(commentId);
    setComments(comments.map((c) => (c.id === commentId ? { ...c, resolved: true } : c)));
    setToast({ message: "Comment resolved", type: "success" });
  };

  const generateAllVideoBriefs = useCallback(async () => {
    const allVideos = modules.flatMap((m) => m.lessons.flatMap((l) => l.videos));
    const toBrief = allVideos.filter((v) => !contentBriefs.some((b) => b.video_id === v.id));

    if (toBrief.length === 0) {
      setToast({ message: "All videos already have briefs", type: "error" });
      return;
    }

    for (const video of toBrief) {
      setLoadingVideos((prev) => ({ ...prev, [video.id]: true }));
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const brief: ContentBrief = {
          id: generateId(),
          video_id: video.id,
          lesson_id: video.lesson_id,
          course_id: courseId,
          coach_id: user?.id || "",
          what_to_cover: `Key concepts and applications for: ${video.title}`,
          examples: "Real-world business scenarios and use cases",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        addContentBrief(brief);
        setContentBriefs((prev) => [...prev, brief]);
      } finally {
        setLoadingVideos((prev) => ({ ...prev, [video.id]: false }));
      }
    }

    setToast({ message: `Generated ${toBrief.length} content briefs`, type: "success" });
  }, [modules, contentBriefs, courseId, user?.id]);

  const generateBrief = useCallback(
    async (videoId: string) => {
      setLoadingVideos((prev) => ({ ...prev, [videoId]: true }));
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const brief: ContentBrief = {
          id: generateId(),
          video_id: videoId,
          lesson_id: modules.flatMap((m) => m.lessons.flatMap((l) => l.videos)).find((v) => v.id === videoId)?.lesson_id || "",
          course_id: courseId,
          coach_id: user?.id || "",
          what_to_cover: "Key concepts and business applications",
          examples: "Real-world scenarios and case studies",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        addContentBrief(brief);
        setContentBriefs((prev) => [...prev, brief]);
        setToast({ message: "Brief generated successfully", type: "success" });
      } finally {
        setLoadingVideos((prev) => ({ ...prev, [videoId]: false }));
      }
    },
    [modules, courseId, user?.id]
  );

  const generateAllPPTs = useCallback(async () => {
    const allVideos = modules.flatMap((m) => m.lessons.flatMap((l) => l.videos));
    const toGenerate = allVideos.filter((v) => !pptSlides.some((s) => s.video_id === v.id));

    if (toGenerate.length === 0) {
      setToast({ message: "All videos already have slides", type: "error" });
      return;
    }

    for (const video of toGenerate) {
      setLoadingVideos((prev) => ({ ...prev, [video.id]: true }));
      try {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        for (let i = 1; i <= 5; i++) {
          const slide: PPTSlide = {
            id: generateId(),
            video_id: video.id,
            lesson_id: video.lesson_id,
            course_id: courseId,
            slide_number: i,
            title: `Slide ${i}: ${video.title}`,
            content: `Key point ${i} about the topic\nSecondary information`,
            notes: `Speaker notes for slide ${i}`,
            status: "generated",
          };
          addPPTSlide(slide);
          setPptSlides((prev) => [...prev, slide]);
        }
      } finally {
        setLoadingVideos((prev) => ({ ...prev, [video.id]: false }));
      }
    }

    setToast({ message: `Generated slides for ${toGenerate.length} videos`, type: "success" });
  }, [modules, pptSlides, courseId]);

  const generatePPT = useCallback(
    async (videoId: string) => {
      setLoadingVideos((prev) => ({ ...prev, [videoId]: true }));
      try {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const video = modules.flatMap((m) => m.lessons.flatMap((l) => l.videos)).find((v) => v.id === videoId);
        if (!video) return;

        for (let i = 1; i <= 5; i++) {
          const slide: PPTSlide = {
            id: generateId(),
            video_id: videoId,
            lesson_id: video.lesson_id,
            course_id: courseId,
            slide_number: i,
            title: `Slide ${i}: ${video.title}`,
            content: `Key concept ${i}\nSupporting details`,
            notes: `Speaker notes for slide ${i}`,
            status: "generated",
          };
          addPPTSlide(slide);
          setPptSlides((prev) => [...prev, slide]);
        }

        setToast({ message: "Slides generated successfully", type: "success" });
      } finally {
        setLoadingVideos((prev) => ({ ...prev, [videoId]: false }));
      }
    },
    [modules, courseId]
  );

  const generateAllRecordings = useCallback(async () => {
    const allVideos = modules.flatMap((m) => m.lessons.flatMap((l) => l.videos));
    const toRecord = allVideos.filter((v) => !recordings.some((r) => r.video_id === v.id));

    if (toRecord.length === 0) {
      setToast({ message: "All videos already have recordings", type: "error" });
      return;
    }

    for (const video of toRecord) {
      setLoadingVideos((prev) => ({ ...prev, [video.id]: true }));
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const recording: Recording = {
          id: generateId(),
          video_id: video.id,
          lesson_id: video.lesson_id,
          course_id: courseId,
          coach_id: user?.id || "",
          duration_seconds: video.duration_minutes * 60,
          status: "recorded",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        addRecording(recording);
        setRecordings((prev) => [...prev, recording]);
      } finally {
        setLoadingVideos((prev) => ({ ...prev, [video.id]: false }));
      }
    }

    setToast({ message: `Generated AI voice for ${toRecord.length} videos`, type: "success" });
  }, [modules, recordings, courseId, user?.id]);

  const generateRecording = useCallback(
    async (videoId: string) => {
      setLoadingVideos((prev) => ({ ...prev, [videoId]: true }));
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const video = modules.flatMap((m) => m.lessons.flatMap((l) => l.videos)).find((v) => v.id === videoId);
        if (!video) return;

        const recording: Recording = {
          id: generateId(),
          video_id: videoId,
          lesson_id: video.lesson_id,
          course_id: courseId,
          coach_id: user?.id || "",
          duration_seconds: video.duration_minutes * 60,
          status: "recorded",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        addRecording(recording);
        setRecordings((prev) => [...prev, recording]);
        setToast({ message: "AI voice generated successfully", type: "success" });
      } finally {
        setLoadingVideos((prev) => ({ ...prev, [videoId]: false }));
      }
    },
    [modules, courseId, user?.id]
  );

  const generateAllTranscripts = useCallback(async () => {
    const toTranscribe = recordings.filter((r) => !transcripts.some((t) => t.recording_id === r.id));

    if (toTranscribe.length === 0) {
      setToast({ message: "All recordings already have transcripts", type: "error" });
      return;
    }

    for (const recording of toTranscribe) {
      setLoadingVideos((prev) => ({ ...prev, [recording.video_id]: true }));
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const transcript: Transcript = {
          id: generateId(),
          recording_id: recording.id,
          video_id: recording.video_id,
          course_id: courseId,
          text: "This is the auto-generated transcript from the AI voice recording. It contains all the key concepts discussed in the video including examples and explanations.",
          language: "en",
          confidence: 0.95,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        addTranscript(transcript);
        setTranscripts((prev) => [...prev, transcript]);
      } finally {
        setLoadingVideos((prev) => ({ ...prev, [recording.video_id]: false }));
      }
    }

    setToast({ message: `Transcribed ${toTranscribe.length} recordings`, type: "success" });
  }, [recordings, transcripts, courseId]);

  const generateTranscript = useCallback(
    async (recordingId: string) => {
      const recording = recordings.find((r) => r.id === recordingId);
      if (!recording) return;

      setLoadingVideos((prev) => ({ ...prev, [recording.video_id]: true }));
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const transcript: Transcript = {
          id: generateId(),
          recording_id: recordingId,
          video_id: recording.video_id,
          course_id: courseId,
          text: "This is the auto-generated transcript from the recording. It contains all the key concepts and information from the video.",
          language: "en",
          confidence: 0.95,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        addTranscript(transcript);
        setTranscripts((prev) => [...prev, transcript]);
        setToast({ message: "Transcript generated successfully", type: "success" });
      } finally {
        setLoadingVideos((prev) => ({ ...prev, [recording.video_id]: false }));
      }
    },
    [recordings, courseId]
  );

  const generateAllContent = useCallback(async () => {
    const lessonsWithTranscripts = new Set<string>();
    for (const transcript of transcripts) {
      const video = modules.flatMap((m) => m.lessons.flatMap((l) => l.videos)).find((v) => v.id === transcript.video_id);
      if (video) lessonsWithTranscripts.add(video.lesson_id);
    }

    const toLessonArray = Array.from(lessonsWithTranscripts);
    if (toLessonArray.length === 0) {
      setToast({ message: "No transcripts available for content generation", type: "error" });
      return;
    }

    for (const lessonId of toLessonArray) {
      const selectedType = selectedContentType[lessonId] || "reading";
      setGeneratingContent((prev) => ({ ...prev, [lessonId]: true }));
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const item: ContentItem = {
          id: generateId(),
          lesson_id: lessonId,
          type: selectedType as any,
          title: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1).replace(/_/g, " ")} - AI Generated`,
          content: "This is AI-generated content based on the video transcript.",
          order: contentItems.filter((c) => c.lesson_id === lessonId).length + 1,
        };
        addContentItem(item);
        setContentItems((prev) => [...prev, item]);
      } finally {
        setGeneratingContent((prev) => ({ ...prev, [lessonId]: false }));
      }
    }

    setToast({ message: `Generated content for ${toLessonArray.length} lessons`, type: "success" });
  }, [modules, transcripts, selectedContentType, contentItems]);

  const generateContent = useCallback(
    async (lessonId: string) => {
      const selectedType = selectedContentType[lessonId] || "reading";
      setGeneratingContent((prev) => ({ ...prev, [lessonId]: true }));
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const item: ContentItem = {
          id: generateId(),
          lesson_id: lessonId,
          type: selectedType as any,
          title: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1).replace(/_/g, " ")} - AI Generated`,
          content: "This is AI-generated content based on the video transcripts for this lesson.",
          order: contentItems.filter((c) => c.lesson_id === lessonId).length + 1,
        };
        addContentItem(item);
        setContentItems((prev) => [...prev, item]);
        setToast({ message: "Content generated successfully", type: "success" });
      } finally {
        setGeneratingContent((prev) => ({ ...prev, [lessonId]: false }));
      }
    },
    [selectedContentType, contentItems]
  );

  const handlePublish = () => {
    if (!course) return;
    updateCourse(courseId, { status: "published" });
    setCourse({ ...course, status: "published" });
    setToast({ message: "Course published successfully!", type: "success" });
  };

  const getVideoStats = () => {
    const allVideos = modules.flatMap((m) => m.lessons.flatMap((l) => l.videos));
    const totalDuration = allVideos.reduce((sum, v) => sum + v.duration_minutes, 0);
    const recordedCount = recordings.length;
    const transcribedCount = transcripts.length;
    const contentCount = contentItems.length;

    return {
      totalVideos: allVideos.length,
      totalDuration,
      recordedCount,
      transcribedCount,
      contentCount,
    };
  };

  if (isLoading || !course || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const availableTabs = PHASE_TABS[course.status] || ["toc"];
  const isCoachOrCreator = user.role === "coach" || user.id === course.created_by;
  const stats = getVideoStats();

  // Get all videos with their parent lesson
  const allVideos = modules.flatMap((m) =>
    m.lessons.flatMap((l) =>
      l.videos.map((v) => ({
        video: v,
        lesson: l,
        module: m,
      }))
    )
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 md:ml-64 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                <p className="text-gray-600 mt-1">{course.description}</p>
              </div>
              <div className="text-right">
                <div className={`inline-block px-4 py-2 rounded-lg font-medium text-sm ${
                  course.status === "published"
                    ? "bg-green-100 text-green-700"
                    : course.status.includes("review")
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {PHASE_LABELS[course.status]}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${((Object.keys(PHASE_LABELS).indexOf(course.status) + 1) / Object.keys(PHASE_LABELS).length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {(["toc", "briefs", "ppts", "recording", "transcript", "content", "review"] as PhaseTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={!availableTabs.includes(tab)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : availableTabs.includes(tab)
                    ? "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {tab === "briefs" ? "Content Briefs" : tab === "ppts" ? "PPTs" : tab === "recording" ? "Recording" : tab === "transcript" ? "Transcript" : tab === "content" ? "Content" : tab === "review" ? "Review" : "TOC"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            {/* TOC Tab */}
            {activeTab === "toc" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Table of Contents</h2>
                  {modules.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>No modules yet. Generate TOC to start.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {modules.map((module) => (
                        <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() =>
                              setExpandedModules((prev) => ({
                                ...prev,
                                [module.id]: !prev[module.id],
                              }))
                            }
                            className="w-full px-6 py-4 hover:bg-gray-50 flex items-center justify-between"
                          >
                            <div className="text-left flex-1">
                              <h3 className="font-bold text-gray-900">{module.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                              <div className="flex gap-3 mt-2">
                                <span className="text-xs text-gray-500">Lessons: {module.lessons.length}</span>
                                <span className="text-xs text-gray-500">
                                  Duration: {module.lessons.reduce((sum, l) => sum + l.videos.reduce((s, v) => s + v.duration_minutes, 0), 0)} min
                                </span>
                              </div>
                              {module.learning_objectives.length > 0 && (
                                <div className="mt-2 text-xs text-blue-600">
                                  {module.learning_objectives.length} learning objectives
                                </div>
                              )}
                            </div>
                            <svg
                              className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-4 ${expandedModules[module.id] ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </button>

                          {expandedModules[module.id] && (
                            <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-4">
                              {module.lessons.map((lesson) => (
                                <div key={lesson.id} className="bg-white p-4 rounded-lg border border-gray-100 space-y-3">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                                      <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {lesson.content_types.map((ct) => (
                                          <span key={ct} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                            {ct}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    {isCoachOrCreator && (
                                      <button
                                        onClick={() => setSelectedTarget({ type: "lesson", id: lesson.id })}
                                        className="text-blue-600 hover:text-blue-700 text-sm whitespace-nowrap"
                                      >
                                        Comment
                                      </button>
                                    )}
                                  </div>

                                  {lesson.videos.length > 0 && (
                                    <div className="pl-4 border-l-2 border-gray-200 space-y-2">
                                      {lesson.videos.map((video) => (
                                        <div key={video.id} className="text-sm">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              <span className="text-gray-700">{video.title}</span>
                                              <span className="text-xs text-gray-500">({video.duration_minutes} min)</span>
                                            </div>
                                            {isCoachOrCreator && (
                                              <button onClick={() => setSelectedTarget({ type: "video", id: video.id })} className="text-blue-600 hover:text-blue-700 text-xs">
                                                Comment
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                {isCoachOrCreator && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">Comments & Feedback</h3>
                    <div className="space-y-4 mb-6">
                      {comments
                        .filter((c) => !c.resolved && ["toc", "module", "lesson", "video"].includes(c.target_type))
                        .map((comment) => (
                          <div key={comment.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-sm text-gray-600">
                                  <strong>{comment.author_role}</strong> on <span className="font-medium">{comment.target_type}</span>
                                </p>
                                <p className="text-gray-900 mt-2">{comment.text}</p>
                                <p className="text-xs text-gray-500 mt-2">{new Date(comment.created_at).toLocaleDateString()}</p>
                              </div>
                              {user.role === "pm" && (
                                <button
                                  onClick={() => handleResolveComment(comment.id)}
                                  className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    {selectedTarget && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-3">Comment on {selectedTarget.type}</p>
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add your feedback..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddComment}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                          >
                            Post Comment
                          </button>
                          <button
                            onClick={() => setSelectedTarget(null)}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Send for AI Improvement */}
                {user.role === "pm" && comments.filter((c) => !c.resolved && ["module", "lesson", "video"].includes(c.target_type)).length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <button
                      onClick={async () => {
                        const unresolvedComments = comments
                          .filter((c) => !c.resolved && ["module", "lesson", "video"].includes(c.target_type))
                          .map((c) => ({ id: c.id, text: c.text, target_id: c.target_id, target_type: c.target_type as "module" | "lesson" | "video" }));

                        setToast({ message: "Sending TOC for AI improvement...", type: "success" });

                        try {
                          const res = await fetch("/api/ai/improve-toc", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              currentTOC: modules,
                              comments: unresolvedComments,
                            }),
                          });

                          const data = await res.json();
                          if (data.success && data.modules) {
                            setModules(data.modules);
                            // Resolve all comments that were sent
                            for (const c of unresolvedComments) {
                              resolveComment(c.id);
                            }
                            setComments(comments.map((c) =>
                              unresolvedComments.some((uc) => uc.id === c.id) ? { ...c, resolved: true } : c
                            ));
                            setToast({ message: "TOC improved by AI! Comments resolved.", type: "success" });
                          } else {
                            setToast({ message: "AI improvement failed. Please try again.", type: "error" });
                          }
                        } catch (err) {
                          console.error("AI improve error:", err);
                          setToast({ message: "Network error. Please try again.", type: "error" });
                        }
                      }}
                      className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Send for AI Improvement ({comments.filter((c) => !c.resolved && ["module", "lesson", "video"].includes(c.target_type)).length} comments)
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">AI will address all unresolved coach comments and update the TOC</p>
                  </div>
                )}

                {/* Advance Phase Button */}
                {user.role === "pm" && (course.status === "toc_review" || course.status === "toc_generation") && (
                  <div className="border-t border-gray-200 pt-6">
                    <button
                      onClick={() => {
                        const nextStatus = course.status === "toc_generation" ? "toc_review" : "toc_approved";
                        updateCourse(courseId, { status: nextStatus });
                        setCourse({ ...course, status: nextStatus as any });
                        setToast({ message: `Phase advanced to ${PHASE_LABELS[nextStatus]}`, type: "success" });
                      }}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                    >
                      Approve & Advance to {course.status === "toc_generation" ? "TOC Review" : "Content Briefs"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Content Briefs Tab */}
            {activeTab === "briefs" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Content Briefs</h2>
                  <button
                    onClick={generateAllVideoBriefs}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Generate All Briefs
                  </button>
                </div>

                {allVideos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No videos available. Please generate TOC first.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allVideos.map(({ video, lesson, module }) => {
                      const brief = contentBriefs.find((b) => b.video_id === video.id);
                      const isLoading = loadingVideos[video.id];
                      const isEditing = editingBrief === video.id;

                      return (
                        <div key={video.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedVideos((prev) => ({ ...prev, [video.id]: !prev[video.id] }))}
                            className="w-full px-6 py-4 hover:bg-gray-50 flex items-center justify-between"
                          >
                            <div className="text-left flex-1">
                              <h3 className="font-semibold text-gray-900">{video.title}</h3>
                              <div className="text-xs text-gray-600 mt-1">
                                {module.title} / {lesson.title} • {video.duration_minutes} min
                              </div>
                              <div className="mt-2">
                                {brief ? <StatusBadge status="ready" /> : isLoading ? <StatusBadge status="generating" /> : <StatusBadge status="pending" />}
                              </div>
                            </div>
                            {!brief && !isLoading && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generateBrief(video.id);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium ml-2 whitespace-nowrap"
                              >
                                Generate Brief
                              </button>
                            )}
                            {isLoading && (
                              <div className="ml-2">
                                <LoadingSpinner size="sm" />
                              </div>
                            )}
                            <svg
                              className={`w-5 h-5 text-gray-400 transition-transform ml-4 ${expandedVideos[video.id] ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </button>

                          {expandedVideos[video.id] && brief && (
                            <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">What to Cover</label>
                                {isEditing ? (
                                  <textarea
                                    value={briefEdits[brief.id]?.what_to_cover ?? brief.what_to_cover}
                                    onChange={(e) =>
                                      setBriefEdits((prev) => ({
                                        ...prev,
                                        [brief.id]: { ...prev[brief.id], what_to_cover: e.target.value },
                                      }))
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                  />
                                ) : (
                                  <p className="text-gray-700">{brief.what_to_cover}</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">Examples & Use Cases</label>
                                {isEditing ? (
                                  <textarea
                                    value={briefEdits[brief.id]?.examples ?? brief.examples}
                                    onChange={(e) =>
                                      setBriefEdits((prev) => ({
                                        ...prev,
                                        [brief.id]: { ...prev[brief.id], examples: e.target.value },
                                      }))
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                  />
                                ) : (
                                  <p className="text-gray-700">{brief.examples}</p>
                                )}
                              </div>

                              <div className="flex gap-2 pt-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        const edits = briefEdits[brief.id];
                                        if (edits) {
                                          updateContentBrief(brief.id, edits);
                                          setContentBriefs((prev) =>
                                            prev.map((b) => (b.id === brief.id ? { ...b, ...edits } : b))
                                          );
                                        }
                                        setEditingBrief(null);
                                        setToast({ message: "Brief updated", type: "success" });
                                      }}
                                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingBrief(null);
                                        setBriefEdits((prev) => {
                                          const next = { ...prev };
                                          delete next[brief.id];
                                          return next;
                                        });
                                      }}
                                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingBrief(brief.id);
                                      setBriefEdits((prev) => ({
                                        ...prev,
                                        [brief.id]: { what_to_cover: brief.what_to_cover, examples: brief.examples },
                                      }));
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PPTs Tab */}
            {activeTab === "ppts" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Generated Presentations</h2>
                  <button
                    onClick={generateAllPPTs}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Generate All PPTs
                  </button>
                </div>

                {allVideos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No videos available.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allVideos.map(({ video, lesson, module }) => {
                      const slides = pptSlides.filter((s) => s.video_id === video.id);
                      const isLoading = loadingVideos[video.id];

                      return (
                        <div key={video.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedVideos((prev) => ({ ...prev, [video.id]: !prev[video.id] }))}
                            className="w-full px-6 py-4 hover:bg-gray-50 flex items-center justify-between"
                          >
                            <div className="text-left flex-1">
                              <h3 className="font-semibold text-gray-900">{video.title}</h3>
                              <div className="text-xs text-gray-600 mt-1">
                                {module.title} / {lesson.title}
                              </div>
                              <div className="mt-2">
                                {slides.length > 0 ? (
                                  <span className="text-sm text-blue-600 font-medium">{slides.length} slides generated</span>
                                ) : isLoading ? (
                                  <StatusBadge status="generating" />
                                ) : (
                                  <StatusBadge status="pending" />
                                )}
                              </div>
                            </div>
                            {slides.length === 0 && !isLoading && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generatePPT(video.id);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium ml-2 whitespace-nowrap"
                              >
                                Generate Slides
                              </button>
                            )}
                            {isLoading && (
                              <div className="ml-2">
                                <LoadingSpinner size="sm" />
                              </div>
                            )}
                            <svg
                              className={`w-5 h-5 text-gray-400 transition-transform ml-4 ${expandedVideos[video.id] ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </button>

                          {expandedVideos[video.id] && slides.length > 0 && (
                            <div className="border-t border-gray-200 bg-gray-50 p-6">
                              <div className="grid grid-cols-2 gap-4">
                                {slides.map((slide) => (
                                  <div key={slide.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="bg-gray-100 rounded mb-3 p-3 min-h-24 flex items-center justify-center">
                                      <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-600">{slide.slide_number}</div>
                                        <div className="text-xs text-gray-500 mt-1">{slide.title}</div>
                                      </div>
                                    </div>
                                    <h4 className="font-semibold text-gray-900 text-sm mb-2">{slide.title}</h4>
                                    <p className="text-xs text-gray-600 mb-3">{slide.content}</p>
                                    {slide.notes && <p className="text-xs text-gray-500 italic">Notes: {slide.notes}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Recording Tab */}
            {activeTab === "recording" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Video Recording</h2>
                  <button
                    onClick={generateAllRecordings}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Generate All AI Voices
                  </button>
                </div>

                {allVideos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No videos available.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allVideos.map(({ video, lesson, module }) => {
                      const recording = recordings.find((r) => r.video_id === video.id);
                      const isLoading = loadingVideos[video.id];

                      return (
                        <div key={video.id} className="border border-gray-200 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-gray-900">{video.title}</h3>
                              <div className="text-sm text-gray-600 mt-1">
                                {module.title} / {lesson.title}
                              </div>
                            </div>
                            {recording ? (
                              <StatusBadge status="completed" />
                            ) : isLoading ? (
                              <StatusBadge status="generating" />
                            ) : (
                              <StatusBadge status="pending" />
                            )}
                          </div>

                          {recording && (
                            <div className="mb-4 bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-20">
                              <svg className="w-8 h-8 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                              </svg>
                              <div className="flex-1">
                                <div className="h-1 bg-blue-600 rounded-full w-full"></div>
                                <div className="text-xs text-gray-600 mt-2 text-center">{video.duration_minutes}:00 / {video.duration_minutes}:00</div>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            {!recording && !isLoading && (
                              <>
                                <button
                                  onClick={() => generateRecording(video.id)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                                >
                                  Generate AI Voice
                                </button>
                                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                                  Upload Recording
                                </button>
                              </>
                            )}
                            {isLoading && (
                              <div className="flex items-center gap-2">
                                <LoadingSpinner size="sm" />
                                <span className="text-sm text-gray-600">Generating AI voice...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Transcript Tab */}
            {activeTab === "transcript" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Transcripts</h2>
                  <button
                    onClick={generateAllTranscripts}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Transcribe All
                  </button>
                </div>

                {recordings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No recordings available. Please record videos first.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recordings.map((recording) => {
                      const video = modules.flatMap((m) => m.lessons.flatMap((l) => l.videos)).find((v) => v.id === recording.video_id);
                      const transcript = transcripts.find((t) => t.recording_id === recording.id);
                      const isLoading = loadingVideos[recording.video_id];

                      if (!video) return null;

                      return (
                        <div key={recording.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedVideos((prev) => ({ ...prev, [recording.id]: !prev[recording.id] }))}
                            className="w-full px-6 py-4 hover:bg-gray-50 flex items-center justify-between"
                          >
                            <div className="text-left flex-1">
                              <h3 className="font-semibold text-gray-900">{video.title}</h3>
                              <div className="text-sm text-gray-600 mt-1">{video.duration_minutes} minute recording</div>
                              <div className="mt-2">
                                {transcript ? (
                                  <StatusBadge status="completed" />
                                ) : isLoading ? (
                                  <StatusBadge status="generating" />
                                ) : (
                                  <StatusBadge status="pending" />
                                )}
                              </div>
                            </div>
                            {!transcript && !isLoading && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generateTranscript(recording.id);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium ml-2 whitespace-nowrap"
                              >
                                Auto-Transcribe
                              </button>
                            )}
                            {isLoading && (
                              <div className="ml-2">
                                <LoadingSpinner size="sm" />
                              </div>
                            )}
                            <svg
                              className={`w-5 h-5 text-gray-400 transition-transform ml-4 ${expandedVideos[recording.id] ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </button>

                          {expandedVideos[recording.id] && transcript && (
                            <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">Transcript</label>
                                {editingTranscript === transcript.id ? (
                                  <textarea
                                    value={transcriptEdits[transcript.id] ?? transcript.text}
                                    onChange={(e) =>
                                      setTranscriptEdits((prev) => ({
                                        ...prev,
                                        [transcript.id]: e.target.value,
                                      }))
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={6}
                                  />
                                ) : (
                                  <p className="text-gray-700 leading-relaxed">{transcript.text}</p>
                                )}
                              </div>

                              <div className="text-sm text-gray-600">
                                <span>Word count: {transcript.text.split(/\s+/).length}</span> •
                                <span className="ml-2">Confidence: {(transcript.confidence * 100).toFixed(0)}%</span>
                              </div>

                              <div className="flex gap-2 pt-2">
                                {editingTranscript === transcript.id ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        const edited = transcriptEdits[transcript.id];
                                        if (edited) {
                                          updateTranscript(transcript.id, { text: edited });
                                          setTranscripts((prev) =>
                                            prev.map((t) => (t.id === transcript.id ? { ...t, text: edited } : t))
                                          );
                                        }
                                        setEditingTranscript(null);
                                        setToast({ message: "Transcript updated", type: "success" });
                                      }}
                                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingTranscript(null);
                                        setTranscriptEdits((prev) => {
                                          const next = { ...prev };
                                          delete next[transcript.id];
                                          return next;
                                        });
                                      }}
                                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingTranscript(transcript.id);
                                      setTranscriptEdits((prev) => ({
                                        ...prev,
                                        [transcript.id]: transcript.text,
                                      }));
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Content Items Tab */}
            {activeTab === "content" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Generated Content Items</h2>
                  <button
                    onClick={generateAllContent}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Generate All Content
                  </button>
                </div>

                {modules.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No lessons available.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {modules.map((module) =>
                      module.lessons.map((lesson) => {
                        const lessonContent = contentItems.filter((c) => c.lesson_id === lesson.id);
                        const hasTranscript = transcripts.some(
                          (t) => lesson.videos.some((v) => v.id === t.video_id)
                        );

                        return (
                          <div key={lesson.id} className="border border-gray-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setExpandedVideos((prev) => ({ ...prev, [lesson.id]: !prev[lesson.id] }))}
                              className="w-full px-6 py-4 hover:bg-gray-50 flex items-center justify-between"
                            >
                              <div className="text-left flex-1">
                                <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                                <div className="text-sm text-gray-600 mt-1">{module.title}</div>
                                {lessonContent.length > 0 && (
                                  <div className="mt-2 text-sm text-blue-600 font-medium">{lessonContent.length} content items</div>
                                )}
                              </div>
                              {hasTranscript && (
                                <div className="text-right mr-4">
                                  <select
                                    value={selectedContentType[lesson.id] || "reading"}
                                    onChange={(e) =>
                                      setSelectedContentType((prev) => ({
                                        ...prev,
                                        [lesson.id]: e.target.value,
                                      }))
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sm px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    {CONTENT_TYPES.map((type) => (
                                      <option key={type} value={type}>
                                        {type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ")}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {hasTranscript && !generatingContent[lesson.id] && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    generateContent(lesson.id);
                                  }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium ml-2 whitespace-nowrap"
                                >
                                  Generate Content
                                </button>
                              )}
                              {generatingContent[lesson.id] && (
                                <div className="ml-2">
                                  <LoadingSpinner size="sm" />
                                </div>
                              )}
                              <svg
                                className={`w-5 h-5 text-gray-400 transition-transform ml-4 ${expandedVideos[lesson.id] ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              </svg>
                            </button>

                            {expandedVideos[lesson.id] && (
                              <div className="border-t border-gray-200 bg-gray-50 p-6">
                                {lessonContent.length === 0 ? (
                                  <p className="text-gray-600 text-sm">No content items yet. {!hasTranscript && "Generate transcript first to create content."}</p>
                                ) : (
                                  <div className="space-y-4">
                                    {lessonContent.map((item) => (
                                      <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900">{item.title}</h4>
                                        <p className="text-sm text-gray-700 mt-2">{item.content}</p>
                                        <div className="mt-3 text-xs text-gray-500">Type: {item.type}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Review & Publish Tab */}
            {activeTab === "review" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Final Review & Publish</h2>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600">{stats.totalVideos}</div>
                    <div className="text-sm text-gray-600">Total Videos</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600">{stats.totalDuration}</div>
                    <div className="text-sm text-gray-600">Total Duration (min)</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-600">{stats.recordedCount}</div>
                    <div className="text-sm text-gray-600">Recorded</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-600">{stats.contentCount}</div>
                    <div className="text-sm text-gray-600">Content Items</div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Pre-Publication Checklist</h3>
                    <ul className="space-y-3">
                      {[
                        { label: "TOC reviewed and approved", completed: modules.length > 0 },
                        { label: "Content briefs completed", completed: stats.totalVideos > 0 && contentBriefs.length === stats.totalVideos },
                        { label: "Slides generated", completed: stats.totalVideos > 0 && pptSlides.length > 0 },
                        { label: "All videos recorded", completed: stats.recordedCount === stats.totalVideos },
                        { label: "Transcripts verified", completed: stats.transcribedCount === stats.recordedCount },
                        { label: "Content items reviewed", completed: stats.contentCount > 0 },
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            disabled
                            className="w-5 h-5 rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={`rounded-lg border p-6 ${
                    stats.totalVideos > 0 &&
                    contentBriefs.length === stats.totalVideos &&
                    stats.recordedCount === stats.totalVideos &&
                    stats.contentCount > 0
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}>
                    <h3 className={`font-bold mb-3 ${
                      stats.totalVideos > 0 &&
                      contentBriefs.length === stats.totalVideos &&
                      stats.recordedCount === stats.totalVideos &&
                      stats.contentCount > 0
                        ? "text-green-900"
                        : "text-yellow-900"
                    }`}>
                      Publication Status
                    </h3>
                    <p className={`text-sm mb-6 ${
                      stats.totalVideos > 0 &&
                      contentBriefs.length === stats.totalVideos &&
                      stats.recordedCount === stats.totalVideos &&
                      stats.contentCount > 0
                        ? "text-green-700"
                        : "text-yellow-700"
                    }`}>
                      {stats.totalVideos > 0 &&
                      contentBriefs.length === stats.totalVideos &&
                      stats.recordedCount === stats.totalVideos &&
                      stats.contentCount > 0
                        ? "All requirements met. Course is ready to publish!"
                        : "Complete remaining items to enable publishing."}
                    </p>
                    {user.role === "pm" && (
                      <button
                        onClick={handlePublish}
                        disabled={!(
                          stats.totalVideos > 0 &&
                          contentBriefs.length === stats.totalVideos &&
                          stats.recordedCount === stats.totalVideos &&
                          stats.contentCount > 0
                        )}
                        className={`w-full px-4 py-3 rounded-lg font-medium text-white ${
                          stats.totalVideos > 0 &&
                          contentBriefs.length === stats.totalVideos &&
                          stats.recordedCount === stats.totalVideos &&
                          stats.contentCount > 0
                            ? "bg-green-600 hover:bg-green-700 cursor-pointer"
                            : "bg-gray-400 cursor-not-allowed"
                        }`}
                      >
                        Publish Course
                      </button>
                    )}
                  </div>
                </div>

                {/* Export Options */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Export Options</h3>
                  <div className="flex flex-wrap gap-3">
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                      Export as PDF
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                      Export Transcripts
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                      Export Content Briefs
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {user.role === "pm" &&
            ["toc_review", "ppt_review", "content_review", "final_review"].includes(course.status) && (
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => {
                    const nextPhases: Record<string, string> = {
                      toc_review: "toc_approved",
                      ppt_review: "recording",
                      content_review: "final_review",
                      final_review: "published",
                    };
                    const nextStatus = nextPhases[course.status];
                    if (nextStatus) {
                      updateCourse(courseId, { status: nextStatus as any });
                      setCourse({ ...course, status: nextStatus as any });
                      setToast({ message: "Phase approved. Moving to next stage...", type: "success" });
                    }
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Approve & Move to Next Phase
                </button>
                <Link href="/dashboard">
                  <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                    Back to Dashboard
                  </button>
                </Link>
              </div>
            )}
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
