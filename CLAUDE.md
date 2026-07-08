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
- Action item (not doable from the CLI): confirm the cPanel Node hosting is set up to run separate `staging` and `main` deployments (matching the SRS §2.3 environment requirement), not just a single production instance.

## Infrastructure (confirmed 2026-07-08)

- **Hosting**: cPanel Node hosting is the real production target (matches SRS §2.3 and the existing `output: 'standalone'` in `next.config.ts`). The `vertex-omega-kohl.vercel.app` deployment used earlier for the redesign work is a separate, interim thing — not the system of record.
- **Database**: PostgreSQL, provisioned via cPanel — no Prisma provider change needed. The Supabase project referenced in `.env`/`.env.example` historically is **not accessible/owned by us**; `DATABASE_URL` needs the real cPanel connection string before `prisma db push` can run.
- **Document storage**: local disk on the cPanel server, under `UPLOAD_DIR` (private, outside `/public`), served only through the signed-URL API route (`/api/documents/[id]/signed-url` → `/api/documents/file`). Supabase Storage is no longer used — `@supabase/supabase-js` was removed as a dependency.
- **Document backup**: Cloudflare R2 (S3-compatible, `lib/backup.ts`), best-effort backup on save/delete, self-heals the local copy on read if it's ever missing. Local disk stays primary; R2 is degraded-gracefully optional until `R2_*` env vars are filled in.

## Key resolved decisions (do not re-litigate without cause)

- Candidate-fee policy (SRS FR-4.5): admin-configurable `FeePolicy` model, defaults disabled — not a leadership-blocking dependency.
- No live candidate data or hardcoded public storage URLs exist in production — schema/storage changes in Phase 1 don't need backfill migrations or call-site audits.
- No API versioning (`/api/v1/`) until/unless external partner API access is actually introduced in Phase 5.
- Dashboards and new portals reuse the existing design tokens/utility classes in `globals.css` (midnight/gold/ivory palette, Outfit font, Phosphor icons) inside a shared `PortalShell` — no new visual language for internal pages.
