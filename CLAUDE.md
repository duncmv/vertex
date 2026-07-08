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
- `phase-N-*` — one branch per phase, branched off the **latest `staging`**, not `main` — `main` only updates after formal business sign-off, which lags behind engineering completion, so it's frequently behind `staging` by one or more completed phases. Branching off `main` would silently drop whatever's already in `staging`.
- **On completing a phase**: push the `phase-N-*` branch, then merge it into `staging` **locally** (`git checkout staging && git merge phase-N-* --no-edit`) and push `staging` — do this automatically for every completed phase without being asked. Don't merge to `main` without explicit confirmation.
- Action item (not doable from the CLI): confirm the cPanel Node hosting is set up to run separate `staging` and `main` deployments (matching the SRS §2.3 environment requirement), not just a single production instance.

## Infrastructure (confirmed 2026-07-08)

- **Hosting**: cPanel Node hosting is the real production target (matches SRS §2.3 and the existing `output: 'standalone'` in `next.config.ts`). The `vertex-omega-kohl.vercel.app` deployment used earlier for the redesign work is a separate, interim thing — not the system of record.
- **Database**: PostgreSQL, provisioned via cPanel — no Prisma provider change needed. The Supabase project referenced in `.env`/`.env.example` historically is **not accessible/owned by us**; `DATABASE_URL` needs the real cPanel connection string before `prisma db push` can run.
- **Document storage**: local disk on the cPanel server, under `UPLOAD_DIR` (private, outside `/public`), served only through the signed-URL API route (`/api/documents/[id]/signed-url` → `/api/documents/file`). Supabase Storage is no longer used — `@supabase/supabase-js` was removed as a dependency.
- **Document backup**: Cloudflare R2 (S3-compatible, `lib/backup.ts`), best-effort backup on save/delete, self-heals the local copy on read if it's ever missing. Local disk stays primary; R2 is degraded-gracefully optional until `R2_*` env vars are filled in.
- **Local development database**: Homebrew `postgresql@16` (not on PATH by default — `export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"`), databases `vertex_dev` (used by `npm run dev`) and `vertex_test` (used by Vitest via `.env.test`). Seed reference data with `npm run db:seed` (`prisma/seed.ts` — Region/Country baseline matching the About page's hubs).
- **Required one-time step per database** (dev, test, staging, production — anywhere the schema is freshly created): `psql "$DATABASE_URL" -f prisma/audit-log-immutability.sql`. `prisma db push` doesn't track raw SQL, so this trigger (blocks UPDATE/DELETE on `AuditLog` at the database level — SRS FR-3.6) isn't applied automatically and must be re-run after any full schema recreation.
- **Test accounts in `vertex_dev`** (password `TestPassword123!` for all): `admin@test.local` (admin), `recruiter@test.local` (regional_recruiter, assigned to Kenya, supervised by supervisor@test.local), `supervisor@test.local` (country_supervisor, assigned to Kenya), `new-recruiter@test.local` (regional_recruiter, created via the admin "Add Staff Member" flow to prove it end-to-end). Keep these — they aren't touched by the E2E suite's teardown (scoped to `e2e-*@test.local` only). A demo candidate ("Grace Wanjiru", status `approved`) exists under `recruiter@test.local` proving the full Phase 2 pipeline once — also fine to keep.

## Testing

- **Unit/integration**: Vitest (`npm test` / `npm run test:watch`), config in `vitest.config.ts`, loads `.env.test` via `vitest.setup.ts`. Covers `lib/rbac.ts` (portal access matrix) and `server/scope.ts` (row-level scoping — run as real integration tests against `vertex_test`, not mocked, since a bug here is a data leak) and `lib/upload.ts` (path-traversal guard, expired/forged token rejection, self-heal-from-backup).
- **E2E**: Playwright (`npm run test:e2e`), config in `playwright.config.ts`, tests in `e2e/`. Runs against the real dev server + `vertex_dev` (there's no cheap separate E2E instance). `global-setup.ts`/`global-teardown.ts` **must** load `.env` explicitly via `dotenv` — Playwright's own Node process doesn't get Next.js's built-in env loading, and this was silently broken (no error, just a no-op) until caught by the `e2e-admin@test.local` account never actually being created.
- When writing a login-then-navigate E2E test, `await page.waitForURL(...)` after clicking submit before navigating away — a same-tab `page.goto()` right after the click can abort the in-flight login POST before the session cookie is set, and this exact race condition caused a real, confusing test failure once already.

## Notable bug found and fixed during Phase 1 (not something Phase 1 introduced)

`middleware.ts` used `jsonwebtoken`'s `jwt.verify`, which depends on Node's `crypto` module — **not supported in the Edge runtime that Next.js middleware defaults to**. This meant `verifyToken()` silently threw on every request, so **the entire auth gate always redirected back to login even with a fully valid session cookie** — this predates Phase 1 entirely (the original binary candidate/admin middleware had the exact same bug) and was probably never caught because no one had tested a real login against a live database before. Fixed by adding `runtime: "nodejs"` to `middleware.ts`'s exported `config`.

**Migrated to `proxy.ts` during Phase 3** (2026-07-08), closing the "re-verify this still holds" note above. `src/middleware.ts` → `src/proxy.ts`, `export function middleware` → `export function proxy`, and — this is the part that would have silently reintroduced the exact Edge-runtime bug if missed — **the `runtime: "nodejs"` config key was deleted, not kept**: Proxy files don't accept a `runtime` option at all (throws a build error if present) and default to the Node.js runtime unconditionally as of Next.js 16. Verified by rerunning `e2e/rbac.spec.ts`'s "regression coverage for the middleware crypto bug" test (still passes) and a live `curl` against a protected route confirming the 307-to-login redirect still fires.

## Bugs found and fixed during Phase 2

- `POST /api/upload` looked up the candidate by `user_id: user!.userId` unconditionally — meaning only a self-registered candidate logged into their own account could ever upload a document. A recruiter-sourced lead has no account, so the screening gate's documentation check was unreachable for the entire agent-network pathway. Fixed by accepting an optional `candidate_id` query param, gated by `isStaffRole` + `canAccessCandidate`, so a recruiter/supervisor can upload on a lead's behalf.
- `CandidateStatusControls` showed an "Advance to X" / "Verify → X" button purely based on `STATUS_ORDER` position, regardless of whether the viewer's role was actually allowed to make that specific move (e.g. a recruiter past "reported," or a supervisor before it). The API correctly rejected these (no security issue), but the UI looked actionable and always failed — fixed by gating the buttons on the same reported-boundary logic `candidateLifecycle.ts` already enforces server-side, with an "Awaiting supervisor action" / "Awaiting recruiter to report" message in the dead zones instead.
- `z.string().email().optional()` in Zod rejects an untouched form field sending `""`, since `.optional()` only short-circuits `undefined`, not an empty string — a genuinely optional email field was practically mandatory. Fixed with a `z.preprocess` that maps `""` to `undefined` first (`optionalEmail` in `validations.ts`).

## Bugs found and fixed during Phase 3

- A CSS `capitalize` class makes text *display* capitalized without changing the actual DOM text content — bit both the app (no functional impact, purely cosmetic) and this session's own E2E tests twice: `getByText("Weekly Report", { exact: true })` failed because the real text node is `"weekly report"`. When writing a selector, check what's actually in the DOM, not what renders on screen.
- A dev-database detail, not an app bug: with two country-scope reports on the same `/management/reports` page (one from manual testing, one from an E2E run), unscoped Playwright locators like `getByText(/Escalation trail/)` matched more than one element. Scope to the specific report's card (`page.locator(".card", { hasText: "..." })`) rather than assuming there's only ever one of something in a real, accumulating dataset.
- Campaign originally allowed a nullable `end_date` — caught before shipping (by the user, not by me): "campaigns have to have a timeframe." Fixed at both the Zod validation layer and the Prisma schema (`end_date DateTime`, not `DateTime?`), with a `refine` requiring `end_date > start_date`. A business rule like "this always has a bounded timeline" belongs at the DB level, not just an API-layer check that a different code path could bypass.
- **Caught by a live Vercel deployment build, not local testing**: there's a Vercel project auto-deploying every pushed branch (a leftover from before this rebuild — `vertex-omega-kohl.vercel.app`, not the real system of record per the Infrastructure section above, but it still runs `npm run build` on push and will keep failing loudly if broken). Its build restored a cached `node_modules` and, because `package.json` had no `postinstall` script, `prisma generate` never re-ran against the current `schema.prisma` — so the cached, stale generated Prisma Client was missing `Region`/`Report`/`Campaign` entirely (`Property 'region' does not exist on type 'PrismaClient'`), even though every local `next build` had been passing for the whole phase. `npm install`'s own dependency-level postinstall hooks only fire for packages actually (re)installed in that invocation — a cache hit skips them. Fixed by adding an explicit top-level `"postinstall": "prisma generate"` to `package.json`, which npm always runs regardless of dependency caching. Verified by deleting `node_modules/.prisma` locally and confirming a plain `npm install` regenerates it.

## Key resolved decisions (do not re-litigate without cause)

- Candidate-fee policy (SRS FR-4.5): admin-configurable `FeePolicy` model, defaults disabled — not a leadership-blocking dependency.
- No live candidate data or hardcoded public storage URLs exist in production — schema/storage changes in Phase 1 don't need backfill migrations or call-site audits.
- No API versioning (`/api/v1/`) until/unless external partner API access is actually introduced in Phase 5.
- Dashboards and new portals reuse the existing design tokens/utility classes in `globals.css` (midnight/gold/ivory palette, Outfit font, Phosphor icons) inside a shared `PortalShell` — no new visual language for internal pages.
- Automated reminders for overdue reports (FR-3.4) are deliberately deferred to Phase 4/5, confirmed with the business 2026-07-08 — not literally required by the SRS's FR-3.4 wording, and needs a background scheduler + due-date concept that don't exist yet. Don't build ad hoc.
- PDF export (FR-3.8, a Should) is deliberately skipped — CSV export (`/api/candidates/export`) substantially satisfies it without adding a new PDF-generation dependency, confirmed with the business 2026-07-08.
