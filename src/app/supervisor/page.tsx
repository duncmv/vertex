"use client";

import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import CandidateList from "@/components/portal/CandidateList";
import { Gauge } from "@phosphor-icons/react";

const NAV_ITEMS: PortalNavItem[] = [{ href: "/supervisor", label: "Country Overview", icon: Gauge }];

export default function SupervisorPortalPage() {
  return (
    <PortalShell roleLabel="Country Supervisor" navItems={NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Agent network
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Country overview.</h1>
      <p className="text-midnight-900/55 font-light mb-10 max-w-2xl">
        Every candidate sourced by recruiters in your assigned country. Verifying and consolidating regional
        submissions, and managing your ~20 recruiters, arrive in Phase 2.
      </p>
      <CandidateList emptyLabel="No candidates in your assigned country yet." />
    </PortalShell>
  );
}
