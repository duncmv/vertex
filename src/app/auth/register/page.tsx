"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function GoogleButton() {
  return (
    <a
      href="/api/auth/google?redirect=/dashboard"
      id="google-register-btn"
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
    >
      <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </a>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", confirmPassword: "", phone: "", country: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: ["Passwords do not match"] });
      return;
    }
    setStatus("loading");
    setErrors({});

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name, email: form.email, password: form.password,
          phone: form.phone || undefined, country: form.country || undefined,
          invite: invite || undefined,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = { error: `Server error (${res.status}). Please try again later.` };
      }

      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.error || "Registration failed.");
        if (data.details) setErrors(data.details);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error. Please check your connection.");
    }
  };

  const COUNTRIES = ["Ethiopia", "Kenya", "Nigeria", "Ghana", "Uganda", "Tanzania", "Sudan", "Somalia", "South Africa", "Saudi Arabia", "UAE", "Qatar", "Kuwait", "Bahrain", "Oman", "Other"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <img src="/logo.svg" alt="Vertex" className="h-10 w-auto brightness-0 invert mx-auto" />
            <span className="block text-amber-400 text-xs font-semibold tracking-widest uppercase mt-1">International</span>
          </Link>
          <h1 className="text-3xl font-black text-white">Create Your Account</h1>
          <p className="text-emerald-200 mt-2">
            {invite ? "Your recruiter says you're ready — finish setting up your account." : "Start your international career journey"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {status === "success" ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="font-black text-slate-800 text-2xl mb-2">Check Your Email</h2>
              <p className="text-slate-500 mb-6">{message}</p>
              <Link href="/auth/login" className="btn-primary">Go to Login</Link>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Google Button */}
              <GoogleButton />

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">or register with email</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                  <input id="reg-fullname" name="full_name" value={form.full_name} onChange={handleChange} required className="input-field" placeholder="John Doe" />
                  {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address *</label>
                  <input id="reg-email" name="email" type="email" value={form.email} onChange={handleChange} required className="input-field" placeholder="john@example.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email[0]}</p>}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                    <input id="reg-phone" name="phone" value={form.phone} onChange={handleChange} className="input-field" placeholder="+251 9..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
                    <select id="reg-country" name="country" value={form.country} onChange={handleChange} className="input-field">
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                  <input id="reg-password" name="password" type="password" value={form.password} onChange={handleChange} required className="input-field" placeholder="Min 8 chars, 1 uppercase, 1 number" />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password *</label>
                  <input id="reg-confirm-password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required className="input-field" placeholder="Repeat password" />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword[0]}</p>}
                </div>

                {message && status === "error" && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{message}</div>
                )}

                <button type="submit" id="register-submit-btn" disabled={status === "loading"} className="btn-primary w-full py-3.5 text-base mt-2 disabled:opacity-60">
                  {status === "loading" ? "Creating Account..." : "Create Account"}
                </button>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-emerald-700 font-semibold hover:underline">Sign In</Link>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
