"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Lock, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { resetPasswordAction } from "@/app/actions/auth";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    "w-full bg-brand-ivory border border-brand-border rounded-xl py-3 pl-10 pr-3 text-base sm:text-sm text-brand-text focus:outline-none focus:border-brand-gold min-h-[44px]";

  return (
    <div className="min-h-[80vh] bg-brand-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-brand-text">
      <div className="max-w-md w-full bg-white border border-brand-border rounded-3xl p-6 sm:p-8 shadow-luxury space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-serif text-brand-text font-normal">Choose a new password</h1>
          <p className="text-xs text-neutral-500 font-light">For your security you will be signed out on all devices afterwards.</p>
        </div>

        {done ? (
          <div role="status" className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h2 className="text-sm font-semibold">Password updated</h2>
            <p className="text-xs text-neutral-600 font-light">Please sign in with your new password.</p>
            <Link href="/auth/login" className="btn-primary inline-block px-6 py-3 text-xs rounded-full font-semibold shadow-md">
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 text-xs" noValidate>
            <div>
              <label htmlFor="rp-password" className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">New password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" aria-hidden="true" />
                <input id="rp-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
              </div>
            </div>
            <div>
              <label htmlFor="rp-confirm" className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">Confirm new password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" aria-hidden="true" />
                <input id="rp-confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
              </div>
            </div>
            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </p>
            )}
            <button type="submit" disabled={saving} className="btn-primary w-full min-h-[48px] text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center justify-center gap-2 font-poppins disabled:opacity-70">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {saving ? "Saving…" : "Update password"}
            </button>
            <p className="text-center">
              <Link href="/auth/forgot-password" className="text-xs text-brand-maroon hover:underline font-poppins">Link expired? Request a new one</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
