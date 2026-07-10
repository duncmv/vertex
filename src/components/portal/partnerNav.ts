import type { PortalNavItem } from "./PortalShell";
import { UsersThree } from "@phosphor-icons/react";

// A partner's own portal (SRS FR-5.1) — submits and tracks its own
// candidates only, no access to Vertex's internal recruiter/screening
// pipeline.
export const PARTNER_NAV_ITEMS: PortalNavItem[] = [
  { href: "/partner", label: "My Candidates", icon: UsersThree },
];
