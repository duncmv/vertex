"use client";

import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import CandidateList from "@/components/portal/CandidateList";
import { Gauge } from "@phosphor-icons/react";

const NAV_ITEMS: PortalNavItem[] = [{ href: "/recruiter", label: "My Candidates", icon: Gauge }];

export default function RecruiterPortalPage() {
  return (
    <PortalShell roleLabel="Regional Recruiter" navItems={NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Agent network
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">My candidates.</h1>
      <p className="text-midnight-900/55 font-light mb-10 max-w-2xl">
        Every candidate you've sourced, with their current stage in the pre-application lifecycle. Registering new
        candidates, guiding them through the screening gate, and submitting regional reports arrive in Phase 2.
      </p>
      <CandidateList emptyLabel="No candidates attributed to you yet." />
    </PortalShell>
  );
}
