"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { RECRUITER_NAV_ITEMS } from "@/components/portal/recruiterNav";
import SearchableSelect from "@/components/SearchableSelect";
import Pagination from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";
import { Plus, PaperPlaneTilt } from "@phosphor-icons/react";

interface ReportRow {
  id: string;
  type: string;
  status: string;
  period_start: string;
  period_end: string;
  return_reason: string | null;
  content: { notes?: string };
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-yellow-100 text-yellow-800",
  verified: "bg-emerald-100 text-emerald-800",
  returned: "bg-red-100 text-red-700",
  consolidated: "bg-blue-100 text-blue-700",
};

export default function RecruiterReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "daily", period_start: "", period_end: "", notes: "" });
  const [resubmitNotes, setResubmitNotes] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    fetch("/api/reports")
      .then((r) => r.json())
      .then((res) => setReports(res.data ?? []))
      .catch(() => setError("Failed to load reports."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const { page, setPage, totalPages, paged, total, pageSize } = usePagination(reports);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          period_start: form.period_start,
          period_end: form.period_end,
          content: { notes: form.notes },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to submit report.");
      setForm({ type: "daily", period_start: "", period_end: "", notes: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setSaving(false);
    }
  };

  const resubmit = async (id: string) => {
    await fetch(`/api/reports/${id}/resubmit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { notes: resubmitNotes[id] ?? "" } }),
    });
    load();
  };

  return (
    <PortalShell roleLabel="Regional Recruiter" navItems={RECRUITER_NAV_ITEMS}>
      <div className="flex items-start justify-between gap-6 mb-2">
        <div>
          <p className="eyebrow mb-3">
            <span className="eyebrow-rule" />
            Agent network
          </p>
          <h1 className="section-title text-3xl md:text-4xl">Reports</h1>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-xs shrink-0">
          <Plus size={16} weight="bold" /> Submit Report
        </button>
      </div>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Daily status updates and weekly candidate lists go to your country supervisor for verification.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="card p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-midnight-900">New report</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <SearchableSelect
              value={form.type}
              onChange={(value) => setForm({ ...form, type: value })}
              options={[
                { value: "daily", label: "Daily status update" },
                { value: "weekly", label: "Weekly candidate list" },
                { value: "monthly", label: "Monthly summary" },
              ]}
            />
            <input required type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} className="input-field" />
            <input required type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} className="input-field" />
          </div>
          <textarea placeholder="Notes for your supervisor" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="input-field w-full resize-none" />
          <button type="submit" disabled={saving} className="btn-primary text-xs disabled:opacity-60">
            {saving ? "Submitting…" : "Submit Report"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : reports.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No reports submitted yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-midnight-900/10 text-left text-midnight-900/40 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Period</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr key={r.id} className="border-b border-midnight-900/5 last:border-0 align-top">
                  <td className="px-5 py-4 text-midnight-900/70">
                    {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-midnight-900/70 capitalize">{r.type}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    {r.status === "returned" && r.return_reason && (
                      <div className="text-xs text-red-500 mt-2 max-w-[220px]">
                        <span className="font-semibold">Returned:</span> {r.return_reason}
                      </div>
                    )}
                    {r.status === "returned" && (
                      <div className="mt-2 flex flex-col gap-1.5 max-w-[240px]">
                        <textarea
                          placeholder="Updated notes"
                          value={resubmitNotes[r.id] ?? r.content?.notes ?? ""}
                          onChange={(e) => setResubmitNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          rows={2}
                          className="input-field text-xs resize-none"
                        />
                        <button onClick={() => resubmit(r.id)} className="btn-secondary py-1.5 px-3 text-xs w-fit">
                          <PaperPlaneTilt size={12} weight="bold" /> Resubmit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-midnight-900/60 text-xs max-w-[240px]">{r.content?.notes || "—"}</td>
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
