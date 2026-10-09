"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { resetPasswordAction, getCurrentUserAction } from "@/app/actions/auth";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The email link signs the person in for this one purpose; without that session the form cannot work
  const [linkState, setLinkState] = useState<"checking" | "ok" | "expired">("checking");
  const [email, setEmail] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUserAction()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data?.user) {
          setEmail(res.data.user.email || null);
          setLinkState("ok");
          setTimeout(() => passwordRef.current?.focus(), 50);
        } else setLinkState("expired");
      })
      .catch(() => !cancelled && setLinkState("expired"));
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    if (password.length < 8) return setError("Your new password must be at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setSaving(true);
    try {
      const res = await resetPasswordAction({ password, confirmPassword: confirm });
      if (res.success) setDone(true);
      else setError(res.error || "We could not update your password. Please request a new link.");
    } catch {
      setError("We could not reach the server. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full bg-brand-ivory border border-brand-border rounded-xl py-3 pl-10 pr-12 text-base sm:text-sm text-brand-text focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30 min-h-[48px]";

  return (
    <div className="min-h-[80vh] bg-brand-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-brand-text">
      <div className="max-w-md w-full bg-white border border-brand-border rounded-3xl p-6 sm:p-8 shadow-luxury space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-serif text-brand-text font-normal">Choose a new password</h1>
          {email && linkState === "ok" && !done && (
            <p className="text-sm text-neutral-600">
              For <strong className="break-all">{email}</strong>
            </p>
          )}
          <p className="text-xs text-neutral-500">For your security you will be signed out on all devices afterwards.</p>
        </div>

        {linkState === "checking" ? (
          <p role="status" className="flex items-center justify-center gap-2 text-sm text-neutral-600 py-6">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Checking your reset link…
          </p>
        ) : linkState === "expired" && !done ? (
          <div role="alert" className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" aria-hidden="true" />
            <h2 className="text-sm font-semibold">This reset link has expired</h2>
            <p className="text-sm text-neutral-700">Each link works once, and only the newest one works. Request a fresh link and open it on this device.</p>
            <Link href="/auth/forgot-password" className="btn-primary inline-flex px-6 min-h-[48px] text-xs rounded-full font-semibold shadow-md">
              Send me a new link
            </Link>
          </div>
        ) : done ? (
          <div role="status" className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Password updated</h2>
            <p className="text-sm text-neutral-600">Please sign in with your new password.</p>
            <Link href="/auth/login" className="btn-primary inline-flex px-6 min-h-[48px] text-xs rounded-full font-semibold shadow-md">
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 text-xs" noValidate aria-busy={saving}>
            <div>
              <label htmlFor="rp-password" className="text-xs font-semibold text-neutral-700 block mb-1.5">New password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  ref={passwordRef}
                  id="rp-password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  aria-describedby="rp-hint"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={field}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide passwords" : "Show passwords"}
                  aria-pressed={show}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-neutral-500 hover:text-brand-text"
                >
                  {show ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
              <p id="rp-hint" className="mt-1.5 text-xs text-neutral-500">At least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="rp-confirm" className="text-xs font-semibold text-neutral-700 block mb-1.5">Confirm new password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input id="rp-confirm" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
              </div>
            </div>
            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {error}
              </p>
            )}
            <button type="submit" disabled={saving} className="btn-primary w-full min-h-[48px] text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center justify-center gap-2 font-poppins disabled:opacity-70">
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} {saving ? "Saving…" : "Update password"}
            </button>
            <p className="text-center">
              <Link href="/auth/forgot-password" className="inline-flex items-center min-h-[44px] text-xs text-brand-maroon hover:underline font-poppins">
                Link expired? Request a new one
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
