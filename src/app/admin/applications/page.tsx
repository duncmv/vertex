"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { ADMIN_NAV_ITEMS } from "@/components/portal/adminNav";
import DocumentLink from "@/components/DocumentLink";
import DocumentVerifyControls from "@/components/DocumentVerifyControls";

interface CandidateDocument { id: string; type: string; verification_status: string; }

interface Application {
  id: string;
  application_status: string;
  submitted_at: string;
  candidate: { documents: CandidateDocument[]; user: { full_name: string; email: string } };
  job: { title: string };
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((res) => setApplications(Array.isArray(res) ? res : []))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    const res = await fetch(`/api/applications/${appId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_status: newStatus }),
    });
    if (res.ok) {
      setApplications((prev) => prev.map((app) => (app.id === appId ? { ...app, application_status: newStatus } : app)));
    }
  };

  return (
    <PortalShell roleLabel="System Administrator" navItems={ADMIN_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Recruitment
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-8">Job Applications.</h1>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : applications.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No applications yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-midnight-900/40 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold">Candidate</th>
                <th className="px-5 py-3 font-semibold">Job Applied</th>
                <th className="px-5 py-3 font-semibold">Documents</th>
                <th className="px-5 py-3 font-semibold">Status Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-midnight-900/5 last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium text-midnight-900">{app.candidate.user.full_name}</div>
                    <div className="text-midnight-900/45 text-xs">{app.candidate.user.email}</div>
                    <div className="text-midnight-900/35 text-xs mt-1">Applied: {new Date(app.submitted_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-5 py-4 text-midnight-900 font-medium">{app.job.title}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      {(["cv", "passport"] as const).map((type) => {
                        const doc = app.candidate.documents.find((d) => d.type === type);
                        const label = type === "cv" ? "📄 View CV" : "🛂 View Passport";
                        if (!doc) {
                          return (
                            <span key={type} className="text-midnight-900/35 text-xs">
                              {type === "cv" ? "📄 No CV" : "🛂 No Passport"}
                            </span>
                          );
                        }
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <DocumentLink documentId={doc.id} label={label} className="text-gold-600 hover:underline text-xs flex items-center gap-1" />
                            <DocumentVerifyControls documentId={doc.id} initialStatus={doc.verification_status} />
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-2">
                      <select
                        value={app.application_status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className="input-field py-2 text-xs w-40"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="interview">Interview</option>
                        <option value="rejected">Rejected</option>
                        <option value="approved">Approved (Hired)</option>
                      </select>
                      <Link href={`/admin/applications/${app.id}`} className="text-xs text-gold-600 hover:underline font-medium">
                        Detailed View & Notes →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}
