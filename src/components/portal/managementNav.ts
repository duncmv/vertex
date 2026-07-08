import type { PortalNavItem } from "./PortalShell";
import { Gauge, Target, FileText } from "@phosphor-icons/react";

export const MANAGEMENT_NAV_ITEMS: PortalNavItem[] = [
  { href: "/management", label: "Control Dashboard", icon: Gauge },
  { href: "/management/campaigns", label: "Campaigns", icon: Target },
  { href: "/management/reports", label: "Reports", icon: FileText },
];
