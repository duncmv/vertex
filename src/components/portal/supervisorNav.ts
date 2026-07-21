import type { PortalNavItem } from "./PortalShell";
import { Gauge, ClipboardText, FileText, Airplane, UsersThree, Users, Warning } from "@phosphor-icons/react";

export const SUPERVISOR_NAV_ITEMS: PortalNavItem[] = [
  { href: "/supervisor", label: "Overview", icon: Gauge },
  { href: "/supervisor/recruiters", label: "Recruiters", icon: UsersThree },
  { href: "/supervisor/candidates", label: "Candidates", icon: Users },
  { href: "/supervisor/applications", label: "Applications", icon: ClipboardText },
  { href: "/supervisor/cases", label: "Cases", icon: Airplane },
  { href: "/supervisor/reports", label: "Reports", icon: FileText },
  { href: "/supervisor/exceptions", label: "Exceptions", icon: Warning },
];
