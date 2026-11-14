# broker pal project to-do

Working branch: `broker-pal-minimal-refresh-clean`  
Tracking PR: [#11 — broker pal website refresh + investor resources](https://github.com/brian-brokerpal/astro-blog-starter-v2/pull/11)

## Immediate account checks — waiting on read-only figures

- [ ] **Cloudflare Workers:** confirm plan, recent requests/CPU usage, and whether any usage or billing/auto-upgrade settings could create charges.
- [ ] **Cloudflare D1:** confirm database count, total storage used, daily rows read/written, and current account-wide capacity.
- [ ] **Cloudflare R2:** confirm whether R2 is enabled, current bucket count, storage used, and Class A/Class B operations.
- [ ] **Cloudflare Billing:** confirm current plan, payment/usage settings, and that no unexpected paid upgrade or automatic charge is enabled.
- [ ] **ZeptoMail:** confirm sender-domain verification, remaining free credits (if any), API access, and auto top-up is disabled. Do not share API keys or secrets.
- [ ] **Identity option:** confirm whether Cloudflare Access Free is available and appropriate for the intended investor/CPA count; review its onboarding/payment-details step before any activation.

When collecting Cloudflare figures, copy dashboard totals only. Do not send screenshots, API tokens, passwords, OTPs, or other secrets. No resource creation or billing changes until the figures are reviewed and the user explicitly approves.

## Website preview and product work

- [x] Create the isolated preview workflow and verify the seven current feature routes.
- [x] Add investor capacity assessment and CPA access security design.
- [x] Add detailed investor/CPA implementation blueprint and link it from the capacity assessment.
- [x] Keep draft PR #11 isolated; no merge or production deployment.
- [ ] Review all preview pages on mobile for layout, accessibility, navigation, and wording.
- [x] Harden demo contact rendering against HTML injection in the CRM sample cards.
- [x] Replace user-logo HTML string insertion with DOM image elements and validate saved Realtor Studio logo data before preview.
- [ ] Replace illustrative/sample content with approved broker pal materials only when supplied.
- [ ] Review the lowercase text-only broker pal wordmark and confirm the latest approved logo assets appear consistently.
- [ ] Test Realtor Studio brand choices and verify the agent page preview reflects saved branding.
- [ ] Test Marketing Studio flyer/social layouts, print-to-PDF, copy-text, and local logo/color handling.
- [x] Confirm CRM and inquiry examples clearly state that they are local-only demonstrations and do not transmit/store leads.
- [ ] Keep custom-domain/white-label routing as a future design item; do not provision hostnames or alter DNS until pricing, ownership verification, and the pilot model are approved.

## Investor / CPA — implementation gates

- [x] Define separate investor/CPA security boundary from the mortgage LOS.
- [x] Define workspace, property, membership, invitation, grant, document metadata, and audit record model.
- [x] Define proposed API contract and server-side authorization invariants.
- [x] Document immediate revocation concern for downloads and avoid long-lived share links in the proposed design.
- [ ] Agree on identity provider and verified-email approach after the account/cost review.
- [ ] Agree on minimum data collected, privacy notice, retention/deletion schedule, export process, and account recovery.
- [ ] Only after explicit approval, design isolated test resources and migration plan; do not reuse LOS or valuation D1/R2.
- [ ] Implement server-side tenant isolation, CPA grants, revocation, audit events, and private file proxy.
- [ ] Pass negative security tests for cross-tenant access, altered IDs, revoked/expired grants, replayed invites, unauthorized downloads, CSRF, and malformed uploads.
- [ ] Complete independent security and privacy review before any real investor data or production pilot.

## Cost and release guardrails

- [x] No paid services, recurring subscriptions, or automatic upgrades approved.
- [x] No production resources, migrations, bindings, secrets, merges, or deployments created by this work.
- [ ] Recheck free-tier limits and billing immediately before any provisioning; limits/pricing may change.
- [ ] Obtain explicit approval before creating resources, enabling services, adding secrets, merging PR #11, or deploying production.

## Current release status

**Preview only.** The Investor Property Hub, CPA Access Center, Realtor CRM, and other interactive feature concepts are not production systems. Do not enter real customer, borrower, investor, CPA, tax, banking, or confidential business information.
