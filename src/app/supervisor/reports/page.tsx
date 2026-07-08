"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { SUPERVISOR_NAV_ITEMS } from "@/components/portal/supervisorNav";
import { Plus, Stack } from "@phosphor-icons/react";

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
  child_reports: { id: string; status: string; submitter: { full_name: string } }[];
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-yellow-100 text-yellow-800",
  verified: "bg-emerald-100 text-emerald-800",
  returned: "bg-red-100 text-red-700",
  consolidated: "bg-blue-100 text-blue-700",
};

export default function SupervisorReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returnDrafts, setReturnDrafts] = useState<Record<string, string>>({});
  const [showConsolidate, setShowConsolidate] = useState(false);
  const [consolidateForm, setConsolidateForm] = useState({ type: "weekly", period_start: "", period_end: "", notes: "" });
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/reports")
      .then((r) => r.json())
      .then((res) => setReports(res.data ?? []))
      .catch(() => setError("Failed to load reports."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const recruiterInbox = reports.filter((r) => r.scope_level === "recruiter" && r.status === "submitted");
  const verifiedForConsolidation = reports.filter((r) => r.scope_level === "recruiter" && r.status === "verified");
  const myCountryReports = reports.filter((r) => r.scope_level === "country");

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

  const toggleChild = (id: string) => {
    setSelectedChildren((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const submitConsolidated = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: consolidateForm.type,
          period_start: consolidateForm.period_start,
          period_end: consolidateForm.period_end,
          content: { notes: consolidateForm.notes },
          child_report_ids: selectedChildren,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to submit country report.");
      setConsolidateForm({ type: "weekly", period_start: "", period_end: "", notes: "" });
      setSelectedChildren([]);
      setShowConsolidate(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit country report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalShell roleLabel="Country Supervisor" navItems={SUPERVISOR_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Agent network
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Reports.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Verify or return your recruiters' submissions, then consolidate verified reports into a country report for
        In-House.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">{error}</div>}

      <h2 className="text-sm font-semibold text-midnight-900/50 uppercase tracking-wider mb-3">Awaiting your review</h2>
      {loading ? (
        <p className="text-midnight-900/50 mb-8">Loading…</p>
      ) : recruiterInbox.length === 0 ? (
        <div className="card p-6 text-center text-midnight-900/40 mb-8">Nothing awaiting review.</div>
      ) : (
        <div className="space-y-3 mb-8">
          {recruiterInbox.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="font-medium text-midnight-900">{r.submitter.full_name}</div>
                  <div className="text-xs text-midnight-900/45 capitalize">
                    {r.type} · {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => verify(r.id)} className="text-xs font-semibold text-emerald-600 hover:underline">Verify</button>
                </div>
              </div>
              {r.content?.notes && <p className="text-sm text-midnight-900/70 mb-3">{r.content.notes}</p>}
              <div className="flex items-center gap-2">
                <textarea
                  placeholder="Reason for return…"
                  value={returnDrafts[r.id] ?? ""}
                  onChange={(e) => setReturnDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  rows={1}
                  className="input-field text-xs flex-1"
                />
                <button onClick={() => returnReport(r.id)} className="btn-secondary py-2 px-3 text-xs shrink-0">Return</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-midnight-900/50 uppercase tracking-wider">Country reports (to In-House)</h2>
        <button onClick={() => setShowConsolidate((v) => !v)} className="btn-primary text-xs">
          <Plus size={14} weight="bold" /> Consolidate Report
        </button>
      </div>

      {showConsolidate && (
        <form onSubmit={submitConsolidated} className="card p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-midnight-900 flex items-center gap-2"><Stack size={16} weight="regular" /> New country report</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <select value={consolidateForm.type} onChange={(e) => setConsolidateForm({ ...consolidateForm, type: e.target.value })} className="input-field">
              <option value="weekly">Weekly country report</option>
              <option value="monthly">Monthly performance summary</option>
            </select>
            <input required type="date" value={consolidateForm.period_start} onChange={(e) => setConsolidateForm({ ...consolidateForm, period_start: e.target.value })} className="input-field" />
            <input required type="date" value={consolidateForm.period_end} onChange={(e) => setConsolidateForm({ ...consolidateForm, period_end: e.target.value })} className="input-field" />
          </div>

          <div>
            <div className="text-xs text-midnight-900/45 uppercase tracking-wider mb-2">Verified recruiter reports to include</div>
            {verifiedForConsolidation.length === 0 ? (
              <p className="text-xs text-midnight-900/40">No verified recruiter reports available yet.</p>
            ) : (
              <div className="space-y-1.5">
                {verifiedForConsolidation.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedChildren.includes(r.id)} onChange={() => toggleChild(r.id)} />
                    {r.submitter.full_name} — {r.type} ({new Date(r.period_start).toLocaleDateString()})
                  </label>
                ))}
              </div>
            )}
          </div>

          <textarea placeholder="Notes for In-House" value={consolidateForm.notes} onChange={(e) => setConsolidateForm({ ...consolidateForm, notes: e.target.value })} rows={3} className="input-field w-full resize-none" />
          <button type="submit" disabled={saving} className="btn-primary text-xs disabled:opacity-60">
            {saving ? "Submitting…" : "Submit Country Report"}
          </button>
        </form>
      )}

      {myCountryReports.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No country reports submitted yet.</div>
      ) : (
        <div className="space-y-3">
          {myCountryReports.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-midnight-900 capitalize">{r.type} report</div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status]}`}>{r.status}</span>
              </div>
              <div className="text-xs text-midnight-900/45 mb-2">
                {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()} · {r.child_reports.length} recruiter report(s) consolidated
              </div>
              {r.status === "returned" && r.return_reason && (
                <div className="text-xs text-red-500"><span className="font-semibold">Returned:</span> {r.return_reason}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
