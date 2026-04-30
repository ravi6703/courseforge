"use client";

// src/components/AIFallbackBanner.tsx
//
// Shows a sticky warning when /api/ai/* responses return `x-cf-ai-mode: fallback`,
// meaning the production deployment is silently returning canned content because
// no AI key is configured. Eliminates the "why is every TOC the same generic
// outline?" support ticket.
//
// Mount once in src/app/layout.tsx. Other components don't need to know.

import { useEffect, useState } from "react";

export function AIFallbackBanner() {
  const [mode, setMode] = useState<"live" | "fallback" | "unknown">("unknown");
  const [provider, setProvider] = useState<string>("");

  useEffect(() => {
    let alive = true;
    const probe = async () => {
      try {
        const r = await fetch("/api/ai/status", { cache: "no-store" });
        const m = (r.headers.get("x-cf-ai-mode") as "live" | "fallback") ||
          ((await r.json()).mode as "live" | "fallback");
        const p = r.headers.get("x-cf-ai-provider") || "";
        if (!alive) return;
        setMode(m || "unknown");
        setProvider(p);
      } catch {
        if (alive) setMode("unknown");
      }
    };
    probe();
    return () => {
      alive = false;
    };
  }, []);

  if (mode !== "fallback") return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full bg-amber-100 border-b border-amber-300 text-amber-900 text-sm"
    >
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
        <span className="font-medium">⚠️ AI is in fallback mode</span>
        <span className="text-amber-800/80">
          This deployment has no AI provider configured ({provider || "unset"}).
          All AI features return canned content. Set{" "}
          <code className="bg-white/60 px-1 rounded">ANTHROPIC_API_KEY</code> in
          Vercel to enable live generation.
        </span>
      </div>
    </div>
  );
}
