"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getContentType } from "@/lib/content-types";
import { StatusBadge } from "./StatusBadge";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  status: string;
  duration?: number;
  description?: string;
  learning_objectives?: string[];
  metadata?: {
    video_type?: string;
    theory_ratio?: number;
    hands_ratio?: number;
    recording_option?: string;
    screen_share?: boolean;
    question_count?: number;
    content_preview?: string;
  };
  comments?: Array<{
    id: string;
    author: string;
    body: string;
    created_at: string;
    is_resolved: boolean;
  }>;
}

interface ContentItemDrawerProps {
  item: ContentItem | null;
  isOpen: boolean;
  onClose: () => void;
  userRole?: "pm" | "coach" | "content_creator";
}

export function ContentItemDrawer({
  item,
  isOpen,
  onClose,
  userRole = "content_creator",
}: ContentItemDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(item?.comments || []);

  if (!item) return null;

  const contentConfig = getContentType(item.type);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentItemId: item.id,
          body: newComment,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setComments([...comments, result.comment]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_resolved: true }),
      });

      setComments(
        comments.map((c) =>
          c.id === commentId ? { ...c, is_resolved: true } : c
        )
      );
    } catch (error) {
      console.error("Failed to resolve comment:", error);
    }
  };

  const handleGenerateContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/content-items/${item.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Content generated successfully", result);
      }
    } catch (error) {
      console.error("Failed to generate content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePPT = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/content-items/${item.id}/generate-ppt`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        console.log("PPT generated successfully", result);
      }
    } catch (error) {
      console.error("Failed to generate PPT:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/content-items/${item.id}/generate-quiz`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Quiz generated successfully", result);
      }
    } catch (error) {
      console.error("Failed to generate quiz:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitForReview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/content-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_review" }),
      });

      if (response.ok) {
        console.log("Submitted for review");
      }
    } catch (error) {
      console.error("Failed to submit for review:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/content-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      if (response.ok) {
        console.log("Approved");
      }
    } catch (error) {
      console.error("Failed to approve:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[hsl(222,47%,8%)] border-l border-[hsl(217,33%,17%)] shadow-xl transform transition-transform duration-300 z-50 flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(217,33%,17%)]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{contentConfig?.icon}</span>
            <div>
              <h2 className="text-lg font-semibold text-[hsl(210,40%,98%)]">
                {item.title}
              </h2>
              <p className="text-sm text-[hsl(215,20%,65%)]">
                {contentConfig?.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[hsl(217,33%,17%)] rounded-lg transition-colors"
            aria-label="Close drawer"
          >
            <svg
              className="w-5 h-5 text-[hsl(215,20%,65%)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Status & Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[hsl(215,20%,65%)]">Status</span>
                <StatusBadge status={item.status as any} />
              </div>

              {item.duration && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(215,20%,65%)]">Duration</span>
                  <span className="text-sm text-[hsl(210,40%,98%)]">
                    {item.duration} minutes
                  </span>
                </div>
              )}

              {item.description && (
                <div>
                  <span className="text-sm text-[hsl(215,20%,65%)] block mb-2">
                    Description
                  </span>
                  <p className="text-sm text-[hsl(210,40%,98%)]">
                    {item.description}
                  </p>
                </div>
              )}

              {item.learning_objectives && item.learning_objectives.length > 0 && (
                <div>
                  <span className="text-sm text-[hsl(215,20%,65%)] block mb-2">
                    Learning Objectives
                  </span>
                  <ul className="space-y-1">
                    {item.learning_objectives.map((obj, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-[hsl(210,40%,98%)] flex gap-2"
                      >
                        <span className="text-[hsl(217,91%,60%)]">•</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Type-Specific Content */}
            {item.type === "video" && (
              <div className="space-y-4 p-4 bg-[hsl(222,47%,6%)] rounded-lg">
                <h3 className="font-semibold text-[hsl(210,40%,98%)]">
                  Video Settings
                </h3>

                {item.metadata?.video_type && (
                  <div>
                    <span className="text-sm text-[hsl(215,20%,65%)]">
                      Video Type
                    </span>
                    <p className="text-sm text-[hsl(210,40%,98%)] capitalize">
                      {item.metadata.video_type}
                    </p>
                  </div>
                )}

                {item.metadata?.theory_ratio !== undefined && (
                  <div>
                    <span className="text-sm text-[hsl(215,20%,65%)] block mb-2">
                      Theory/Hands Ratio
                    </span>
                    <div className="flex gap-2 text-sm">
                      <span className="text-[hsl(210,40%,98%)]">
                        Theory: {item.metadata.theory_ratio}%
                      </span>
                      <span className="text-[hsl(210,40%,98%)]">
                        Hands: {item.metadata.hands_ratio}%
                      </span>
                    </div>
                  </div>
                )}

                {item.metadata?.recording_option && (
                  <div>
                    <span className="text-sm text-[hsl(215,20%,65%)]">
                      Recording Option
                    </span>
                    <p className="text-sm text-[hsl(210,40%,98%)] capitalize">
                      {item.metadata.recording_option.replace(/_/g, " ")}
                    </p>
                  </div>
                )}

                {item.metadata?.screen_share !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(215,20%,65%)]">
                      Screen Share
                    </span>
                    <span className="text-sm text-[hsl(210,40%,98%)]">
                      {item.metadata.screen_share ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleGeneratePPT}
                  disabled={isLoading}
                  className="w-full mt-4 py-2 px-4 bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Generating..." : "Generate PPT"}
                </button>
              </div>
            )}

            {(item.type === "practice_quiz" || item.type === "graded_quiz") && (
              <div className="space-y-4 p-4 bg-[hsl(222,47%,6%)] rounded-lg">
                <h3 className="font-semibold text-[hsl(210,40%,98%)]">
                  Quiz Settings
                </h3>

                {item.metadata?.question_count && (
                  <div>
                    <span className="text-sm text-[hsl(215,20%,65%)]">
                      Question Count
                    </span>
                    <p className="text-sm text-[hsl(210,40%,98%)]">
                      {item.metadata.question_count} questions
                    </p>
                  </div>
                )}

                {item.metadata?.content_preview && (
                  <div>
                    <span className="text-sm text-[hsl(215,20%,65%)] block mb-2">
                      Preview
                    </span>
                    <p className="text-sm text-[hsl(210,40%,98%)] line-clamp-3">
                      {item.metadata.content_preview}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleGenerateQuiz}
                  disabled={isLoading}
                  className="w-full mt-4 py-2 px-4 bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Generating..." : "Generate Quiz"}
                </button>
              </div>
            )}

            {[
              "reading",
              "ai_dialogue",
              "discussion_prompt",
              "case_study",
              "glossary",
            ].includes(item.type) && (
              <div className="space-y-4 p-4 bg-[hsl(222,47%,6%)] rounded-lg">
                <h3 className="font-semibold text-[hsl(210,40%,98%)]">
                  Content Preview
                </h3>

                {item.metadata?.content_preview && (
                  <p className="text-sm text-[hsl(210,40%,98%)] line-clamp-4">
                    {item.metadata.content_preview}
                  </p>
                )}

                <button
                  onClick={handleGenerateContent}
                  disabled={isLoading}
                  className="w-full mt-4 py-2 px-4 bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Generating..." : "Generate Content"}
                </button>
              </div>
            )}

            {/* Comments Section */}
            <div className="space-y-4 pt-6 border-t border-[hsl(217,33%,17%)]">
              <h3 className="font-semibold text-[hsl(210,40%,98%)]">Comments</h3>

              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={cn(
                      "p-3 rounded-lg",
                      comment.is_resolved
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)]"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-[hsl(210,40%,98%)]">
                          {comment.author}
                        </p>
                        <p className="text-xs text-[hsl(215,20%,65%)]">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {comment.is_resolved && (
                        <span className="text-xs text-green-400">Resolved</span>
                      )}
                    </div>
                    <p className="text-sm text-[hsl(210,40%,98%)]">
                      {comment.body}
                    </p>
                    {!comment.is_resolved && userRole === "content_creator" && (
                      <button
                        onClick={() => handleResolveComment(comment.id)}
                        className="mt-2 text-xs text-[hsl(217,91%,60%)] hover:underline"
                      >
                        Mark as resolved
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full p-3 bg-[hsl(222,47%,6%)] border border-[hsl(217,33%,17%)] rounded-lg text-sm text-[hsl(210,40%,98%)] placeholder-[hsl(215,20%,45%)] focus:outline-none focus:border-[hsl(217,91%,60%)]"
                  rows={3}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isLoading}
                  className="w-full py-2 px-4 bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  Add Comment
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[hsl(217,33%,17%)] p-6 space-y-3">
          {item.status === "draft" && (
            <button
              onClick={handleSubmitForReview}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-[hsl(217,91%,60%)] hover:bg-[hsl(217,91%,55%)] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              Submit for Review
            </button>
          )}

          {userRole === "pm" &&
            item.status === "in_review" && (
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                Approve
              </button>
            )}

          {userRole === "coach" &&
            item.status === "in_review" && (
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                Accept
              </button>
            )}

          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-[hsl(217,33%,17%)] hover:bg-[hsl(217,33%,22%)] text-[hsl(210,40%,98%)] rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
