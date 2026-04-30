"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_USERS } from "@/lib/store";

const STORAGE_KEY = "courseforge_data";

export default function LoginPage() {
  const router = useRouter();

  const loginAs = (role: "pm" | "coach") => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      data.currentUser = DEMO_USERS[role];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to home
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 mt-4">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to CourseForge</h1>
          <p className="text-slate-600 mt-1">Choose your role to get started</p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => loginAs("pm")}
              className="w-full px-4 py-3 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 flex items-center gap-3 text-left"
            >
              <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center font-bold shrink-0">PM</span>
              <span className="flex-1">
                <span className="block">Login as Project Manager</span>
                <span className="block text-xs text-white/60 font-normal">ravi@boardinfinity.com</span>
              </span>
            </button>
            <button
              onClick={() => loginAs("coach")}
              className="w-full px-4 py-3 rounded-md border border-slate-300 hover:bg-slate-50 flex items-center gap-3 text-left"
            >
              <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">C</span>
              <span className="flex-1">
                <span className="block font-medium">Login as Subject-Matter Coach</span>
                <span className="block text-xs text-slate-500 font-normal">priya@boardinfinity.com</span>
              </span>
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-6 leading-relaxed">
            PM orchestrates the production lifecycle, reviews all stages, and approves content.
            Coach provides subject-matter expertise, reviews TOCs, records lectures, and creates content briefs.
          </p>
        </div>
        <p className="text-xs text-slate-400 mt-4 text-center">Powered by Claude · Board Infinity</p>
      </div>
    </div>
  );
}
