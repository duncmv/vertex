# Roles & Permissions Review

Working doc for a full pre-team review of every role in the platform: what each one can see, what it can do, and how to log in and test it yourself. Compiled directly from `prisma/schema.prisma`'s `Role` enum, `src/lib/rbac.ts`, `src/proxy.ts`, every API route's role guard, and the actual page/nav components — not a design intention, this is what the code currently enforces.

**8 roles total:** `candidate`, `regional_recruiter`, `country_supervisor`, `inhouse_supervisor`, `director`, `admin`, `marketing`, `partner`. Plus anonymous/public visitors, covered briefly at the end.

---

## Quick-reference table

| Role | Portal home | Who they are | Dev DB test account |
|---|---|---|---|
| Candidate | `/dashboard` | A jobseeker with their own account | None yet — self-register via `/apply` to get one (see note below) |
| Regional Recruiter | `/recruiter` | Sources and shepherds candidates through screening/reporting | `recruiter@test.local` |
| Country Supervisor | `/supervisor` | Verifies recruiter work for one assigned country | `supervisor@test.local` |
| In-House Supervisor | `/management` | Approves candidates, sets policy, owns Management portal | `inhouse@test.local` |
| Director | `/management` | Same portal/permissions as In-House Supervisor today | `director@test.local` |
| Admin | `/admin` | System administrator; full override access everywhere | `admin@test.local` |
| Marketing | `/marketing/jobs` | Owns job postings only; outside the 3-tier hierarchy | `marketing@test.local` |
| Partner | `/partner` | External agency; submits its own candidates | `partner@test.local` (agency: "Test Partner Agency") |

See [Test accounts](#test-accounts) at the bottom for passwords and full detail. These are real rows in your local `vertex_dev` database (queried directly, not from a script) — distinct from the `e2e-*@test.local` fixtures the automated Playwright suite creates and tears down on every run.

---

## Candidate

**Portal:** `/dashboard` (single page — no sub-nav; uses the public marketing Navbar/Footer, not the internal `PortalShell` chrome)

**How they get an account:** Never self-registers up front. Either (a) submits the public Candidate Information Form anonymously and later claims an emailed invite link once a recruiter screens and passes them, or (b) is a recruiter-sourced lead who does the same once screened. `POST /api/auth/register` accepts an `?invite=` token that links the new account to their existing pre-registration `Candidate` record.

**What they can do:**
- View their own profile, application, and lifecycle status (`GET /api/candidates/profile`, own `Application`)
- Upload required documents (`POST /api/upload`) — this is what auto-advances their status from `guided_to_apply` → `submitted` once every required document (universal set + destination-country extras) is present
- View and pay for job listings requiring an application fee (Stripe/PayPal, `/jobs/[id]/pay`)
- View their mobility Case once approved (`GET /api/cases/[id]`, `GET /api/cases`) — read-only, cannot advance its stage
- Sign their own Contract with a typed full-legal-name attestation (`POST /api/cases/[id]/contract/sign`) — the **only** role allowed to call this route
- Chat with the AI assistant (public `/api/chat`)

**Cannot do:** see any other candidate's data, advance their own lifecycle status, advance a Case's stage, record a payment, or access any staff/partner portal.

---

## Regional Recruiter

**Portal:** `/recruiter` — **My Candidates**, **Applications**, **Cases**, **Reports**

| Page | What it's for |
|---|---|
| `/recruiter` | Candidates this recruiter sourced; register a new walk-in lead via the Candidate Information Form |
| `/recruiter/applications` | Read-only view of applications tied to their own candidates |
| `/recruiter/cases` | Cases for their approved candidates — can advance stage forward only |
| `/recruiter/reports` | Submit daily/weekly activity reports to their supervisor |

**What they can do:**
- Register a brand-new candidate lead (`POST /api/applications`, no `candidate_id`) — becomes the attributed recruiter automatically
- Advance a candidate's lifecycle **forward only**, up to and including `reported` (`identified → screened → reported`) — cannot move a candidate backward, cannot manually set `guided_to_apply` or `submitted` (both are system-only, fired by invite-claim and document-upload respectively), cannot verify or approve
- View/scope candidates, applications, cases, and documents to only the ones they sourced (`scopeCandidatesToRequester`)
- Advance a Case's stage forward (`POST /api/cases/[id]/stage`), issue a Contract (`POST /api/cases/[id]/contract`), record a milestone payment (`POST /api/cases/[id]/payments`), complete a retention follow-up
- Submit a daily/weekly report (`POST /api/reports`), resubmit one a supervisor returned
- Edit a candidate's personal details and record consent (`PATCH /api/candidates/[id]`) — worth flagging: this specific endpoint allows `regional_recruiter`/`country_supervisor`/`admin` **but not `inhouse_supervisor`/`director`**, unlike almost every other candidate-related permission in the system

**Cannot do:** verify or approve a candidate, return a candidate to an earlier stage, verify a peer's report, see another recruiter's pipeline, access Campaigns/KPI/Fee Policy/Partners/Employer Clients/Jobs management, or the System Admin or Marketing portals.

---

## Country Supervisor

**Portal:** `/supervisor` — **Country Overview**, **Applications**, **Cases**, **Reports**

| Page | What it's for |
|---|---|
| `/supervisor` | Every candidate reported within their assigned country |
| `/supervisor/applications` | Applications scoped to their country |
| `/supervisor/cases` | Cases for their country's candidates |
| `/supervisor/reports` | Verify recruiter reports; consolidate into a weekly country report for In-House |

**What they can do:**
- Verify or **return** a candidate (`reported → verified`, or return to an earlier stage with a required reason) for anyone in their assigned country — but **cannot approve** and cannot touch a candidate already at/beyond `approved`
- Verify a recruiter's submitted report or return it with a reason (`POST /api/reports/[id]/verify`, `/return`)
- Consolidate multiple recruiter reports into one country-level report for In-House
- Everything a recruiter can do operationally within their country (advance case stages, issue contracts, record payments, retention follow-ups) — scoped to `assigned_country_id`

**Cannot do:** approve a candidate or reverse an approval ("Only In-House can approve a candidate, or reverse an approval" — enforced in `candidateLifecycle.ts`), act on a candidate before a recruiter has reported them, see another country's data, access Campaigns/KPI/Fee Policy/Partners/Employer Clients/Jobs management, or System Admin/Marketing portals.

---

## In-House Supervisor & Director

These two share **identical** portal access and API permissions today — `director` exists as a distinct org-chart role but has no code path anywhere that treats it differently from `inhouse_supervisor`. Both render under the UI label "Management."

**Portal:** `/management` — **Control Dashboard**, **Campaigns**, **Applications**, **Partners**, **Employer Clients**, **Fee Policy**, **Cases**, **Reports**

| Page | What it's for |
|---|---|
| `/management` | KPI dashboard (targets vs. actuals, agent sign-ups, funnel, conversion rates, partner performance) + full candidate list with approve/return actions |
| `/management/campaigns` | Create campaigns, set country/region targets |
| `/management/applications` | Every application, with the ability to change hiring-decision status |
| `/management/partners` | Add agencies, provision their login, view MOU status |
| `/management/employer-clients` | Add/manage employer records that jobs link to |
| `/management/fee-policy` | Turn on milestone payments and set amounts (global or per country) |
| `/management/cases` | Every case, full stage/contract/payment control |
| `/management/reports` | Full escalation trail; verify consolidated country reports |

**What they can do (beyond everything a supervisor can):**
- **Approve** a candidate (the only roles that can — `IN_HOUSE_ROLES` in `candidateLifecycle.ts`), or reverse an approval
- See and act on **every** candidate/application/case/report across all countries (no scoping)
- Create/edit Campaigns and CampaignTargets, view the full KPI dashboard (`GET /api/kpi` — restricted to `inhouse_supervisor`/`director`/`admin` only, not even a recruiter/supervisor can see it)
- Enable and configure milestone-payment Fee Policy
- Create Partners, edit their status/MOU, **provision a partner's login** (`POST /api/admin/partners/:id/provision-account`)
- Create/edit Employer Clients

**Cannot do:** create/edit/delete job postings (Marketing's exclusive job), manage Regions/Countries/Sectors/Staff accounts (System Admin's job), submit a candidate as a partner would, or — worth flagging for the review — **edit a candidate's personal details or record consent** (`PATCH /api/candidates/[id]` allows recruiter/supervisor/admin, not In-House/Director; likely worth a look, may be an oversight rather than intentional).

---

## Admin (System Administrator)

**Portal:** `/admin` — **Overview**, **Regions & Countries**, **Sectors & Requirements**, **Staff & Roles**, **Settings**

**Revised in the review batch:** Candidates/Finances/Jobs were removed from Admin's scope entirely — a system administrator provisions accounts and reference data, it doesn't run recruitment operations (that's Marketing/Management's job). `/admin/candidates`, `/admin/finances`, and their backing API routes (`GET /api/admin/candidates`, `GET /api/payments/admin`) no longer exist.

| Page | What it's for |
|---|---|
| `/admin` | System-level snapshot: staff headcount by role, region/country counts, sectors configured — not a recruitment-ops dashboard |
| `/admin/regions` | Add, rename, and delete regions and the countries within them (delete is blocked with a friendly error if a partner candidate submission still references the country) |
| `/admin/sectors` | Add/delete sectors ("type of work"); add/delete **document requirement types** (admin-managed — a type added here is immediately usable on the Candidate Information Form, the Agency form, and uploads, no code change needed); configure which of those types each destination country requires |
| `/admin/users` | Create staff accounts (generates a one-time temp password), stage role/supervisor/country changes behind an explicit Save button per row, reset a user's password, or remove their account entirely |
| `/admin/settings` | Global feature toggles (AI chatbot on/off, WhatsApp number), Knowledge Base articles (AI chat FAQ content), email template overrides |

**What they can do:** Everything, everywhere — `admin` is included in literally every `requireRole([...])` allow-list in the codebase, and `canSetLifecycleStatus`/`requireAdmin` both special-case it as an unconditional override. This is also the only role that can:
- Write Region/Country/Sector/document-requirement-type reference data (everyone else can only *read* these)
- Create/edit/delete staff accounts, reassign supervisor/country, and reset any staff member's password
- Configure AI chatbot / knowledge base / email templates

**No longer has a dedicated UI for:** browsing the full candidates pool or system-wide financial records — `/admin/candidates`, `/admin/finances`, and their backing routes (`GET /api/admin/candidates`, `GET /api/payments/admin`) are gone. Worth flagging precisely, since it's easy to overstate: admin still technically has *API-level* access to candidates (`admin` is in `STAFF_ROLES`, which gates the same general `GET /api/candidates` every staff role uses) and to Jobs (`admin` is one of the two `JOB_MANAGER_ROLES`, alongside `marketing`) — those weren't revoked, there's just no admin-facing screen for them anymore. Day-to-day recruitment ops (Jobs, Fee Policy, Campaigns, Candidates) live under Marketing/Management's own portals.

**Design note:** Admin is *not* part of the three-tier operational hierarchy (Regional Recruiter → Country Supervisor → In-House/Director) — it's a support/provisioning role layered on top, deliberately kept off day-to-day recruitment screens now that they've been consolidated under Marketing/Management, while retaining underlying API access for support purposes.

---

## Marketing

**Portal:** `/marketing/jobs` — **Jobs** (the only nav item)

| Page | What it's for |
|---|---|
| `/marketing/jobs` | List/search job postings |
| `/marketing/jobs/new` | Create a job posting, optionally linked to an Employer Client |
| `/marketing/jobs/[id]/edit` | Edit/close a posting |

**What they can do:**
- Full CRUD on `Job` (`JOB_MANAGER_ROLES = ["marketing", "admin"]` — the *only* two roles that can create/edit/delete a job)
- Read Sectors and per-country Document Requirements (needed to categorize jobs)
- Read Employer Clients (to link a job to one) — but notably **cannot** read the Partners list (`GET /api/admin/partners` allows recruiter/supervisor/inhouse/director/admin, marketing is not on that list)

**Cannot do:** anything else. Marketing is deliberately excluded from `STAFF_ROLES` and `isStaffRole()` — it cannot see candidates, applications, cases, reports, campaigns, KPIs, or fee policy, and has no access to `/recruiter`, `/supervisor`, `/management`, `/admin`, or `/partner`. It exists purely to own job postings, outside the 3-tier hierarchy.

---

## Partner

**Portal:** `/partner` — **My Candidates** (the only nav item)

The newest role (Phase 5, SRS FR-5.1) and the only one representing an external organization rather than Vertex staff. **Provisioning is one-way and staff-controlled**: an agency never signs itself up — an In-House Supervisor/Director/Admin creates the `Partner` record, then clicks "Create Partner Login" to generate the account and a one-time temp password shared with the agency out of band.

| Page | What it's for |
|---|---|
| `/partner` | This partner's own candidate submissions (status: submitted / under review / job assigned / rejected) + a "Submit Candidate" form |

**What they can do:**
- View only their own `PartnerCandidate` submissions (`GET /api/partner/candidates`, scoped by `Partner.user_id`)
- Submit a new candidate (`POST /api/partner/candidates`) — a form mirroring the real-world Agency Application Form's Sections 2–6 (Programme Selection, Personal Info, Document Checklist, Payment Plan Ack, Visa & Travel Readiness)

**Cannot do:** see any other partner's candidates, see or touch Vertex's internal `Candidate`/`Application`/`Case` pipeline in any way, access any other portal. This is intentional and load-bearing, not a gap: **a partner's submitted candidates never enter Vertex's internal recruiter/screening/verification funnel** — the partner is responsible for their own screening and verification before submitting. Partner and Employer-Client CRUD, MOU tracking, and provisioning are all staff-side actions under `/management/partners`, not something the partner does themselves.

**⚠️ Known, deliberate gap (confirmed with the business, not an oversight):** there is currently **no staff-side workflow** to review a partner's submission and assign it to a job — a submission just sits at `status: "submitted"` forever from the product's point of view. The only signal staff get is a best-effort notification email (`sendPartnerCandidateSubmittedEmail`, recipient TBD — `PARTNER_SUBMISSION_NOTIFY_EMAIL` is unset, so right now the email doesn't actually send anywhere). The schema has groundwork for this (`PartnerCandidate.reviewed_by`, `rejection_reason`, `bridged_candidate_id`) but no route or page uses it yet. **This is the biggest thing to raise in the team review** — decide whether/when to build the assignment queue.

---

## Public / anonymous (no login)

Not a `Role`, but worth listing since a real workflow runs through it: an anonymous visitor can browse `/jobs`, read `/about`/`/contact`/`/help`, use the AI chat widget, and — most importantly — submit the full Candidate Information Form at `/apply` with no account at all (rate-limited to 5 submissions/minute/IP). This is what creates the very first `Candidate` + `Application` record for a self-service candidate, before any account exists. They cannot see any data belonging to anyone else, obviously, since there's no session to scope by.

---

## Test accounts

These are the actual `User` rows currently sitting in your local `vertex_dev` database (checked directly via Prisma, not inferred from a script). Password for every one of them: **`TestPassword123!`**. **Every one of the 8 roles now has a working login** — the three that were missing (`inhouse_supervisor`, `director`, `partner`) were created and login-verified (`POST /api/auth/login`, confirmed each lands on the right role) as part of this review.

| Email | Role | Notes |
|---|---|---|
| `admin@test.local` | `admin` | "Test Admin" — no assigned country/supervisor, doesn't need one |
| `recruiter@test.local` | `regional_recruiter` | "Test Recruiter" — assigned to Kenya, supervised by `supervisor@test.local`. Owns the demo candidate below |
| `supervisor@test.local` | `country_supervisor` | "Test Supervisor" — assigned to Kenya |
| `new-recruiter@test.local` | `regional_recruiter` | "Test New Recruiter" — created via `/admin/users`' "Add Staff Member" flow to prove that path works end-to-end; no country/supervisor assigned |
| `inhouse@test.local` | `inhouse_supervisor` | "Test In-House Supervisor" — **newly created for this review**, no country scoping (In-House sees everything) |
| `director@test.local` | `director` | "Test Director" — **newly created for this review**, same shape as `inhouse@test.local` since the two roles behave identically today |
| `marketing@test.local` | `marketing` | "Test Marketing" — same purpose as `new-recruiter`, proves the Marketing role is assignable from the admin staff picker |
| `partner@test.local` | `partner` | "Test Partner Contact" — **newly created for this review**, the login for a real `Partner` record ("Test Partner Agency," a travel agency in Kenya, status `active`, MOU `signed`). Confirmed `GET /api/partner/candidates` resolves correctly (empty list, no error) |
| — | — | The original demo candidate (`grace.wanjiru@example.com`) was removed by the review-batch's DB wipe (Jobs & Candidates cleared for the review). A fresh demo candidate ("Grace Wanjiru," recruiter-sourced, Kenya → United Kingdom, sector Warehouse & Logistics) has been recreated at `screened` — good for demonstrating the screening gate and the recruiter/supervisor's "awaiting candidate to create an account" state. She has **no login of her own yet**: `guided_to_apply`/`submitted` only fire once a candidate claims their emailed invite link (SRS FR-2.1), which needs real SMTP. To demo the candidate dashboard itself, self-register a new account via `/apply` instead — no test account exists for that specific state right now |

⚠️ Separate from all of the above: `e2e/global-setup.ts` creates its own throwaway fixtures (`e2e-admin@test.local`, `e2e-inhouse@test.local`, `e2e-supervisor@test.local`, `e2e-recruiter@test.local`, `e2e-case-candidate@test.local`, password `E2ETestPassword123!`) every time the Playwright suite runs, and tears them down afterward. Don't rely on those for manual exploration — they're not guaranteed to exist between test runs.
