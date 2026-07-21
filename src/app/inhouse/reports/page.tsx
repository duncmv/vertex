"use client";

import { useEffect, useMemo, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { INHOUSE_NAV_ITEMS } from "@/components/portal/inhouseNav";
import SearchableSelect from "@/components/SearchableSelect";
import ReportContentForm, { EMPTY_REPORT_CONTENT, type ReportContentValue } from "@/components/portal/reports/ReportContentForm";
import ReportContentView from "@/components/portal/reports/ReportContentView";
import { CheckCircle, XCircle, CaretDown, CaretUp, ArrowRight, Plus, Stack } from "@phosphor-icons/react";

interface ReportRow {
  id: string;
  type: "daily" | "weekly" | "monthly";
  scope_level: string;
  status: string;
  period_start: string;
  period_end: string;
  return_reason: string | null;
  content: Partial<ReportContentValue>;
  submitter: { id: string; full_name: string };
  country: { id: string; name: string } | null;
  child_reports: { id: string; status: string; submitter: { full_name: string } }[];
}

interface Overview {
  dailyCompliance: { submitted: number; total: number; recruiters: { id: string; full_name: string; submittedToday: boolean }[] };
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-yellow-100 text-yellow-800",
  verified: "bg-emerald-100 text-emerald-800",
  returned: "bg-red-100 text-red-700",
  consolidated: "bg-blue-100 text-blue-700",
};

function CountryReportCard({ r, onChanged }: { r: ReportRow; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  const verify = async () => {
    await fetch(`/api/reports/${r.id}/verify`, { method: "PATCH" });
    onChanged();
  };
  const returnReport = async () => {
    if (returnReason.trim().length < 5) return;
    await fetch(`/api/reports/${r.id}/return`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ return_reason: returnReason }),
    });
    onChanged();
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-midnight-900 capitalize">{r.type} report</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[r.status]}`}>
              {r.status}
            </span>
          </div>
          <div className="text-xs text-midnight-900/45">
            Submitted by {r.submitter.full_name} · {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
          </div>
        </div>
        {r.status === "submitted" && (
          <button onClick={verify} className="text-xs font-semibold text-emerald-600 hover:underline shrink-0">
            Verify &amp; send to Management
          </button>
        )}
      </div>

      <div className="mt-3">
        <ReportContentView content={r.content} />
      </div>

      <button onClick={() => setExpanded((v) => !v)} className="inline-flex items-center gap-1 text-xs text-gold-600 hover:underline mt-3">
        {expanded ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
        Escalation trail ({r.child_reports.length} recruiter report{r.child_reports.length === 1 ? "" : "s"})
      </button>

      {expanded && (
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
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            rows={1}
            className="input-field text-xs flex-1"
          />
          <button onClick={returnReport} className="btn-secondary py-2 px-3 text-xs shrink-0">Return</button>
        </div>
      )}
      {r.status === "returned" && r.return_reason && (
        <div className="text-xs text-red-500 mt-3"><span className="font-semibold">Returned:</span> {r.return_reason}</div>
      )}
    </div>
  );
}

export default function InhouseReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitType, setSubmitType] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [submitPeriodStart, setSubmitPeriodStart] = useState("");
  const [submitPeriodEnd, setSubmitPeriodEnd] = useState("");
  const [submitContent, setSubmitContent] = useState<ReportContentValue>(EMPTY_REPORT_CONTENT);
  const [selectedChild, setSelectedChild] = useState("");
  const [saving, setSaving] = useState(false);

  // Country-scoped but still derives grouped/expandable views from one
  // fetch — pageSize=200 (the API's own cap) is a protective bound
  // against what used to be a fully unbounded query, not true
  // pagination; that needs this view restructured into filtered,
  // independently-paginated queries per tab.
  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/reports?pageSize=200").then((r) => r.json()),
      fetch("/api/inhouse/overview").then((r) => r.json()),
    ])
      .then(([reportsRes, overviewRes]) => {
        setReports(reportsRes.data ?? []);
        setOverview(overviewRes.data ?? null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const countryReports = useMemo(() => reports.filter((r) => r.scope_level === "country"), [reports]);
  const weeklyReports = useMemo(() => countryReports.filter((r) => r.type === "weekly"), [countryReports]);
  const monthlyReports = useMemo(() => countryReports.filter((r) => r.type === "monthly"), [countryReports]);
  const outstanding = useMemo(() => countryReports.filter((r) => r.status === "submitted"), [countryReports]);
  // Portfolio-of-one (the existing confirmed single-country in-house
  // scoping) — a verified country report is the only thing that can ever
  // be consolidated into this supervisor's own portfolio report.
  const verifiedCountryReports = useMemo(() => countryReports.filter((r) => r.status === "verified"), [countryReports]);
  const myPortfolioReports = useMemo(() => reports.filter((r) => r.scope_level === "inhouse"), [reports]);

  const submitPortfolioReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: submitType,
          period_start: submitPeriodStart,
          period_end: submitPeriodEnd,
          content: submitContent,
          child_report_ids: selectedChild ? [selectedChild] : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to submit portfolio report.");
      setSubmitType("weekly");
      setSubmitPeriodStart("");
      setSubmitPeriodEnd("");
      setSubmitContent(EMPTY_REPORT_CONTENT);
      setSelectedChild("");
      setShowSubmit(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit portfolio report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalShell roleLabel="In-House Supervisor" navItems={INHOUSE_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Operations
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Reports.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Daily submission compliance, your Country Supervisor&rsquo;s weekly and monthly reports, and the full
        recruiter-to-country escalation trail. Verifying a country report is what sends it on to Management —
        and your own portfolio report below goes to Management/Director in turn.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">{error}</div>}

      {loading ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : (
        <div className="space-y-10">
          {/* Daily compliance */}
          <section>
            <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">
              Daily report compliance — today
            </h2>
            {!overview || overview.dailyCompliance.total === 0 ? (
              <div className="card p-6 text-center text-midnight-900/50 text-sm">No recruiters assigned to your country yet.</div>
            ) : (
              <div className="card p-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {overview.dailyCompliance.recruiters.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 bg-ivory-100 rounded-lg px-3 py-2.5 text-sm">
                      <span className="text-midnight-900/80">{r.full_name}</span>
                      {r.submittedToday ? (
                        <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle size={18} weight="fill" className="text-red-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Outstanding */}
          <section>
            <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">
              Outstanding to review ({outstanding.length})
            </h2>
            {outstanding.length === 0 ? (
              <div className="card p-6 text-center text-midnight-900/50 text-sm">Nothing outstanding — you&rsquo;re caught up.</div>
            ) : (
              <div className="space-y-3">
                {outstanding.map((r) => <CountryReportCard key={r.id} r={r} onChanged={load} />)}
              </div>
            )}
          </section>

          {/* Weekly */}
          <section>
            <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">Weekly country reports</h2>
            {weeklyReports.length === 0 ? (
              <div className="card p-6 text-center text-midnight-900/50 text-sm">No weekly reports submitted yet.</div>
            ) : (
              <div className="space-y-3">
                {weeklyReports.map((r) => <CountryReportCard key={r.id} r={r} onChanged={load} />)}
              </div>
            )}
          </section>

          {/* Monthly */}
          <section>
            <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-4">Monthly country reports</h2>
            {monthlyReports.length === 0 ? (
              <div className="card p-6 text-center text-midnight-900/50 text-sm">No monthly reports submitted yet.</div>
            ) : (
              <div className="space-y-3">
                {monthlyReports.map((r) => <CountryReportCard key={r.id} r={r} onChanged={load} />)}
              </div>
            )}
          </section>

          {/* Portfolio reports to Management/Director */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider">Your portfolio reports (to Management)</h2>
              <button onClick={() => setShowSubmit((v) => !v)} className="btn-secondary text-xs">
                <Plus size={14} weight="bold" /> Submit portfolio report
              </button>
            </div>

            {showSubmit && (
              <form onSubmit={submitPortfolioReport} className="card p-6 mb-4 space-y-4">
                <h3 className="font-semibold text-midnight-900 flex items-center gap-2">
                  <Stack size={16} weight="regular" /> New portfolio report
                </h3>
                <div className={`grid gap-4 ${submitType === "daily" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                  <SearchableSelect
                    value={submitType}
                    onChange={(value) => setSubmitType(value as typeof submitType)}
                    options={[
                      { value: "daily", label: "Daily Management Exception Report" },
                      { value: "weekly", label: "Weekly Portfolio Review" },
                      { value: "monthly", label: "Monthly Management Report" },
                    ]}
                  />
                  {submitType === "daily" ? (
                    <input
                      required
                      type="date"
                      value={submitPeriodStart}
                      onChange={(e) => {
                        setSubmitPeriodStart(e.target.value);
                        setSubmitPeriodEnd(e.target.value);
                      }}
                      className="input-field"
                    />
                  ) : (
                    <>
                      <input required type="date" value={submitPeriodStart} onChange={(e) => setSubmitPeriodStart(e.target.value)} className="input-field" />
                      <input required type="date" value={submitPeriodEnd} onChange={(e) => setSubmitPeriodEnd(e.target.value)} className="input-field" />
                    </>
                  )}
                </div>

                {submitType !== "daily" && (
                  <div>
                    <div className="text-xs text-midnight-900/45 uppercase tracking-wider mb-2">Verified country report to include</div>
                    {verifiedCountryReports.length === 0 ? (
                      <p className="text-xs text-midnight-900/40">No verified country report available yet for this period.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {verifiedCountryReports
                          .filter((r) => r.type === submitType)
                          .map((r) => (
                            <label key={r.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name="child-country-report"
                                checked={selectedChild === r.id}
                                onChange={() => setSelectedChild(r.id)}
                              />
                              {r.type} report ({new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()})
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                <ReportContentForm role="inhouse_supervisor" cycle={submitType} value={submitContent} onChange={setSubmitContent} />

                <button type="submit" disabled={saving || !submitContent.certified} className="btn-primary text-xs disabled:opacity-60">
                  {saving ? "Submitting…" : "Certify & Submit to Management"}
                </button>
              </form>
            )}

            {myPortfolioReports.length === 0 ? (
              <div className="card p-10 text-center text-midnight-900/50">No portfolio reports submitted yet.</div>
            ) : (
              <div className="space-y-3">
                {myPortfolioReports.map((r) => (
                  <div key={r.id} className="card p-5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-midnight-900 capitalize">{r.type} report</div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-700"}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="text-xs text-midnight-900/45 mb-2">
                      {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                    </div>
                    <ReportContentView content={r.content} />
                    {r.status === "returned" && r.return_reason && (
                      <div className="text-xs text-red-500 mt-2"><span className="font-semibold">Returned:</span> {r.return_reason}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </PortalShell>
  );
}
