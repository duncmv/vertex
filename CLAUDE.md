# Vertex CRM & Recruitment Operations Platform

## Phase workflow (mandatory)

This platform is being built phase-by-phase against an approved SRS. For **every** phase:

1. **Before starting**, re-read all three source documents:
   - `docs/PLATFORM_ARCHITECTURE.md` — the architecture and phased delivery plan for this build
   - `/Users/dunc/Desktop/Vertex/Vertex/Vertex_SRS_Platform_Phases_1-5.docx` — the approved SRS (functional/non-functional requirements, phase exit criteria)
   - `/Users/dunc/Desktop/Vertex/Vertex/Vertex platform recommendation.pdf` — the approved build/buy/integrate decision and gap analysis
   (The SRS is a `.docx` — the Read tool can't parse it directly; extract text via a `zipfile`/regex script against `word/document.xml`, as done when the architecture doc was first written.)
2. **Implement** the phase's scope as scoped in `docs/PLATFORM_ARCHITECTURE.md` — don't silently expand or shrink scope from what that doc and the SRS's per-phase Functional Requirements define.
3. **Test** the phase's changes (build passes, relevant unit/E2E coverage, manual verification of the new flows).
4. **Verify against the exit criteria** in the SRS (§8, Phasing & Acceptance) and the architecture doc's per-phase "Exit" line before considering the phase done or moving to the next one.

Do not start the next phase until the current one's exit criteria are met.

## Delivery approach

Sequential, phase-by-phase — not parallelized across phases (confirmed with the business).

## Git / environment workflow

- `main` — production.
- `staging` — pre-production sign-off environment. Every phase branch (`phase-N-*`) is merged into `staging` first; a phase is only merged from `staging` into `main` after it's been verified there against the SRS exit criteria and signed off.
- `phase-N-*` — one branch per phase, branched off `main`.
- Action item (not doable from the CLI): confirm in the Vercel dashboard that the `staging` branch auto-deploys to its own stable preview URL, separate from the `main` production deployment.

## Key resolved decisions (do not re-litigate without cause)

- Candidate-fee policy (SRS FR-4.5): admin-configurable `FeePolicy` model, defaults disabled — not a leadership-blocking dependency.
- No live candidate data or hardcoded public storage URLs exist in production — schema/storage changes in Phase 1 don't need backfill migrations or call-site audits.
- No API versioning (`/api/v1/`) until/unless external partner API access is actually introduced in Phase 5.
- Dashboards and new portals reuse the existing design tokens/utility classes in `globals.css` (midnight/gold/ivory palette, Outfit font, Phosphor icons) inside a shared `PortalShell` — no new visual language for internal pages.
