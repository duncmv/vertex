"use client";

import { useEffect, useState } from "react";
import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import CandidateList from "@/components/portal/CandidateList";
import { Gauge } from "@phosphor-icons/react";

const NAV_ITEMS: PortalNavItem[] = [{ href: "/management", label: "Overview", icon: Gauge }];

interface CandidateRow {
  lifecycle_status: string;
}

export default function ManagementPortalPage() {
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number> } | null>(null);

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then((res) => {
        const rows: CandidateRow[] = res.data ?? [];
        const byStatus: Record<string, number> = {};
        for (const row of rows) {
          byStatus[row.lifecycle_status] = (byStatus[row.lifecycle_status] ?? 0) + 1;
        }
        setStats({ total: rows.length, byStatus });
      })
      .catch(() => {});
  }, []);

  return (
    <PortalShell roleLabel="Management" navItems={NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Control
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Management overview.</h1>
      <p className="text-midnight-900/55 font-light mb-10 max-w-2xl">
        Every candidate across every region and country. Full KPI dashboards (targets vs. actuals, conversion rates,
        campaign tracking) and reporting cycles arrive in Phase 3 — this is the real, unfiltered data those will be
        built on.
      </p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
          <div className="card p-6">
            <div className="text-3xl font-semibold text-midnight-900">{stats.total}</div>
            <div className="text-xs text-midnight-900/45 uppercase tracking-wider mt-1">Total candidates</div>
          </div>
          {["identified", "guided_to_apply", "submitted", "approved"].map((status) => (
            <div key={status} className="card p-6">
              <div className="text-3xl font-semibold text-midnight-900">{stats.byStatus[status] ?? 0}</div>
              <div className="text-xs text-midnight-900/45 uppercase tracking-wider mt-1 capitalize">
                {status.replace(/_/g, " ")}
              </div>
            </div>
          ))}
        </div>
      )}

      <CandidateList emptyLabel="No candidates in the system yet." showStatusControls={false} />
    </PortalShell>
  );
}
