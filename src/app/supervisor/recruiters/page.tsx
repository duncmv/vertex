"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { SUPERVISOR_NAV_ITEMS } from "@/components/portal/supervisorNav";
import { CaretRight } from "@phosphor-icons/react";

interface RecruiterRow {
  id: string;
  full_name: string;
  email: string;
  candidatesTotal: number;
  conversionRate: number;
  lastReportAt: string | null;
}

export default function SupervisorRecruitersPage() {
  const [recruiters, setRecruiters] = useState<RecruiterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/supervisor/recruiters")
      .then((r) => r.json())
      .then((res) => setRecruiters(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell roleLabel="Country Supervisor" navItems={SUPERVISOR_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Agent network
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Recruiters.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Every recruiter under you, all-time candidates sourced, and conversion rate. Click into a recruiter
        to set their target, review their reports, and leave them a note.
      </p>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : recruiters.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No recruiters assigned to you yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-midnight-900/10 text-left text-midnight-900/40 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Candidates (all time)</th>
                <th className="px-5 py-3 font-semibold">Conversion rate</th>
                <th className="px-5 py-3 font-semibold">Last report</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {recruiters.map((r) => (
                <tr key={r.id} className="border-b border-midnight-900/5 last:border-0 hover:bg-ivory-100/60">
                  <td className="px-5 py-4">
                    <Link href={`/supervisor/recruiters/${r.id}`} className="font-medium text-midnight-900 hover:underline">
                      {r.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-midnight-900/60">{r.email}</td>
                  <td className="px-5 py-4 text-midnight-900/70">{r.candidatesTotal}</td>
                  <td className="px-5 py-4 text-midnight-900/70">{r.conversionRate}%</td>
                  <td className="px-5 py-4 text-midnight-900/60">
                    {r.lastReportAt ? new Date(r.lastReportAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/supervisor/recruiters/${r.id}`} className="text-gold-600 inline-flex items-center gap-1 text-xs font-semibold hover:underline">
                      View <CaretRight size={12} weight="bold" />
                    </Link>
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
