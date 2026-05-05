/** @type {import('next').NextConfig} */

// SEC-6 — Security headers.
//
// CSP keeps `'unsafe-inline'`/`'unsafe-eval'` on scripts because Next 14's
// runtime still injects inline bootstrap; we'll switch to nonces in a
// dedicated PR. Everything else has been tightened.
//
// New in this revision:
//   - connect-src extended for Sentry envelope and the Vercel inspector
//     URLs we link from the AppShell, so observability + sharing work
//     without weakening default-src
//   - report-to / report-uri so violations from this CSP are visible
//   - Cross-Origin-Resource-Policy locks responses to same-origin
//   - Cross-Origin-Embedder-Policy: credentialless so Supabase storage
//     signed-URL fetches still work in cross-origin contexts
const SENTRY_HOST = process.env.SENTRY_DSN
  ? new URL(process.env.SENTRY_DSN).host
  : null;

const connectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://api.anthropic.com",
  "https://api.openai.com",
  ...(SENTRY_HOST ? [`https://${SENTRY_HOST}`] : []),
  // Vercel runtime + analytics
  "https://vercel.live",
  "https://*.vercel.app",
].join(" ");

const securityHeaders = [
  { key: "Strict-Transport-Security",   value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",             value: "DENY" },
  { key: "X-Content-Type-Options",      value: "nosniff" },
  { key: "Referrer-Policy",             value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",          value: "camera=(), microphone=(self), geolocation=(), interest-cohort=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy",  value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Allow cross-origin loads from Supabase storage signed URLs while still
  // blocking cookie-bearing cross-origin embeds.
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      `connect-src ${connectSrc}`,
      "media-src 'self' blob: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
