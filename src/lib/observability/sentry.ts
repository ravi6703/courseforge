// Tiny Sentry bridge — no SDK install required.
//
// Sentry accepts events posted to a public envelope endpoint derived from
// the DSN. We build a minimal event payload (good enough for stack traces
// + tags) and POST it. When SENTRY_DSN isn't set, every call no-ops, which
// is what we want for self-hosted / offline environments.
//
// Why not @sentry/nextjs?
//   - Avoids an extra dep and a build-time webpack instrumentation step.
//   - Keeps the runtime cost tiny (a single fetch on captured errors only).
//   - Lets the operator switch to the full SDK later without code changes
//     because callers go through `captureException(err, ctx)`.
//
// Configure with one env: SENTRY_DSN=https://<key>@<host>/<project_id>

import { logger } from "@/lib/log";

interface SentryDsn {
  protocol: string;
  publicKey: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string | undefined): SentryDsn | null {
  if (!dsn) return null;
  // https://<publicKey>@<host>/<projectId>
  const m = dsn.match(/^(https?):\/\/([^@]+)@([^/]+)\/(\d+)/);
  if (!m) return null;
  return { protocol: m[1], publicKey: m[2], host: m[3], projectId: m[4] };
}

const DSN = parseDsn(process.env.SENTRY_DSN);

function nowSeconds(): number { return Math.floor(Date.now() / 1000); }
function uuid32(): string {
  // Cheap deterministic uuid-without-dashes; Sentry only needs uniqueness.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CaptureContext {
  /** Free-form labels: org_id, route, user_id, etc. */
  tags?: Record<string, string>;
  /** Anything extra that helps debugging. */
  extra?: Record<string, unknown>;
  /** Severity level. Defaults to "error". */
  level?: "fatal" | "error" | "warning" | "info" | "debug";
  /** Logger / route name; appears as event title prefix. */
  source?: string;
}

export async function captureException(err: unknown, ctx: CaptureContext = {}): Promise<void> {
  // Always log locally so we don't lose the error if Sentry is offline.
  const log = logger(ctx.source ?? "obs");
  if (err instanceof Error) log.error({ err, tags: ctx.tags, extra: ctx.extra }, err.message);
  else log.error({ err, tags: ctx.tags, extra: ctx.extra }, "non-Error captured");

  if (!DSN) return;

  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack ?? "" : "";

  const eventId = uuid32();
  const event: Record<string, unknown> = {
    event_id: eventId,
    timestamp: nowSeconds(),
    platform: "node",
    level: ctx.level ?? "error",
    server_name: process.env.VERCEL_REGION ?? "unknown",
    environment: process.env.VERCEL_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    tags: ctx.tags ?? {},
    extra: ctx.extra ?? {},
    exception: {
      values: [{
        type: err instanceof Error ? err.name : "Error",
        value: message,
        ...(stack ? { stacktrace: { frames: parseStack(stack) } } : {}),
      }],
    },
  };

  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  const url = `${DSN.protocol}://${DSN.host}/api/${DSN.projectId}/envelope/?sentry_key=${DSN.publicKey}&sentry_version=7`;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-sentry-envelope" }, body: envelope });
  } catch {
    // Don't let observability errors mask the original failure.
  }
}

function parseStack(stack: string) {
  // Convert "at fn (file:line:col)" lines to Sentry frame shape.
  return stack.split("\n").slice(1).reverse().map((line) => {
    const m = line.match(/at (?:(.+) \()?(.+):(\d+):(\d+)/);
    if (!m) return { filename: line.trim() };
    return {
      function: m[1] ?? "<anonymous>",
      filename: m[2],
      lineno: parseInt(m[3], 10),
      colno: parseInt(m[4], 10),
      in_app: !m[2].includes("node_modules"),
    };
  });
}
