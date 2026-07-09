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

### Phase 2 — Agent-Network Core — delivered 2026-07-08
_(Recruiter CRUD, reassignment, and country assignment already shipped in Phase 1 — see the "Superseded" note in §2.)_
1. Candidate schema additions: pre-registration identity (full_name/phone/email/desired_role) + consent + return_reason.
2. Screening-gate rule engine (`src/server/services/screening.ts`): data completeness (name, nationality, DOB, passport, phone, **and email specifically** — phone alone is enough to register a lead, but email becomes mandatory by the time they're guided to apply, since status-update emails, receipts, and their eventual account login all depend on it — and desired_role, satisfying FR-2.8's "role" data point), documentation present and not rejected, consent given, minimum-age eligibility — blocks the `guided_to_apply` transition until all pass. ("Role suitability" from FR-2.5 has no dedicated matching model yet — that's Phase 4's Case/stage territory — represented here as just requiring desired_role be on file, not an actual suitability judgment.)
3. `POST /api/candidates`: a recruiter registers a new lead (name/nationality/DOB/passport/contact/desired_role), defaulting country to their own assigned country. `PATCH /api/candidates/[id]` fills in the rest progressively, and `POST /api/upload?candidate_id=` lets a recruiter/supervisor upload documents on a lead's behalf (added mid-phase — the original self-upload-only endpoint made the screening gate unreachable for any recruiter-sourced candidate, since they have no account to log in and upload with themselves).
4. `PATCH /api/candidates/[id]/status`: role-gated lifecycle transitions — recruiter drives identified → screened → guided_to_apply (screening-gated) → submitted → reported for their own candidates; supervisor (excluded from verifying their own sourced candidates, same conflict-of-interest rule as document verification) drives reported → verified → approved, or returns a candidate to an earlier stage with a required reason (FR-2.7), for candidates in their country. All transitions audited.
5. Regional Recruiter portal (`/recruiter`): register-candidate form, status controls, screening-gate failure reasons surfaced inline, document upload, progressive detail editing.
6. Country Supervisor portal (`/supervisor`): verify/return controls with a reason field.
7. Real, automated coverage: `screening.test.ts` (10 cases), `candidateLifecycle.test.ts` (10 cases, the role-gating rules), and `e2e/candidate-lifecycle.spec.ts` (full recruiter→supervisor journey through a real browser against a real DB).
8. **Exit:** Recruiter/Supervisor sections operational; screening gate enforced; every candidate attributed to a recruiter/country — all verified against a live database, not just built.

**Resolved 2026-07-08:** FR-2.1's "submit regional reports and candidate lists" and FR-2.2's "consolidate regional submissions and submit finalised country reports to In-House" were flagged here as a gap, deferred to Phase 3's `Report` model. Phase 3 has since shipped that model plus the full submission/verification/consolidation workflow (`src/server/services/reportWorkflow.ts`, `/recruiter/reports`, `/supervisor/reports`, `/management/reports`) — this closes the gap. All of FR-2.1 through FR-2.9 is now fully built and verified.

### Phase 3 — Control, Reporting & Governance — delivered 2026-07-08
1. `Report` (draft/submitted/verified/returned/consolidated, `parent_report_id` rollup), `Campaign`, `CampaignTarget` models. Campaign requires a bounded `start_date`/`end_date` — a campaign is a timeline, not open-ended (caught by the user before shipping).
2. KPI aggregation service (`src/server/services/kpi.ts`): agent sign-ups, recruiter response rate (FR-3.2's "agency response rate" has no Agency/Partner entity yet — Phase 5 — interpreted as % of identified candidates a recruiter actually screened, disclosed in the code comment), applicant flow funnel, overall + stage-to-stage conversion rates, targets vs actuals — all live aggregation over Candidate/Application/Campaign, never a stored, driftable copy.
3. Role-gated report workflow (`src/server/services/reportWorkflow.ts`): exactly one controlling position per scope — a country_supervisor reviews recruiter-scope reports, in-house/director review country-scope reports (FR-3.5). A recruiter submits; a supervisor verifies/returns recruiter reports and consolidates verified ones into a country report; in-house verifies/returns that. Escalation trail (FR-3.7) surfaced as real data (`parent_report_id`) and a visible UI trail, not just a permission chain.
4. Campaign set-up UI (`/management/campaigns`, FR-3.3) and Management/Control dashboard (`/management`, FR-3.1/3.2/3.8) — KPI stat tiles, applicant-flow funnel and stage-conversion charts (dataviz skill: validated ordinal green ramp for the funnel, gold accent + reserved status icons for targets-vs-actuals — never mixing the two encodings), filterable by region/country/campaign/date-range preset, plus a table view underneath (accessibility requirement — every chart's data is also reachable without it).
5. Reporting-cycle UI on `/recruiter/reports`, `/supervisor/reports`, `/management/reports` (FR-3.4).
6. CSV export (`/api/candidates/export`, FR-3.8) — reuses the same role-scoping as every other candidate query, so an export can never contain more than the viewer could already see in the app.
7. Real, automated coverage: `kpi.test.ts` (8 cases, integration-style against real seeded candidates), `reportWorkflow.test.ts` (7 cases), and `e2e/report-workflow.spec.ts` (the full recruiter → supervisor → management escalation through a real browser against a real DB).
8. Cross-phase gap closure (see §7's Phase 1/2 follow-ups below): `/recruiter/applications` and `/supervisor/applications` (FR-2.1) and DB-level audit-log immutability (FR-3.6).

**Resolved 2026-07-08:** FR-3.6 — the audit trail is now immutable at the database level, not just by app discipline. `prisma/audit-log-immutability.sql` adds `BEFORE UPDATE`/`BEFORE DELETE` triggers on `AuditLog` that reject the operation outright (verified: both a manual `UPDATE` and `DELETE` against a real row were rejected with a Postgres error). Required one-time step per database, documented in `CLAUDE.md`, since `prisma db push` doesn't track raw SQL.

**Confirmed with the business 2026-07-08 — deliberately deferred, not oversights:**
- FR-3.4 ("Should" via this doc's own original phrasing, not literal SRS text): no automated reminders for overdue reports. Deferred to Phase 4/5 — not literally required by the SRS's FR-3.4 wording (asks for cycles to be *supported*, not reminded about), and needs a background scheduler + a "due date" concept that don't exist yet.
- FR-3.8 (Should): CSV export is done; PDF export was explicitly skipped. CSV substantially satisfies the exportability requirement without adding a new PDF-generation dependency.

### Phase 4 — Extended Mobility Lifecycle — delivered 2026-07-09
1. `Case` (11-stage `CaseStage` enum, one per `Application`, auto-created the moment an application is approved — from *either* admin approval path, the list view's inline dropdown and the detailed-view editor) and `CaseStageEvent` (stage/owner/entered_at/completed_at/notes — the audit trail FR-4.2 asks for). Auto-creation logic lives in `src/server/services/caseLifecycle.ts` (`createCaseForApprovedApplication`, idempotent), integration-tested against a real DB.
2. Case management UI across recruiter/supervisor/management/admin (`/*/cases`, `/*/cases/[id]`), sharing one `CaseDetail` component — stage-advance form (role-gated: a recruiter advances forward only, a supervisor+ can also return a case, mirroring the Phase 2 candidate-lifecycle shape without reusing its single hard boundary, since a case has no equivalent hand-off gate), stage history, document upload/verification, contract, milestone payments, and retention follow-up all in one place. An 11-segment progress strip (one brand hue, filled to the current stage) replaces per-stage color-coding — nobody can tell 11 hues apart at a glance, and the label already carries the specific information.
3. Contract generation + signature capture (FR-4.3) — the candidate signs with a typed full-legal-name attestation, tied to their authenticated session, timestamp, and IP: a real, legally-recognized "simple electronic signature," not a stub. The paid e-signature vendor (DocuSign/Dropbox Sign) is deliberately not integrated — the platform recommendation places that under "Integrate," scoped to Phase 5, and this Contract model is exactly the groundwork a vendor swap would sit behind.
4. Work-permit/visa deadline tracking (FR-4.4): a staff-entered `stage_deadline` on `Case` (never a system-computed SLA guess — none is specified anywhere), surfaced as an overdue/due-soon urgency badge in every case list.
5. Milestone payments (FR-4.5): `CasePayment` (initial/final, amount, receipt reference), gated by the admin-configurable `FeePolicy` (global or per destination country, defaults disabled — no leadership sign-off blocks this shipping) at `/admin/fee-policy`. This *records* that a payment was collected; it is not a new Stripe/PayPal charge flow, which is the separate, already-built candidate application-fee path.
6. Document verification widened (FR-4.6): `POST /api/upload` was hard-restricted to `cv`/`passport` only — widened to the full mobility document set (`transcript`, `certificate`, `medical`, `police_clearance`, `contract`, `visa`). The verification workflow itself (`DocumentVerifyControls`, audit-logged) was already generic and needed no change.
7. `RetentionFollowUp` (FR-4.7, Should) auto-starts (due_at = +90 days) the moment a case reaches its final stage, `travel_settlement`. Flight/accommodation/arrival details are captured via that stage's `CaseStageEvent.notes` rather than a dedicated structured model — a deliberately modest scope choice for a Should.
8. Stage-based candidate notification (FR-4.8, Should): every stage change best-effort emails the candidate (skipped if they have no linked account yet) — the same "correct code path, untested real delivery" pattern as every other email in this codebase, since there's no working SMTP in dev. "Assigned staff" notification specifically was not built.
9. Real, automated coverage: `caseLifecycle.test.ts` (9 pure-logic cases), `caseLifecycle.integration.test.ts` (3 cases against a real DB — creation, idempotency, audit logging), and `e2e/case-lifecycle.spec.ts` (the full browser flow: admin approves → case auto-opens → stage advance → contract issued → candidate signs from their own dashboard).
10. Two real, pre-existing bugs surfaced and fixed along the way (not introduced by Phase 4, but found by testing it): `/admin/applications` (list and detail) assumed every candidate has a linked user account and crashed outright — client-side on the list view, server-side (email send) on the detail view's PUT — whenever a recruiter-sourced lead without an account had an application. Both now fall back to the candidate's own pre-registration `full_name`/`email`/`phone`, matching the pattern already used in `ApplicationsList.tsx`. The detailed view's PUT handler was also missing the case-auto-creation hook entirely — approving from there silently opened no case.

**Confirmed with the business — deliberately deferred, not oversights:**
- FR-4.4/4.8: no automated (email/push) reminders — same reasoning as Phase 3's deferred report reminders. Deadlines are real staff-entered data with real in-app urgency indicators, just not a background scheduler yet.
- FR-4.3: the actual e-signature vendor integration is Phase 5's, per the platform recommendation's own "Integrate" column.

### Framework-alignment role restructuring — delivered 2026-07-09
Post-Phase-4 amendment. Auditing the platform against the business's actual Regional Supervisory Operational Workflow document (three tiers — Regional Recruiter, Country Supervisor, In-House Supervisor — each "one controlling position per process") surfaced a real drift: System Administrator had accumulated ownership of day-to-day operational workflows (candidate approval, Jobs, Applications, Fee Policy, a redundant `/admin/cases`) that the framework assigns to specific operational roles, not to a system-level role. Confirmed with the business: Admin should be restricted to system-level concerns (accounts, reference-data taxonomy, technical settings), keeping override access everywhere for support purposes, but not being the primary place operational decisions get made.
1. Candidate `verified → approved` restricted to In-House Supervisor/Director only (`candidateLifecycle.ts`'s `IN_HOUSE_ROLES`) — the framework's "Approved by In-House" is a distinct, higher tier than Country Supervisor's "Verified" ceiling, not something a supervisor can also do. Country Supervisor is explicitly blocked from any `approved`-adjacent transition (forward or reverse).
2. Case auto-creation's trigger re-pointed to this real approval event (unchanged code path, just now firing from the correct, framework-defined gate rather than a broader one).
3. Jobs, Applications review, and Fee Policy moved off `/admin` to `/management` (In-House Supervisor/Director's portal) — matching the workflow document's role assignments. The redundant `/admin/cases` (a duplicate of `/management/cases`) was deleted outright rather than kept as a second read path.
4. Candidate screening's `screening_result` (pass/fail) is now persisted on the `Candidate` record rather than recomputed transiently, so oversight views (now visible to In-House, not just the recruiter who ran the check) show the same result everyone else sees.
5. A new `marketing` role, created after a further business clarification mid-review: job postings are solely marketing's responsibility, deliberately kept **outside** the three-tier operational hierarchy (not a fourth rung, a parallel lane) — `lib/rbac.ts`'s `STAFF_ROLES` (candidate-hierarchy scoping) stays narrower than `lib/validations.ts`'s `STAFF_ROLES` (all assignable staff roles) specifically so `marketing` is assignable without inheriting `isStaffRole()`'s broader candidate/application access. Jobs moved a second time, from `/management` to a new `/marketing` portal; Admin retains override access throughout.
6. New `/marketing` portal (`marketingNav.ts`, `PORTAL_ACCESS["/marketing"]`) and a marketing test account, following the same pattern as every other role's test account.

### Application model pivot — general Candidate Information Form — delivered 2026-07-09
Post-Phase-4 amendment, driven by the business clarifying the real intake process: candidates don't apply to specific job listings today (jobs aren't listed on the platform yet) — they submit a general programme-interest form, matching Vertex's real-world "Candidate Information Form" (European Work Permit & Visa Application), whether filled in by the candidate themselves or by a regional recruiter on their behalf. A parallel partner/agency intake form exists for Phase 5.
1. `Application.job_id` widened to nullable (was required, with a `[candidate_id, job_id]` unique constraint that no longer means anything once a candidate can have a job-less application) — `job_id` stays in the schema for when real job matching exists, but every current submission path leaves it empty. Duplicate-submission protection moved from the old unique constraint to an explicit check: a candidate can't have a second non-`rejected` `Application` on file.
2. `Application` widened with the form's own fields: `preferred_country_1/2/3_id` (`Country` doubles as the destination-programme picker — see below), `preferred_sector_id`, `earliest_travel_date`, `prior_eu_visa_applied`, `current_location_country`, `holds_schengen_visa`, `prior_visa_refusals`, `available_for_embassy_appointment`, `willing_to_start_within_30_days`, `preferred_contact_channel`, `payment_plan_acknowledged` (a required, literal-`true` field — the payment plan must be explicitly ticked, not just displayed).
3. New `Sector` model (admin-managed "Preferred Type of Work" options) and `CountryDocumentRequirement` (admin-managed, per-country extra document requirements — e.g. Poland needs all passport pages, Belarus needs a national ID copy — beyond the universal passport/photo/CV set every programme requires). Both are data-driven, matching the existing `FeePolicy`/`CampaignTarget` pattern of admin-configurable business rules over hardcoded ones. Managed at `/admin/sectors`.
4. `Country` (already region-scoped reference data used for recruiter/supervisor territory assignment) doubles as the candidate's destination-programme picker, scoped to whichever countries admin has placed under the "Europe" region — the business's own framing ("the countries admin sets in Europe are the ones a user can select from"). Source-market regions (Africa, Middle East & Gulf) are unaffected; a public `GET /api/apply/options` exposes just the Europe-scoped countries and the sector list, unauthenticated, for the apply form.
5. `DocumentType` widened with the form's Section 3 checklist items (`all_passport_pages`, `passport_photo`, `national_id`, `cv_europass`, `education_diploma`, `driving_licence`, `tachograph_card`, `professional_training_certificate`, `e_apostille`, `zab_recognition_letter`) — and `POST /api/upload`'s allowlist, which had been widened for Phase 4's document set but not for these, was widened again (a schema/enum change alone doesn't propagate to a hardcoded allowlist; this was caught by grep, not `tsc`, same lesson as item 6 below).
6. `MilestonePaymentType`/`FeePolicy` extended from a 2-stage (initial/final) to the form's real 3-stage plan: `documentation` (Stage 1 · 20%, on engagement), `permit` (Stage 2 · 40%, after the work permit is issued), `visa` (Stage 3 · 40%, after the visa is granted). Renamed `FeePolicy.initial_amount/final_amount` → `documentation_amount/permit_amount/visa_amount`.
7. Public `/apply` rewritten: an authenticated-candidate-only flow (unchanged from before) combining a "Section 2" personal-information form (`CandidateProfileForm`, self-service, `PUT /api/candidates/profile`) with the Section 1/4/5 application form (`ApplicationForm`, shared component, `POST /api/applications`). The two speculative Hungary/Greece landing pages (`/apply/hungary`, `/apply/greece`) were retired — they were static mockups with no real submission path (`onClick={() => alert(...)}`, no API call at all) built before this model existed; the one generic multi-country form now supersedes them.
8. Recruiter-assisted flow: `CandidateApplyOnBehalf` rewritten from a job-picker dropdown to the same shared `ApplicationForm` (rendered in a modal, given its size), and `CandidateEditDetails`/`updateCandidateDetailsSchema` widened with the form's Section 2 fields so a recruiter can complete a lead's full profile, not just the original DOB/passport/email/desired-role subset.
9. A systemic bug swept across every Application/Case surface: once `job_id` could be null, every call site that assumed `application.job.title` always existed became a crash risk — client-side (Applications/Cases lists and detail views across all four portals, the candidate dashboard) and server-side (status-change and stage-change confirmation emails). All were found by grepping for `.job.title`/`.job.city`/`.job.country` rather than relying on `tsc` (loosely-typed API responses don't surface these), fixed with a `job ?? preferred_sector/preferred_country_1` fallback everywhere, consistent with the existing candidate-`full_name`-fallback pattern from Phase 4.

### Pre-application lifecycle re-sequenced around the Candidate Information Form — delivered 2026-07-09
Second amendment the same day, after the business clarified the *order* of the real intake process: the Candidate Information Form (CIF) is the very first thing anyone fills in — the candidate themselves (no account yet) or a recruiter on a walk-in lead's behalf — and it's what gets screened, before any account or documents exist. Only once screening passes does the candidate get emailed an invite to create their own account; only then do they upload documents. This reverses two things the *first* same-day amendment above had just built (the authenticated-only `/apply` gate, and `CandidateApplyOnBehalf`'s existing-candidate-only scope) and retires the recruiter's separate lightweight quick-add entirely.

`CandidateLifecycleStatus`'s 7 values are unchanged (renaming would ripple through the KPI funnel, stage-color maps, and every existing test for no real benefit) — only what triggers each transition changed:

| Status | Trigger now |
|---|---|
| `identified` | The CIF is submitted — creates the `Candidate` + `Application` together in one shot (`POST /api/applications`'s new branch), for either an anonymous self-service submitter or a recruiter entering a walk-in lead. |
| `screened` | Still a manual staff click, but now actually gated: `evaluateScreeningGate` (rewritten) checks the CIF + the candidate's own Section 2 answers — full name, nationality, DOB (18+), passport number **and expiry (≥ 6 months' validity, newly enforced)**, phone, email, consent — not documents, since none exist yet. Passing sends the existing account-creation invite email (previously unconditional at this transition; now only reachable once the gate has already passed). |
| `guided_to_apply` | System-only now — fires from `POST /api/auth/register` when the candidate claims their invite link and creates their account. No longer a manual recruiter action (`canSetLifecycleStatus` now rejects it the same way it already rejected manual `submitted`). |
| `submitted` | System-only — fires from `POST /api/upload` once a new `documentCompleteness.ts` service confirms the universal set (`cv`/`passport`/`passport_photo`) plus any `CountryDocumentRequirement` extras for the candidate's chosen destination are all uploaded. This is the first real consumer of `CountryDocumentRequirement` — it existed with an admin UI but no reader until now. |
| `reported`/`verified`/`approved` | Unchanged. |

1. Recruiter auto-assignment for a self-service submission: new `src/server/services/recruiterAssignment.ts` (`assignNextRecruiterForCountry`), round-robin among the Regional Recruiters `assigned_country_id`-matched to the candidate's chosen current-location country — whose turn is next is derived from the most recently created candidate already assigned in that country (no new stored cursor), not a persisted rotation pointer. Only runs for an anonymous submission; a recruiter entering a walk-in lead is themselves the assigned recruiter (or, if a non-recruiter staff role does it — e.g. a supervisor stepping in — the same round-robin runs rather than misattributing the lead to them).
2. `Application.current_location_country` (free text) → `current_location_country_id` (`Country` FK) — needed to match against `User.assigned_country_id` for (1). Scoped in the UI to every region *except* "Europe" (the source-market regions already used for recruiter territory), the mirror image of the destination-country picker.
3. Section 3 (Document Checklist) turned out to be a self-reported "can you provide this?" checklist on the form itself (tick-boxes), not a file-upload step — corrected after initial confusion; added `Application.documents_available: DocumentType[]`, populated from the same static 12-item list the form displays (matching the source document's exact wording and "Required for: X" tags), distinct from the `Document` model (which tracks what's actually been uploaded and verified, later).
4. `POST /api/candidates` (the recruiter's old lightweight quick-add, `registerCandidateSchema`) removed outright — the CIF is now the only intake path for both self-service and recruiter-assisted leads. `RegisterCandidateForm.tsx` now opens the same shared `ApplicationForm` (with `includePersonalInfo`) in a modal instead of its own 7-field form. `CandidateApplyOnBehalf.tsx` was deleted — its only mount point (a `guided_to_apply`-gated "submit on behalf" action) no longer makes sense once that transition is system-only.
5. The public `/apply` page's login gate removed for the primary path: an anonymous visitor now sees the full CIF (`ApplicationForm` with `includePersonalInfo`) directly; the existing authenticated-candidate flow (`CandidateProfileForm` + `ApplicationForm`) is kept for the narrower case of an already-registered candidate with no active application yet. The anonymous submission endpoint is rate-limited (`lib/rate-limit.ts`, 5/min per IP) — this is a genuinely new unauthenticated write surface.
6. Shared `src/lib/documentTypes.ts` (`DOCUMENT_TYPE_LABELS`, `UNIVERSAL_DOCUMENT_TYPES`, `CIF_PROGRAMME_SPECIFIC_DOCUMENT_TYPES`) extracted after the same document-type label list started recurring a third time (admin's Sectors page, the CIF form's Section 3 checklist, the candidate dashboard's upload checklist) — the dashboard's own upload widget now shows the universal set plus whichever `CountryDocumentRequirement` extras apply to the candidate's chosen destination, instead of a hardcoded cv/passport pair.
7. Tests: `recruiterAssignment.integration.test.ts` (round-robin over 0/1/2 recruiters), `documentCompleteness.integration.test.ts`, rewritten `screening.test.ts` and `candidateLifecycle.test.ts` for the new gate/transition rules, and `e2e/candidate-lifecycle.spec.ts` rewritten end-to-end for the new order — including simulating the candidate's invite-claim step via a direct Prisma write (same pattern `global-setup.ts` already uses for `e2e-case-candidate@test.local`, since there's no SMTP in dev to actually intercept the invite email).

**A real gap this surfaced, deliberately accepted rather than solved now:** a candidate with an email who simply never creates an account (declines, loses the link, etc.) is stuck at `screened` indefinitely — `guided_to_apply` has no staff-driven fallback. Given the framework's own description of the process ("...before they submit documents via their account that they create...") treats account creation as the singular expected path, not one of several, the existing `admin` role-unrestricted override in `canSetLifecycleStatus` is the intended escape hatch for this edge case, not a dedicated new mechanism.

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

**Resolved 2026-07-08:** this follow-up predicted that once Phase 2/3 landed, Applications review would need re-scoping away from pure admin — confirmed and fixed. `GET /api/applications` now scopes every staff role through `scopeCandidatesToRequester` (the same function the candidate list uses), not just `admin`, and read-only Applications views were added at `/recruiter/applications` and `/supervisor/applications` (FR-2.1's "guide and track applications" — recruiters previously had no application visibility at all, only candidate-pipeline visibility). `/admin/applications` is untouched and still the only place application *status* (interview/approved/rejected) is changed — this closes visibility, not editing rights, matching Phase 1's original decision to keep hiring-decision screens under System Administrator.

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
