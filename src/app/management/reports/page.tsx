"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { MANAGEMENT_NAV_ITEMS } from "@/components/portal/managementNav";
import { ArrowRight, CaretDown, CaretUp } from "@phosphor-icons/react";

interface ReportRow {
  id: string;
  type: string;
  scope_level: string;
  status: string;
  period_start: string;
  period_end: string;
  return_reason: string | null;
  content: { notes?: string };
  submitter: { id: string; full_name: string };
  country: { id: string; name: string } | null;
  child_reports: { id: string; status: string; submitter: { full_name: string } }[];
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-yellow-100 text-yellow-800",
  verified: "bg-emerald-100 text-emerald-800",
  returned: "bg-red-100 text-red-700",
  consolidated: "bg-blue-100 text-blue-700",
};

export default function ManagementReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [returnDrafts, setReturnDrafts] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    fetch("/api/reports")
      .then((r) => r.json())
      .then((res) => setReports(res.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const countryReports = reports.filter((r) => r.scope_level === "country");

  const verify = async (id: string) => {
    await fetch(`/api/reports/${id}/verify`, { method: "PATCH" });
    load();
  };

  const returnReport = async (id: string) => {
    const reason = returnDrafts[id];
    if (!reason || reason.trim().length < 5) return;
    await fetch(`/api/reports/${id}/return`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ return_reason: reason }),
    });
    load();
  };

  return (
    <PortalShell roleLabel="Management" navItems={MANAGEMENT_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Control
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Reports.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Country reports consolidated by supervisors, with the full escalation trail from recruiter to country to
        here — verify to close the loop, or return for correction.
      </p>

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : countryReports.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No country reports submitted yet.</div>
      ) : (
        <div className="space-y-3">
          {countryReports.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-midnight-900">{r.country?.name ?? "—"}</span>
                    <span className="text-midnight-900/30 text-xs">·</span>
                    <span className="text-xs text-midnight-900/50 capitalize">{r.type} report</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-xs text-midnight-900/45">
                    Submitted by {r.submitter.full_name} · {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                  </div>
                </div>
                {r.status === "submitted" && (
                  <button onClick={() => verify(r.id)} className="text-xs font-semibold text-emerald-600 hover:underline shrink-0">Verify</button>
                )}
              </div>

              {r.content?.notes && <p className="text-sm text-midnight-900/70 mt-3">{r.content.notes}</p>}

              <button
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="inline-flex items-center gap-1 text-xs text-gold-600 hover:underline mt-3"
              >
                {expanded === r.id ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
                Escalation trail ({r.child_reports.length} recruiter report{r.child_reports.length === 1 ? "" : "s"})
              </button>

              {expanded === r.id && (
                <div className="mt-3 bg-ivory-100 rounded-lg p-4 space-y-2">
                  {r.child_reports.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-xs text-midnight-900/60">
                      <span className="font-medium">{c.submitter.full_name}</span>
                      <ArrowRight size={11} weight="bold" />
                      <span>{r.submitter.full_name}</span>
                      <ArrowRight size={11} weight="bold" />
                      <span>Management</span>
                      <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                    </div>
                  ))}
                  {r.child_reports.length === 0 && <p className="text-xs text-midnight-900/40">No recruiter reports linked.</p>}
                </div>
              )}

              {r.status === "submitted" && (
                <div className="flex items-center gap-2 mt-3">
                  <textarea
                    placeholder="Reason for return…"
                    value={returnDrafts[r.id] ?? ""}
                    onChange={(e) => setReturnDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    rows={1}
                    className="input-field text-xs flex-1"
                  />
                  <button onClick={() => returnReport(r.id)} className="btn-secondary py-2 px-3 text-xs shrink-0">Return</button>
                </div>
              )}
              {r.status === "returned" && r.return_reason && (
                <div className="text-xs text-red-500 mt-3"><span className="font-semibold">Returned:</span> {r.return_reason}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
