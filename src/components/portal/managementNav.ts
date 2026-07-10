import type { PortalNavItem } from "./PortalShell";
import { Gauge, Target, FileText, Airplane, ClipboardText, HandCoins, Handshake, Buildings } from "@phosphor-icons/react";

// Applications and Fee Policy live here rather than under System
// Administrator — "sets policy & criteria... approves & controls the
// workflow" is In-House Supervisor/Director's mandate per the Regional
// Supervisory Operational Workflow, not a system-admin task. Jobs lives
// under the dedicated Marketing portal instead — it's solely responsible
// for job postings, not part of this three-tier hierarchy. Partners and
// Employer Clients (Phase 5, SRS FR-5.1/FR-5.2) live here for the same
// reason as Fee Policy — a management/CRM concern, not system admin.
export const MANAGEMENT_NAV_ITEMS: PortalNavItem[] = [
  { href: "/management", label: "Control Dashboard", icon: Gauge },
  { href: "/management/campaigns", label: "Campaigns", icon: Target },
  { href: "/management/applications", label: "Applications", icon: ClipboardText },
  { href: "/management/partners", label: "Partners", icon: Handshake },
  { href: "/management/employer-clients", label: "Employer Clients", icon: Buildings },
  { href: "/management/fee-policy", label: "Fee Policy", icon: HandCoins },
  { href: "/management/cases", label: "Cases", icon: Airplane },
  { href: "/management/reports", label: "Reports", icon: FileText },
];
