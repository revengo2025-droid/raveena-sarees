"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { loginAction } from "@/app/actions/auth";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/account";
  const { login, showToast } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast("Please enter your email address", "error");
      return;
    }
    setIsLoading(true);

    try {
      const res = await loginAction({ email, password });
      if (res.success && res.data?.user) {
        login(res.data.user.email, res.data.user.role as any, res.data.user.fullName);
        setIsLoading(false);
        showToast("Signed in successfully. Welcome back!", "success");
        if (res.data.user.role === "admin") {
          router.push("/admin");
        } else {
          router.push(redirectParam);
        }
      } else {
        setIsLoading(false);
        showToast(res.error || "Invalid email or password", "error");
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err?.message || "Failed to sign in. Please verify your credentials.", "error");
    }
  };

  return (
    <div className="min-h-[85vh] bg-brand-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-brand-text">
      <div className="max-w-md w-full bg-white border border-brand-border rounded-3xl p-8 shadow-luxury space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <img
              src="/images/logo/raveena-logo-light.png"
              alt="Raveena Sarees"
              className="h-14 w-auto object-contain mx-auto"
            />
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5 font-poppins">
              Patron Authentication
            </p>
          </Link>
          <h1 className="text-xl font-serif text-brand-text font-normal pt-2">
            Welcome to the Royal Circle
          </h1>
          <p className="text-xs text-neutral-500 font-light">
            Sign in to access your orders, wishlist, and complete your saree purchase.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="patron@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl py-2.5 pl-10 pr-3 text-brand-text placeholder-neutral-400 focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase text-neutral-500 font-poppins">Password</label>
              <Link href="/auth/forgot-password" className="text-[11px] text-brand-maroon hover:underline font-poppins">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl py-2.5 pl-10 pr-3 text-brand-text placeholder-neutral-400 focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3.5 text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center justify-center gap-2 font-poppins"
          >
            {isLoading ? "Signing In..." : "Sign In to Royal Portal"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-brand-border text-xs text-neutral-500">
          New to Ravina Sarees?{" "}
          <Link
            href={
              redirectParam !== "/account"
                ? `/auth/register?redirect=${encodeURIComponent(redirectParam)}`
                : "/auth/register"
            }
            className="text-brand-maroon font-semibold hover:underline font-poppins"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] bg-brand-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
