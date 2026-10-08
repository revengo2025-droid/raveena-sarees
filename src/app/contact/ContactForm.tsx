"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send, AlertTriangle } from "lucide-react";
import { submitContactMessageAction } from "@/app/actions/contact";
import { CONTACT_LIMITS, validateContact, type ContactField } from "@/lib/support/validate";
import { newSubmissionToken, withTimeout, RequestTimeoutError, TIMEOUT_MESSAGE, NETWORK_MESSAGE } from "@/lib/support/client";
import { SITE } from "@/lib/site";

const EMPTY = { name: "", email: "", phone: "", subject: "", message: "", website: "" };
type Values = typeof EMPTY;
type Errors = Partial<Record<ContactField, string>>;

const input =
  "w-full bg-white border rounded-xl px-4 py-3 text-base sm:text-sm text-brand-text placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/20 min-h-[44px]";
const label = "text-[11px] uppercase text-neutral-600 font-poppins block mb-1 tracking-wide";

export function ContactForm() {
  const [form, setForm] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<{ ref: string; confirmationEmailed: boolean; email: string } | null>(null);

  // One token per message: kept across failed attempts so a retry can never create a second record
  const token = useRef<string>("");
  const submitting = useRef(false); // synchronous guard: state updates are too slow to stop a fast double click

  const validate = (values: Values): Errors => {
    const v = validateContact(values);
    return v.ok ? {} : v.errors;
  };

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    if (touched[k as ContactField]) setErrors(validate(next));
  };
  const blur = (k: ContactField) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors(validate(form));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setFormError(null);

    const found = validate(form);
    setErrors(found);
    setTouched({ name: true, email: true, phone: true, subject: true, message: true });
    const firstBad = (["name", "email", "phone", "subject", "message"] as ContactField[]).find((k) => found[k]);
    if (firstBad) {
      document.getElementById(`ct-${firstBad}`)?.focus();
      return;
    }

    submitting.current = true;
    setSending(true);
    if (!token.current) token.current = newSubmissionToken();
    try {
      const res = await withTimeout(submitContactMessageAction({ ...form, token: token.current }));
      if (res.success) {
        setDone({ ref: res.ref, confirmationEmailed: res.confirmationEmailed, email: form.email.trim() });
        setForm(EMPTY); // reset only after the server confirmed it saved the message
        setErrors({});
        setTouched({});
        token.current = "";
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors as Errors);
        setFormError(res.error);
      }
    } catch (err) {
      setFormError(err instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
    } finally {
      submitting.current = false;
      setSending(false);
    }
  };

  if (done) {
    return (
      <div role="status" className="text-center py-8 space-y-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" aria-hidden="true" />
        <h2 className="text-xl font-serif">Message received</h2>
        <p className="text-sm text-neutral-600 max-w-sm mx-auto">
          Thank you. Your reference is <strong className="font-mono">{done.ref}</strong>. We will reply to <strong className="break-all">{done.email}</strong> as soon as we can.
        </p>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          {done.confirmationEmailed
            ? "A confirmation has been emailed to you."
            : `Your message is saved with us. We could not send a confirmation email just now, so please keep this reference. You can also WhatsApp us on ${SITE.phoneDisplay}.`}
        </p>
        <button type="button" onClick={() => setDone(null)} className="text-xs underline text-brand-maroon min-h-[44px]">
          Send another message
        </button>
      </div>
    );
  }

  const fieldProps = (k: ContactField) => ({
    id: `ct-${k}`,
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `ct-${k}-err` : undefined,
    className: `${input} ${errors[k] ? "border-red-400 focus:border-red-500" : "border-brand-border focus:border-brand-gold"}`,
    onBlur: blur(k),
    disabled: sending,
  });
  const err = (k: ContactField) =>
    errors[k] ? (
      <p id={`ct-${k}-err`} className="mt-1 text-xs text-red-700">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate aria-busy={sending}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ct-name" className={label}>Your name *</label>
          <input {...fieldProps("name")} autoComplete="name" required maxLength={CONTACT_LIMITS.name} value={form.name} onChange={set("name")} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="ct-email" className={label}>Email *</label>
          <input {...fieldProps("email")} type="email" autoComplete="email" required maxLength={255} value={form.email} onChange={set("email")} />
          {err("email")}
        </div>
        <div>
          <label htmlFor="ct-phone" className={label}>Mobile (optional)</label>
          <input {...fieldProps("phone")} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={20} value={form.phone} onChange={set("phone")} />
          {err("phone")}
        </div>
        <div>
          <label htmlFor="ct-subject" className={label}>Subject *</label>
          <input {...fieldProps("subject")} required maxLength={CONTACT_LIMITS.subject} placeholder="e.g. Question about my order" value={form.subject} onChange={set("subject")} />
          {err("subject")}
        </div>
      </div>
      <div>
        <label htmlFor="ct-message" className={label}>Message *</label>
        <textarea
          {...fieldProps("message")}
          rows={5}
          required
          maxLength={CONTACT_LIMITS.message}
          className={`${fieldProps("message").className} resize-y`}
          value={form.message}
          onChange={set("message")}
          placeholder="Include your order number if it is about an order."
        />
        <div className="flex justify-between gap-3">
          <div>{err("message")}</div>
          <p className="mt-1 text-[11px] text-neutral-400 shrink-0">{form.message.length}/{CONTACT_LIMITS.message}</p>
        </div>
      </div>

      {/* Honeypot: hidden from people and screen readers, visible to bots */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
        </label>
      </div>

      {formError && (
        <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {formError}
        </p>
      )}

      <p className="text-[11px] leading-5 text-neutral-500">
        We use your name, email and mobile number only to reply to this message and keep a record of it. See our{" "}
        <Link href="/privacy-policy" className="underline text-brand-maroon">Privacy Policy</Link>.
      </p>

      <button
        type="submit"
        disabled={sending}
        className="btn-primary w-full sm:w-auto sm:px-10 min-h-[48px] text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
        {sending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
