"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { MANAGEMENT_NAV_ITEMS } from "@/components/portal/managementNav";
import DocumentLink from "@/components/DocumentLink";
import DocumentVerifyControls from "@/components/DocumentVerifyControls";
import SearchableSelect from "@/components/SearchableSelect";
import Pagination from "@/components/Pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/usePagination";

interface CandidateDocument { id: string; type: string; verification_status: string; }

interface Application {
  id: string;
  application_status: string;
  submitted_at: string;
  candidate: { full_name: string | null; documents: CandidateDocument[]; user: { full_name: string; email: string } | null };
  job: { title: string } | null;
  preferred_country_1: { name: string } | null;
  preferred_sector: { name: string } | null;
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/applications?page=${page}&pageSize=${pageSize}`)
      .then((r) => r.json())
      .then((res) => {
        setApplications(res.data ?? []);
        setTotal(res.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
    <PortalShell roleLabel="Management" navItems={MANAGEMENT_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Recruitment
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-8">Job Applications.</h1>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : total === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No applications yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-midnight-900/40 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold">Candidate</th>
                <th className="px-5 py-3 font-semibold">Programme</th>
                <th className="px-5 py-3 font-semibold">Documents</th>
                <th className="px-5 py-3 font-semibold">Status Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-midnight-900/5 last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium text-midnight-900">{app.candidate.user?.full_name ?? app.candidate.full_name ?? "— unnamed lead —"}</div>
                    {app.candidate.user?.email && <div className="text-midnight-900/45 text-xs">{app.candidate.user.email}</div>}
                    <div className="text-midnight-900/35 text-xs mt-1">Applied: {new Date(app.submitted_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-5 py-4 text-midnight-900 font-medium">
                    {app.job ? app.job.title : (
                      <>
                        {app.preferred_sector?.name ?? "General Programme"}
                        {app.preferred_country_1 && <div className="text-xs text-midnight-900/45 font-normal">{app.preferred_country_1.name}</div>}
                      </>
                    )}
                  </td>
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
                      <SearchableSelect
                        value={app.application_status}
                        onChange={(value) => handleStatusChange(app.id, value)}
                        className="input-field py-2 text-xs w-40"
                        options={[
                          { value: "submitted", label: "Submitted" },
                          { value: "under_review", label: "Under Review" },
                          { value: "interview", label: "Interview" },
                          { value: "rejected", label: "Rejected" },
                          { value: "approved", label: "Approved (Hired)" },
                        ]}
                      />
                      <Link href={`/management/applications/${app.id}`} className="text-xs text-gold-600 hover:underline font-medium">
                        Detailed View & Notes →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={pageSize} />
          </div>
        </div>
      )}
    </PortalShell>
  );
}
