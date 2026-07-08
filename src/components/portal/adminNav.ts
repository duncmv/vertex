import type { PortalNavItem } from "./PortalShell";
import { Gauge, Briefcase, ClipboardText, Users, CurrencyDollar, GearSix, GlobeHemisphereWest, IdentificationBadge } from "@phosphor-icons/react";

export const ADMIN_NAV_ITEMS: PortalNavItem[] = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/applications", label: "Applications", icon: ClipboardText },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/finances", label: "Finances", icon: CurrencyDollar },
  { href: "/admin/regions", label: "Regions & Countries", icon: GlobeHemisphereWest },
  { href: "/admin/users", label: "Staff & Roles", icon: IdentificationBadge },
  { href: "/admin/settings", label: "Settings", icon: GearSix },
];
