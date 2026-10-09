"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Send, AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/store";
import { createTicketAction } from "@/app/actions/support";
import { TICKET_CATEGORIES } from "@/lib/support/constants";
import { TICKET_LIMITS, validateTicket, type TicketField } from "@/lib/support/validate";
import { newSubmissionToken, withTimeout, RequestTimeoutError, TIMEOUT_MESSAGE, NETWORK_MESSAGE } from "@/lib/support/client";
import { AccountShell } from "@/components/account/AccountShell";

type Errors = Partial<Record<TicketField, string>>;
const field = "w-full bg-white border rounded-xl px-4 py-3 text-base sm:text-sm text-brand-text placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/20 min-h-[44px]";
const lab = "text-[11px] uppercase text-neutral-600 font-poppins block mb-1 tracking-wide";

export default function NewQueryPage() {
  const router = useRouter();
  const { orders } = useApp();
  const [form, setForm] = useState({ category: "", subject: "", description: "", orderNumber: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const token = useRef("");
  const submitting = useRef(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k as TicketField]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setFormError(null);
    const v = validateTicket(form);
    if (!v.ok) {
      setErrors(v.errors);
      const first = (["category", "subject", "description", "orderNumber"] as TicketField[]).find((k) => v.errors[k]);
      if (first) document.getElementById(`tk-${first}`)?.focus();
      return;
    }
    submitting.current = true;
    setSending(true);
    if (!token.current) token.current = newSubmissionToken();
    try {
      const res = await withTimeout(createTicketAction({ ...form, token: token.current }));
      if (res.success) {
        token.current = "";
        router.push(`/account/support/${res.id}?created=1`);
        return;
      }
      if ("fieldErrors" in res && res.fieldErrors) setErrors(res.fieldErrors as Errors);
      setFormError(res.error);
    } catch (err) {
      setFormError(err instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
    } finally {
      submitting.current = false;
      setSending(false);
    }
  };

  const props = (k: TicketField) => ({
    id: `tk-${k}`,
    disabled: sending,
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `tk-${k}-err` : undefined,
    className: `${field} ${errors[k] ? "border-red-400" : "border-brand-border focus:border-brand-gold"}`,
  });
  const err = (k: TicketField) => (errors[k] ? <p id={`tk-${k}-err`} className="mt-1 text-xs text-red-700">{errors[k]}</p> : null);

  return (
    <AccountShell title="Raise a query" description="Tell us what you need help with. We reply on your account and by email." signInRedirect="/account/support/new">
        <form onSubmit={submit} noValidate aria-busy={sending} className="bg-white border border-brand-border rounded-3xl p-5 sm:p-8 shadow-card space-y-4">
          <div>
            <label htmlFor="tk-category" className={lab}>What is this about? *</label>
            <select {...props("category")} required value={form.category} onChange={update("category")}>
              <option value="">Choose one…</option>
              {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {err("category")}
          </div>

          <div>
            <label htmlFor="tk-orderNumber" className={lab}>Related order (optional)</label>
            <select {...props("orderNumber")} value={form.orderNumber} onChange={update("orderNumber")}>
              <option value="">Not about a specific order</option>
              {orders.map((o) => <option key={o.id} value={o.orderNumber}>{o.orderNumber}</option>)}
            </select>
            {err("orderNumber")}
          </div>

          <div>
            <label htmlFor="tk-subject" className={lab}>Subject *</label>
            <input {...props("subject")} required maxLength={TICKET_LIMITS.subject} placeholder="A short summary" value={form.subject} onChange={update("subject")} />
            {err("subject")}
          </div>

          <div>
            <label htmlFor="tk-description" className={lab}>Describe the issue *</label>
            <textarea {...props("description")} rows={6} required maxLength={TICKET_LIMITS.description} className={`${props("description").className} resize-y`} placeholder="What happened? What would you like us to do?" value={form.description} onChange={update("description")} />
            <div className="flex justify-between gap-3">
              <div>{err("description")}</div>
              <p className="mt-1 text-[11px] text-neutral-400 shrink-0">{form.description.length}/{TICKET_LIMITS.description}</p>
            </div>
          </div>

          {formError && (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {formError}
            </p>
          )}

          <p className="text-[11px] leading-5 text-neutral-500">
            We use what you write here only to resolve your request and keep a record of it. See our <Link href="/privacy-policy" className="underline text-brand-maroon">Privacy Policy</Link>.
            Please do not share passwords or card numbers.
          </p>

          <button type="submit" disabled={sending} className="btn-primary w-full sm:w-auto sm:px-10 min-h-[48px] text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-70">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
            {sending ? "Submitting…" : "Submit query"}
          </button>
        </form>
    </AccountShell>
  );
}
