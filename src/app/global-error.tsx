"use client";

// Global error boundary. Next.js 14 App Router renders this when a route
// throws above its own error.tsx (or when error.tsx itself fails). We log
// the stack to Sentry through a fire-and-forget POST so even unhandled
// production crashes show up in observability.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report client-side via the dedicated endpoint so the Sentry DSN
    // never has to leak into the browser.
    fetch("/api/observability/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack:   error.stack,
        digest:  error.digest,
        url:     typeof window !== "undefined" ? window.location.href : undefined,
      }),
    }).catch(() => { /* swallow; original error wins */ });
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "Inter, system-ui, sans-serif", padding: "48px", maxWidth: 720, margin: "0 auto", color: "#2C3340" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A243A" }}>Something went wrong.</h1>
        <p style={{ color: "#6B7180", marginTop: 8 }}>
          The error has been logged. You can try again, or come back in a minute.
        </p>
        {error.digest && (
          <p style={{ fontSize: 12, color: "#A0A4AC", marginTop: 12 }}>
            Reference: <code>{error.digest}</code>
          </p>
        )}
        <button
          onClick={() => reset()}
          style={{
            marginTop: 24, padding: "8px 14px", borderRadius: 8,
            background: "#DEEAF5", color: "#345C8C",
            border: "1px solid #C0D7EB", fontWeight: 600, cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
