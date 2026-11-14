# Website dependency security review

Review date: 2026-11-14  
Branch: `broker-pal-minimal-refresh-clean`

## Audit result

A read-only `npm audit` was run against the committed lockfile. It reported **17 advisories: 2 low, 2 moderate, 12 high, and 1 critical**.

Direct packages flagged by the audit:

| Package | Installed version in this branch | Audit severity | Reported remediation |
|---|---:|---|---|
| `astro` | 5.16.9 | Critical | Astro 7.4.12 (major upgrade) |
| `@astrojs/cloudflare` | 12.6.12 | High | 14.4.8 (major upgrade) |
| `@astrojs/mdx` | 4.3.13 | Low | 8.1.6 (major upgrade) |
| `@astrojs/rss` | 4.0.14 | Moderate | 4.0.19 |
| `@astrojs/sitemap` | 3.6.1 | High | 3.7.5 |
| `wrangler` | 4.136.1 | High | 4.162.0 |

The audit also reported affected transitive packages including `devalue`, `fast-xml-parser`, `miniflare`, `sharp`, `smol-toml`, `source-map-js`, `undici`, `vite`, `ws`, `zod`, and `zod-to-ts`. The dependency graph and advisories can change; rerun `npm audit` before acting on this list.

## Why no automatic fix was applied

The highest-severity remediation requires coordinated major upgrades. The official compatibility guidance is evolving. The current stable adapter documentation lists v14.4.8 and identifies adapter v13 as the Astro 6 upgrade path. Separate v15 migration guidance says adapter v15 requires Astro 7.4.0 or later and migrates the project from Wrangler to the new `cf` CLI and `cloudflare.config.ts` configuration. Astro 7 also moves to Vite 8 and a stricter compiler that can expose invalid HTML previously tolerated by older versions.

Official guidance:
- Astro 7 upgrade guide: https://docs.astro.build/en/guides/upgrade-to/v7/
- Cloudflare adapter compatibility and upgrade notes: https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- Cloudflare's Astro migration notes: https://developers.cloudflare.com/workers/static-assets/migration-guides/vercel-to-workers/astro/
- Cloudflare adapter v15 migration notes: https://cloudflare-next.previews.docs.astro.build/en/guides/integrations-guide/cloudflare/
- Cloudflare `cf migrate` guide (currently beta): https://developers.cloudflare.com/cf/wrangler/migrate/

A safe remediation needs its own isolated branch and staged changes:
1. Preserve the current website feature branch and its working preview.
2. Upgrade Astro and the Cloudflare adapter together to a compatible patched pair.
3. Upgrade MDX and other official integrations to compatible releases.
4. Regenerate the lockfile using npm; do not hand-edit package-lock metadata.
5. Build and check every existing route, the property valuation API, image handling, sitemap/RSS generation, and the Cloudflare preview configuration.
6. Review rendered output for whitespace/HTML changes and verify no production D1/KV/R2 bindings enter preview.
7. Rerun `npm audit`; record remaining advisories and decide whether each affects runtime or development-only tooling.
8. Keep all changes in preview until explicitly approved. No merge or production deployment is authorized.

## Current decision

**Security work required; no dependency upgrades applied yet.** The current lockfile has a critical Astro advisory and multiple high-severity advisories. Do not treat the existing application as security-cleared for production or real customer data until the dependency remediation and broader security review are complete.

No paid service, subscription, billing change, production deployment, or resource provisioning was performed by this review.

## Isolated Astro 7 upgrade trial

An isolated branch, `broker-pal-astro7-security-upgrade`, tests the patched Astro 7.4.12 dependency set. The first trial used `@astrojs/cloudflare@14.4.8`; Astro compiled successfully, but Wrangler could not resolve the adapter's unified entrypoint. A second attempt switched the preview config to the older built-worker path, but the Astro 7.4.12 build did not emit that legacy file, so the dry-run stopped before deployment. During installation, npm reported **2 remaining advisories (1 low, 1 high)**; the post-upgrade audit step did not run because the build verification stopped early.

The evidence points to a version/configuration mismatch rather than an application page error. Official adapter guidance now says v15 requires Astro 7.4.0 or later and replaces Wrangler with the beta `cf` CLI plus `cloudflare.config.ts`. The current v14.4.8 stable documentation still describes the earlier Astro 6 upgrade path. This means the next possible Astro 7 test would require a separate migration trial on the isolated branch; it must not be applied to the working feature branch or production until the beta tooling is proven and the remaining advisory is understood.

**Current outcome:** Astro 7 upgrade is not approved or complete. The feature branch remains on its existing dependency set and its own preview is unaffected. No production changes, merges, or deployments were made.


The feature branch's own isolated website preview completed successfully on both its stable preview URL and unique deployment URL, with HTTP 200 responses on all seven expected routes. The most recent preview run also passed the new keyboard-focus CSS changes and inline-script check.