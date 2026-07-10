"use client";

import SearchableSelect from "@/components/SearchableSelect";

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
      <SearchableSelect
        value={filters.preset}
        onChange={(value) => onChange({ ...filters, preset: value as KpiFilterState["preset"] })}
        className="w-auto"
        options={PRESETS}
      />
      <SearchableSelect
        value={filters.regionId}
        onChange={(value) => onChange({ ...filters, regionId: value, countryId: "" })}
        className="w-auto"
        placeholder="All regions"
        options={[{ value: "", label: "All regions" }, ...regions.map((r) => ({ value: r.id, label: r.name }))]}
      />
      <SearchableSelect
        value={filters.countryId}
        onChange={(value) => onChange({ ...filters, countryId: value, regionId: "" })}
        className="w-auto"
        placeholder="All countries"
        options={[{ value: "", label: "All countries" }, ...countries.map((c) => ({ value: c.id, label: c.name }))]}
      />
      <SearchableSelect
        value={filters.campaignId}
        onChange={(value) => onChange({ ...filters, campaignId: value })}
        className="w-auto"
        placeholder="No campaign targets"
        options={[{ value: "", label: "No campaign targets" }, ...campaigns.map((c) => ({ value: c.id, label: c.name }))]}
      />
    </div>
  );
}
