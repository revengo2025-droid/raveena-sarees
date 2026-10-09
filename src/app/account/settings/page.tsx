"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ShieldCheck, UserRound, Trash2, KeyRound, Loader2, CheckCircle2, AlertTriangle, Mail, Phone, Lock } from "lucide-react";
import { useApp } from "@/lib/store";
import { updateProfileAction, forgotPasswordAction } from "@/app/actions/auth";
import { DeleteAccountDialog } from "@/components/account/DeleteAccountDialog";
import { AccountShell } from "@/components/account/AccountShell";
import { withTimeout, NETWORK_MESSAGE } from "@/lib/support/client";

const input =
  "w-full bg-white border rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30 min-h-[48px]";
const lab = "text-xs font-semibold text-neutral-700 block mb-1.5";

export default function AccountSettingsPage() {
  const { logout } = useApp();
  const [showDelete, setShowDelete] = useState(false);
  // After a successful deletion the app signs the customer out; the dialog stays on screen to confirm it
  const [deleted, setDeleted] = useState(false);

  return (
    <>
      {!deleted && (
        <AccountShell title="Profile & Settings" description="Update your personal details, password and privacy choices." signInRedirect="/account/settings">
          <SettingsContent onDeleteClick={() => setShowDelete(true)} />
        </AccountShell>
      )}
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
    </>
  );
}

function SettingsContent({ onDeleteClick }: { onDeleteClick: () => void }) {
  const { user, applyUserDetails } = useApp();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [resetState, setResetState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resetError, setResetError] = useState<string | null>(null);

  if (!user) return null;

  const digits = phone.replace(/\D/g, "").slice(-10);
  const changed = fullName.trim() !== user.fullName || digits !== (user.phone || "");

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const found: typeof errors = {};
    if (fullName.trim().length < 2) found.name = "Please enter your full name (at least 2 letters).";
    if (digits && !/^[6-9]\d{9}$/.test(digits)) found.phone = "Enter a valid 10-digit Indian mobile number, or leave it blank.";
    setErrors(found);
    setProfileMsg(null);
    if (found.name) return nameRef.current?.focus();
    if (found.phone) return phoneRef.current?.focus();

    setSaving(true);
    try {
      const res = await withTimeout(updateProfileAction({ fullName: fullName.trim(), phone: digits }), 20_000);
      if (res.success) {
        const saved = { fullName: res.data?.fullName ?? fullName.trim(), phone: res.data?.phone ?? digits };
        applyUserDetails(saved);
        setFullName(saved.fullName);
        setPhone(saved.phone);
        setProfileMsg({ ok: true, text: "Your details have been saved." });
      } else {
        setProfileMsg({ ok: false, text: res.error || "We could not save your details." });
      }
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
      const res = await withTimeout(forgotPasswordAction({ email: user.email }), 20_000);
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
    <>
      {/* Personal information */}
      <section aria-labelledby="profile-h" className="bg-white border border-brand-border rounded-3xl p-5 sm:p-7 shadow-card">
        <h2 id="profile-h" className="text-lg font-serif flex items-center gap-2">
          <UserRound className="w-5 h-5 text-brand-gold" aria-hidden="true" /> Personal information
        </h2>
        <p className="text-sm text-neutral-600 mt-1 mb-5">This is how we address you and contact you about deliveries.</p>

        <form onSubmit={saveProfile} noValidate className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label htmlFor="st-name" className={lab}>
                Full name <span className="text-red-700" aria-hidden="true">*</span>
              </label>
              <input
                ref={nameRef}
                id="st-name"
                className={`${input} ${errors.name ? "border-red-500" : "border-brand-border"}`}
                autoComplete="name"
                maxLength={100}
                required
                aria-required="true"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "st-name-error" : undefined}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
                }}
              />
              {errors.name && (
                <p id="st-name-error" className="mt-1.5 text-xs text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="st-email" className={lab}>Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input id="st-email" className={`${input} pl-10 pr-10 border-brand-border bg-neutral-50 text-neutral-600`} value={user.email} readOnly aria-describedby="st-email-help" />
                <Lock className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              </div>
              <p id="st-email-help" className="mt-1.5 text-xs text-neutral-500">
                Your sign-in email cannot be changed here. <Link href="/account/support/new" className="underline text-brand-maroon">Contact us</Link> to change it.
              </p>
            </div>

            <div>
              <label htmlFor="st-phone" className={lab}>Mobile number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-neutral-500" aria-hidden="true">+91</span>
                <input
                  ref={phoneRef}
                  id="st-phone"
                  className={`${input} pl-[4.5rem] ${errors.phone ? "border-red-500" : "border-brand-border"}`}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={14}
                  placeholder="98765 43210"
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={errors.phone ? "st-phone-error" : "st-phone-help"}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors((x) => ({ ...x, phone: undefined }));
                  }}
                />
              </div>
              {errors.phone ? (
                <p id="st-phone-error" className="mt-1.5 text-xs text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> {errors.phone}
                </p>
              ) : (
                <p id="st-phone-help" className="mt-1.5 text-xs text-neutral-500">Used only for order and courier updates.</p>
              )}
            </div>
          </div>

          <div aria-live="polite" aria-atomic="true">
            {profileMsg && (
              <p
                className={`flex items-start gap-2 text-sm rounded-xl px-3 py-2.5 border ${
                  profileMsg.ok ? "text-emerald-800 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"
                }`}
              >
                {profileMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />} {profileMsg.text}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || !changed}
              className="btn-primary min-h-[48px] px-8 text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} {saving ? "Saving…" : "Save changes"}
            </button>
            {changed && !saving && (
              <button
                type="button"
                onClick={() => {
                  setFullName(user.fullName);
                  setPhone(user.phone || "");
                  setErrors({});
                  setProfileMsg(null);
                }}
                className="min-h-[48px] px-5 rounded-full text-sm font-semibold text-neutral-600 hover:text-brand-text"
              >
                Undo changes
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Security */}
      <section aria-labelledby="security-h" className="bg-white border border-brand-border rounded-3xl p-5 sm:p-7 shadow-card">
        <h2 id="security-h" className="text-lg font-serif flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-gold" aria-hidden="true" /> Password &amp; security
        </h2>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between rounded-2xl bg-brand-ivory border border-brand-border p-4">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-brand-maroon shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-semibold">Change your password</h3>
              <p className="text-sm text-neutral-600 mt-0.5">
                We will email a secure link to <strong className="break-all">{user.email}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={sendReset}
            disabled={resetState === "sending" || resetState === "sent"}
            className="shrink-0 min-h-[44px] px-5 rounded-full bg-white border border-brand-border text-sm font-semibold hover:border-brand-gold disabled:opacity-70 inline-flex items-center justify-center gap-2"
          >
            {resetState === "sending" && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {resetState === "sent" ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" /> Link sent
              </>
            ) : resetState === "sending" ? (
              "Sending…"
            ) : (
              "Email me a reset link"
            )}
          </button>
        </div>
        <div aria-live="polite">
          {resetState === "sent" && <p className="mt-3 text-sm text-emerald-800">Check your inbox (and the Spam folder). The link works once.</p>}
          {resetState === "error" && <p className="mt-3 text-sm text-red-700">{resetError}</p>}
        </div>
        <p className="text-xs text-neutral-500 mt-4">
          Read how we use your information in our <Link href="/privacy-policy" className="underline text-brand-maroon">Privacy Policy</Link>. Questions about your data?{" "}
          <Link href="/account/support/new" className="underline text-brand-maroon">Raise a query</Link>.
        </p>
      </section>

      {/* Danger zone */}
      <section aria-labelledby="delete-h" className="bg-white border-2 border-red-200 rounded-3xl p-5 sm:p-7 shadow-card">
        <h2 id="delete-h" className="text-lg font-serif text-red-800 flex items-center gap-2">
          <Trash2 className="w-5 h-5" aria-hidden="true" /> Delete account
        </h2>
        <p className="text-sm text-neutral-700 mt-2 max-w-prose">
          Permanently delete your account, saved addresses, wishlist and reviews. This cannot be undone. Records of past orders may be kept where the law requires it.
        </p>
        <button
          type="button"
          onClick={onDeleteClick}
          className="mt-4 min-h-[48px] px-6 rounded-full border-2 border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          Delete my account…
        </button>
      </section>
    </>
  );
}
