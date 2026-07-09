"use client";

import { useEffect, useState } from "react";
import PortalShell from "@/components/portal/PortalShell";
import CandidateList from "@/components/portal/CandidateList";
import { MANAGEMENT_NAV_ITEMS } from "@/components/portal/managementNav";
import KpiFilterBar, { type KpiFilterState } from "@/components/portal/kpi/KpiFilterBar";
import FunnelChart from "@/components/portal/kpi/FunnelChart";
import ConversionChart from "@/components/portal/kpi/ConversionChart";
import TargetsVsActuals from "@/components/portal/kpi/TargetsVsActuals";
import { UsersThree, TrendUp, ArrowsClockwise, DownloadSimple } from "@phosphor-icons/react";

interface KpiSummary {
  agentSignups: number;
  recruiterResponseRate: number;
  applicantFlow: Record<string, number>;
  conversion: { overall: number; byStage: { from: string; to: string; rate: number }[] };
}

interface Option { id: string; name: string; }

function StatTile({ icon: Icon, label, value, suffix }: { icon: typeof UsersThree; label: string; value: number; suffix?: string }) {
  return (
    <div className="card p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-midnight-950/5 flex items-center justify-center shrink-0">
        <Icon size={22} weight="regular" className="text-midnight-800" />
      </div>
      <div>
        <div className="text-3xl font-semibold text-midnight-900">
          {value}{suffix}
        </div>
        <div className="text-midnight-900/50 text-xs uppercase tracking-wider mt-1">{label}</div>
      </div>
    </div>
  );
}

export default function ManagementPortalPage() {
  const [filters, setFilters] = useState<KpiFilterState>({ preset: "90", countryId: "", regionId: "", campaignId: "" });
  const [countries, setCountries] = useState<Option[]>([]);
  const [regions, setRegions] = useState<Option[]>([]);
  const [campaigns, setCampaigns] = useState<Option[]>([]);
  const [kpi, setKpi] = useState<KpiSummary | null>(null);
  const [targetsVsActuals, setTargetsVsActuals] = useState<{ campaignTargetId: string; metric: string; countryId: string | null; regionId: string | null; targetValue: number; actualValue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/countries").then((r) => r.json()).then((res) => setCountries(res.data ?? []));
    fetch("/api/admin/regions").then((r) => r.json()).then((res) => setRegions(res.data ?? []));
    fetch("/api/campaigns").then((r) => r.json()).then((res) => setCampaigns(res.data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - Number(filters.preset) * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    });
    if (filters.countryId) params.set("country_id", filters.countryId);
    if (filters.regionId) params.set("region_id", filters.regionId);
    if (filters.campaignId) params.set("campaign_id", filters.campaignId);

    fetch(`/api/kpi?${params}`)
      .then((r) => r.json())
      .then((res) => {
        setKpi(res.data?.summary ?? null);
        setTargetsVsActuals(res.data?.targetsVsActuals ?? []);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <PortalShell roleLabel="Management" navItems={MANAGEMENT_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Control
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Control dashboard.</h1>
      <p className="text-midnight-900/55 font-light mb-6 max-w-2xl">
        Real-time campaign status and KPIs across every region and country (SRS FR-3.1, FR-3.2).
      </p>

      <KpiFilterBar filters={filters} onChange={setFilters} countries={countries} regions={regions} campaigns={campaigns} />

      {loading || !kpi ? (
        <p className="text-midnight-900/50">Loading…</p>
      ) : (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <StatTile icon={UsersThree} label="Agent Sign-ups" value={kpi.agentSignups} />
            <StatTile icon={ArrowsClockwise} label="Recruiter Response Rate" value={kpi.recruiterResponseRate} suffix="%" />
            <StatTile icon={TrendUp} label="Overall Conversion" value={kpi.conversion.overall} suffix="%" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-5">Applicant Flow</h2>
              <FunnelChart flow={kpi.applicantFlow} />
            </div>
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-5">Stage Conversion</h2>
              <ConversionChart byStage={kpi.conversion.byStage} />
            </div>
          </div>

          {filters.campaignId && (
            <div className="card p-6 mb-8">
              <h2 className="text-sm font-semibold text-midnight-900/70 uppercase tracking-wider mb-5">Targets vs Actuals</h2>
              <TargetsVsActuals data={targetsVsActuals} />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-10 mb-3">
        <h2 className="text-sm font-semibold text-midnight-900/50 uppercase tracking-wider">All candidates — approve or return</h2>
        <a href="/api/candidates/export" download className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-600 hover:underline">
          <DownloadSimple size={14} weight="bold" /> Export CSV
        </a>
      </div>
      <CandidateList emptyLabel="No candidates in the system yet." canVerify canApprove />
    </PortalShell>
  );
}
