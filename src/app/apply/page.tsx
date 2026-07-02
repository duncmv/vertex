"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  country: string;
  city: string;
}

function ApplyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("job") || "";

  const [job, setJob] = useState<Job | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (jobId) {
      fetch(`/api/jobs/${jobId}`)
        .then((r) => r.json())
        .then((j) => setJob(j))
        .catch(() => {});
    }
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, cover_letter: coverLetter }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus("success");
      setMessage("Application submitted successfully! We will be in touch soon.");
    } else if (res.status === 401) {
      router.push(`/auth/login?redirect=/apply?job=${jobId}`);
    } else {
      setStatus("error");
      setMessage(data.error || "Failed to submit application.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Special Hungary Jobs Banner */}
      <div className="mb-6 bg-gradient-to-r from-[#104F36] to-[#1CA36A] rounded-xl p-6 text-white shadow-[0_10px_20px_rgba(28,163,106,0.2)] flex flex-col sm:flex-row items-center justify-between overflow-hidden relative border border-[#1CA36A]/30">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
         <div className="relative z-10 space-y-2 mb-6 sm:mb-0">
           <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-1">HOT REQUIREMENT 2026</div>
           <h2 className="text-2xl font-black tracking-tight">Hungary Industrial Jobs</h2>
           <p className="text-emerald-50 text-sm max-w-[280px] leading-relaxed opacity-90">
             Fast-track application for factory and industrial workers in Hungary. Form takes 2 mins.
           </p>
         </div>
         <Link href="/apply/hungary" className="relative z-10 bg-white text-[#104F36] hover:bg-[#EEF8F3] font-bold px-7 py-3.5 rounded-lg shadow-xl whitespace-nowrap transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-wide flex items-center gap-2">
            Open Form <span className="text-lg leading-none">→</span>
         </Link>
      </div>

      {/* Special Greece Jobs Banner */}
      <div className="mb-10 bg-gradient-to-r from-[#103E5C] to-[#1A7B9B] rounded-xl p-6 text-white shadow-[0_10px_20px_rgba(26,123,155,0.2)] flex flex-col sm:flex-row items-center justify-between overflow-hidden relative border border-[#1A7B9B]/30">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
         <div className="relative z-10 space-y-2 mb-6 sm:mb-0">
           <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-1">NEW OPPORTUNITY 2026</div>
           <h2 className="text-2xl font-black tracking-tight">Greece Hospitality & Labor</h2>
           <p className="text-cyan-50 text-sm max-w-[280px] leading-relaxed opacity-90">
             Urgent requirement for hospitality and general labor sectors in Greece. Open now.
           </p>
         </div>
         <Link href="/apply/greece" className="relative z-10 bg-white text-[#103E5C] hover:bg-cyan-50 font-bold px-7 py-3.5 rounded-lg shadow-xl whitespace-nowrap transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-wide flex items-center gap-2">
            Open Form <span className="text-lg leading-none">→</span>
         </Link>
      </div>

      <div className="card p-8">
        <h1 className="text-2xl font-black text-slate-800 mb-2">Apply for a Position</h1>
        {job ? (
          <p className="text-slate-500 mb-6">
            Applying for: <strong className="text-emerald-700">{job.title}</strong> — {job.city}, {job.country}
          </p>
        ) : (
          <p className="text-slate-500 mb-6">
            No job selected.{" "}
            <Link href="/jobs" className="text-emerald-700 underline">Browse open jobs →</Link>
          </p>
        )}

        {status === "success" ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="font-bold text-green-800 text-lg mb-1">Application Submitted!</h2>
            <p className="text-green-700 text-sm mb-4">{message}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/jobs" className="btn-secondary text-sm py-2 px-4">Browse More Jobs</Link>
              <Link href="/dashboard" className="btn-primary text-sm py-2 px-4">View Dashboard</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cover Letter <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={7}
                placeholder="Tell us why you're a great fit for this role..."
                className="input-field resize-none"
              />
            </div>

            {message && status === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={!jobId || status === "loading"}
              id="submit-application-btn"
              className="btn-gold w-full text-base py-3.5 disabled:opacity-60"
            >
              {status === "loading" ? "Submitting..." : "Submit Application"}
            </button>

            <p className="text-center text-xs text-slate-400">
              By applying you agree to our{" "}
              <Link href="/terms" className="underline">Terms of Service</Link>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-gradient-to-br from-emerald-950 to-emerald-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-black mb-2">Apply Now</h1>
          <p className="text-emerald-200">Take the next step in your international career</p>
        </div>
      </section>
      <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading...</div>}>
        <ApplyForm />
      </Suspense>
    </div>
  );
}
