"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { useApp } from "@/lib/store";

export default function ForgotPasswordPage() {
  const { showToast } = useApp();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSent(true);
      showToast("Password reset link has been dispatched to your email", "success");
    }
  };

  return (
    <div className="min-h-[80vh] bg-brand-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-brand-text">
      <div className="max-w-md w-full bg-white border border-brand-border rounded-3xl p-8 shadow-luxury space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-serif text-brand-text font-normal">
            Reset Your Password
          </h1>
          <p className="text-xs text-neutral-500 font-light">
            Enter your registered email address and we will send you secure instructions to regain access.
          </p>
        </div>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-semibold text-brand-text">Reset Link Dispatched</h3>
            <p className="text-xs text-neutral-600 font-light">
              We have sent instructions to <strong>{email}</strong>. Please check your inbox.
            </p>
            <Link
              href="/auth/login"
              className="inline-block mt-2 text-xs text-brand-maroon hover:underline font-semibold font-poppins"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                Registered Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="ananya.reddy@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-ivory border border-brand-border rounded-xl py-2.5 pl-10 pr-3 text-brand-text focus:outline-none focus:border-brand-gold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-3.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-md flex items-center justify-center gap-2 font-poppins"
            >
              <Send className="w-3.5 h-3.5" /> Send Reset Link
            </button>

            <div className="text-center pt-2">
              <Link
                href="/auth/login"
                className="text-xs text-neutral-500 hover:text-brand-text inline-flex items-center gap-1 font-poppins"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
