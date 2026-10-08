"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { deleteAccountAction, getAccountDeletionStatusAction } from "@/app/actions/account";
import { DELETE_CONFIRMATION_WORD } from "@/lib/support/constants";
import { withTimeout, RequestTimeoutError, NETWORK_MESSAGE } from "@/lib/support/client";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called once the account is gone, so the app can clear its in-memory state. */
  onDeleted: () => void;
}

/**
 * Confirmation dialog for permanent account deletion.
 * Safety rails: orders in progress block it, the word DELETE must be typed, and the password must be re-entered.
 * Accessible: focus moves into the dialog, Tab is trapped, Escape closes it, and focus returns to the opener.
 */
export function DeleteAccountDialog({ open, onClose, onDeleted }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<Element | null>(null);
  const submitting = useRef(false);

  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  // Reset and check for blockers every time the dialog opens
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    setConfirmation("");
    setPassword("");
    setError(null);
    setDoneMessage(null);
    setBlocked(null);
    setChecking(true);
    let cancelled = false;
    withTimeout(getAccountDeletionStatusAction(), 15_000)
      .then((r) => {
        if (cancelled) return;
        if (r.success && r.blocked) setBlocked(r.reason || "You have an order in progress.");
        else if (!r.success) setError(r.error || "We could not check your account. Please try again.");
      })
      .catch(() => !cancelled && setError(NETWORK_MESSAGE))
      .finally(() => !cancelled && setChecking(false));
    // Focus goes into the dialog (the first field when there is one, otherwise the dialog itself)
    const t = setTimeout(() => (firstFieldRef.current || dialogRef.current)?.focus(), 50);
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      clearTimeout(t);
      document.body.style.overflow = "";
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  // Escape works wherever focus is, as long as nothing irreversible is in progress
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting && !doneMessage) onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, deleting, doneMessage, onClose]);

  // When the order check finishes with no input shown (blocked), keep focus inside the dialog
  useEffect(() => {
    if (open && !checking && blocked) dialogRef.current?.focus();
  }, [open, checking, blocked]);

  if (!open) return null;

  const canSubmit = !checking && !blocked && !deleting && confirmation.trim() === DELETE_CONFIRMATION_WORD && password.length > 0;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]'));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting.current) return;
    submitting.current = true;
    setDeleting(true);
    setError(null);
    try {
      const res = await withTimeout(deleteAccountAction({ confirmation: confirmation.trim(), password }), 40_000);
      if (res.success) {
        setPassword("");
        setDoneMessage(res.message);
        onDeleted();
      } else {
        setError(res.error);
      }
    } catch (err) {
      // After a timeout we cannot know whether it finished: tell the truth and let the person check by signing in
      setError(
        err instanceof RequestTimeoutError
          ? "This is taking longer than expected. Your account may already be deleted. Please refresh the page; if you are still signed in, try again."
          : NETWORK_MESSAGE
      );
    } finally {
      submitting.current = false;
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" onClick={() => !deleting && !doneMessage && onClose()} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="del-title"
        aria-describedby="del-desc"
        tabIndex={-1}
        className="relative outline-none w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 text-brand-text"
      >
        {doneMessage ? (
          <div role="status" className="text-center space-y-3 py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" aria-hidden="true" />
            <h2 id="del-title" className="text-xl font-serif">Account deleted</h2>
            <p id="del-desc" className="text-sm text-neutral-600">{doneMessage}</p>
            <button type="button" onClick={() => window.location.assign("/")} className="btn-primary inline-block px-6 py-3 min-h-[44px] text-xs rounded-full font-semibold shadow-md mt-2">Back to home page</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate aria-busy={deleting}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 id="del-title" className="text-xl font-serif flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" /> Delete your account?
              </h2>
              <button type="button" onClick={onClose} disabled={deleting} aria-label="Close" className="p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-500 hover:text-brand-text disabled:opacity-40">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div id="del-desc" className="text-sm text-neutral-700 space-y-2">
              <p>This cannot be undone. When you delete your account:</p>
              <ul className="list-disc pl-5 space-y-1 text-[13px]">
                <li>Your profile, saved addresses, wishlist, cart and reviews are removed.</li>
                <li>Your newsletter subscription and support messages not tied to an order are removed.</li>
                <li>You are signed out everywhere and cannot sign in again with this account.</li>
                <li>Records of past orders and payments may be kept where required by law or legitimate business obligations. They are no longer linked to your login.</li>
              </ul>
            </div>

            {checking && (
              <p role="status" className="mt-4 flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Checking your orders…</p>
            )}
            {blocked && (
              <p role="alert" className="mt-4 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">{blocked}</p>
            )}

            {!blocked && (
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="del-confirm" className="text-[11px] uppercase text-neutral-600 font-poppins block mb-1 tracking-wide">
                    Type <strong>{DELETE_CONFIRMATION_WORD}</strong> to confirm
                  </label>
                  <input
                    ref={firstFieldRef}
                    id="del-confirm"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={confirmation}
                    disabled={deleting}
                    onChange={(e) => setConfirmation(e.target.value)}
                    className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 min-h-[44px]"
                  />
                </div>
                <div>
                  <label htmlFor="del-password" className="text-[11px] uppercase text-neutral-600 font-poppins block mb-1 tracking-wide">Your password</label>
                  <input
                    id="del-password"
                    type="password"
                    autoComplete="current-password"
                    maxLength={128}
                    value={password}
                    disabled={deleting}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "del-error" : undefined}
                    className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 min-h-[44px]"
                  />
                </div>
              </div>
            )}

            {error && (
              <p id="del-error" role="alert" className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {error}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button type="button" onClick={onClose} disabled={deleting} className="min-h-[48px] px-6 rounded-full border border-brand-border text-sm font-semibold hover:border-brand-gold disabled:opacity-50">
                Keep my account
              </button>
              {!blocked && (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="min-h-[48px] px-6 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} {deleting ? "Deleting…" : "Delete my account"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
