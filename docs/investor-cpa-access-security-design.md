# Investor and CPA access — security design (proposal)

## Status

Design only. This document does not create accounts, send invitations, expose records, configure Cloudflare resources, or change production. The current Investor Property Hub and CPA Access Center are local-only prototypes.

## Security boundary

Investor/CPA records must be isolated from the mortgage LOS, borrower applications, loan documents, Realtor CRM contacts, and public website assets. The valuation-usage D1 database is only for valuation usage/cache and must not be repurposed for investor financial records.

The preview worker must remain isolated: no production D1, KV, R2, authentication secrets, or real customer data bindings.

## Proposed access model

- An investor account owns one or more workspaces and properties.
- A workspace owner invites a CPA using the CPA's individual email address.
- The invitation is single-use, short-lived, and bound to the intended recipient and workspace.
- Store only a cryptographic hash of the invitation token; never store or log the raw token.
- The CPA verifies control of the invited email and receives a short-lived session.
- The investor explicitly selects properties, information categories, view/download capability, and an expiration.
- Authorization is enforced server-side for every page, API request, and file download. Hiding a UI control is not authorization.
- CPA access is read-only. It cannot create, edit, delete, or invite other users.
- The investor can revoke access immediately. Expiration and revocation invalidate active sessions and download authorization.
- Record invitation, acceptance, authentication, view, download, permission change, expiration, and revocation events in an append-only audit trail.
- Never expose borrower/LOS records to a CPA through the investor workspace.

## Proposed data boundaries

Separate logical records (D1 or another supported database) from private files (private object storage). Do not store document bytes in database rows or public static folders.

Candidate tables, subject to schema review:
- `workspaces`: owner, status, created/updated timestamps.
- `workspace_members`: user, workspace, role, status.
- `investor_properties`: workspace ownership and property metadata.
- `cpa_invitations`: normalized recipient email, token hash, expiry, used/revoked timestamps.
- `cpa_grants`: CPA member, workspace, property scope, permission categories, view/download flags, expiry, revoked timestamp.
- `private_documents`: workspace/property scope, private object key, category, metadata, checksum, retention state.
- `access_events`: actor, workspace, resource, action, timestamp, outcome, request correlation ID.

Do not put full document contents, bank/tax identifiers, or invitation secrets in logs. Audit records should capture the action and resource reference, not duplicate sensitive contents.

## Request authorization sequence

1. Resolve the authenticated user and active session.
2. Resolve the requested workspace and resource from server-side records.
3. Confirm the user is an active workspace owner/member or has a current CPA grant.
4. Confirm the grant covers the specific property, category, action, and current time.
5. For a file, issue a short-lived download response only after authorization; never make the object public.
6. Record the result in the audit trail.
7. Deny by default if any check or dependency fails.

## Token and session safeguards

- Generate invitation tokens with a cryptographically secure random generator and sufficient entropy.
- Store a one-way token hash; compare safely; enforce one-time use, expiry, and recipient matching.
- Rate-limit invitation creation, OTP requests, verification attempts, and login attempts.
- Avoid putting reusable credentials or sensitive data in URL query strings or analytics.
- Use secure, HttpOnly, SameSite cookies for sessions; rotate session identifiers after authentication and privilege changes.
- Revoke sessions on grant revocation, password/email changes, or account suspension.
- Apply CSRF protection to state-changing requests and validate origins.
- Do not rely on IP address as identity proof.

## File handling

- Private bucket only; no public bucket, public URL, or predictable object key.
- Validate file size and allowed file types; inspect content signatures rather than trusting file extensions.
- Use randomized object keys and malware scanning before making a file available.
- Use short-lived, server-authorized downloads; consider a download watermark for sensitive tax packages.
- Define retention and deletion rules before accepting real documents.
- Do not implement bulk upload or OCR until secure storage and access controls are verified.

## Cost and deployment guardrails

- First inspect current account-wide D1/R2 usage and remaining free allowances. Existing LOS and valuation usage may already consume shared quotas.
- No paid plan, paid add-on, recurring vendor, or automatic upgrade.
- Create separate resources only after verifying free-tier capacity and getting explicit approval for any resource creation.
- Preview uses fake data and no production bindings.
- No production migration, binding, secret, deployment, or merge without explicit approval.
- Keep database migrations versioned and reviewed; do not renumber or remove existing migrations without checking the deployed migration history.

## Build sequence

1. Confirm account-level free-tier capacity and existing email delivery capability.
2. Agree on identity/authentication approach and data retention policy.
3. Create isolated schema and private storage only after approval.
4. Implement investor authentication and workspace isolation.
5. Implement CPA invitation, email verification, scoped grants, revocation, and audit events.
6. Add private file delivery and security tests.
7. Run authorization tests for cross-workspace access, expired/revoked grants, altered IDs, unauthorized downloads, replayed tokens, and session revocation.
8. Only after a separate review and explicit approval consider production rollout.

## Current prototype limitations

The CPA Access Center currently creates only in-memory demonstration entries. Its permission checkboxes and revoke controls demonstrate the intended workflow; they do not create identities, send email, issue tokens, authorize real records, persist grants, or protect documents. Do not enter real investor, CPA, tax, banking, or property financial information into the prototype.
