"use client";

import PortalShell from "@/components/portal/PortalShell";
import { MANAGEMENT_NAV_ITEMS } from "@/components/portal/managementNav";
import CaseList from "@/components/portal/CaseList";

export default function ManagementCasesPage() {
  return (
    <PortalShell roleLabel="Management" navItems={MANAGEMENT_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Mobility Lifecycle
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Cases.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Every active case across every region and country — offer through permit, visa, and travel (SRS FR-4.1).
      </p>
      <CaseList emptyLabel="No active cases yet." basePath="/management/cases" />
    </PortalShell>
  );
}
