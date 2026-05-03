"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-bi-navy-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <Link href="/" className="text-sm text-bi-navy-500 hover:text-bi-navy-700">
          ← Back to home
        </Link>
        <div className="bg-white rounded-xl border border-bi-navy-200 shadow-sm p-8 mt-4">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to CourseForge</h1>
          <p className="text-bi-navy-600 mt-1">Sign in to your account</p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-bi-navy-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@boardinfinity.com"
                className="w-full px-3 py-2 border border-bi-navy-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bi-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-bi-navy-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-bi-navy-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bi-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-md bg-bi-navy-700 text-white font-medium hover:bg-bi-navy-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-bi-navy-500 mt-6 text-center">
            No account?{" "}
            <Link href="/signup" className="text-bi-blue-600 hover:text-blue-800 font-medium">
              Create one
            </Link>
          </p>
        </div>
        <p className="text-xs text-bi-navy-400 mt-4 text-center">Powered by Claude · Board Infinity</p>
      </div>
    </div>
  );
}
