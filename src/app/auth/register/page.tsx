"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Mail, Phone, Lock, ArrowRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { registerAction } from "@/app/actions/auth";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/account";
  const { login, showToast } = useApp();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      showToast("Please fill in all mandatory registration fields.", "error");
      return;
    }
    setIsLoading(true);

    try {
      const res = await registerAction({
        fullName,
        email,
        phone: phone ? phone.replace(/\D/g, "").slice(-10) : undefined,
        password,
      });

      if (res.success) {
        login(email, "customer", fullName, phone);
        showToast("Account created successfully! Welcome to Ravina Sarees.", "success");
        router.push(redirectParam);
      } else {
        showToast(res.error || "Could not create account. Please try again.", "error");
      }
    } catch {
      showToast("Registration failed. Please check your connection and try again.", "error");
    } finally {
      setIsLoading(false);
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
              New Patron Registration
            </p>
          </Link>
          <h1 className="text-xl font-serif text-brand-text font-normal pt-2">
            Join the Privileged Circle
          </h1>
          <p className="text-xs text-neutral-500 font-light">
            Enjoy express checkout, order tracking, and exclusive bridal privileges.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="Ananya Reddy"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl py-2.5 pl-10 pr-3 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
              Email Address *
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

          <div>
            <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
              Mobile Number (For Courier Updates) *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                placeholder="+91 77807 56009"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl py-2.5 pl-10 pr-3 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl py-2.5 pl-10 pr-3 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-brand-gold"
            />
            <span className="text-[11px] text-neutral-500 font-light leading-tight">
              I agree to the <Link href="/terms" className="text-brand-maroon underline font-medium">Terms of Service</Link> and <Link href="/privacy-policy" className="text-brand-maroon underline font-medium">Privacy Policy</Link>.
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3.5 text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center justify-center gap-2 font-poppins"
          >
            {isLoading ? "Creating Account..." : "Create My Royal Account"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-brand-border text-xs text-neutral-500">
          Already have an account?{" "}
          <Link
            href={
              redirectParam !== "/account"
                ? `/auth/login?redirect=${encodeURIComponent(redirectParam)}`
                : "/auth/login"
            }
            className="text-brand-maroon font-semibold hover:underline font-poppins"
          >
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] bg-brand-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
