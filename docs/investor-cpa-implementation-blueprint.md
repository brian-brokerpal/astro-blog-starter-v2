# Investor and CPA access — implementation blueprint

Status: planning artifact only. No application code, migrations, Cloudflare resources, secrets, email, accounts, or production configuration are changed by this document.

## Non-negotiable boundaries

- Separate investor identity, database, document bucket, and authorization logic from the mortgage LOS.
- Never expose LOS borrower applications, loan documents, staff accounts, or Realtor CRM contacts through investor/CPA routes.
- Preview remains fake-data-only and must have no production database, storage, or authentication bindings.
- No real investor financial, tax, banking, or identity data until the security gates below pass.
- No paid subscriptions, auto-upgrades, paid email, or resource provisioning without explicit approval.
- Every request is denied by default unless the server can prove the caller's identity and exact scope.

## Authentication adapter

Keep the application independent of the eventual identity provider. Define a small server-side adapter that returns a verified principal:

- `subject`: stable provider identity ID (not email alone).
- `email`: verified email address.
- `email_verified`: must be true.
- `issuer`: expected identity provider.
- `issued_at` and `expires_at`: validated token/session times.

The application must validate issuer, audience, signature, expiry, and verified-email status server-side. Do not trust identity fields sent in request bodies, query parameters, localStorage, or browser state.

Cloudflare Access with email OTP is one candidate front door, not a decision or complete authorization layer. It must be evaluated against its user cap, onboarding/payment-details step, allowlisting operations, and revocation behavior before use. The existing LOS Access allowlist remains staff-only.

## Proposed logical schema

Use normalized relationships and composite ownership checks. Exact SQL types, indexes, migration numbers, and foreign keys must be reviewed against the chosen database before implementation.

| Record | Required fields and invariants |
|---|---|
| `users` | internal ID, provider issuer + subject (unique pair), verified email, status, timestamps |
| `workspaces` | ID, owner user ID, display name, status, timestamps |
| `workspace_members` | workspace ID, user ID, role, status; unique workspace/user pair |
| `properties` | ID, workspace ID, address/description metadata, status; property ID is never treated as authorization |
| `cpa_invitations` | ID, workspace ID, normalized recipient email, token hash (unique), creator, expiry, accepted/revoked timestamps |
| `cpa_grants` | ID, workspace ID, CPA user ID, recipient email, status, created/expiry/revoked timestamps |
| `cpa_grant_properties` | grant ID + property ID; composite relationship must prove both belong to the same workspace |
| `cpa_grant_permissions` | grant ID, category enum, can_view, can_download; no wildcard permission |
| `private_documents` | ID, workspace ID, property ID, opaque object key (unique), category, safe filename, content type, byte size, checksum, scan state, retention/deletion state |
| `access_events` | event ID, actor ID if known, workspace/resource IDs, action, allow/deny outcome, timestamp, request correlation ID; no secrets or document contents |

Suggested category allowlist: property summary, income/expense summary, bills, tax records, insurance records, and individually selected supporting documents. A category is not a blanket permission to every file; document-level scope must still be checked.

Avoid storing full SSNs, bank account numbers, tax IDs, credentials, or raw invitation tokens. Store only the minimum property/financial data needed for the approved workflow.

## API contract (proposed, not implemented)

All endpoints require HTTPS, a validated server-side principal, CSRF protection for cookie-authenticated writes, input validation, rate limits, and an audit event where sensitive access occurs.

| Method + route | Purpose | Required server-side checks |
|---|---|---|
| `GET /api/investor/me` | Current signed-in identity and memberships | Verified principal; return only caller's active memberships |
| `POST /api/investor/workspaces` | Create workspace | Authenticated active user; quotas; assign owner from principal, never request body |
| `GET /api/investor/workspaces/:wid` | Workspace overview | Owner/member relationship or active scoped CPA grant |
| `GET /api/investor/workspaces/:wid/properties` | List properties | Workspace membership; CPA sees only granted properties |
| `POST /api/investor/workspaces/:wid/properties` | Add property | Owner/editor role only; bind workspace ID from authorized route context |
| `POST /api/investor/workspaces/:wid/cpa-invitations` | Invite CPA | Owner role; verified recipient; bounded expiry; selected property/category permissions; rate limit |
| `POST /api/investor/cpa-invitations/accept` | Accept invitation | Token hash match; one-time; unexpired; not revoked; signed-in verified email matches invite |
| `GET /api/investor/workspaces/:wid/cpa-grants` | List current grants | Workspace owner only; never return token hashes |
| `POST /api/investor/cpa-grants/:gid/revoke` | Revoke CPA access | Workspace owner; atomically revoke grant and invalidate related sessions/cache |
| `GET /api/investor/workspaces/:wid/properties/:pid/summary` | View permitted summary | Membership/grant plus property, category, action and expiry checks |
| `GET /api/investor/documents/:did/download` | Download selected file | Recheck workspace, property, category, grant, download permission and scan state for every request |

Do not expose endpoints that accept an arbitrary `user_id`, `workspace_id`, `object_key`, or role as proof of access. IDs are selectors only; the server must resolve and authorize them against the authenticated principal.

## Critical file-download decision

If immediate revocation is promised, do not hand out long-lived R2 presigned URLs or public object URLs. A signed URL may remain usable until it expires even after the CPA grant is revoked. Prefer a Worker download endpoint that rechecks the current grant on every request and streams the object from private storage. If a short-lived redirect is ever considered for performance, document the residual revocation window and obtain explicit product approval; it does not satisfy instantaneous revocation.

## Mandatory security invariants

1. The owner ID is derived from the verified principal, never accepted from the browser.
2. Every property and document query is constrained by workspace ID and authorized membership/grant in the same server-side operation.
3. A CPA grant must match the signed-in CPA identity, exact workspace, selected property, category, action, status, and current time.
4. CPA role is read-only; mutation endpoints reject CPA principals even if UI controls are manipulated.
5. Grant revocation and expiry are checked live for every sensitive request; stale browser state or cached authorization cannot preserve access.
6. A revoked/expired invitation cannot be accepted, replayed, or exchanged for a new session.
7. Object keys are opaque and never confer access by themselves.
8. Audit events exclude passwords, OTPs, raw tokens, signed URLs, document contents, and full financial identifiers.
9. Cross-tenant access is impossible even when a caller substitutes another tenant's IDs.
10. If database, identity, or authorization checks fail, the system returns a denial rather than falling back to localStorage or permissive defaults.

## Test plan before any real data

| Test | Expected result |
|---|---|
| Investor A requests Investor B workspace/property/document IDs | Denied; no data leakage |
| CPA requests an unselected property | Denied |
| CPA requests a category not granted | Denied |
| CPA attempts create/update/delete/invite | Denied |
| CPA attempts download when view-only | Denied |
| CPA grant expires or is revoked, then same session downloads | Denied immediately |
| Invitation token is replayed, expired, revoked, or used by another email | Denied |
| Request body changes owner/workspace/user IDs | No authorization change; denied if out of scope |
| Private object key is guessed or copied | No direct access |
| Malformed, oversized, unsupported, or spoofed file | Rejected/quarantined |
| CSRF, invalid origin, missing session, invalid JWT audience/issuer | Denied |
| Audit storage fails during sensitive operation | Fail closed for operations requiring an audit record |

Automate these as integration tests against isolated test data. Include negative tests for every endpoint, not just the happy path.

## Rollout gates

**Gate 0 — current:** UI prototypes and documentation only. No real data.

**Gate 1 — account and cost review:** Confirm actual Cloudflare D1/R2/Workers usage, billing/auto-upgrade status, email delivery eligibility, and identity provider limits. No resource creation until user approval.

**Gate 2 — isolated foundation:** After explicit approval, create separate non-production resources and migration plan; keep production and LOS untouched. Use synthetic test identities and records only.

**Gate 3 — authorization implementation:** Build identity adapter, workspace ownership, scoped grants, audit trail, and private file proxy. Run all negative tests.

**Gate 4 — independent review:** Review access control, session handling, file handling, retention/deletion, privacy notices, incident response, and restore procedures. Resolve all critical/high findings.

**Gate 5 — controlled pilot:** Only after separate explicit approval, define a small invited pilot, support process, quotas, and rollback plan. Do not assume passing preview tests authorizes production.

## Current decision

**NO-GO for real investor or CPA records.** Continue fake-data prototype and design work only until account capacity, email/identity, secure implementation, and independent security review are complete.
