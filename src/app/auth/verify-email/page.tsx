"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.message) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("An error occurred. Please try again.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-emerald-800 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto mb-6" />
            <h1 className="font-black text-slate-800 text-2xl">Verifying your email...</h1>
            <p className="text-slate-400 mt-2">Please wait</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="font-black text-slate-800 text-2xl mb-2">Email Verified!</h1>
            <p className="text-slate-500 mb-6">{message}</p>
            <Link href="/auth/login" className="btn-primary px-8">Sign In Now</Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="font-black text-slate-800 text-2xl mb-2">Verification Failed</h1>
            <p className="text-slate-500 mb-6">{message}</p>
            <Link href="/auth/login" className="btn-secondary px-8">Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-emerald-950 text-white">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
