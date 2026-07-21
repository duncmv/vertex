"use client";

import type { ReportCycle, Role } from "@prisma/client";
import SearchableSelect from "@/components/SearchableSelect";
import EditableRowTable, { type RowValue } from "./EditableRowTable";
import ReportKpiTable, { type KpiRow } from "./ReportKpiTable";
import { REPORT_KPI_LABELS, getReportSections, OVERALL_STATUS_OPTIONS } from "@/lib/reportTemplates";

export interface ReportContentValue {
  campaign_or_role?: string;
  crm_reference?: string;
  executive_summary?: string;
  overall_status?: "green" | "amber" | "red" | "grey";
  kpis: KpiRow[];
  pipeline: Record<string, RowValue>[];
  activity: Record<string, RowValue>[];
  issues: Record<string, RowValue>[];
  achievements: Record<string, RowValue>[];
  priorities: Record<string, RowValue>[];
  competencies: Record<string, RowValue>[];
  key_achievement?: string;
  next_priority?: string;
  certified: boolean;
}

export const EMPTY_REPORT_CONTENT: ReportContentValue = {
  kpis: [],
  pipeline: [],
  activity: [],
  issues: [],
  achievements: [],
  priorities: [],
  competencies: [],
  certified: false,
};

const PIPELINE_COLUMNS = [
  { key: "stage", label: "Stage" },
  { key: "opening", label: "Opening", type: "number" as const },
  { key: "added", label: "Added / New", type: "number" as const },
  { key: "moved_forward", label: "Moved Forward / Progressed", type: "number" as const },
  { key: "closed_rejected", label: "Closed / Rejected", type: "number" as const },
  { key: "closing", label: "Closing", type: "number" as const },
  { key: "target", label: "Target", type: "number" as const },
];

const ACHIEVEMENT_COLUMNS = [
  { key: "label", label: "Achievement / Finding" },
  { key: "evidence", label: "Evidence / Analysis" },
  { key: "business_impact", label: "Business Impact / Implication" },
];

const PRIORITY_COLUMNS = [
  { key: "label", label: "Priority / Objective" },
  { key: "planned_activity", label: "Planned Activity / Recommendation" },
  { key: "target_measure", label: "Target / Measure" },
  { key: "support_required", label: "Support Required" },
  { key: "due_date", label: "Due Date", type: "date" as const },
];

const COMPETENCY_COLUMNS = [
  { key: "label", label: "Area" },
  { key: "target", label: "Self-Rating (1-5)", type: "number" as const },
  { key: "detail", label: "Evidence" },
  { key: "actual", label: "Supervisor Rating (1-5)", type: "number" as const },
];

interface Props {
  role: Role;
  cycle: ReportCycle;
  value: ReportContentValue;
  onChange: (value: ReportContentValue) => void;
}

/**
 * The shared body of every Supervisory Reporting Framework report form —
 * §2.1's mandatory sections (KPI table, pipeline/activity table, issues,
 * achievements, priorities, competencies, executive summary,
 * certification), assembled generically and driven entirely by
 * src/lib/reportTemplates.ts's per-role/per-cycle configuration. Each
 * portal's reports page wraps this with its own period picker and any
 * auto-populated data (candidate lists, target progress) specific to
 * that role.
 */
export default function ReportContentForm({ role, cycle, value, onChange }: Props) {
  const kpiLabels = REPORT_KPI_LABELS[role]?.[cycle] ?? [];
  const sections = getReportSections(role, cycle);
  const set = <K extends keyof ReportContentValue>(key: K, v: ReportContentValue[K]) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-midnight-900/60 mb-1">Campaign / Job Role</label>
          <input value={value.campaign_or_role ?? ""} onChange={(e) => set("campaign_or_role", e.target.value)} className="input-field text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-midnight-900/60 mb-1">CRM Submission Ref.</label>
          <input value={value.crm_reference ?? ""} onChange={(e) => set("crm_reference", e.target.value)} className="input-field text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-midnight-900/60 mb-1">Overall Status</label>
        <SearchableSelect
          value={value.overall_status ?? ""}
          onChange={(v) => set("overall_status", v as ReportContentValue["overall_status"])}
          options={OVERALL_STATUS_OPTIONS}
          placeholder="Select…"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-midnight-900/60 mb-1">Executive Summary</label>
        <textarea
          value={value.executive_summary ?? ""}
          onChange={(e) => set("executive_summary", e.target.value)}
          rows={2}
          placeholder="Progress, achievements, shortfalls, urgent issues, decisions required, overall status."
          className="input-field w-full resize-none text-sm"
        />
      </div>

      {kpiLabels.length > 0 && <ReportKpiTable labels={kpiLabels} rows={value.kpis} onChange={(rows) => set("kpis", rows)} />}

      {sections.pipeline && (
        <EditableRowTable title={sections.pipeline.title} columns={PIPELINE_COLUMNS} rows={value.pipeline} onChange={(rows) => set("pipeline", rows)} />
      )}

      {sections.activity && (
        <EditableRowTable title={sections.activity.title} columns={sections.activity.columns} rows={value.activity} onChange={(rows) => set("activity", rows)} />
      )}

      {sections.achievements && (
        <EditableRowTable title={sections.achievements.title} columns={ACHIEVEMENT_COLUMNS} rows={value.achievements} onChange={(rows) => set("achievements", rows)} />
      )}

      {sections.issues && (
        <EditableRowTable title={sections.issues.title} columns={sections.issues.columns} rows={value.issues} onChange={(rows) => set("issues", rows)} />
      )}

      {sections.competencies && (
        <EditableRowTable
          title={sections.competencies.title}
          columns={COMPETENCY_COLUMNS}
          rows={value.competencies}
          onChange={(rows) => set("competencies", rows)}
        />
      )}

      {sections.priorities && (
        <EditableRowTable title={sections.priorities.title} columns={PRIORITY_COLUMNS} rows={value.priorities} onChange={(rows) => set("priorities", rows)} />
      )}

      {cycle === "daily" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-midnight-900/60 mb-1">Key Achievement</label>
            <input value={value.key_achievement ?? ""} onChange={(e) => set("key_achievement", e.target.value)} className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-midnight-900/60 mb-1">Tomorrow's Priority</label>
            <input value={value.next_priority ?? ""} onChange={(e) => set("next_priority", e.target.value)} className="input-field text-sm" />
          </div>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-midnight-900/80 font-medium border-t border-midnight-900/10 pt-4">
        <input type="checkbox" checked={value.certified} onChange={(e) => set("certified", e.target.checked)} required className="w-4 h-4 mt-0.5" />
        I confirm that the information above is complete and accurate.
      </label>
    </div>
  );
}
