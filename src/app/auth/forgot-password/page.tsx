"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Send, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { forgotPasswordAction } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);

  // Arriving from a reset link that was already used or is too old
  useEffect(() => {
    setLinkExpired(new URLSearchParams(window.location.search).get("error") === "link");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const res = await forgotPasswordAction({ email: email.trim() });
      if (res.success) setSent(true);
      else setError(res.error || "We could not send the reset email. Please try again.");
    } catch {
      setError("We could not reach the server. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-brand-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-brand-text">
      <div className="max-w-md w-full bg-white border border-brand-border rounded-3xl p-6 sm:p-8 shadow-luxury space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-serif text-brand-text font-normal">Reset your password</h1>
          <p className="text-xs text-neutral-500 font-light">
            Enter the email you registered with and we will send you a link to choose a new password.
          </p>
        </div>

        {linkExpired && !sent && (
          <p role="alert" className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            That reset link has expired or was already used. Each link works once, and only the newest link works. Enter your email to get a fresh one.
          </p>
        )}

        {sent ? (
          <div role="status" className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h2 className="text-sm font-semibold text-brand-text">Check your email</h2>
            <p className="text-xs text-neutral-600 font-light">
              If an account exists for <strong className="break-all">{email}</strong>, a reset link is on its way. It can take a few minutes, and the link works once.
            </p>
            <Link href="/auth/login" className="inline-block mt-2 text-xs text-brand-maroon hover:underline font-semibold font-poppins min-h-[44px] leading-[44px]">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
            <div>
              <label htmlFor="fp-email" className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                Registered email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" aria-hidden="true" />
                <input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={255}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "fp-error" : undefined}
                  className="w-full bg-brand-ivory border border-brand-border rounded-xl py-3 pl-10 pr-3 text-base sm:text-sm text-brand-text placeholder-neutral-400 focus:outline-none focus:border-brand-gold min-h-[44px]"
                />
              </div>
            </div>

            {error && (
              <p id="fp-error" role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="btn-primary w-full min-h-[48px] text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center justify-center gap-2 font-poppins disabled:opacity-70"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {sending ? "Sending…" : "Send reset link"}
            </button>
            <p className="text-center">
              <Link href="/auth/login" className="text-xs text-brand-maroon hover:underline font-poppins">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
