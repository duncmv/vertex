"use client";

import { useEffect, useState } from "react";
import DocumentLink from "@/components/DocumentLink";

const STATUS_STYLES: Record<string, string> = {
  identified: "bg-slate-100 text-slate-700",
  screened: "bg-blue-100 text-blue-700",
  guided_to_apply: "bg-purple-100 text-purple-700",
  submitted: "bg-yellow-100 text-yellow-800",
  reported: "bg-orange-100 text-orange-700",
  verified: "bg-teal-100 text-teal-700",
  approved: "bg-emerald-100 text-emerald-800",
};

interface CandidateRow {
  id: string;
  source: string;
  lifecycle_status: string;
  nationality: string | null;
  created_at: string;
  user: { full_name: string; email: string } | null;
  recruiter: { id: string; full_name: string } | null;
  country: { id: string; name: string } | null;
  documents: { id: string; type: string; verification_status: string }[];
}

/** Shared candidate table for the recruiter/supervisor/management portals — each scoped server-side by role. */
export default function CandidateList({ emptyLabel }: { emptyLabel: string }) {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then((res) => setCandidates(res.data ?? []))
      .catch(() => setError("Failed to load candidates."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-midnight-900/50">Loading…</p>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>;
  if (candidates.length === 0) return <div className="card p-10 text-center text-midnight-900/50">{emptyLabel}</div>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-midnight-900/10 text-left text-midnight-900/40 text-xs uppercase tracking-wider">
            <th className="px-5 py-3 font-semibold">Candidate</th>
            <th className="px-5 py-3 font-semibold">Country</th>
            <th className="px-5 py-3 font-semibold">Recruiter</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Documents</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id} className="border-b border-midnight-900/5 last:border-0">
              <td className="px-5 py-4">
                <div className="font-medium text-midnight-900">{c.user?.full_name ?? "— not yet registered —"}</div>
                <div className="text-xs text-midnight-900/45">{c.user?.email ?? c.nationality ?? ""}</div>
              </td>
              <td className="px-5 py-4 text-midnight-900/70">{c.country?.name ?? "—"}</td>
              <td className="px-5 py-4 text-midnight-900/70">{c.recruiter?.full_name ?? "—"}</td>
              <td className="px-5 py-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[c.lifecycle_status] ?? "bg-slate-100 text-slate-700"}`}>
                  {c.lifecycle_status.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-col gap-1 items-start">
                  {c.documents.length === 0 && <span className="text-xs text-midnight-900/35">None</span>}
                  {c.documents.map((d) => (
                    <DocumentLink key={d.id} documentId={d.id} label={d.type} className="text-xs text-gold-600 hover:underline capitalize" />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
