"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadState, saveState, DEMO_USERS } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = (role: "pm" | "coach") => {
    setIsLoading(true);
    try {
      const user = DEMO_USERS[role];
      // Save user to localStorage
      localStorage.setItem("courseforge_user", JSON.stringify(user));

      // Ensure state is initialized with user
      const state = loadState();
      state.currentUser = user;
      saveState(state);

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-6 sm:px-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Card Header with Gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 pt-8 pb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 font-bold">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CourseForge</h1>
                <p className="text-blue-100 text-xs">Board Infinity</p>
              </div>
            </div>
            <p className="text-blue-50 text-sm font-medium">
              AI-Powered Course Production Platform
            </p>
          </div>

          {/* Card Content */}
          <div className="px-8 pt-8 pb-8">
            {/* Demo Login Section */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Demo Login
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => handleDemoLogin("pm")}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Loading..." : "Login as PM (Ravi)"}
                </button>
                <button
                  onClick={() => handleDemoLogin("coach")}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Loading..." : "Login as Coach (Dr. Priya)"}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email/Password Section */}
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Coming soon with Supabase Auth
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Coming soon with Supabase Auth
                </p>
              </div>

              <button
                disabled
                className="w-full px-4 py-2.5 bg-gray-300 text-gray-500 font-semibold rounded-lg cursor-not-allowed"
              >
                Sign In
              </button>
            </div>

            {/* Footer Info */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-600">
                Use demo accounts to explore all features
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Authentication powered by Supabase
              </p>
            </div>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            An AI-powered platform by Board Infinity
          </p>
        </div>
      </div>
    </div>
  );
}
