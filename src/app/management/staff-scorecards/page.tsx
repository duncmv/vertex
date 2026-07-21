"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { MANAGEMENT_NAV_ITEMS } from "@/components/portal/managementNav";
import StaffScorecardPanel from "@/components/portal/StaffScorecardPanel";
import { CaretDown, CaretUp, UserCheck } from "@phosphor-icons/react";

interface StaffRow {
  id: string;
  full_name: string;
  assigned_country: { id: string; name: string } | null;
}

/**
 * Supervisory Reporting Framework §7 — Management/Director scoring an
 * In-House Supervisor. Unlike the Country Supervisor↔Regional Recruiter
 * and In-House↔Country Supervisor pairs (each naturally single, so their
 * scorecard panel is embedded directly into an existing detail page),
 * a Director oversees potentially many In-House Supervisors across many
 * countries, so this is its own list page.
 */
export default function ManagementStaffScorecardsPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users?role=inhouse_supervisor")
      .then((r) => r.json())
      .then((res) => setStaff(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell roleLabel="Management" navItems={MANAGEMENT_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Control
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Staff Scorecards.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Monthly Supervisory Performance Scorecards for each In-House Supervisor.
      </p>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : staff.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No In-House Supervisors on file yet.</div>
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <div key={s.id} className="card p-5">
              <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="flex items-center justify-between w-full text-left">
                <span className="flex items-center gap-2 font-medium text-midnight-900">
                  <UserCheck size={16} weight="bold" className="text-gold-600" />
                  {s.full_name}
                  <span className="text-xs text-midnight-900/40 font-normal">{s.assigned_country?.name ?? "No country assigned"}</span>
                </span>
                {expanded === s.id ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
              </button>
              {expanded === s.id && (
                <div className="mt-4 pt-4 border-t border-midnight-900/10">
                  <StaffScorecardPanel staffId={s.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
