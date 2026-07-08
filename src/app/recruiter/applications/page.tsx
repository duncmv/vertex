"use client";

import PortalShell from "@/components/portal/PortalShell";
import { RECRUITER_NAV_ITEMS } from "@/components/portal/recruiterNav";
import ApplicationsList from "@/components/portal/ApplicationsList";

export default function RecruiterApplicationsPage() {
  return (
    <PortalShell roleLabel="Regional Recruiter" navItems={RECRUITER_NAV_ITEMS}>
      <p className="eyebrow mb-3">
        <span className="eyebrow-rule" />
        Agent network
      </p>
      <h1 className="section-title text-3xl md:text-4xl mb-2">Applications.</h1>
      <p className="text-midnight-900/55 font-light mb-8 max-w-2xl">
        Real job applications submitted by your candidates. Status changes happen through the hiring team —
        this is your tracking view.
      </p>
      <ApplicationsList emptyLabel="None of your candidates have submitted an application yet." />
    </PortalShell>
  );
}
