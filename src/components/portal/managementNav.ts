import type { PortalNavItem } from "./PortalShell";
import { Gauge, Target, FileText, Airplane, ClipboardText, HandCoins } from "@phosphor-icons/react";

// Applications and Fee Policy live here rather than under System
// Administrator — "sets policy & criteria... approves & controls the
// workflow" is In-House Supervisor/Director's mandate per the Regional
// Supervisory Operational Workflow, not a system-admin task. Jobs lives
// under the dedicated Marketing portal instead — it's solely responsible
// for job postings, not part of this three-tier hierarchy.
export const MANAGEMENT_NAV_ITEMS: PortalNavItem[] = [
  { href: "/management", label: "Control Dashboard", icon: Gauge },
  { href: "/management/campaigns", label: "Campaigns", icon: Target },
  { href: "/management/applications", label: "Applications", icon: ClipboardText },
  { href: "/management/fee-policy", label: "Fee Policy", icon: HandCoins },
  { href: "/management/cases", label: "Cases", icon: Airplane },
  { href: "/management/reports", label: "Reports", icon: FileText },
];
