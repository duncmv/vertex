"use client";

import { useEffect, useState } from "react";
import DocumentLink from "@/components/DocumentLink";

interface ApplicationRow {
  id: string;
  application_status: string;
  submitted_at: string;
  candidate: {
    full_name: string | null;
    user: { full_name: string; email: string } | null;
    recruiter: { id: string; full_name: string } | null;
    country: { id: string; name: string } | null;
    documents: { id: string; type: string; verification_status: string }[];
  };
  job: { title: string; country: string; city: string } | null;
  preferred_country_1: { name: string } | null;
  preferred_sector: { name: string } | null;
}

/**
 * Read-only application tracking for the recruiter/supervisor portals
 * (SRS FR-2.1 "guide and track applications") — scoped server-side
 * exactly like the candidate list. Status changes (interview/approved/
 * rejected) are In-House Supervisor/Director's controlling position
 * (/management/applications — Regional Supervisory Operational Workflow
 * p.5, "Approved by In-House"); this is visibility, not a second place
 * to edit from.
 */
export default function ApplicationsList({ emptyLabel }: { emptyLabel: string }) {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((res) => setApplications(Array.isArray(res) ? res : []))
      .catch(() => setError("Failed to load applications."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-midnight-900/50">Loading…</p>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>;
  if (applications.length === 0) return <div className="card p-10 text-center text-midnight-900/50">{emptyLabel}</div>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-midnight-900/10 text-left text-midnight-900/40 text-xs uppercase tracking-wider">
            <th className="px-5 py-3 font-semibold">Candidate</th>
            <th className="px-5 py-3 font-semibold">Programme</th>
            <th className="px-5 py-3 font-semibold">Recruiter</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Documents</th>
            <th className="px-5 py-3 font-semibold">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => {
            const name = a.candidate.user?.full_name ?? a.candidate.full_name ?? "— unnamed lead —";
            const contact = a.candidate.user?.email ?? "";
            return (
              <tr key={a.id} className="border-b border-midnight-900/5 last:border-0">
                <td className="px-5 py-4">
                  <div className="font-medium text-midnight-900">{name}</div>
                  <div className="text-xs text-midnight-900/45">{contact}</div>
                </td>
                <td className="px-5 py-4 text-midnight-900/70">
                  {a.job ? (
                    <>
                      <div>{a.job.title}</div>
                      <div className="text-xs text-midnight-900/45">{a.job.city}, {a.job.country}</div>
                    </>
                  ) : (
                    <>
                      <div>{a.preferred_sector?.name ?? "General Programme"}</div>
                      {a.preferred_country_1 && <div className="text-xs text-midnight-900/45">{a.preferred_country_1.name}</div>}
                    </>
                  )}
                </td>
                <td className="px-5 py-4 text-midnight-900/70">{a.candidate.recruiter?.full_name ?? "—"}</td>
                <td className="px-5 py-4">
                  <span className={`badge-${a.application_status}`}>{a.application_status.replace(/_/g, " ")}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1 items-start">
                    {a.candidate.documents.length === 0 && <span className="text-xs text-midnight-900/35">None</span>}
                    {a.candidate.documents.map((d) => (
                      <DocumentLink key={d.id} documentId={d.id} label={d.type} className="text-xs text-gold-600 hover:underline capitalize" />
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4 text-midnight-900/60">{new Date(a.submitted_at).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
