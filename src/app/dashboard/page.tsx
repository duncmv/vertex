"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Application {
  id: string;
  application_status: string;
  submitted_at: string;
  job: { id: string; title: string; country: string; city: string; salary_range?: string };
}

interface Profile {
  id: string;
  cv_file?: string;
  passport_scan?: string;
  passport_number?: string;
  nationality?: string;
  _count: { applications: number };
  user: { full_name: string; email: string; phone?: string; country?: string };
}

interface Payment {
  id: string;
  amount: number;
  transaction_id: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  job: { title: string };
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    submitted: "badge-pending", under_review: "badge-under_review",
    interview: "badge-shortlisted", rejected: "badge-rejected", approved: "badge-hired",
  };
  return <span className={cls[status] ?? "badge bg-slate-100 text-slate-600"}>{status.replace("_", " ")}</span>;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/candidates/profile").then((r) => r.json()),
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/payments/me").then((r) => r.json()).catch(() => []), 
    ]).then(([p, a, payRes]) => {
      setProfile(p.error ? null : p);
      setApplications(Array.isArray(a) ? a : []);
      setPayments(Array.isArray(payRes) ? payRes : []);
      setLoading(false);
    }).catch(() => { setError("Failed to load dashboard."); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">My Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Welcome back, {profile?.user.full_name ?? "Candidate"}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/jobs" className="btn-secondary text-sm py-2 px-4">Browse Jobs</Link>
            <button
              onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }}
              className="text-sm text-red-500 hover:text-red-700 font-medium"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>}

        {/* Profile summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Applications", value: profile?._count.applications ?? 0, icon: "📋" },
            { label: "CV Uploaded", value: profile?.cv_file ? "✅ Yes" : "❌ No", icon: "📄" },
            { label: "Passport Scan", value: profile?.passport_scan ? "✅ Yes" : "❌ No", icon: "🛂" },
          ].map((stat) => (
            <div key={stat.label} className="card p-6 flex items-center gap-4">
              <div className="text-3xl">{stat.icon}</div>
              <div>
                <div className="text-2xl font-black text-slate-800">{stat.value}</div>
                <div className="text-slate-500 text-sm">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Document Upload */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">📎 Upload Documents</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {(["cv", "passport"] as const).map((type) => (
              <label key={type} className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors group">
                <div className="text-3xl mb-2">{type === "cv" ? "📄" : "🛂"}</div>
                <div className="font-semibold text-slate-700 group-hover:text-emerald-700">
                  Upload {type === "cv" ? "CV / Resume" : "Passport Scan"}
                </div>
                <div className="text-xs text-slate-400 mt-1">PDF, JPG, PNG · Max 5MB</div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append("file", file);
                    await fetch(`/api/upload?type=${type}`, { method: "POST", body: fd });
                    window.location.reload();
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Applications */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-800">My Applications</h2>
            <Link href="/jobs" className="text-sm text-emerald-700 hover:underline">Browse More Jobs →</Link>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <div className="text-4xl mb-3">📭</div>
              <p>No applications yet. <Link href="/jobs" className="text-emerald-700 hover:underline">Browse Jobs</Link></p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold rounded-tl-lg">Job Title & Location</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Applied On</th>
                    <th className="px-5 py-4 font-semibold text-right rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 mb-1">{app.job.title}</div>
                        <div className="text-slate-500 text-xs">📍 {app.job.city}, {app.job.country}</div>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={app.application_status} /></td>
                      <td className="px-5 py-4 text-slate-500">{new Date(app.submitted_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/jobs/${app.job.id}`} className="text-sm font-semibold text-emerald-600 hover:text-emerald-800 hover:underline">
                          View Job →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment History & Receipts */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-800">Payment Receipts</h2>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <div className="text-4xl mb-3">🧾</div>
              <p>No payment history found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold rounded-tl-lg">Job Title</th>
                    <th className="px-5 py-4 font-semibold">Amount Paid</th>
                    <th className="px-5 py-4 font-semibold">Method</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold text-right rounded-tr-lg">Transaction ID</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {payment.job?.title || "Unknown Job"}
                      </td>
                      <td className="px-5 py-4 font-medium text-emerald-600">
                        ${payment.amount.toFixed(2)} USD
                      </td>
                      <td className="px-5 py-4 text-slate-600 capitalize">
                        {payment.payment_method}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-slate-400 font-mono">
                        {payment.transaction_id || payment.id.substring(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
