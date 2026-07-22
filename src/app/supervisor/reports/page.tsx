"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { SUPERVISOR_NAV_ITEMS } from "@/components/portal/supervisorNav";
import Pagination from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";
import type { ReportContentValue } from "@/components/portal/reports/ReportContentForm";
import ReportContentView from "@/components/portal/reports/ReportContentView";
import { Plus, ListChecks, CalendarBlank } from "@phosphor-icons/react";

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
  child_reports: { id: string; status: string; submitter: { full_name: string } }[];
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-yellow-100 text-yellow-800",
  verified: "bg-emerald-100 text-emerald-800",
  approved: "bg-emerald-100 text-emerald-800",
  returned: "bg-red-100 text-red-700",
  consolidated: "bg-blue-100 text-blue-700",
  escalated: "bg-orange-100 text-orange-800",
  closed: "bg-slate-100 text-slate-700",
};

const REPORT_TYPES: ReportRow["type"][] = ["daily", "weekly", "monthly"];

function RecruiterReportCard({
  r,
  returnDraft,
  onReturnDraftChange,
  onVerify,
  onReturn,
}: {
  r: ReportRow;
  returnDraft: string;
  onReturnDraftChange: (v: string) => void;
  onVerify: () => void;
  onReturn: () => void;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="font-medium text-midnight-900">{r.submitter.full_name}</div>
          <div className="text-xs text-midnight-900/45 capitalize">
            {r.type} · {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status]}`}>{r.status}</span>
          {r.status === "submitted" && (
            <button onClick={onVerify} className="text-xs font-semibold text-emerald-600 hover:underline">Verify</button>
          )}
        </div>
      </div>

      <div className="mb-3">
        <ReportContentView content={r.content} />
      </div>

      {r.status === "returned" && r.return_reason && (
        <div className="text-xs text-red-500 mb-2"><span className="font-semibold">Returned:</span> {r.return_reason}</div>
      )}

      {r.status === "submitted" && (
        <div className="flex items-center gap-2">
          <textarea
            placeholder="Reason for return…"
            value={returnDraft}
            onChange={(e) => onReturnDraftChange(e.target.value)}
            rows={1}
            className="input-field text-xs flex-1"
          />
          <button onClick={onReturn} className="btn-secondary py-2 px-3 text-xs shrink-0">Return</button>
        </div>
      )}
    </div>
  );
}

export default function SupervisorReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returnDrafts, setReturnDrafts] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<"outstanding" | "byPeriod">("outstanding");
  const [byPeriodType, setByPeriodType] = useState<ReportRow["type"]>("daily");

  // This page derives several client-side views (outstanding-to-review,
  // by-period grouping, the consolidation checklist) from one fetch —
  // pageSize=200 (the API's own cap) is a protective bound against a
  // fully unbounded query. Each view then paginates its own slice
  // client-side (usePagination) so a country with 20 recruiters and
  // months of history never renders more than one page of cards at once;
  // this still isn't a true server-paginated query per tab (that's a
  // separate, larger piece of work), but it's no longer an unbounded list.
  const load = () => {
    setLoading(true);
    fetch("/api/reports?pageSize=200")
      .then((r) => r.json())
      .then((res) => setReports(res.data ?? []))
      .catch(() => setError("Failed to load reports."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const recruiterReports = useMemo(() => reports.filter((r) => r.scope_level === "recruiter"), [reports]);
  const recruiterInbox = useMemo(() => recruiterReports.filter((r) => r.status === "submitted"), [recruiterReports]);
  const myCountryReports = useMemo(() => reports.filter((r) => r.scope_level === "country"), [reports]);

  const byPeriod = useMemo(() => {
    const groups: Record<ReportRow["type"], ReportRow[]> = { daily: [], weekly: [], monthly: [] };
    for (const r of recruiterReports) {
      groups[r.type].push(r);
    }
    for (const type of REPORT_TYPES) {
      groups[type].sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime());
    }
    return groups;
  }, [recruiterReports]);

  const inboxPage = usePagination(recruiterInbox);
  const countryReportsPage = usePagination(myCountryReports);
  const byPeriodPage = usePagination(byPeriod[byPeriodType]);

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
    <PortalShell roleLabel="Country Supervisor" navItems={SUPERVISOR_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Agent network
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Reports.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Verify or return your recruiters&rsquo; submissions, then create your own weekly or monthly country report
        — it previews what&rsquo;s ready to pull in from their verified reports, but you always review and submit
        it yourself.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm mb-6">{error}</div>}

      <div className="flex items-center gap-1 mb-4 bg-ivory-100 rounded-full p-1 w-fit">
        <button
          onClick={() => setViewMode("outstanding")}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${viewMode === "outstanding" ? "bg-midnight-950 text-ivory-50" : "text-midnight-900/60"}`}
        >
          <ListChecks size={14} weight="bold" /> Outstanding to review
        </button>
        <button
          onClick={() => setViewMode("byPeriod")}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${viewMode === "byPeriod" ? "bg-midnight-950 text-ivory-50" : "text-midnight-900/60"}`}
        >
          <CalendarBlank size={14} weight="bold" /> By period
        </button>
      </div>

      {loading ? (
        <p className="text-midnight-900/50 mb-8">Loading…</p>
      ) : viewMode === "outstanding" ? (
        <>
          <h2 className="text-sm font-semibold text-midnight-900/50 uppercase tracking-wider mb-3">Awaiting your review</h2>
          {recruiterInbox.length === 0 ? (
            <div className="card p-6 text-center text-midnight-900/40 mb-8">Nothing awaiting review.</div>
          ) : (
            <div className="space-y-3 mb-8">
              {inboxPage.paged.map((r) => (
                <RecruiterReportCard
                  key={r.id}
                  r={r}
                  returnDraft={returnDrafts[r.id] ?? ""}
                  onReturnDraftChange={(v) => setReturnDrafts((prev) => ({ ...prev, [r.id]: v }))}
                  onVerify={() => verify(r.id)}
                  onReturn={() => returnReport(r.id)}
                />
              ))}
              <Pagination page={inboxPage.page} totalPages={inboxPage.totalPages} onPageChange={inboxPage.setPage} total={inboxPage.total} pageSize={inboxPage.pageSize} />
            </div>
          )}
        </>
      ) : (
        <div className="mb-8">
          <div className="flex items-center gap-1 mb-4">
            {REPORT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => {
                  setByPeriodType(type);
                  byPeriodPage.setPage(1);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                  byPeriodType === type ? "bg-midnight-950 text-ivory-50" : "bg-ivory-100 text-midnight-900/60"
                }`}
              >
                {type} ({byPeriod[type].length})
              </button>
            ))}
          </div>

          {byPeriod[byPeriodType].length === 0 ? (
            <div className="card p-6 text-center text-midnight-900/40">No {byPeriodType} reports yet.</div>
          ) : (
            <div className="space-y-3">
              {byPeriodPage.paged.map((r) => (
                <RecruiterReportCard
                  key={r.id}
                  r={r}
                  returnDraft={returnDrafts[r.id] ?? ""}
                  onReturnDraftChange={(v) => setReturnDrafts((prev) => ({ ...prev, [r.id]: v }))}
                  onVerify={() => verify(r.id)}
                  onReturn={() => returnReport(r.id)}
                />
              ))}
              <Pagination
                page={byPeriodPage.page}
                totalPages={byPeriodPage.totalPages}
                onPageChange={byPeriodPage.setPage}
                total={byPeriodPage.total}
                pageSize={byPeriodPage.pageSize}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-midnight-900/50 uppercase tracking-wider">Country reports (to In-House)</h2>
        <Link href="/supervisor/reports/new" className="btn-secondary text-xs">
          <Plus size={14} weight="bold" /> Create Report
        </Link>
      </div>

      {myCountryReports.length === 0 ? (
        <div className="card p-10 text-center text-midnight-900/50">No country reports submitted yet.</div>
      ) : (
        <div className="space-y-3">
          {countryReportsPage.paged.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-midnight-900 capitalize">{r.type} report</div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status]}`}>{r.status}</span>
              </div>
              <div className="text-xs text-midnight-900/45 mb-2">
                {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()} · {r.child_reports.length} recruiter report(s) consolidated
              </div>
              <ReportContentView content={r.content} />
              {r.status === "returned" && r.return_reason && (
                <div className="text-xs text-red-500 mt-2"><span className="font-semibold">Returned:</span> {r.return_reason}</div>
              )}
            </div>
          ))}
          <Pagination page={countryReportsPage.page} totalPages={countryReportsPage.totalPages} onPageChange={countryReportsPage.setPage} total={countryReportsPage.total} pageSize={countryReportsPage.pageSize} />
        </div>
      )}
    </PortalShell>
  );
}
