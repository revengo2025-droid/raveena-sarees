// Browser-side helpers for the support forms. No server imports.

/** Random token that identifies ONE form submission, so a retry or double click can never create a second record. */
export function newSubmissionToken(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

export class RequestTimeoutError extends Error {
  constructor() {
    super("timeout");
  }
}

/** Never leave a customer staring at a spinner: rejects when the server takes too long. */
export function withTimeout<T>(promise: Promise<T>, ms = 25_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new RequestTimeoutError()), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export const TIMEOUT_MESSAGE = "This is taking longer than usual. Please check your connection and press the button again. It is safe to retry; we will not create a duplicate.";
export const NETWORK_MESSAGE = "We could not reach the server. Please check your connection and try again.";

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  } catch {
    return iso;
  }
}
