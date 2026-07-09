import type { PortalNavItem } from "./PortalShell";
import { Gauge, Users, CurrencyDollar, GearSix, GlobeHemisphereWest, IdentificationBadge, Briefcase } from "@phosphor-icons/react";

// System Administrator is restricted to system-level concerns — account
// provisioning, reference-data taxonomy, technical settings — not
// operational recruitment workflows. Jobs, Applications, Cases, and Fee
// Policy live under Management (In-House Supervisor/Director), per the
// Regional Supervisory Operational Workflow's role assignments. Admin
// retains API-level override access to all of them for support purposes,
// it just isn't the primary place these get done.
export const ADMIN_NAV_ITEMS: PortalNavItem[] = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/finances", label: "Finances", icon: CurrencyDollar },
  { href: "/admin/regions", label: "Regions & Countries", icon: GlobeHemisphereWest },
  { href: "/admin/sectors", label: "Sectors & Requirements", icon: Briefcase },
  { href: "/admin/users", label: "Staff & Roles", icon: IdentificationBadge },
  { href: "/admin/settings", label: "Settings", icon: GearSix },
];
