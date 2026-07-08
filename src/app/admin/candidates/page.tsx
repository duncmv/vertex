"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { ADMIN_NAV_ITEMS } from "@/components/portal/adminNav";
import DocumentLink from "@/components/DocumentLink";
import DocumentVerifyControls from "@/components/DocumentVerifyControls";

interface CandidateDocument { id: string; type: string; verification_status: string; }

interface CandidateRow {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  country?: string;
  candidate?: {
    nationality?: string;
    documents?: CandidateDocument[];
    _count?: { applications: number };
  };
}

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/candidates")
      .then((r) => r.json())
      .then((res) => setCandidates(Array.isArray(res) ? res : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell roleLabel="System Administrator" navItems={ADMIN_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Recruitment
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-8">Candidates Pool.</h1>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : candidates.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No candidates registered yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-midnight-900/40 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold">Name & Contact</th>
                <th className="px-5 py-3 font-semibold">Nationality</th>
                <th className="px-5 py-3 font-semibold">Applications</th>
                <th className="px-5 py-3 font-semibold">Documents</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((cand) => (
                <tr key={cand.id} className="border-b border-midnight-900/5 last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium text-midnight-900">{cand.full_name}</div>
                    <div className="text-xs text-midnight-900/45">{cand.email} {cand.phone ? `• ${cand.phone}` : ""}</div>
                  </td>
                  <td className="px-5 py-4 text-midnight-900/70">{cand.candidate?.nationality || cand.country || "N/A"}</td>
                  <td className="px-5 py-4 font-medium text-midnight-900/70">{cand.candidate?._count?.applications || 0}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      {(["cv", "passport"] as const).map((type) => {
                        const doc = cand.candidate?.documents?.find((d) => d.type === type);
                        const label = type === "cv" ? "📄 CV" : "🛂 Passport";
                        if (!doc) return <span key={type} className="text-midnight-900/35 text-xs">{label.replace(/^\S+ /, "No ")}</span>;
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <DocumentLink documentId={doc.id} label={label} className="text-gold-600 hover:underline text-xs" />
                            <DocumentVerifyControls documentId={doc.id} initialStatus={doc.verification_status} />
                          </div>
                        );
                      })}
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
