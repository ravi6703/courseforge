"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { User, Course, Module, Comment } from "@/types";
import {
  getCourseById,
  getModulesByCourse,
  getCommentsByCourse,
  addComment,
  resolveComment,
  updateCourse,
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
    type: "module" | "lesson" | "video";
    id: string;
  } | null>(null);

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

      // Set active tab based on course status
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
      id: Math.random().toString(36).substring(2, 10),
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
  };

  const handleResolveComment = (commentId: string) => {
    resolveComment(commentId);
    setComments(comments.map((c) => (c.id === commentId ? { ...c, resolved: true } : c)));
  };

  const handleApprovePhase = async () => {
    if (!course) return;

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
    }
  };

  if (isLoading || !course || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const availableTabs = PHASE_TABS[course.status] || ["toc"];
  const isCoachOrCreator = user.role === "coach" || user.id === course.created_by;

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
                style={{ width: `${(Object.keys(PHASE_LABELS).indexOf(course.status) + 1) / Object.keys(PHASE_LABELS).length * 100}%` }}
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
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                        <div key={module.id} className="border border-gray-200 rounded-lg">
                          <button
                            onClick={() =>
                              setExpandedModules((prev) => ({
                                ...prev,
                                [module.id]: !prev[module.id],
                              }))
                            }
                            className="w-full px-6 py-4 hover:bg-gray-50 flex items-center justify-between"
                          >
                            <div className="text-left">
                              <h3 className="font-bold text-gray-900">{module.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                              {module.duration && (
                                <p className="text-xs text-gray-500 mt-1">{module.duration}</p>
                              )}
                            </div>
                            <svg
                              className={`w-5 h-5 text-gray-400 transition-transform ${
                                expandedModules[module.id] ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                              />
                            </svg>
                          </button>

                          {expandedModules[module.id] && (
                            <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-3">
                              {module.lessons.map((lesson) => (
                                <div key={lesson.id} className="bg-white p-4 rounded-lg border border-gray-100">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                                      <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                                      {lesson.content_types && lesson.content_types.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {lesson.content_types.map((ct) => (
                                            <span
                                              key={ct}
                                              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                                            >
                                              {ct}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    {isCoachOrCreator && (
                                      <button
                                        onClick={() =>
                                          setSelectedTarget({ type: "lesson", id: lesson.id })
                                        }
                                        className="text-blue-600 hover:text-blue-700 text-sm"
                                      >
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

                {/* Comments Section */}
                {isCoachOrCreator && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">Comments</h3>
                    <div className="space-y-4 mb-6">
                      {comments.filter((c) => !c.resolved).map((comment) => (
                        <div key={comment.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm text-gray-600">
                                <strong>{comment.author_role}</strong> on{" "}
                                {comment.target_type}
                              </p>
                              <p className="text-gray-900 mt-2">{comment.text}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            {user.role === "pm" && (
                              <button
                                onClick={() => handleResolveComment(comment.id)}
                                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
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
                        <p className="text-sm text-gray-600 mb-3">
                          Comment on {selectedTarget.type}
                        </p>
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add your feedback..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none mb-3"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddComment}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
              </div>
            )}

            {/* Briefs Tab */}
            {activeTab === "briefs" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Content Briefs</h2>
                <div className="text-center py-12 text-gray-500">
                  <p>Content briefs for each video will appear here.</p>
                  <p className="text-sm mt-2">Coach fills in what to cover and examples for each video.</p>
                </div>
              </div>
            )}

            {/* PPTs Tab */}
            {activeTab === "ppts" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Generated PPTs</h2>
                <div className="text-center py-12 text-gray-500">
                  <p>AI-generated presentation slides will appear here.</p>
                  <p className="text-sm mt-2">Coach can preview, comment, and approve.</p>
                </div>
              </div>
            )}

            {/* Recording Tab */}
            {activeTab === "recording" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Video Recording</h2>
                <div className="text-center py-12 text-gray-500">
                  <p>Video recording interface will appear here.</p>
                  <p className="text-sm mt-2">Upload or record videos using Zoom integration.</p>
                </div>
              </div>
            )}

            {/* Transcript Tab */}
            {activeTab === "transcript" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Auto-Generated Transcripts</h2>
                <div className="text-center py-12 text-gray-500">
                  <p>Auto-transcribed content will appear here.</p>
                  <p className="text-sm mt-2">Edit transcripts to improve accuracy.</p>
                </div>
              </div>
            )}

            {/* Content Tab */}
            {activeTab === "content" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Generated Content Items</h2>
                <div className="text-center py-12 text-gray-500">
                  <p>AI-generated content items (readings, quizzes, case studies) will appear here.</p>
                  <p className="text-sm mt-2">Generated from video transcripts.</p>
                </div>
              </div>
            )}

            {/* Review Tab */}
            {activeTab === "review" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Final Review & Publish</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-bold text-gray-900 mb-3">Checklist</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4" defaultChecked />
                        <span className="text-sm text-gray-700">TOC reviewed and approved</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4" defaultChecked />
                        <span className="text-sm text-gray-700">Content briefs completed</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4" defaultChecked />
                        <span className="text-sm text-gray-700">All videos recorded</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4" defaultChecked />
                        <span className="text-sm text-gray-700">Transcripts verified</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4" defaultChecked />
                        <span className="text-sm text-gray-700">Content items reviewed</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="font-bold text-green-900 mb-3">Ready to Publish</h3>
                    <p className="text-sm text-green-700 mb-6">
                      All phases complete. Course is ready to be published to the platform.
                    </p>
                    {user.role === "pm" && (
                      <button className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                        Publish Course
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {user.role === "pm" && ["toc_review", "ppt_review", "content_review", "final_review"].includes(course.status) && (
            <div className="flex gap-4 mt-8">
              <button
                onClick={handleApprovePhase}
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
    </div>
  );
}
