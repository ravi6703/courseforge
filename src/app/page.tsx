"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Role, User } from "@/types";

const DEMO_USERS: Record<Role, { email: string; name: string; role: Role }> = {
  pm: { email: "ravi@boardinfinity.com", name: "Ravi (PM)", role: "pm" },
  coach: { email: "priya@boardinfinity.com", name: "Dr. Priya Sharma (Coach)", role: "coach" },
};

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!selectedRole) return;
    setLoading(true);
    setError("");

    try {
      const demo = DEMO_USERS[selectedRole];

      if (isSupabaseConfigured) {
        // Fetch profile from Supabase
        const { data, error: dbError } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", demo.email)
          .single();

        if (dbError || !data) {
          // Profile not found — create it
          const { data: newProfile, error: insertErr } = await supabase
            .from("profiles")
            .insert({ email: demo.email, name: demo.name, role: demo.role })
            .select()
            .single();

          if (insertErr) throw insertErr;

          const user: User = {
            id: newProfile.id,
            email: newProfile.email,
            name: newProfile.name,
            role: newProfile.role,
          };
          localStorage.setItem("courseforge_user", JSON.stringify(user));
        } else {
          const user: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role,
          };
          localStorage.setItem("courseforge_user", JSON.stringify(user));
        }
      } else {
        // Fallback: localStorage-only mode
        const user: User = {
          id: selectedRole === "pm" ? "pm-001" : "coach-001",
          email: demo.email,
          name: demo.name,
          role: demo.role,
        };
        localStorage.setItem("courseforge_user", JSON.stringify(user));
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">CourseForge</span>
          </div>
          <p className="text-gray-500 text-sm">AI-Powered Course Creation Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Select your role to continue</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-3 mb-6">
            <button
              onClick={() => setSelectedRole("pm")}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selectedRole === "pm"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedRole === "pm" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Project Manager</div>
                  <div className="text-xs text-gray-500">Create courses, manage TOC, assign coaches</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedRole("coach")}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selectedRole === "coach"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedRole === "coach" ? "bg-blue-600 text-white" : "bg-green-100 text-green-600"
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Coach / SME</div>
                  <div className="text-xs text-gray-500">Review TOC, record videos, provide expertise</div>
                </div>
              </div>
            </button>
          </div>

          <button
            onClick={handleLogin}
            disabled={!selectedRole || loading}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              `Continue as ${selectedRole === "pm" ? "Project Manager" : selectedRole === "coach" ? "Coach" : "..."}`
            )}
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 mt-6">
          Board Infinity &middot; CourseForge v0.2
        </p>
      </div>
    </div>
  );
}
