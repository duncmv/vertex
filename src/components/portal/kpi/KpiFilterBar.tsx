"use client";

export interface KpiFilterState {
  preset: "30" | "90" | "365";
  countryId: string;
  regionId: string;
  campaignId: string;
}

interface Option { id: string; name: string; }

interface Props {
  filters: KpiFilterState;
  onChange: (next: KpiFilterState) => void;
  countries: Option[];
  regions: Option[];
  campaigns: Option[];
}

const PRESETS: { value: KpiFilterState["preset"]; label: string }[] = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

/** One row, above the charts — every chart/stat below re-renders against the same slice (dataviz skill: interaction.md). */
export default function KpiFilterBar({ filters, onChange, countries, regions, campaigns }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-8">
      <select
        value={filters.preset}
        onChange={(e) => onChange({ ...filters, preset: e.target.value as KpiFilterState["preset"] })}
        className="input-field py-2 text-xs w-auto"
      >
        {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      <select
        value={filters.regionId}
        onChange={(e) => onChange({ ...filters, regionId: e.target.value, countryId: "" })}
        className="input-field py-2 text-xs w-auto"
      >
        <option value="">All regions</option>
        {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      <select
        value={filters.countryId}
        onChange={(e) => onChange({ ...filters, countryId: e.target.value, regionId: "" })}
        className="input-field py-2 text-xs w-auto"
      >
        <option value="">All countries</option>
        {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select
        value={filters.campaignId}
        onChange={(e) => onChange({ ...filters, campaignId: e.target.value })}
        className="input-field py-2 text-xs w-auto"
      >
        <option value="">No campaign targets</option>
        {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  );
}
