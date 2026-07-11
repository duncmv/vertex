import type { PortalNavItem } from "./PortalShell";
import { Gauge, ClipboardText, FileText, Airplane, Target } from "@phosphor-icons/react";

export const SUPERVISOR_NAV_ITEMS: PortalNavItem[] = [
  { href: "/supervisor", label: "Country Overview", icon: Gauge },
  { href: "/supervisor/applications", label: "Applications", icon: ClipboardText },
  { href: "/supervisor/cases", label: "Cases", icon: Airplane },
  { href: "/supervisor/reports", label: "Reports", icon: FileText },
  { href: "/supervisor/targets", label: "Team Targets", icon: Target },
];
