import "server-only";
import { waitUntil } from "@vercel/functions";

/**
 * Runs work after the response is sent without letting it fail the request.
 * On Vercel the function stays alive until the promise settles (waitUntil); on a Node server the
 * promise simply continues. Anything that must not be lost is persisted first (outbox/lease rows),
 * so the cron/maintenance job finishes it if the process dies.
 */
export function runInBackground(label: string, work: () => Promise<unknown>) {
  const p = (async () => {
    try {
      await work();
    } catch (err: any) {
      console.error(`[background:${label}]`, err?.message || err);
    }
  })();
  try {
    waitUntil(p);
  } catch {
    // Not running inside a Vercel request context: the promise still runs.
  }
  return p;
}
