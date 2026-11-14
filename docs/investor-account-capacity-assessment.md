# Investor account capacity and security assessment

Assessment date: 2026-11-14

## Decision summary

**Do not build real investor or CPA accounts against the current website preview or the existing property-valuation database.** The website's Investor Property Hub and CPA Access Center are browser-only demonstrations. The valuation database is for RentCast request accounting and response caching. The separate mortgage LOS has its own D1 database, private R2 document binding, Cloudflare Access staff authentication, and ZeptoMail transactional-email integration. Keep those systems isolated.

A small investor pilot may fit Cloudflare's published free allowances, but actual remaining capacity is not verified. The Cloudflare account's current D1, R2, Workers and billing usage must be inspected before creating resources or accepting real data. Cloudflare's R2 onboarding documentation says enabling R2 involves an account subscription/checkout flow even though a free monthly allowance exists; do not complete that flow or enable billing without first checking the account's billing setup and getting explicit approval.

## Verified project findings

### Public website repository

- Astro 5.16.9 / Cloudflare Workers adapter.
- Production worker configuration binds `PROPERTY_USAGE_DB` to `yourbrokerpal-property-usage`.
- That database's migration files define only RentCast monthly request counts and valuation-response cache tables.
- The isolated preview config intentionally has no D1, KV, R2, authentication secrets, or production data bindings.
- The Investor Property Hub, CPA Access Center, Realtor Studio and CRM prototypes use browser-side demonstration state; they are not real user accounts or a secure record store.
- The website repository currently has no investor authentication endpoint, login/session implementation, investor document API, or private object-storage binding.

### Separate mortgage LOS repository

- The LOS is a separate application and must remain a separate security and data boundary.
- It has established D1 schema/migrations for borrower applications, loans, lead records, disclosures, events and document metadata.
- Its document API expects a private R2 binding named `DOCS`, uses Cloudflare Access JWT validation and an explicit staff-email allowlist.
- Its public application API has a ZeptoMail transactional-email sender using `ZEPTOMAIL_SEND_API_KEY` and `ZEPTOMAIL_FROM_EMAIL` environment values. It tracks email send status in the LOS database.
- The staff Access check is not an investor/CPA identity system: it verifies an Access JWT and checks an allowlist. Do not simply add investors or CPAs to the staff allowlist.
- Do not reuse the LOS D1 database, document bucket, staff access policy, borrower records, or loan-document endpoints for investor accounts.

## Published Cloudflare free allowances

These are published account-plan limits, not a reading of the user's current usage. They can change; check the live Cloudflare dashboard before provisioning.

| Service | Published free allowance | Design implication |
|---|---:|---|
| Workers | 100,000 requests/day; 10 ms CPU per invocation | Suitable for a modest, carefully designed pilot; avoid CPU-heavy document processing |
| D1 | 10 databases/account; 500 MB/database; 5 GB total account storage | A separate small investor database is possible only if account-wide capacity remains |
| D1 reads/writes | 5 million rows read/day; 100,000 rows written/day | Daily limits can stop queries when reached; index and bound every query |
| R2 Standard | 10 GB-month storage; 1 million Class A operations/month; 10 million Class B operations/month; no egress charge | A small document pilot may fit; impose per-workspace quotas and usage alerts |
| Workers static assets | 20,000 files per Worker version; 25 MiB per file | Not a document vault; private investor documents belong in private object storage |

Official references:
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
- R2 onboarding and activation: https://developers.cloudflare.com/r2/get-started/
- R2 limits: https://developers.cloudflare.com/r2/platform/limits/

## Email delivery and cost

Cloudflare Email Service's outbound sending to arbitrary recipients requires Workers Paid. Its free option is limited to verified destination addresses in the account, so it is not an appropriate free-tier foundation for inviting unrelated CPAs or sending customer OTPs.

The separate LOS already contains a ZeptoMail API integration for transactional emails. ZeptoMail's published pricing is pay-as-you-go, not a monthly subscription: one credit covers 10,000 emails, listed at US$2.50 per credit, with a first free credit advertised for new accounts. Do not assume the user's account has unused free credits or verified sending-domain status. The user's previous setup history indicated ZeptoMail DNS authentication was still pending; current account status and remaining credits must be confirmed in ZeptoMail. Reusing the existing sender would require a separate, least-privilege secret configuration for the investor application and successful domain/authentication testing. Do not copy secrets into source control.

Official references:
- Cloudflare Email Service availability: https://developers.cloudflare.com/email-service/
- ZeptoMail pricing: https://www.zoho.com/zeptomail/pricing.html
- ZeptoMail domain verification: https://www.zoho.com/zeptomail/help/domains.html
- ZeptoMail send API keys: https://www.zoho.com/zeptomail/help/api-home.html

No paid plan, credit purchase, auto top-up, or paid add-on is approved by this assessment.


## Authentication option to evaluate: Cloudflare Access

Cloudflare Access may be a lower-cost front-door authentication option for a small, controlled pilot, but it is not a complete investor-account authorization system.

- Cloudflare currently advertises a Zero Trust Free plan for up to 50 users. The published pay-as-you-go tier is $7 per user/month, so the design must stop and be reviewed before approaching the free user cap; never allow an automatic paid transition.
- Access supports email one-time PINs for approved external email addresses. Current Cloudflare documentation says new Zero Trust organizations default to Cloudflare as the identity provider rather than OTP; OTP can be enabled separately. Access policies must explicitly restrict allowed identities. Never create a public policy that allows any email address.
- Cloudflare Access authenticates a person at the application boundary. The investor application must still independently authorize each workspace, property, category, action, CPA grant, expiration and revocation on every request. A valid Access JWT alone must never grant access to all investor records.
- The existing LOS Cloudflare Access configuration is staff-only and belongs to the separate LOS security boundary. Do not alter it or simply reuse its staff allowlist for investors/CPAs.
- Cloudflare's onboarding documentation says even the Free Zero Trust plan requires completing plan selection and entering payment details, although the Free plan is not charged. Do not create or activate a Zero Trust organization, add payment details, enable OTP, or change Access policies without explicit approval and a billing review.
- If evaluated later, count every investor and CPA who authenticates against the 50-user limit, verify how individual email allowlisting and revocation will be automated, and test tenant isolation independently of Access.

Official references:
- Zero Trust pricing and 50-user Free limit: https://www.cloudflare.com/plans/zero-trust-services/
- Access guest OTP policies: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/
- One-time PIN login: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/
- Zero Trust onboarding/payment-details step: https://developers.cloudflare.com/learning-paths/clientless-access/initial-setup/create-zero-trust-org/

## Recommended pilot architecture

1. **Separate application identity:** Investor accounts must be authenticated independently of staff LOS access. Use secure server-managed sessions, verified email, MFA/step-up authentication for sensitive actions, rate limits, and account recovery.
2. **Separate investor D1 database:** Store workspaces, memberships, property metadata, CPA invitations/grants, document metadata, and audit events. Never store document bytes in D1.
3. **Private R2 bucket:** Store investor files under opaque random keys. Disable public access and custom public delivery. File downloads must go through an authorization check and short-lived delivery.
4. **Server-side authorization:** Check account, workspace, property, document category, action, grant status and expiry on every API request. Deny by default. Never rely on browser-side checkboxes, localStorage, or hidden buttons.
5. **CPA grants:** Invite a named email; one-time token stored only as a hash; enforce recipient match, expiry and single use. Grant read-only access to selected properties and categories, optionally downloads. Revoke immediately and invalidate active sessions/download authorization.
6. **Audit trail:** Record invite, acceptance, authentication, view, download, permission change, expiry and revocation without recording secrets or document contents.
7. **Document safeguards:** Accept a narrow set of file types, inspect file signatures, cap file size, randomize keys, scan uploads before release, set retention/deletion policy, and log file access.
8. **Usage guardrails:** Per-workspace file/record quotas, upload throttling, maximum file size, account-wide usage alerts, no automatic paid upgrade, and graceful denial when free limits are approached.
9. **No shared tenant access:** An investor's CPA grant cannot expose another investor's workspace, the mortgage LOS, borrower applications, or Realtor CRM contacts.

## Security tests required before real data

- Investor A cannot read or enumerate Investor B's workspace, properties, documents, or identifiers.
- CPA can access only the exact properties/categories/actions granted.
- Altering IDs, URLs, request bodies, or object keys does not bypass authorization.
- Expired, revoked, replayed, or wrong-recipient invitation tokens fail.
- Revocation blocks existing sessions and subsequent downloads.
- Unauthenticated requests, CSRF attempts, and cross-origin writes fail.
- Oversized, malformed, spoofed-MIME, and unsupported files are rejected.
- Audit records exist for both successful and denied sensitive access.
- No document object is publicly readable.

## Capacity verification still required

Actual account-wide usage cannot be determined from the GitHub repository or public Cloudflare documentation. Before any resource creation, inspect the Cloudflare account:

- Workers & Pages: plan and recent request/CPU usage for the account and relevant workers.
- D1: total storage used, database count, daily row reads and writes, and migration history of the existing databases.
- R2: whether the R2 service is enabled, total storage used, Class A/B operations, and current buckets.
- Billing: confirm no unexpected paid plan, auto-upgrade, or usage-based charge setting is enabled.

Do not expose API tokens or secrets. Read-only dashboard totals are enough. If the account does not have spare free capacity, stop and redesign the pilot rather than upgrading automatically.

## Go/no-go

**Current status: NO-GO for real investor data; GO for continued fake-data prototype work.**

The architecture is viable in principle for a limited pilot under free allowances, but available capacity, verified email sending, identity implementation, private storage provisioning, and security tests are not yet confirmed. No production resources, migrations, secrets, accounts, or deployments were created by this assessment.
