"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ShieldCheck, UserRound, Trash2, KeyRound, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/store";
import { updateProfileAction, forgotPasswordAction } from "@/app/actions/auth";
import { DeleteAccountDialog } from "@/components/account/DeleteAccountDialog";
import { withTimeout, NETWORK_MESSAGE } from "@/lib/support/client";

const input = "w-full bg-white border border-brand-border rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 min-h-[44px]";
const lab = "text-[11px] uppercase text-neutral-600 font-poppins block mb-1 tracking-wide";

export default function AccountSettingsPage() {
  const { user, logout } = useApp();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [resetState, setResetState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resetError, setResetError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  // After a successful deletion the app signs the customer out; the dialog must stay on screen to confirm it
  const [deleted, setDeleted] = useState(false);

  const lastUser = useRef(user);
  if (user) lastUser.current = user;
  const shown = user ?? (deleted ? lastUser.current : null);

  if (!shown) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
        <h1 className="text-xl font-serif mb-2">Please sign in</h1>
        <Link href="/auth/login?redirect=%2Faccount%2Fsettings" className="btn-primary px-6 py-3 text-xs rounded-full font-semibold">Sign in</Link>
      </div>
    );
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (fullName.trim().length < 2) return setProfileMsg({ ok: false, text: "Please enter your full name." });
    if (digits && !/^[6-9]\d{9}$/.test(digits)) return setProfileMsg({ ok: false, text: "Enter a valid 10-digit mobile number, or leave it blank." });
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await withTimeout(updateProfileAction({ fullName: fullName.trim(), phone: digits }), 20_000);
      setProfileMsg(res.success ? { ok: true, text: "Your details have been saved." } : { ok: false, text: res.error || "We could not save your details." });
    } catch {
      setProfileMsg({ ok: false, text: NETWORK_MESSAGE });
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    if (resetState === "sending") return;
    setResetState("sending");
    setResetError(null);
    try {
      const res = await withTimeout(forgotPasswordAction({ email: shown.email }), 20_000);
      if (res.success) setResetState("sent");
      else {
        setResetState("error");
        setResetError(res.error || "We could not send the email.");
      }
    } catch {
      setResetState("error");
      setResetError(NETWORK_MESSAGE);
    }
  };

  return (
    <div className="bg-brand-white text-brand-text font-sans">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <div>
          <nav aria-label="Breadcrumb" className="text-xs text-neutral-500 mb-4 font-poppins">
            <Link href="/account" className="hover:text-brand-gold">My account</Link> <span aria-hidden="true">/</span> <span className="text-brand-text">Account Settings</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-serif">Account Settings</h1>
        </div>

        <section aria-labelledby="profile-h" className="bg-white border border-brand-border rounded-3xl p-5 sm:p-7 shadow-card">
          <h2 id="profile-h" className="text-lg font-serif flex items-center gap-2 mb-4"><UserRound className="w-5 h-5 text-brand-gold" aria-hidden="true" /> Your details</h2>
          <form onSubmit={saveProfile} noValidate className="space-y-4">
            <div>
              <label htmlFor="st-name" className={lab}>Full name</label>
              <input id="st-name" className={input} autoComplete="name" maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="st-email" className={lab}>Email</label>
              <input id="st-email" className={`${input} bg-neutral-50 text-neutral-500`} value={shown.email} readOnly aria-describedby="st-email-help" />
              <p id="st-email-help" className="mt-1 text-[11px] text-neutral-500">To change your email, contact support.</p>
            </div>
            <div>
              <label htmlFor="st-phone" className={lab}>Mobile</label>
              <input id="st-phone" className={input} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {profileMsg && (
              <p role={profileMsg.ok ? "status" : "alert"} className={`flex items-start gap-2 text-sm rounded-xl px-3 py-2.5 border ${profileMsg.ok ? "text-emerald-800 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"}`}>
                {profileMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />} {profileMsg.text}
              </p>
            )}
            <button type="submit" disabled={saving} className="btn-primary min-h-[48px] px-8 text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center gap-2 disabled:opacity-70">
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </section>

        <section aria-labelledby="privacy-h" className="bg-white border border-brand-border rounded-3xl p-5 sm:p-7 shadow-card space-y-6">
          <h2 id="privacy-h" className="text-lg font-serif flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-brand-gold" aria-hidden="true" /> Privacy &amp; Security</h2>

          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-neutral-500" aria-hidden="true" /> Password</h3>
            <p className="text-sm text-neutral-600 mt-1">We will email a link to <strong className="break-all">{shown.email}</strong> so you can choose a new password.</p>
            <button type="button" onClick={sendReset} disabled={resetState === "sending" || resetState === "sent"} className="mt-3 min-h-[44px] px-5 rounded-full border border-brand-border text-sm font-semibold hover:border-brand-gold disabled:opacity-60 inline-flex items-center gap-2">
              {resetState === "sending" && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {resetState === "sent" ? "Link sent. Check your email" : resetState === "sending" ? "Sending…" : "Email me a reset link"}
            </button>
            {resetState === "error" && <p role="alert" className="mt-2 text-xs text-red-700">{resetError}</p>}
          </div>

          <p className="text-xs text-neutral-500">
            Read how we use your information in our <Link href="/privacy-policy" className="underline text-brand-maroon">Privacy Policy</Link>. Questions about your data? <Link href="/account/support/new" className="underline text-brand-maroon">Raise a query</Link>.
          </p>

          <div className="border-t border-red-100 pt-6">
            <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2"><Trash2 className="w-4 h-4" aria-hidden="true" /> Delete account</h3>
            <p className="text-sm text-neutral-600 mt-1">
              Permanently delete your account and personal data. Some transaction records may be retained where required by law or legitimate business obligations.
            </p>
            <button type="button" onClick={() => setShowDelete(true)} className="mt-3 min-h-[44px] px-5 rounded-full border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50">
              Delete my account…
            </button>
          </div>
        </section>
      </div>

      <DeleteAccountDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onDeleted={() => {
          setDeleted(true);
          // Forget everything held in this browser for the deleted account, then sign the app out
          try {
            Object.keys(localStorage).filter((k) => k.startsWith("raveena_")).forEach((k) => localStorage.removeItem(k));
          } catch {
            /* storage may be unavailable */
          }
          logout();
        }}
      />
    </div>
  );
}
