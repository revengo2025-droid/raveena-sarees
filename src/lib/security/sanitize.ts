// Small input-hygiene helpers shared by actions and route handlers. No dependencies, safe on client and server.

/**
 * Makes a user-typed search term safe to place inside a PostgREST `or()` / `ilike` expression: removes the
 * characters that separate filters or act as wildcards, so the input can only ever be a plain search word.
 */
export function safeFilterTerm(input: unknown, max = 60): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[,()%*_\\"'`:;<>[\]{}|&=!]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Positive integer from untrusted input, clamped to [min, max]. */
export function clampInt(input: unknown, min: number, max: number, fallback: number): number {
  const n = typeof input === "number" ? input : typeof input === "string" ? Number(input) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Allow-list lookup: returns the value only if it is one of the permitted options. */
export function oneOf<T extends string>(input: unknown, allowed: readonly T[]): T | undefined {
  return typeof input === "string" && (allowed as readonly string[]).includes(input) ? (input as T) : undefined;
}
