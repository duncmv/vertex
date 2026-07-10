"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { PARTNER_NAV_ITEMS } from "@/components/portal/partnerNav";
import PartnerCandidateForm from "@/components/portal/PartnerCandidateForm";
import Pagination from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";
import { Plus, X } from "@phosphor-icons/react";

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-800",
  job_assigned: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

interface PartnerCandidateRow {
  id: string;
  full_name: string;
  email: string;
  status: string;
  submitted_at: string;
  preferred_country_1: { name: string } | null;
  preferred_sector: { name: string } | null;
}

// A partner's own candidate submissions (SRS FR-5.1) — this never shows
// Vertex's internal recruiter/screening pipeline, since these candidates
// don't go through it; the partner already handled that themselves.
export default function PartnerPortalPage() {
  const [candidates, setCandidates] = useState<PartnerCandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/partner/candidates")
      .then((r) => r.json())
      .then((res) => setCandidates(res.data ?? []))
      .catch(() => setError("Failed to load candidates."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const { page, setPage, totalPages, paged, total, pageSize } = usePagination(candidates);

  return (
    <PortalShell roleLabel="Partner" navItems={PARTNER_NAV_ITEMS}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="eyebrow mb-3">
            <span className="eyebrow-rule" />
            Partner Portal
          </p>
          <h1 className="section-title text-3xl md:text-4xl mb-2">My Candidates.</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs">
          <Plus size={16} weight="bold" /> Submit Candidate
        </button>
      </div>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Submit a candidate for a work permit and visa application. We review for completeness and confirm the
        programme/offer within 48 hours.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-8">{error}</div>}

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : candidates.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No candidates submitted yet — submit one above.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-midnight-900/10 text-left text-midnight-900/40 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Candidate</th>
                <th className="px-5 py-3 font-semibold">Preferred Programme</th>
                <th className="px-5 py-3 font-semibold">Type of Work</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.id} className="border-b border-midnight-900/5 last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium text-midnight-900">{c.full_name}</div>
                    <div className="text-xs text-midnight-900/45">{c.email}</div>
                  </td>
                  <td className="px-5 py-4 text-midnight-900/70">{c.preferred_country_1?.name ?? "—"}</td>
                  <td className="px-5 py-4 text-midnight-900/70">{c.preferred_sector?.name ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[c.status] ?? "bg-slate-100 text-slate-700"}`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-midnight-900/60">{new Date(c.submitted_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={pageSize} />
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[200] bg-midnight-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 sm:p-8 relative">
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-midnight-900/40 hover:text-midnight-900">
              <X size={20} weight="bold" />
            </button>
            <h2 className="text-xl font-black text-midnight-900 mb-1">Submit a Candidate</h2>
            <p className="text-sm text-midnight-900/50 mb-6">Every detail is checked against the candidate's passport and supporting documents.</p>
            <PartnerCandidateForm
              onSubmitted={() => {
                setShowForm(false);
                load();
              }}
            />
          </div>
        </div>
      )}
    </PortalShell>
  );
}
