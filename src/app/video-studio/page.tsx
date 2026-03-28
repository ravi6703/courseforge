"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { loadState } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getCourses } from "@/lib/db";
import {
  ChevronRight,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: "pm" | "coach";
}

interface Course {
  id: string;
  title: string;
  status: string;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  order: number;
  videos: Video[];
}

interface Video {
  id: string;
  lesson_id: string;
  title: string;
  duration_minutes: number;
  status: "pending" | "ppt_ready" | "recorded" | "reviewed";
}

interface LessonWithVideo extends Lesson {
  video?: Video;
  videoStatus: "No Video" | "Uploaded" | "Recorded";
  transcriptStatus:
    | "Waiting for Video"
    | "Processing"
    | "Ready"
    | "Failed";
}

export default function VideoStudioPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [uploadingLessonId, setUploadingLessonId] = useState<string | null>(
    null
  );
  const [lessonStatuses, setLessonStatuses] = useState<
    Record<string, { videoStatus: string; transcriptStatus: string }>
  >({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("courseforge_user");
    if (!userStr) {
      router.push("/");
      return;
    }

    const currentUser = JSON.parse(userStr);
    setUser(currentUser);

    // Load courses and modules from localStorage
    const state = loadState();
    setCourses(state.courses);
    setModules(state.modules);

    // If Supabase is configured, also try to load from there
    if (isSupabaseConfigured) {
      getCourses().then((supabaseCourses) => {
        if (supabaseCourses && supabaseCourses.length > 0) {
          setCourses(supabaseCourses);
        }
      });
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("courseforge_user");
    router.push("/");
  };

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleUploadClick = (lessonId: string) => {
    setUploadingLessonId(lessonId);
  };

  const handleFileSelect = (lessonId: string, file: File) => {
    // Simulate video upload
    setLessonStatuses((prev) => ({
      ...prev,
      [lessonId]: {
        videoStatus: "Uploaded",
        transcriptStatus: "Processing",
      },
    }));

    showToastMessage(`Video "${file.name}" uploaded successfully`);
    setUploadingLessonId(null);

    // Simulate transcription completion after 2 seconds
    setTimeout(() => {
      setLessonStatuses((prev) => ({
        ...prev,
        [lessonId]: {
          videoStatus: "Uploaded",
          transcriptStatus: "Ready",
        },
      }));
    }, 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, lessonId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(lessonId, files[0]);
    }
  };

  const getSelectedCourse = () => {
    return courses.find((c) => c.id === selectedCourseId);
  };

  const getLessonsForSelectedCourse = (): LessonWithVideo[] => {
    if (!selectedCourseId) return [];

    const courseModules = modules[selectedCourseId] || [];
    const allLessons: LessonWithVideo[] = [];

    courseModules.forEach((mod) => {
      mod.lessons.forEach((lesson) => {
        const status =
          lessonStatuses[lesson.id] || {
            videoStatus: lesson.videos && lesson.videos.length > 0 ? "Uploaded" : "No Video",
            transcriptStatus:
              lesson.videos && lesson.videos.length > 0
                ? "Ready"
                : "Waiting for Video",
          };

        allLessons.push({
          ...lesson,
          video: lesson.videos?.[0],
          videoStatus: status.videoStatus as
            | "No Video"
            | "Uploaded"
            | "Recorded",
          transcriptStatus: status.transcriptStatus as
            | "Waiting for Video"
            | "Processing"
            | "Ready"
            | "Failed",
        });
      });
    });

    return allLessons;
  };

  const getVideoStatusColor = (
    status: "No Video" | "Uploaded" | "Recorded"
  ) => {
    switch (status) {
      case "No Video":
        return "bg-gray-100 text-gray-700";
      case "Uploaded":
        return "bg-blue-100 text-blue-700";
      case "Recorded":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTranscriptStatusColor = (
    status:
      | "Waiting for Video"
      | "Processing"
      | "Ready"
      | "Failed"
  ) => {
    switch (status) {
      case "Waiting for Video":
        return "bg-gray-100 text-gray-700";
      case "Processing":
        return "bg-yellow-100 text-yellow-700";
      case "Ready":
        return "bg-green-100 text-green-700";
      case "Failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (
    status:
      | "Waiting for Video"
      | "Processing"
      | "Ready"
      | "Failed"
  ) => {
    switch (status) {
      case "Processing":
        return <Clock className="w-4 h-4" />;
      case "Ready":
        return <CheckCircle2 className="w-4 h-4" />;
      case "Failed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (!user) {
    return null;
  }

  const selectedCourse = getSelectedCourse();
  const lessonsToDisplay = getLessonsForSelectedCourse();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="hover:text-gray-900"
            >
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Video Studio</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Video Studio
            </h1>
            <p className="text-gray-600">
              Upload videos and manage transcriptions
            </p>
          </div>

          {/* Course Filter */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseSelect(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            >
              <option value="">Choose a course...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Lessons Table */}
          {selectedCourse && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Module
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Lesson Title
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Video Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Transcript Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessonsToDisplay.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <p className="text-gray-500">
                            No lessons found for this course.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      lessonsToDisplay.map((lesson, index) => {
                        const moduleTitle =
                          modules[selectedCourseId]?.find(
                            (m) => m.id === lesson.module_id
                          )?.title || "Unknown Module";

                        return (
                          <tr
                            key={lesson.id}
                            className={`border-b border-gray-200 ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            } hover:bg-blue-50 transition-colors`}
                          >
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {moduleTitle}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {lesson.title}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getVideoStatusColor(
                                  lesson.videoStatus
                                )}`}
                              >
                                {lesson.videoStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getTranscriptStatusColor(
                                  lesson.transcriptStatus
                                )}`}
                              >
                                {getStatusIcon(lesson.transcriptStatus)}
                                {lesson.transcriptStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleUploadClick(lesson.id)
                                  }
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Upload className="w-4 h-4" />
                                  Upload Video
                                </button>
                                <button
                                  disabled={
                                    lesson.transcriptStatus ===
                                      "Waiting for Video" ||
                                    lesson.transcriptStatus === "Failed"
                                  }
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <FileText className="w-4 h-4" />
                                  View Transcript
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!selectedCourse && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                Select a course to view and manage lessons.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {uploadingLessonId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Upload Video
              </h3>
              <button
                onClick={() => setUploadingLessonId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, uploadingLessonId)}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 cursor-pointer hover:border-blue-500 transition-colors"
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                Drag and drop your video here
              </p>
              <p className="text-xs text-gray-500 mb-4">
                or click to select a file
              </p>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  if (
                    e.target.files &&
                    e.target.files.length > 0
                  ) {
                    handleFileSelect(
                      uploadingLessonId,
                      e.target.files[0]
                    );
                  }
                }}
                className="hidden"
                id={`file-input-${uploadingLessonId}`}
              />
              <label
                htmlFor={`file-input-${uploadingLessonId}`}
                className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Select File
              </label>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Supported formats: MP4, WebM, MOV
            </p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg z-40">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
