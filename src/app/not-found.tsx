import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] bg-brand-white flex flex-col items-center justify-center p-8 text-center text-brand-text font-sans space-y-6">
      <div className="w-20 h-20 rounded-full bg-brand-ivory border border-brand-gold/40 flex items-center justify-center text-brand-gold shadow-card">
        <Sparkles className="w-10 h-10 animate-pulse" />
      </div>
      <span className="text-xs uppercase font-bold tracking-[0.3em] text-brand-gold font-poppins">
        Error 404 • Page Not Found
      </span>
      <h1 className="text-3xl sm:text-5xl font-serif font-normal">
        A Drape Lost in Weaving
      </h1>
      <p className="text-xs sm:text-sm text-neutral-500 max-w-md leading-relaxed font-light">
        The royal page you are searching for might have been moved or is currently being re-woven by our master drapers.
      </p>
      <div className="flex flex-wrap gap-4 pt-2 font-poppins">
        <Link
          href="/"
          className="btn-primary px-8 py-3.5 text-xs font-bold uppercase tracking-widest rounded-full shadow-md"
        >
          Return to Atelier Home
        </Link>
        <Link
          href="/shop"
          className="px-6 py-3.5 bg-brand-ivory hover:bg-white border border-brand-border text-brand-text text-xs font-semibold uppercase tracking-widest rounded-full transition-colors shadow-sm"
        >
          Browse All Sarees
        </Link>
      </div>
    </div>
  );
}
