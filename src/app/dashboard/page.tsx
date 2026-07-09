"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import CandidateCaseCard from "@/components/CandidateCaseCard";
import CandidateProfileForm from "@/components/CandidateProfileForm";
import {
  ClipboardText,
  FileText,
  IdentificationCard,
  CheckCircle,
  XCircle,
  UploadSimple,
  Tray,
  Receipt,
  MapPin,
  ArrowRight,
} from "@phosphor-icons/react";

interface Application {
  id: string;
  application_status: string;
  submitted_at: string;
  job: { id: string; title: string; country: string; city: string; salary_range?: string } | null;
  preferred_country_1: { name: string } | null;
  preferred_sector: { name: string } | null;
}

interface Profile {
  id: string;
  documents: { id: string; type: string; verification_status: string }[];
  passport_number?: string | null;
  nationality?: string | null;
  second_nationality?: string | null;
  date_of_birth?: string | null;
  passport_expiry?: string | null;
  current_occupation?: string | null;
  highest_education?: string | null;
  home_address?: string | null;
  whatsapp_number?: string | null;
  marital_status?: string | null;
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
    <div className="min-h-screen flex items-center justify-center bg-ivory-50">
      <div className="w-10 h-10 border-4 border-midnight-900/15 border-t-midnight-700 rounded-full animate-spin" />
    </div>
  );

  const hasCv = profile?.documents.some((d) => d.type === "cv") ?? false;
  const hasPassport = profile?.documents.some((d) => d.type === "passport") ?? false;

  return (
    <div className="bg-ivory-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-midnight-900/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2">
              <span className="eyebrow-rule" />
              My Account
            </p>
            <h1 className="section-title text-3xl md:text-4xl">My Dashboard</h1>
            <p className="text-midnight-900/55 text-sm mt-2 font-light">Welcome back, {profile?.user.full_name ?? "Candidate"}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/jobs" className="btn-secondary text-xs py-2.5 px-5">Browse Jobs</Link>
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
            { label: "Applications", value: profile?._count.applications ?? 0, icon: ClipboardText },
            { label: "CV Uploaded", value: hasCv ? "Yes" : "No", icon: FileText, ok: hasCv },
            { label: "Passport Scan", value: hasPassport ? "Yes" : "No", icon: IdentificationCard, ok: hasPassport },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-midnight-950/5 flex items-center justify-center shrink-0">
                  <Icon size={22} weight="regular" className="text-midnight-800" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-semibold text-midnight-900">{stat.value}</span>
                    {"ok" in stat && (
                      stat.ok
                        ? <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                        : <XCircle size={18} weight="fill" className="text-red-400" />
                    )}
                  </div>
                  <div className="text-midnight-900/50 text-sm">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Personal Information (Candidate Information Form Section 2) */}
        {profile && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-midnight-900 mb-4 flex items-center gap-2">
              <IdentificationCard size={18} weight="regular" /> Personal Information
            </h2>
            <CandidateProfileForm
              initial={profile}
              onSaved={() => fetch("/api/candidates/profile").then((r) => r.json()).then((p) => !p.error && setProfile(p))}
            />
          </div>
        )}

        {/* Document Upload */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-midnight-900 mb-4 flex items-center gap-2">
            <UploadSimple size={18} weight="regular" /> Upload Documents
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {(["cv", "passport"] as const).map((type) => {
              const Icon = type === "cv" ? FileText : IdentificationCard;
              return (
                <label key={type} className="border-2 border-dashed border-midnight-900/15 rounded-xl p-6 text-center cursor-pointer hover:border-gold-400 hover:bg-gold-50/40 transition-colors group">
                  <Icon size={30} weight="regular" className="mx-auto mb-2 text-midnight-900/40 group-hover:text-gold-600" />
                  <div className="font-semibold text-midnight-800 group-hover:text-midnight-950">
                    Upload {type === "cv" ? "CV / Resume" : "Passport Scan"}
                  </div>
                  <div className="text-xs text-midnight-900/40 mt-1">PDF, JPG, PNG · Max 5MB</div>
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
              );
            })}
          </div>
        </div>

        <CandidateCaseCard />

        {/* Applications */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-midnight-900">My Applications</h2>
            <Link href="/jobs" className="text-sm text-gold-600 hover:underline">Browse More Jobs →</Link>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-10 text-midnight-900/40">
              <Tray size={36} weight="regular" className="mx-auto mb-3" />
              <p>No applications yet. <Link href="/jobs" className="text-gold-600 hover:underline">Browse Jobs</Link></p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-midnight-900/40 text-xs uppercase tracking-wider">
                  <tr className="border-b border-midnight-900/10">
                    <th className="px-5 py-3 font-semibold">Programme</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Applied On</th>
                    <th className="px-5 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} className="border-b border-midnight-900/5 last:border-0">
                      <td className="px-5 py-4">
                        {app.job ? (
                          <>
                            <div className="font-medium text-midnight-900 mb-1">{app.job.title}</div>
                            <div className="text-midnight-900/45 text-xs flex items-center gap-1">
                              <MapPin size={12} weight="regular" /> {app.job.city}, {app.job.country}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium text-midnight-900 mb-1">{app.preferred_sector?.name ?? "General Programme Application"}</div>
                            {app.preferred_country_1 && (
                              <div className="text-midnight-900/45 text-xs flex items-center gap-1">
                                <MapPin size={12} weight="regular" /> {app.preferred_country_1.name}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={app.application_status} /></td>
                      <td className="px-5 py-4 text-midnight-900/60">{new Date(app.submitted_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-right">
                        {app.job && (
                          <Link href={`/jobs/${app.job.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-gold-600 hover:underline">
                            View Job <ArrowRight size={14} weight="bold" />
                          </Link>
                        )}
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
            <h2 className="text-lg font-semibold text-midnight-900">Payment Receipts</h2>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-10 text-midnight-900/40">
              <Receipt size={36} weight="regular" className="mx-auto mb-3" />
              <p>No payment history found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-midnight-900/40 text-xs uppercase tracking-wider">
                  <tr className="border-b border-midnight-900/10">
                    <th className="px-5 py-3 font-semibold">Job Title</th>
                    <th className="px-5 py-3 font-semibold">Amount Paid</th>
                    <th className="px-5 py-3 font-semibold">Method</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold text-right">Transaction ID</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-midnight-900/5 last:border-0">
                      <td className="px-5 py-4 font-medium text-midnight-900">
                        {payment.job?.title || "Unknown Job"}
                      </td>
                      <td className="px-5 py-4 font-medium text-emerald-700">
                        ${payment.amount.toFixed(2)} USD
                      </td>
                      <td className="px-5 py-4 text-midnight-900/60 capitalize">
                        {payment.payment_method}
                      </td>
                      <td className="px-5 py-4 text-midnight-900/60">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-midnight-900/40 font-mono">
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
