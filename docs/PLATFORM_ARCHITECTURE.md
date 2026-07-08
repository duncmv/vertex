# Vertex CRM & Recruitment Operations Platform — Architecture & Delivery Plan

Status: **Draft for approval** — mirrors `Vertex_SRS_Platform_Phases_1-5.docx` (v1.0, 2 July 2026) and the approved Platform Gap Analysis (30 June 2026).
Scope: extend the existing Next.js/PostgreSQL platform into the full system of record. No parallel CRM, no rewrite.

---

## 0. What exists today (baseline)

Confirmed by reading the live codebase, not assumed:

| Area | Current state |
|---|---|
| Roles | `Role { candidate, admin }` only — binary |
| Auth | JWT (cookie `auth_token`) + bcrypt; `middleware.ts` protects `/dashboard` and `/admin` by path prefix |
| Candidate model | 1:1 with `User`, `user_id` required — no concept of a recruiter-sourced lead who hasn't registered |
| Application | 5 statuses (`submitted → under_review → interview → approved/rejected`), no case/stage tracking beyond that |
| Documents | Two ad-hoc string fields (`cv_file`, `passport_scan`) on `Candidate`; stored in Supabase Storage via `getPublicUrl` — **permanently public links, not signed** |
| Admin panel | One flat client component (`/admin/page.tsx`), tab-switched, `bg-slate-50` — generic Tailwind gray, disconnected from the brand system now live on the public site |
| API | Flat `/api/*`, no versioning, inconsistent response shapes (raw arrays in some routes, `{jobs: [...]}` in others) |
| Data access | Route handlers call `prisma.*` directly — no repository/service layer |
| Reporting/KPIs | None — admin shows raw counts only |
| Region/country/recruiter structure | None |

The gap analysis estimate stands: roughly the candidate-facing ATS half is built: the agent-network, control, and extended-lifecycle half is not.

---

## 1. Key architecture decisions

These are the calls that shape everything downstream. Flagging each with its rationale so they can be challenged before code is written.

### 1.1 Candidate vs. Lead — decouple `Candidate` from requiring a `User` login
**Decision:** make `Candidate.user_id` **nullable**. A Regional Recruiter can create a `Candidate` record directly (FR-2.1, "register candidates") for a person who hasn't signed up yet. Add `Candidate.source: self_registered | recruiter_sourced` and `Candidate.recruiter_id`. When the person later registers themselves (or the recruiter completes registration with them), the `User` row is created/linked and `user_id` is set.
**Why:** the pre-application lifecycle (`Identified → Screened → Guided to Apply → Submitted`) starts *before* the candidate has an account — that's the entire point of the screening gate (FR-2.5). Forcing a `User` row to exist at "Identified" would mean fabricating login credentials for people who haven't consented to an account, which is also a GDPR lawful-basis problem (NFR-5). This is the single biggest schema shift from the current model and touches the existing registration flow, so it's called out first.

### 1.2 Case is 1:1 with an approved `Application`, not with `Candidate`
**Decision:** `Case` is created when an `Application` reaches `approved`, carrying the 11-stage mobility journey (FR-4.1). `Candidate` can have multiple `Application`s over time (reapplying), but only approved ones spawn a `Case`.
**Why:** keeps the pre-application funnel (owned by recruiters) and the post-offer mobility lifecycle (permits, visas, travel) as distinct concerns with distinct owners, matching the SRS's own separation (Section 3a vs. 3b).

### 1.3 RBAC: six roles, one direct supervisor, central permission table
**Decision:** extend `Role` to `candidate | regional_recruiter | country_supervisor | inhouse_supervisor | director | admin`. Add `User.supervisor_id` (self-relation, nullable, required for all non-candidate/non-admin roles — "unity of command," FR-1.3). Partner/Employer users (Phase 5) are **not** folded into this enum — they get their own `PartnerUser`/scoped-access model, since they're external and need a narrower, differently-shaped access surface than internal staff.
**Why:** a flat enum plus one lookup table (`lib/rbac.ts`) is enough for 6 roles; a full policy engine would be over-engineering at this scale. Centralizing it once means every new route/page checks the same source of truth instead of reimplementing "who can see what."

### 1.4 Row-level scoping lives in the service layer, not scattered in routes
**Decision:** every list/read that returns candidates, reports, or cases passes through a `scopeToRequester(user, baseWhere)` helper: a Regional Recruiter only ever sees their own candidates; a Country Supervisor sees their country; In-House/Director/Admin see everything (optionally filtered). This helper lives in one place (`src/server/scope.ts`) and every service calls it.
**Why:** this is the actual enforcement of least-privilege (FR-1.2, NFR-4). Duplicating "if role === X then where.recruiter_id = ..." across 20 route handlers is exactly how that kind of check silently rots.

### 1.5 Introduce a service/repository layer now, not later
**Decision:** new domain logic (screening gate, report consolidation, campaign target cascade, case-stage transitions, KPI aggregation) lives in `src/server/services/*.ts`, with route handlers reduced to: parse & validate (Zod) → call service → shape response. Repositories (`src/server/repositories/*.ts`) wrap Prisma only where there's real reuse (candidates, cases, reports) — not a blanket wrapper over every model.
**Why:** the current "route calls Prisma directly" pattern was fine for 5 CRUD-ish resources. It will not survive multi-role authorization, audit logging, and KPI aggregation without turning into copy-pasted logic across dozens of files. This is the backend-patterns Repository + Service Layer pattern, applied where the SRS's own complexity (NFR-3, NFR-6) justifies it — not applied reflexively to every model.

### 1.6 Audit logging via a Prisma extension, not manual calls
**Decision:** `AuditLog` (entity_type, entity_id, action, actor_id, before/after JSON, created_at, append-only) is written automatically by a Prisma Client extension (`$extends`) hooked on `create`/`update`/`delete` for the models the SRS requires auditing (Candidate status, Application, Case/CaseStage, Report, verification/approval actions) — not by scattering `await audit(...)` calls through every service method.
**Why:** NFR-6 asks for "comprehensive, immutable" audit logging. A manual-call approach is comprehensive only until someone forgets to add the call in a new code path; a client-level hook can't be forgotten.

### 1.7 Storage: private local disk + signed, time-limited URLs
**Decision (superseded during Phase 1):** the Supabase project referenced in `.env` turned out not to be accessible/owned by the business, and the confirmed real hosting target is cPanel Node hosting (matching SRS §2.3 and the existing `output: 'standalone'`), not Vercel. Storage is therefore local disk under `UPLOAD_DIR`, kept outside `/public` (never statically servable), with a custom signed-URL mechanism: a short-lived, single-purpose JWT (`signDocumentToken`/`verifyDocumentToken` in `lib/jwt.ts`) encoding the storage path, resolved by `GET /api/documents/file?token=...`, issued only after an RBAC check by `GET /api/documents/[id]/signed-url`. `@supabase/supabase-js` was removed as a dependency.
**Why:** this directly closes FR-1.6, which is explicitly a Phase 1 **Must**. Passport scans previously sat behind a permanent, guessable-if-leaked public URL. Local disk is viable here (unlike on Vercel's ephemeral serverless functions) because the app runs as a persistent Node process on cPanel.

### 1.8 Document backup: Cloudflare R2, not dual-write
**Decision:** local disk is the only *primary* store — every write goes there first, synchronously. R2 (S3-compatible, `lib/backup.ts`) receives a best-effort copy on every save/delete, and the read path in `lib/upload.ts` self-heals from R2 if a local file is ever missing, rewriting it back to disk. Backup and restore share one mechanism rather than being separate features. If R2 env vars are unset, backup/self-heal is silently skipped — local disk keeps working as the only copy.
**Why:** NFR-7 asks for automated backups with tested restores; a single cPanel disk is a real single point of failure for documents that are often irreplaceable (passport scans, medical records). A synchronous dual-write to two stores on every request was considered and rejected — it doubles the failure surface for every upload (what happens when local succeeds and R2 doesn't, or vice versa) for a benefit that a best-effort backup + self-healing read already delivers more simply.

### 1.8 API: keep the existing surface unversioned; extend the same convention
**Decision:** do **not** introduce `/api/v1/` and do not touch the shape of existing working routes (jobs, applications, payments, auth, chat). New domain routes (`/api/recruiters`, `/api/countries`, `/api/cases`, `/api/reports`, `/api/campaigns`, `/api/partners`) follow the same flat `/api/` convention, but adopt a consistent `{ data, meta? }` / `{ error: { code, message, details? } }` envelope and correct status codes (422 for validation, 403 vs 401, 429 on rate-limited routes) going forward. Real versioning (`/api/v1/`) is deferred to Phase 5, and only if/when partner-facing external API access is introduced — that's the actual trigger for needing a stable, versioned public contract; there is no external consumer today.
**Why:** the API-design guidance defaults to "version from day one," but that default assumes a public/external API. This one has exactly one consumer (the platform's own frontend) and renaming working, live routes to satisfy a convention would be pure churn with real regression risk for zero present benefit.

### 1.9 Frontend: extend the existing design system, don't invent a new one
**Decision:** dashboards reuse the tokens and utility classes already defined in `globals.css` (`midnight-950/900/800`, `gold-400/500`, `ivory-50/100`, `.card`, `.badge-*`, `.eyebrow`, `.section-title`, Outfit font, Phosphor icons) inside a new shared `PortalShell` layout (dark sidebar on `midnight-950`, ivory content area, gold accents for active/primary states). No new fonts, no new palette.
**Why:** the brand aesthetic is finalized and management has already signed off on it. The distinctiveness the frontend-design skill asks for comes from applying that already-distinctive system well to a new context (dense operational screens), not from inventing a second visual language for "internal" pages — that's exactly the kind of inconsistency that made the current admin panel feel bolted-on.

### 1.10 KPI dashboards follow the dataviz method, palette mapped from brand tokens
**Decision:** stat tiles for headline numbers (agent sign-ups, conversion rate) rather than gauges/donuts; a funnel (not a pie) for applicant-flow-by-stage; grouped bars for targets-vs-actuals (never dual-axis); one hue ramp per series family assigned in fixed order (gold for primary/actual, a muted ivory/gray step for target-ghost bars, a status palette — distinct from the categorical ramp — for on-track/at-risk/behind). Every chart gets a table-view fallback and a legend when it has ≥2 series. Palette run through `validate_palette.js` before shipping using the brand's actual hex values, in both light (ivory) and dark (midnight) chart surfaces.
**Why:** this is a direct application of the loaded dataviz skill — computed, not eyeballed, and consistent with the "targets vs actuals," "conversion rate," "filterable by country/region/recruiter/campaign" requirements in FR-3.2/FR-3.8.

---

## 2. Data model additions (by phase)

Extends the existing `User, Candidate, Job, Application, Payment, SystemSetting, KnowledgeArticle, EmailTemplate`.

**Phase 1**
```
enum Role { candidate regional_recruiter country_supervisor inhouse_supervisor director admin }

model User {
  ...
  role          Role   @default(candidate)
  supervisor_id String?
  supervisor    User?  @relation("Supervision", fields: [supervisor_id], references: [id])
  reports       User[] @relation("Supervision")
  country_id    String?
  country       Country? @relation(fields: [country_id], references: [id])
}

model Region  { id String @id @default(cuid()) name String @unique  countries Country[] }
model Country { id String @id @default(cuid()) name String @unique  region_id String  region Region @relation(...)  users User[]  candidates Candidate[] }

model Candidate {
  ...
  user_id      String?           // now nullable
  source       CandidateSource   @default(self_registered)
  recruiter_id String?
  recruiter    User? @relation("RecruiterCandidates", fields: [recruiter_id], references: [id])
  country_id   String?
  lifecycle_status CandidateLifecycleStatus @default(identified)
}
enum CandidateSource { self_registered recruiter_sourced }
enum CandidateLifecycleStatus { identified screened guided_to_apply submitted reported verified approved }

model Document {
  id            String @id @default(cuid())
  candidate_id  String
  type          DocumentType
  storage_path  String            // private bucket path, not a public URL
  verification_status VerificationStatus @default(pending)
  verified_by   String?
  verified_at   DateTime?
  uploaded_at   DateTime @default(now())
}
enum DocumentType { cv passport transcript certificate medical police_clearance contract visa other }
enum VerificationStatus { pending verified rejected }

model AuditLog {
  id          String @id @default(cuid())
  entity_type String
  entity_id   String
  action      String        // create | update | delete | verify | approve
  actor_id    String
  before      Json?
  after       Json?
  created_at  DateTime @default(now())
  @@index([entity_type, entity_id])
  @@index([actor_id])
}
```

**Phase 2 (revised — see note below)**
```
// Pre-registration identity (used only when user_id is null — a
// recruiter-sourced lead who hasn't created an account yet). Once linked
// to a User, the User's fields become authoritative.
model Candidate {
  ...
  full_name String?
  phone     String?
  email     String?

  // Screening gate (FR-2.5) + verification-return workflow (FR-2.7)
  consent_given Boolean   @default(false)
  consent_at    DateTime?
  return_reason String?   @db.Text
}
```
**Superseded:** the `RecruiterProfile` model and "recruiter CRUD + reassignment API" originally planned here are no longer needed — Phase 1's `User.supervisor_id`/`assigned_country_id` plus the Staff & Roles admin page already deliver exactly this (create staff, assign supervisor, assign country), built ahead of schedule when Phase 1 was extended to include real UI. Candidate attribution and pre-application lifecycle statuses are also already covered by Phase 1. Phase 2's actual remaining scope is: capturing a pre-registration lead's identity (above), the screening-gate rule engine, and the recruiter/supervisor portal workflows built on top of it.

**Phase 3**
```
model Report {
  id            String @id @default(cuid())
  type          ReportCycle          // daily weekly monthly
  scope_level   ScopeLevel           // recruiter country
  country_id    String?
  submitted_by  String
  period_start  DateTime
  period_end    DateTime
  status        ReportStatus @default(draft)   // draft submitted verified consolidated
  content       Json
  parent_report_id String?          // recruiter reports roll up into a country report
  created_at    DateTime @default(now())
}

model Campaign {
  id          String @id @default(cuid())
  name        String
  criteria    Json
  created_by  String
  start_date  DateTime
  end_date    DateTime?
}

model CampaignTarget {
  id           String @id @default(cuid())
  campaign_id  String
  metric       String       // agent_signups | applicant_flow | conversion_rate | ...
  country_id   String?
  region_id    String?
  target_value Float
}
```
KPI *actuals* are computed by aggregation queries over `Candidate`/`Application`/`Report`, not stored — avoids a second, driftable copy of the truth.

**Phase 4**
```
model Case {
  id             String @id @default(cuid())
  application_id String @unique
  current_stage  CaseStage @default(application_submitted)
  created_at     DateTime @default(now())
}
enum CaseStage {
  application_submitted verification offer_issued initial_payment
  permit_processing permit_delivered final_payment
  visa_application visa_guidance visa_approved travel_settlement
}
model CaseStageEvent {
  id          String @id @default(cuid())
  case_id     String
  stage       CaseStage
  owner_id    String?
  entered_at  DateTime @default(now())
  completed_at DateTime?
  notes       String? @db.Text
}
model RetentionFollowUp {
  case_id       String @id
  due_at        DateTime      // +90 days from travel_settlement
  completed_at  DateTime?
  notes         String? @db.Text
}

model FeePolicy {
  id             String   @id @default(cuid())
  country_id     String?               // null = global default; a country-specific row overrides it
  enabled        Boolean  @default(false)
  initial_amount Float?
  final_amount   Float?
  currency       String   @default("USD")
  updated_by     String
  updated_at     DateTime @updatedAt
}
```
No leadership sign-off gates the code: `FeePolicy` defaults to `enabled: false`, and an admin settings screen lets the System Administrator turn milestone payments on and set amounts (globally or per destination country, since local law was the reason this was a policy question in the first place) whenever the business decides. Milestone-payment logic in the Case engine reads this policy at runtime instead of a hardcoded rule.

**Phase 5**
```
model Partner {
  id      String @id @default(cuid())
  name    String
  type    PartnerType    // travel_agency visa_consultancy manpower_supplier
  status  PartnerStatus  // prospect active inactive
  contact_json Json
}
model EmployerClient {
  id   String @id @default(cuid())
  name String
  contact_json Json
  jobs Job[]              // Job gets employer_client_id
}
```

---

## 3. API surface (new routes, following the conventions in §1.8)

```
# Reference data
GET    /api/regions
GET    /api/countries

# Agent network
GET    /api/recruiters?country=...&supervisor=...
POST   /api/recruiters
PATCH  /api/recruiters/:id                 # reassign supervisor/country
GET    /api/recruiters/:id/candidates

# Candidates (pre-application funnel)
POST   /api/candidates                    # recruiter registers a lead
PATCH  /api/candidates/:id/status         # identified→screened→guided... (screening-gate enforced server-side)
GET    /api/candidates?status=&country=&recruiter=

# Documents
POST   /api/documents                     # upload, typed
GET    /api/documents/:id/signed-url      # short-lived, RBAC-checked
PATCH  /api/documents/:id/verify

# Reporting
POST   /api/reports                       # submit (recruiter or country level)
PATCH  /api/reports/:id/verify            # country supervisor verifies/consolidates
GET    /api/reports?cycle=&scope=&country=&period=

# Campaigns & KPIs
POST   /api/campaigns
GET    /api/campaigns/:id/kpis?country=&region=&period=
GET    /api/dashboard/kpis                # aggregated, filterable — powers the Management dashboard

# Cases (Phase 4)
GET    /api/cases/:id
PATCH  /api/cases/:id/stage
POST   /api/cases/:id/documents

# Partners (Phase 5)
GET/POST /api/partners
GET/POST /api/employer-clients

# Audit
GET    /api/audit-logs?entity_type=&entity_id=   # admin/director only
```

Every mutating route: Zod-validated body, `requireRole([...])`, then `scopeToRequester` where the action isn't already role-exclusive.

---

## 4. Frontend architecture

- **New route segments**, each behind `middleware.ts` role checks: `/recruiter`, `/supervisor`, `/management`, plus the existing `/admin` (system admin) and `/dashboard` (candidate, unchanged).
- **`PortalShell`** (`src/components/portal/PortalShell.tsx`): shared shell — `midnight-950` sidebar with Phosphor-icon nav items filtered by role, ivory-50 content area, gold-400 active/accent states, reusing `.card`/`.badge-*`/`.eyebrow` from `globals.css`. Replaces the current flat tab-switcher in `/admin/page.tsx`, which gets migrated onto the same shell for visual consistency.
- **Dashboard components** (`src/components/portal/dashboard/*`): `StatTile`, `FunnelChart`, `TargetVsActualBars`, `TrendLine` — built per the dataviz method in §1.10, filter row (country/region/recruiter/campaign/period) above the charts per that skill's interaction spec.
- **Multi-language**: existing Google Translate integration is retained; no additional i18n framework introduced (NFR-10 is already substantially met by what's live).

---

## 5. Phased delivery plan

Mirrors SRS §8 exit criteria exactly, sequenced so each phase is independently shippable and testable on staging before the next begins.

### Phase 1 — Foundation, Access Control & Data Structure
1. Version control hygiene: confirm `.env`-only secrets (FR-1.8), set up staging environment/branch (FR-1.7).
2. Schema migration: `Role` enum extension, `supervisor_id`, `Region`/`Country`, `Candidate.user_id` nullable + `source`/`recruiter_id`/`lifecycle_status`, `Document`, `AuditLog`. No production candidate data exists yet, so this is a clean additive migration with no backfill step.
3. `lib/rbac.ts` + extend `api-auth.ts` (`requireRole`, `scopeToRequester`) + rewrite `middleware.ts` for the new path prefixes.
4. Storage: flip bucket private, implement signed-URL endpoint, migrate existing upload/display call sites.
5. Remove the placeholder-jobs fallback (FR-1.5) — jobs page shows real DB data or an explicit empty state.
6. Audit-log Prisma extension wired to the models named in §1.6.
7. **Exit:** roles, RBAC, region/country model, secure storage, and environments live; placeholder jobs gone. Signed off on staging by System Administrator + a Director.

### Phase 2 — Agent-Network Core
_(Recruiter CRUD, reassignment, and country assignment already shipped in Phase 1 — see the "Superseded" note in §2.)_
1. Candidate schema additions: pre-registration identity (full_name/phone/email) + consent + return_reason.
2. Screening-gate rule engine (`src/server/services/screening.ts`): data completeness, documentation present and not rejected, consent given, minimum-age eligibility — blocks the `guided_to_apply` transition until all pass. ("Role suitability" from FR-2.5 has no dedicated matching model yet — that's Phase 4's Case/stage territory — so it's folded into data completeness for now, noted explicitly rather than inventing an unspec'd field.)
3. `POST /api/candidates`: a recruiter registers a new lead (name/nationality/DOB/passport/contact), defaulting country to their own assigned country.
4. `PATCH /api/candidates/[id]/status`: role-gated lifecycle transitions — recruiter drives identified → screened → guided_to_apply (screening-gated) → submitted → reported for their own candidates; supervisor (excluded from verifying their own sourced candidates, same conflict-of-interest rule as document verification) drives reported → verified → approved, or returns a candidate to an earlier stage with a required reason (FR-2.7), for candidates in their country. All transitions audited.
5. Regional Recruiter portal (`/recruiter`): register-candidate form, status controls, screening-gate failure reasons surfaced inline.
6. Country Supervisor portal (`/supervisor`): verify/return controls with a reason field.
7. **Exit:** Recruiter/Supervisor sections operational; screening gate enforced; every candidate attributed to a recruiter/country.

### Phase 3 — Control, Reporting & Governance
1. `Report`, `Campaign`, `CampaignTarget` models + submission/verification/consolidation API.
2. Management/Control dashboard (`/management`): KPI tiles + funnel + targets-vs-actuals, filterable, per §1.10.
3. Reporting cadence: daily/weekly/monthly submission workflow and reminders.
4. Escalation path (recruiter → country supervisor → in-house → management) surfaced as a visible status trail, not just a permission chain.
5. Export (PDF/CSV) for dashboards/reports (FR-3.8).
6. **Exit:** dashboard, KPIs, reporting cycles, approval workflow, and audit trail in active use.

### Phase 4 — Extended Mobility Lifecycle
1. `Case`/`CaseStageEvent` models; case auto-created on application approval.
2. Case management UI across all portals (recruiter/supervisor/management views scoped appropriately).
3. Contract generation + e-signature integration (shared groundwork with Phase 5's e-signature vendor choice).
4. Milestone payments mapped to stages, gated by the admin-configurable `FeePolicy` (see §2) — no external policy decision blocks this shipping; an admin enables/configures it whenever ready.
5. `RetentionFollowUp` (90-day) with reminders.
6. **Exit:** full 11-stage case management live with permit/visa/travel tracking, contracts, and milestone payments.

### Phase 5 — Partner CRM & Integrations
1. `Partner`, `EmployerClient` models + CRUD, `Job.employer_client_id` link.
2. Integrations (each isolated behind an adapter interface so a vendor swap doesn't ripple through the app): Microsoft 365/Teams (identity/notifications), Calendly (scheduling), e-signature (contracts), BI layer (read-only DB access for Metabase/Power BI), WhatsApp Business API (messaging).
3. **Exit:** partner/employer records live; all five integrations delivered.

---

## 6. Cross-cutting

- **Testing:** Playwright E2E per role portal's critical path (screening gate, report consolidation, case stage transition); unit tests on the service layer (screening rules, KPI aggregation, scoping helper) — this is exactly the logic where a bug is an authorization or data-integrity bug, not a cosmetic one.
- **Migrations:** every schema change ships as an additive, reversible Prisma migration; nothing destructive without a staging soak first (NFR-9).
- **Security:** rate limiting extended to all new mutating routes (existing `lib/rate-limit.ts` pattern reused); OWASP Top 10 pass before each phase sign-off (NFR-4).
- **GDPR (NFR-5):** `Consent`/retention metadata is a Phase 1 data-model concern even though it's not customer-visible yet — added alongside `Candidate` so it's not retrofitted later onto records that already exist without consent capture.

## 7. Risks

| Risk | Level | Mitigation |
|---|---|---|
| One IT administrator delivering a 5-phase SRS | High | Phases are independently shippable; scope can pause after any phase without leaving the system broken |
| Third-party procurement (M365, e-signature, WhatsApp Business, BI) not yet in place | Low (Phase 5 only) | Adapter-interface pattern means the app-side work can proceed against a stub before contracts are signed |

Resolved / not applicable, confirmed with the business:
- **Candidate-fee policy** — no longer a blocking external decision. Implemented as an admin-configurable `FeePolicy` (§2, §5 Phase 4), defaulting to disabled. The System Administrator turns it on and sets amounts whenever ready; engineering isn't gated on it.
- **`Candidate.user_id` nullable / registration-flow regression** — confirmed no live candidate data exists in production yet, so there's no backfill or existing-row migration to get right. The schema change ships as a clean additive migration with no data-migration risk.
- **Storage bucket flip breaking hardcoded URLs** — confirmed no hardcoded public-URL references exist to worry about. The bucket flips to private and signed URLs from the start, with no call-site audit required.

**Delivery approach:** phase-by-phase, sequentially — not parallelized. Each phase is fully built, tested on staging, and signed off (System Administrator + a Director) before the next begins, per SRS §8.

**Open follow-up — admin-scope ownership of legacy ATS screens:** during Phase 1's admin-panel migration onto `PortalShell`, Jobs, Applications (status review), Candidates pool, and Finances were kept under System Administrator, matching exactly what the old binary `candidate/admin` role model already allowed — no access was widened or narrowed. The SRS's §2.2 role definitions don't assign these screens to a specific role; they predate the phase-based RBAC model and are explicitly "retained, not re-specified" per the SRS's constraints. Once Phase 2 delivers the Regional Recruiter's own candidate/application tracking (FR-2.1) and Phase 3 delivers the In-House Supervisor's campaign-control dashboard (FR-3.1), expect real overlap with these admin screens — Applications review in particular will likely need re-scoping away from pure admin rather than being left duplicated across two places.

## 8. Complexity estimate

| Phase | Complexity | Primary risk driver |
|---|---|---|
| 1 | High | Foundational — every later phase depends on its RBAC/schema being right, even with no data-migration risk |
| 2 | High | New portals + the screening-gate rule engine |
| 3 | Medium-High | KPI aggregation correctness + dashboard build |
| 4 | High | Largest surface area (11 stages) + policy dependency |
| 5 | Medium | Mostly integration adapters, well-isolated |

---

**WAITING FOR CONFIRMATION** — proceed with this architecture and phased plan? (yes / modify: ... / different approach: ...)

Once confirmed, Phase 1 starts with the schema migration and RBAC/storage fixes (§5, Phase 1, items 1-4), since everything else in the SRS depends on them.
