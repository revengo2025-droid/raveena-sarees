"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, Send, AlertTriangle } from "lucide-react";
import { submitContactMessageAction } from "@/app/actions/contact";

const SUBJECTS = [
  "Order question",
  "Return or refund",
  "Product question",
  "Delivery issue",
  "Payment issue",
  "Account help",
  "Something else",
];

const input =
  "w-full bg-white border border-brand-border rounded-xl px-4 py-3 text-base sm:text-sm text-brand-text placeholder-neutral-400 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 min-h-[44px]";
const label = "text-[11px] uppercase text-neutral-600 font-poppins block mb-1 tracking-wide";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: SUBJECTS[0], message: "", website: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    const res = await submitContactMessageAction(form);
    setSending(false);
    if (res.success) setSent(true);
    else setError(res.error);
  };

  if (sent) {
    return (
      <div role="status" className="text-center py-10 space-y-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <h2 className="text-xl font-serif">Message received</h2>
        <p className="text-sm text-neutral-600 max-w-sm mx-auto">
          Thank you. We will reply to <strong>{form.email}</strong> as soon as we can.
        </p>
        <button onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", subject: SUBJECTS[0], message: "", website: "" }); }} className="text-xs underline text-brand-maroon min-h-[44px]">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ct-name" className={label}>Your name *</label>
          <input id="ct-name" autoComplete="name" required className={input} value={form.name} onChange={set("name")} />
        </div>
        <div>
          <label htmlFor="ct-email" className={label}>Email *</label>
          <input id="ct-email" type="email" autoComplete="email" required className={input} value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label htmlFor="ct-phone" className={label}>Mobile (optional)</label>
          <input id="ct-phone" type="tel" inputMode="numeric" autoComplete="tel-national" className={input} value={form.phone} onChange={set("phone")} />
        </div>
        <div>
          <label htmlFor="ct-subject" className={label}>Topic *</label>
          <select id="ct-subject" className={input} value={form.subject} onChange={set("subject")}>
            {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="ct-message" className={label}>Message *</label>
        <textarea id="ct-message" rows={5} required minLength={10} maxLength={3000} className={`${input} resize-y`} value={form.message} onChange={set("message")} placeholder="Include your order number if it is about an order." />
      </div>

      {/* Honeypot: hidden from people, visible to bots */}
      <div aria-hidden="true" className="hidden">
        <label>Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <button type="submit" disabled={sending} className="btn-primary w-full sm:w-auto sm:px-10 min-h-[48px] text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-70">
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {sending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
