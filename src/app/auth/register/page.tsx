"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Mail, Phone, Lock, ArrowRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { registerAction } from "@/app/actions/auth";
import { postLoginPath } from "@/lib/auth/roles";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-site relative paths, and never the admin area (prevents open redirects)
  const redirectParam = postLoginPath("customer", searchParams.get("redirect"));
  const { login, showToast } = useApp();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      showToast("Please fill in all mandatory registration fields.", "error");
      return;
    }
    if (!agreed) {
      showToast("Please accept the Terms and Privacy Policy to create your account.", "error");
      return;
    }
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await registerAction({
        fullName,
        email,
        phone: phone ? phone.replace(/\D/g, "").slice(-10) : undefined,
        password,
      });

      if (res.success && res.data?.signedIn === false) {
        // The account exists but must be confirmed first: do not pretend the customer is signed in
        showToast("Account created. Please check your email and confirm your address, then sign in.", "success");
        router.push("/auth/login");
      } else if (res.success) {
        login(email, "customer", fullName, phone);
        showToast("Account created successfully! Welcome to Raveena Sarees.", "success");
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
              src="/images/logo/raveena-logo.jpg"
              alt="Raveena Sarees"
              className="h-24 w-24 object-cover rounded-2xl shadow-md mx-auto"
            />
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5 font-poppins">
              New Patron Registration
            </p>
          </Link>
          <h1 className="text-xl font-serif text-brand-text font-normal pt-2">
            Join the Privileged Circle
          </h1>
          <p className="text-xs text-neutral-500 font-light">
            Create an account to check out faster and track your orders.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label htmlFor="reg-name" className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                maxLength={100}
                required
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl py-2.5 pl-10 pr-3 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-email" className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl py-2.5 pl-10 pr-3 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-phone" className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
              Mobile Number (For Courier Updates) *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                id="reg-phone"
                type="tel"
                autoComplete="tel-national"
                inputMode="numeric"
                required
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl py-2.5 pl-10 pr-3 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-password" className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
              Password * <span className="normal-case text-neutral-400">(at least 8 characters)</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
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
              required
              className="mt-0.5 w-4 h-4 accent-brand-gold"
            />
            <span className="text-[11px] text-neutral-500 font-light leading-tight">
              I agree to the <Link href="/terms" className="text-brand-maroon underline font-medium">Terms of Service</Link> and <Link href="/privacy-policy" className="text-brand-maroon underline font-medium">Privacy Policy</Link>.
              We use your name, email and mobile number to create your account, deliver orders and send order updates.
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
