"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadState, saveState, DEMO_USERS } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleDemoLogin = (role: "pm" | "coach") => {
    setIsLoading(role);
    const user = DEMO_USERS[role];
    localStorage.setItem("courseforge_user", JSON.stringify(user));
    const state = loadState();
    state.currentUser = user;
    saveState(state);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 pt-8 pb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 font-bold">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CourseForge</h1>
                <p className="text-blue-200 text-xs">Board Infinity</p>
              </div>
            </div>
            <p className="text-blue-100 text-sm">AI-Powered End-to-End Course Production</p>
          </div>

          <div className="px-8 py-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome</h2>
            <p className="text-sm text-gray-500 mb-6">Choose your role to get started</p>

            <div className="space-y-3">
              <button
                onClick={() => handleDemoLogin("pm")}
                disabled={!!isLoading}
                className="w-full px-4 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading === "pm" ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">PM</span>
                    <span>Login as PM (Ravi)</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleDemoLogin("coach")}
                disabled={!!isLoading}
                className="w-full px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading === "coach" ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">C</span>
                    <span>Login as Coach (Dr. Priya)</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong>PM</strong> can create courses, review all stages, and approve content.
                <strong> Coach</strong> provides subject matter expertise, reviews TOC, records lectures, and creates content briefs.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Powered by Claude AI &middot; Board Infinity
        </p>
      </div>
    </div>
  );
}
