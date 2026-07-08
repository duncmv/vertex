"use client";

import PortalShell from "@/components/portal/PortalShell";
import { SUPERVISOR_NAV_ITEMS } from "@/components/portal/supervisorNav";
import ApplicationsList from "@/components/portal/ApplicationsList";

export default function SupervisorApplicationsPage() {
  return (
    <PortalShell roleLabel="Country Supervisor" navItems={SUPERVISOR_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Agent network
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Applications.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Every application submitted by candidates across your country's recruiters — status changes happen
        through the hiring team.
      </p>
      <ApplicationsList emptyLabel="No applications from your country yet." />
    </PortalShell>
  );
}
