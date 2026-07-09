"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { ADMIN_NAV_ITEMS } from "@/components/portal/adminNav";

interface Job {
  id: string;
  status: string;
}

interface Application {
  id: string;
  application_status: string;
  candidate: { full_name: string | null; user: { full_name: string } | null };
  job: { title: string } | null;
  preferred_sector: { name: string } | null;
}

export default function AdminOverviewPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [candidateCount, setCandidateCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/jobs?limit=50").then((r) => r.json()),
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/admin/candidates").then((r) => r.json()).catch(() => []),
    ])
      .then(([jRes, aRes, cRes]) => {
        setJobs(jRes.jobs || []);
        setApplications(Array.isArray(aRes) ? aRes : []);
        setCandidateCount(Array.isArray(cRes) ? cRes.length : 0);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell roleLabel="System Administrator" navItems={ADMIN_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Control
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-8">Overview.</h1>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            <div className="card p-6">
              <div className="text-xs text-gold-600 font-semibold uppercase tracking-wider mb-1">Active Jobs</div>
              <div className="text-3xl font-semibold text-midnight-900">{jobs.filter((j) => j.status === "active").length}</div>
            </div>
            <div className="card p-6">
              <div className="text-xs text-gold-600 font-semibold uppercase tracking-wider mb-1">Total Applications</div>
              <div className="text-3xl font-semibold text-midnight-900">{applications.length}</div>
            </div>
            <div className="card p-6">
              <div className="text-xs text-midnight-900/45 font-semibold uppercase tracking-wider mb-1">Registered Candidates</div>
              <div className="text-3xl font-semibold text-midnight-900">{candidateCount}</div>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <div className="p-5 border-b border-midnight-900/10">
              <h2 className="font-semibold text-midnight-900">Recent Applications</h2>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="text-midnight-900/40 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-semibold">Candidate</th>
                  <th className="px-5 py-3 font-semibold">Programme</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.slice(0, 5).map((app) => (
                  <tr key={app.id} className="border-b border-midnight-900/5 last:border-0">
                    <td className="px-5 py-4 font-medium text-midnight-900">{app.candidate.user?.full_name ?? app.candidate.full_name ?? "— unnamed lead —"}</td>
                    <td className="px-5 py-4 text-midnight-900/60">{app.job?.title ?? app.preferred_sector?.name ?? "General Programme"}</td>
                    <td className="px-5 py-4">
                      <span className={`badge-${app.application_status}`}>{app.application_status}</span>
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr><td colSpan={3} className="p-10 text-center text-midnight-900/40">No applications yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PortalShell>
  );
}
