"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminSettings from "@/components/AdminSettings";
import DocumentLink from "@/components/DocumentLink";

interface Job {
  id: string; title: string; status: string; created_at: string;
  _count: { applications: number };
}

interface CandidateDocument { id: string; type: string; }

interface Application {
  id: string; application_status: string; submitted_at: string;
  candidate: { documents: CandidateDocument[]; user: { full_name: string; email: string } };
  job: { title: string };
}

interface Payment {
  id: string; amount: number; transaction_id: string; payment_method: string;
  payment_status: string; created_at: string;
  user: { full_name: string; email: string };
  job: { title: string };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "applications" | "candidates" | "finances" | "settings">("overview");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/jobs?limit=50").then((r) => r.json()),
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/payments/admin").then((r) => r.json()).catch(() => []),
      fetch("/api/admin/candidates").then((r) => r.json()).catch(() => []),
    ]).then(([jRes, aRes, pRes, cRes]) => {
      setJobs(jRes.jobs || []);
      setApplications(Array.isArray(aRes) ? aRes : []);
      setPayments(Array.isArray(pRes) ? pRes : []);
      setCandidates(Array.isArray(cRes) ? cRes : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    const res = await fetch(`/api/applications/${appId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_status: newStatus }),
    });
    if (res.ok) {
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, application_status: newStatus } : app))
      );
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job? All associated applications will crash if not cascaded.")) return;
    const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    if (res.ok) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } else {
      alert("Failed to delete job.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  if (loading) return <div className="p-20 text-center">Loading Admin Dashboard...</div>;

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Admin Portal</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "overview" ? "bg-emerald-600" : "hover:bg-slate-800"}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("jobs")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "jobs" ? "bg-emerald-600" : "hover:bg-slate-800"}`}
              >
                Jobs
              </button>
              <button
                onClick={() => setActiveTab("applications")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "applications" ? "bg-emerald-600" : "hover:bg-slate-800"}`}
              >
                Applications
              </button>
              <button
                onClick={() => setActiveTab("candidates")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "candidates" ? "bg-emerald-600" : "hover:bg-slate-800"}`}
              >
                Candidates
              </button>
              <button
                onClick={() => setActiveTab("finances")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "finances" ? "bg-emerald-600" : "hover:bg-slate-800"}`}
              >
                Finances
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "settings" ? "bg-purple-600" : "hover:bg-slate-800"}`}
              >
                Settings
              </button>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:bg-slate-800 px-3 py-1.5 rounded-md">Log Out</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 border border-emerald-100 bg-emerald-50">
                <div className="text-emerald-800 font-bold mb-1">Active Jobs</div>
                <div className="text-3xl font-black text-emerald-600">{jobs.filter(j => j.status === 'active').length}</div>
              </div>
              <div className="card p-6 border border-emerald-100 bg-emerald-50">
                <div className="text-emerald-800 font-bold mb-1">Total Applications</div>
                <div className="text-3xl font-black text-emerald-600">{applications.length}</div>
              </div>
              <div className="card p-6 border border-slate-200">
                <div className="text-slate-600 font-bold mb-1">Registered Candidates</div>
                <div className="text-3xl font-black text-slate-800">{candidates.length}</div>
              </div>
            </div>
            
            <div className="card shadow-sm">
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">Recent Applications</h2>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Candidate</th>
                    <th className="px-5 py-3 font-semibold">Job Applied</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.slice(0, 5).map((app) => (
                    <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-800">{app.candidate.user.full_name}</td>
                      <td className="px-5 py-4 text-slate-600">{app.job.title}</td>
                      <td className="px-5 py-4"><span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded-full">{app.application_status}</span></td>
                    </tr>
                  ))}
                  {applications.length === 0 && (
                    <tr><td colSpan={3} className="p-10 text-center text-slate-400">No applications yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "candidates" && (
          <div className="card shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Candidates Pool</h2>
            </div>
            {candidates.length === 0 ? (
               <div className="p-10 text-center text-slate-400">No candidates registered yet.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name & Contact</th>
                    <th className="px-5 py-3 font-semibold">Nationality</th>
                    <th className="px-5 py-3 font-semibold">Applications</th>
                    <th className="px-5 py-3 font-semibold">Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((cand) => (
                    <tr key={cand.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">{cand.full_name}</div>
                        <div className="text-xs text-slate-500">{cand.email} {cand.phone ? `• ${cand.phone}` : ''}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{cand.candidate?.nationality || cand.country || 'N/A'}</td>
                      <td className="px-5 py-4 font-medium text-slate-600">{cand.candidate?._count?.applications || 0}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          {cand.candidate?.documents?.find((d: CandidateDocument) => d.type === "cv") ? (
                            <DocumentLink
                              documentId={cand.candidate.documents.find((d: CandidateDocument) => d.type === "cv").id}
                              label="📄 CV"
                              className="text-emerald-600 hover:underline text-xs"
                            />
                          ) : <span className="text-slate-400 text-xs">📄 No CV</span>}
                          {cand.candidate?.documents?.find((d: CandidateDocument) => d.type === "passport") ? (
                            <DocumentLink
                              documentId={cand.candidate.documents.find((d: CandidateDocument) => d.type === "passport").id}
                              label="🛂 Passport"
                              className="text-emerald-600 hover:underline text-xs"
                            />
                          ) : <span className="text-slate-400 text-xs">🛂 No Passport</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "jobs" && (
          <div className="card shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Manage Jobs</h2>
              <button 
                className="btn-primary py-2 px-4 text-sm" 
                onClick={() => router.push("/admin/jobs/new")}
              >
                + Post New Job
              </button>
            </div>
            {jobs.length === 0 ? (
               <div className="p-10 text-center text-slate-400">No jobs posted yet.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Job Title & Location</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Applicants</th>
                    <th className="px-5 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">{job.title}</div>
                        <div className="text-xs text-slate-500">Posted {new Date(job.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-5 py-4"><span className={`badge-${job.status}`}>{job.status}</span></td>
                      <td className="px-5 py-4 font-medium text-slate-600">{job._count?.applications || 0} applied</td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/jobs/${job.id}`} target="_blank" className="text-emerald-600 hover:underline mr-4 font-medium text-xs">
                          View
                        </Link>
                        <Link href={`/admin/jobs/${job.id}/edit`} className="text-slate-600 hover:text-emerald-600 hover:underline mr-4 font-medium text-xs">
                          Edit
                        </Link>
                        <button 
                          onClick={() => handleDeleteJob(job.id)}
                          className="text-red-500 hover:text-red-700 hover:underline font-medium text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        
        {activeTab === "applications" && (
          <div className="card shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Job Applications</h2>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Candidate</th>
                  <th className="px-5 py-3 font-semibold">Job Applied</th>
                  <th className="px-5 py-3 font-semibold">Documents</th>
                  <th className="px-5 py-3 font-semibold">Status Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{app.candidate.user.full_name}</div>
                      <div className="text-slate-500 text-xs">{app.candidate.user.email}</div>
                      <div className="text-slate-400 text-xs mt-1">Applied: {new Date(app.submitted_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-800 font-medium">{app.job.title}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2 items-start">
                        {app.candidate.documents.find((d) => d.type === "cv") ? (
                          <DocumentLink
                            documentId={app.candidate.documents.find((d) => d.type === "cv")!.id}
                            label="📄 View CV"
                            className="text-emerald-600 hover:underline text-xs flex items-center gap-1"
                          />
                        ) : <span className="text-slate-400 text-xs group-hover:text-red-500 transition-colors">📄 No CV</span>}

                        {app.candidate.documents.find((d) => d.type === "passport") ? (
                          <DocumentLink
                            documentId={app.candidate.documents.find((d) => d.type === "passport")!.id}
                            label="🛂 View Passport"
                            className="text-emerald-600 hover:underline text-xs flex items-center gap-1"
                          />
                        ) : <span className="text-slate-400 text-xs group-hover:text-red-500 transition-colors">🛂 No Passport</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 flex flex-col gap-2">
                      <select
                        value={app.application_status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-3 py-1.5 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm
                          ${app.application_status === "submitted" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                            app.application_status === "approved" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                            app.application_status === "rejected" ? "bg-red-100 text-red-800 border-red-200" :
                            app.application_status === "interview" ? "bg-green-100 text-green-800 border-green-200" :
                            "bg-emerald-100 text-emerald-800 border-emerald-200"
                          }
                        `}
                      >
                        <option value="submitted" className="bg-white text-slate-800">Submitted</option>
                        <option value="under_review" className="bg-white text-slate-800">Under Review</option>
                        <option value="interview" className="bg-white text-slate-800">Interview</option>
                        <option value="rejected" className="bg-white text-slate-800">Rejected</option>
                        <option value="approved" className="bg-white text-slate-800">Approved (Hired)</option>
                      </select>
                      <Link href={`/admin/applications/${app.id}`} className="text-xs text-emerald-600 hover:underline font-medium">
                        Detailed View & Notes →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "finances" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 border border-emerald-100 bg-emerald-50">
                <div className="text-emerald-800 font-bold mb-1">Total Revenue</div>
                <div className="text-3xl font-black text-emerald-600">
                  ${payments.reduce((acc, p) => acc + (p.payment_status === "completed" ? p.amount : 0), 0).toFixed(2)}
                </div>
              </div>
              <div className="card p-6 border border-emerald-100 bg-emerald-50">
                <div className="text-emerald-800 font-bold mb-1">Total Transactions</div>
                <div className="text-3xl font-black text-emerald-600">{payments.length}</div>
              </div>
              <div className="card p-6 border border-slate-200">
                <div className="text-slate-600 font-bold mb-1">Pending Processing</div>
                <div className="text-3xl font-black text-slate-800">
                  {payments.filter(p => p.payment_status === "pending").length}
                </div>
              </div>
            </div>

            {/* Payments Table */}
            <div className="card shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Transaction History</h2>
              </div>
              {payments.length === 0 ? (
                <div className="p-10 text-center text-slate-400">No transactions recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">User details</th>
                        <th className="px-5 py-3 font-semibold">Job</th>
                        <th className="px-5 py-3 font-semibold text-right">Amount</th>
                        <th className="px-5 py-3 font-semibold">Gateway</th>
                        <th className="px-5 py-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <div className="font-bold text-slate-800">{p.user?.full_name}</div>
                            <div className="text-xs text-slate-500">{p.user?.email}</div>
                          </td>
                          <td className="px-5 py-3 text-slate-700">{p.job?.title}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`font-bold ${p.payment_status === 'completed' ? 'text-emerald-600' : 'text-slate-500'}`}>
                              ${p.amount.toFixed(2)}
                            </span>
                            <div className="text-[10px] uppercase text-slate-400">{p.payment_status}</div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="capitalize text-slate-600">{p.payment_method}</span>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[120px]" title={p.transaction_id}>
                              {p.transaction_id}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-500 text-xs">
                            {new Date(p.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "settings" && <AdminSettings />}
      </div>
    </div>
  );
}
