"use client";

import { useEffect, useMemo, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { RECRUITER_NAV_ITEMS } from "@/components/portal/recruiterNav";
import SearchableSelect from "@/components/SearchableSelect";
import Pagination from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";
import { Plus, PaperPlaneTilt, Target } from "@phosphor-icons/react";

interface ReportRow {
  id: string;
  type: string;
  status: string;
  period_start: string;
  period_end: string;
  return_reason: string | null;
  content: { notes?: string; challenges?: string; performance_updates?: string };
  created_at: string;
}

interface CandidateForReport {
  id: string;
  full_name: string | null;
  user: { full_name: string; email: string } | null;
  email: string | null;
  phone: string | null;
  desired_role: string | null;
  screening_result: boolean | null;
  lifecycle_status: string;
  created_at: string;
  country: { id: string; name: string; region: { id: string; name: string } | null } | null;
}

interface TargetProgress {
  recruiterTargetId: string;
  metric: string;
  campaignName: string;
  targetValue: number;
  actualValue: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-yellow-100 text-yellow-800",
  verified: "bg-emerald-100 text-emerald-800",
  returned: "bg-red-100 text-red-700",
  consolidated: "bg-blue-100 text-blue-700",
};

const METRIC_LABELS: Record<string, string> = {
  agent_signups: "Agent Sign-ups",
  applicant_flow: "Applicant Flow",
  conversion_rate: "Conversion Rate (%)",
};

const LIFECYCLE_LABELS: Record<string, string> = {
  identified: "Identified",
  screened: "Screened",
  guided_to_apply: "Guided to Apply",
  submitted: "Submitted",
  reported: "Reported",
  verified: "Verified",
  approved: "Approved",
};

function TargetProgressList({ progress }: { progress: TargetProgress[] }) {
  if (progress.length === 0) {
    return <p className="text-xs text-midnight-900/40">No target has been set for you yet — your country supervisor sets this under Team Targets.</p>;
  }
  return (
    <div className="space-y-2">
      {progress.map((p) => (
        <div key={p.recruiterTargetId} className="flex items-center justify-between text-sm bg-ivory-100 rounded-lg px-3 py-2">
          <span className="text-midnight-900/70 flex items-center gap-1.5">
            <Target size={13} weight="bold" className="text-gold-600" />
            {METRIC_LABELS[p.metric] ?? p.metric} <span className="text-midnight-900/40 text-xs">({p.campaignName})</span>
          </span>
          <span className="font-semibold text-midnight-900">
            {p.actualValue} / {p.targetValue}
            {p.metric === "conversion_rate" ? "%" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RecruiterReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "daily", period_start: "", period_end: "", notes: "", challenges: "", performance_updates: "" });
  const [resubmitNotes, setResubmitNotes] = useState<Record<string, string>>({});

  const [periodCandidates, setPeriodCandidates] = useState<CandidateForReport[]>([]);
  const [targetProgress, setTargetProgress] = useState<TargetProgress[]>([]);
  const [loadingPeriodData, setLoadingPeriodData] = useState(false);

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

  const isDateDrivenType = form.type === "weekly" || form.type === "monthly";

  // Weekly/monthly reports auto-populate from the selected date range —
  // both the candidate list (weekly) and the summary stats it's rolled up
  // into (monthly) come from the same fetch; targets vs actuals is the
  // same regardless of type.
  useEffect(() => {
    if (!isDateDrivenType || !form.period_start || !form.period_end) {
      setPeriodCandidates([]);
      setTargetProgress([]);
      return;
    }
    setLoadingPeriodData(true);
    const params = new URLSearchParams({ period_start: form.period_start, period_end: form.period_end });
    Promise.all([
      fetch(`/api/candidates?${params}`).then((r) => r.json()),
      fetch(`/api/recruiter-targets/progress?${params}`).then((r) => r.json()),
    ])
      .then(([candidatesRes, progressRes]) => {
        setPeriodCandidates(candidatesRes.data ?? []);
        setTargetProgress(progressRes.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingPeriodData(false));
  }, [isDateDrivenType, form.type, form.period_start, form.period_end]);

  const monthlySummary = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let screened = 0;
    let screeningEvaluated = 0;
    for (const c of periodCandidates) {
      byStatus[c.lifecycle_status] = (byStatus[c.lifecycle_status] ?? 0) + 1;
      if (c.screening_result !== null) {
        screeningEvaluated += 1;
        if (c.screening_result) screened += 1;
      }
    }
    return {
      total: periodCandidates.length,
      byStatus,
      screeningPassRate: screeningEvaluated === 0 ? null : Math.round((screened / screeningEvaluated) * 1000) / 10,
    };
  }, [periodCandidates]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      let content: Record<string, unknown>;
      if (form.type === "daily") {
        content = { notes: form.notes };
      } else if (form.type === "weekly") {
        content = {
          candidates: periodCandidates.map((c) => ({
            name: c.user?.full_name ?? c.full_name ?? "— unnamed lead —",
            region: c.country?.region?.name ?? null,
            role: c.desired_role,
            contact: c.user?.email ?? c.email ?? c.phone ?? null,
            screening_result: c.screening_result,
            status: c.lifecycle_status,
            date_of_application: c.created_at,
          })),
          targets_vs_actuals: targetProgress,
          challenges: form.challenges,
          performance_updates: form.performance_updates,
        };
      } else {
        content = {
          summary: monthlySummary,
          targets_vs_actuals: targetProgress,
          challenges: form.challenges,
          performance_updates: form.performance_updates,
        };
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          period_start: form.period_start,
          period_end: form.period_end,
          content,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to submit report.");
      setForm({ type: "daily", period_start: "", period_end: "", notes: "", challenges: "", performance_updates: "" });
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
        Daily status updates go to your country supervisor as a quick note. Weekly and monthly reports
        auto-populate from the candidates you sourced in the period you pick, plus your progress against
        whatever target your supervisor has set for you.
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

          {form.type === "daily" && (
            <textarea placeholder="Notes for your supervisor" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="input-field w-full resize-none" />
          )}

          {isDateDrivenType && (
            <>
              {!form.period_start || !form.period_end ? (
                <p className="text-xs text-midnight-900/40">Pick a period above to auto-populate this report.</p>
              ) : loadingPeriodData ? (
                <p className="text-xs text-midnight-900/40">Loading…</p>
              ) : (
                <>
                  {form.type === "weekly" ? (
                    periodCandidates.length === 0 ? (
                      <p className="text-xs text-midnight-900/40">No candidates sourced in this period.</p>
                    ) : (
                      <div className="border border-midnight-900/10 rounded-lg overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-midnight-900/10 text-left text-midnight-900/40 uppercase tracking-wider">
                              <th className="px-3 py-2 font-semibold">Name</th>
                              <th className="px-3 py-2 font-semibold">Region</th>
                              <th className="px-3 py-2 font-semibold">Role</th>
                              <th className="px-3 py-2 font-semibold">Contact</th>
                              <th className="px-3 py-2 font-semibold">Screening</th>
                              <th className="px-3 py-2 font-semibold">Status</th>
                              <th className="px-3 py-2 font-semibold">Applied</th>
                            </tr>
                          </thead>
                          <tbody>
                            {periodCandidates.map((c) => (
                              <tr key={c.id} className="border-b border-midnight-900/5 last:border-0">
                                <td className="px-3 py-2 font-medium text-midnight-900">{c.user?.full_name ?? c.full_name ?? "— unnamed lead —"}</td>
                                <td className="px-3 py-2 text-midnight-900/70">{c.country?.region?.name ?? "—"}</td>
                                <td className="px-3 py-2 text-midnight-900/70">{c.desired_role ?? "—"}</td>
                                <td className="px-3 py-2 text-midnight-900/70">{c.user?.email ?? c.email ?? c.phone ?? "—"}</td>
                                <td className="px-3 py-2">
                                  {c.screening_result === null ? "—" : c.screening_result ? (
                                    <span className="text-emerald-600 font-medium">Passed</span>
                                  ) : (
                                    <span className="text-red-500 font-medium">Failed</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-midnight-900/70 capitalize">{c.lifecycle_status.replace(/_/g, " ")}</td>
                                <td className="px-3 py-2 text-midnight-900/60">{new Date(c.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : (
                    <div className="border border-midnight-900/10 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div>
                          <div className="text-xl font-semibold text-midnight-900">{monthlySummary.total}</div>
                          <div className="text-[11px] text-midnight-900/45 uppercase tracking-wider">Candidates</div>
                        </div>
                        <div>
                          <div className="text-xl font-semibold text-midnight-900">
                            {monthlySummary.screeningPassRate === null ? "—" : `${monthlySummary.screeningPassRate}%`}
                          </div>
                          <div className="text-[11px] text-midnight-900/45 uppercase tracking-wider">Screening Pass Rate</div>
                        </div>
                        <div>
                          <div className="text-xl font-semibold text-midnight-900">{monthlySummary.byStatus.reported ?? 0}</div>
                          <div className="text-[11px] text-midnight-900/45 uppercase tracking-wider">Reported</div>
                        </div>
                        <div>
                          <div className="text-xl font-semibold text-midnight-900">{monthlySummary.byStatus.approved ?? 0}</div>
                          <div className="text-[11px] text-midnight-900/45 uppercase tracking-wider">Approved</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-midnight-900/10">
                        {Object.entries(monthlySummary.byStatus).map(([status, count]) => (
                          <span key={status} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-ivory-100 border border-midnight-900/10 text-midnight-900/70">
                            {LIFECYCLE_LABELS[status] ?? status}: <span className="font-semibold">{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-midnight-900/50 uppercase tracking-wider mb-2">Progress vs Target</div>
                    <TargetProgressList progress={targetProgress} />
                  </div>

                  <textarea placeholder="Challenges this period" value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })} rows={2} className="input-field w-full resize-none" />
                  <textarea placeholder="Performance updates" value={form.performance_updates} onChange={(e) => setForm({ ...form, performance_updates: e.target.value })} rows={2} className="input-field w-full resize-none" />
                </>
              )}
            </>
          )}

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
                  <td className="px-5 py-4 text-midnight-900/60 text-xs max-w-[240px]">
                    {r.content?.notes || r.content?.challenges || r.content?.performance_updates || "—"}
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
