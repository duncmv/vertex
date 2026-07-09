import type { PortalNavItem } from "./PortalShell";
import { Gauge, ClipboardText, FileText, Airplane } from "@phosphor-icons/react";

export const RECRUITER_NAV_ITEMS: PortalNavItem[] = [
  { href: "/recruiter", label: "My Candidates", icon: Gauge },
  { href: "/recruiter/applications", label: "Applications", icon: ClipboardText },
  { href: "/recruiter/cases", label: "Cases", icon: Airplane },
  { href: "/recruiter/reports", label: "Reports", icon: FileText },
];
