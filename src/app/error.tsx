"use client";

import { useEffect } from "react";
import Link from "next/link";

// Catches unexpected rendering errors anywhere below the root layout, so a customer never sees a blank page or a
// stack trace. The `digest` is a short id that matches the server log line for this failure.
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Browser console only; the full details are in the server logs under the same digest
    console.error("Page error", error.digest || "");
  }, [error]);

  return (
    <div role="alert" className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-16 bg-brand-white text-brand-text">
      <h1 className="text-2xl sm:text-3xl font-serif mb-3">Something went wrong</h1>
      <p className="text-sm text-neutral-600 max-w-md mb-6">
        Sorry, this page could not be shown. Please try again. If it keeps happening, contact us and mention the reference below.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary px-6 py-3 min-h-[44px] text-xs rounded-full font-semibold shadow-md">
          Try again
        </button>
        <Link href="/" className="px-6 py-3 min-h-[44px] text-xs rounded-full font-semibold border border-brand-border bg-white hover:border-brand-gold inline-flex items-center">
          Go to home page
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-[11px] text-neutral-400">Reference: {error.digest}</p>}
    </div>
  );
}
