"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"pm" | "coach">("pm");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

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
        <Link href="/login" className="text-sm text-bi-navy-500 hover:text-bi-navy-700">
          ← Back to login
        </Link>
        <div className="bg-white rounded-xl border border-bi-navy-200 shadow-sm p-8 mt-4">
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="text-bi-navy-600 mt-1">Join CourseForge to get started</p>

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-bi-navy-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full px-3 py-2 border border-bi-navy-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bi-blue-500 focus:border-transparent"
              />
            </div>
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2 border border-bi-navy-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bi-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-bi-navy-700 mb-2">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {(["pm", "coach"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-4 py-2.5 rounded-md border text-sm font-medium transition-colors ${
                      role === r
                        ? "bg-bi-navy-700 border-bi-navy-900 text-white"
                        : "border-bi-navy-300 text-bi-navy-700 hover:bg-bi-navy-50"
                    }`}
                  >
                    {r === "pm" ? "Project Manager" : "Coach"}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-md bg-bi-blue-600 text-white font-medium hover:bg-bi-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-sm text-bi-navy-500 mt-6 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-bi-blue-600 hover:text-blue-800 font-medium">
              Sign in
            </Link>
          </p>
        </div>
        <p className="text-xs text-bi-navy-400 mt-4 text-center">Powered by Claude · Board Infinity</p>
      </div>
    </div>
  );
}
