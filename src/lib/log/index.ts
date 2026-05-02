// src/lib/log/index.ts
//
// OPS-1 — Lightweight structured logger. JSON lines so Vercel's log
// drains can ingest them as-is and Sentry / Logtail / Datadog can pick
// them up later without re-parsing.
//
// Usage:
//   import { logger } from "@/lib/log";
//   const log = logger("api/courses");
//   log.info({ orgId, action: "create" }, "course created");
//   log.error({ err }, "course create failed");
//
// requestId() should be called once per request handler and threaded
// through child logs. Pages can use logger("page/dashboard") similarly.

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: Level = (process.env.LOG_LEVEL as Level) || "info";

function shouldLog(level: Level): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function emit(level: Level, scope: string, fields: Record<string, unknown>, msg: string) {
  if (!shouldLog(level)) return;
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v instanceof Error) {
      safe[k] = { name: v.name, message: v.message, stack: v.stack };
    } else {
      safe[k] = v;
    }
  }
  // JSON line: trivially parseable by Vercel's log explorer + drains.
  const line = JSON.stringify({
    t: new Date().toISOString(),
    lvl: level,
    scope,
    msg,
    ...safe,
  });
  // route to console — Vercel captures stdout/stderr automatically.
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(fields: Record<string, unknown>, msg: string): void;
  info(fields: Record<string, unknown>, msg: string): void;
  warn(fields: Record<string, unknown>, msg: string): void;
  error(fields: Record<string, unknown>, msg: string): void;
  child(extra: Record<string, unknown>): Logger;
}

function build(scope: string, base: Record<string, unknown> = {}): Logger {
  const w = (level: Level) =>
    (fields: Record<string, unknown>, msg: string) =>
      emit(level, scope, { ...base, ...fields }, msg);
  return {
    debug: w("debug"),
    info: w("info"),
    warn: w("warn"),
    error: w("error"),
    child: (extra) => build(scope, { ...base, ...extra }),
  };
}

export function logger(scope: string): Logger {
  return build(scope);
}

/** Per-request id, suitable for the `req` log field. */
export function requestId(): string {
  // Web Crypto on Node 24, fallback for older runtimes.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as { randomUUID: () => string }).randomUUID();
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
