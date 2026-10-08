// Small structured logger: one JSON object per line (easy to search in Vercel/any log drain).
// - Newlines and control characters in values are neutralised, so user input cannot forge log lines.
// - Keys that look like secrets are dropped, and long strings are truncated.
// Server-only; never log request bodies, passwords, tokens, cookies or card data.
import "server-only";

type Level = "debug" | "info" | "warn" | "error";
const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie|api[-_]?key|card|cvv|otp|signature/i;

// Control characters plus the Unicode line/paragraph separators (built from char codes so the source stays plain ASCII)
const LOG_UNSAFE = new RegExp("[\u0000-\u001f\u007f" + String.fromCharCode(0x2028, 0x2029) + "]", "g");

function clean(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return value.replace(LOG_UNSAFE, " ").slice(0, 500);
  if (typeof value === "number" || typeof value === "boolean" || value === null || value === undefined) return value;
  if (value instanceof Error) return clean(value.message, depth + 1);
  if (depth > 2) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 10).map((v) => clean(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 20)) {
      if (!SENSITIVE_KEY.test(k)) out[k] = clean(v, depth + 1);
    }
    return out;
  }
  return String(value).slice(0, 100);
}

function emit(level: Level, event: string, fields?: Record<string, unknown>) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, event: String(event).slice(0, 80), ...((clean(fields || {}) as object) || {}) });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const log = {
  debug: (event: string, fields?: Record<string, unknown>) => emit("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
};

/** Short random id to correlate a user-visible error with the server log line. */
export const newRequestId = () => Math.random().toString(36).slice(2, 10);
