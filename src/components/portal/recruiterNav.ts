import type { PortalNavItem } from "./PortalShell";
import { Gauge, Users, ClipboardText, FileText, Airplane, Warning } from "@phosphor-icons/react";

export const RECRUITER_NAV_ITEMS: PortalNavItem[] = [
  { href: "/recruiter/overview", label: "Overview", icon: Gauge },
  { href: "/recruiter", label: "My Candidates", icon: Users },
  { href: "/recruiter/applications", label: "Applications", icon: ClipboardText },
  { href: "/recruiter/cases", label: "Cases", icon: Airplane },
  { href: "/recruiter/reports", label: "Reports", icon: FileText },
  { href: "/recruiter/exceptions", label: "Exceptions", icon: Warning },
];
