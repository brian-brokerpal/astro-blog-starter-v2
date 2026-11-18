# Astro Starter Kit: Blog

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/astro-blog-starter-template)

![Astro Template Preview](https://github.com/withastro/astro/assets/2244813/ff10799f-a816-4703-b967-c78997e8323d)

<!-- dash-content-start -->

Create a blog with Astro and deploy it on Cloudflare Workers as a [static website](https://developers.cloudflare.com/workers/static-assets/).

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support
- ✅ Built-in Observability logging

<!-- dash-content-end -->

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/astro-blog-starter-template
```

A live public deployment of this template is available at [https://astro-blog-starter-template.templates.workers.dev](https://astro-blog-starter-template.templates.workers.dev)

## 🚀 Project Structure

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                           | Action                                           |
| :-------------------------------- | :----------------------------------------------- |
| `npm install`                     | Installs dependencies                            |
| `npm run dev`                     | Starts local dev server at `localhost:4321`      |
| `npm run build`                   | Build your production site to `./dist/`          |
| `npm run preview`                 | Preview your build locally, before deploying     |
| `npm run astro ...`               | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help`         | Get help using the Astro CLI                     |
| `npm run build && npm run deploy` | Deploy your production site to Cloudflare        |
| `npm wrangler tail`               | View real-time logs for all Workers              |


## Production intake configuration

The public property-report form sends submissions to `/api/public-leads`. That same-origin route forwards the request to the LOS; it does not save leads in this website's own database. Before enabling the form in production, configure the following values:

| Variable | Type | Purpose |
| --- | --- | --- |
| `LOS_PUBLIC_LEADS_URL` | Non-secret variable | Set in production `wrangler.json` to the LOS public intake endpoint; branch previews are independently blocked by the production-host allowlist |
| `PUBLIC_TURNSTILE_SITE_KEY` | GitHub Actions production environment variable | Public Cloudflare Turnstile site key embedded during the production build; the deploy workflow now fails closed if this value is missing |
| `PROPERTY_USAGE_DB` | D1 binding | Usage counter and 30-day response cache for property valuation requests; configured in `wrangler.json` |
| `CENSUS_API_KEY` | Encrypted secret | Server-side key for the Census API route |
| `RENTCAST_API_KEY` | Encrypted secret | Server-side key for the optional automated valuation route; use only RentCast's $0 Developer plan; route stays disabled if the billing-period key is missing |
| `RENTCAST_BILLING_PERIOD_KEY` | Non-secret Worker variable | Operator-managed identifier for the current provider billing period (for example, `2026-11-17`). Change it only after confirming the 50-request free allowance has reset in RentCast; the endpoint atomically caps attempts at 50 per key, including failed attempts |

On the LOS Worker, configure `ALLOWED_ORIGIN=https://yourbrokerpal.com` and the matching Turnstile `TURNSTILE_SECRET_KEY`. The site key and secret must belong to the same Turnstile widget and the widget must allow the production hostname. The LOS also needs its D1 binding and any desired transactional-email settings. Never put the Turnstile secret or email-provider API key in this website repository or a public build variable.

The website proxy returns a clear `503` if `LOS_PUBLIC_LEADS_URL` is missing. A successful website build does not prove that the upstream URL, Turnstile credentials, LOS database, or email alerts are configured. Verify a test submission in the LOS Lead Center before announcing the integration as live.

## Preview safety

Cloudflare Workers Builds creates a branch preview for `feature/property-report-lead-center-label`. The `previews` block in `wrangler.json` is intentionally empty, so branch previews do not inherit production variables or the production D1 binding; `preview_urls` is explicitly enabled. The `/api/public-leads`, `/api/census.json`, and `/api/property-valuation.json` routes also reject every host except `yourbrokerpal.com` and `www.yourbrokerpal.com`, before forwarding leads or calling Census/RentCast. Automated preview testing therefore cannot create production leads or consume provider quota. The CI preview step uploads a non-promoted version of the existing Worker using `wrangler.preview.json`; it does not run `wrangler deploy` or change the active production version. That config deliberately omits the production LOS URL and D1 binding. The version URL is for visual review only; API routes remain blocked by the production-host allowlist.

## Dependency security posture

The production-only audit (`npm audit --omit=dev`) reports zero vulnerable runtime dependencies. The full development-tool audit still reports 13 high-severity package entries, all cascading from the single upstream `picomatch` ReDoS advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), which affects versions through 4.0.7; no patched npm release is available in the current dependency registry. These are build-toolchain dependencies, not installed runtime dependencies in the deployed Worker bundle. Do not run `npm audit fix` blindly: its suggested Astro 5.3.0 downgrade would reintroduce the critical Astro advisory removed by the Astro 7 upgrade. Recheck this advisory on future dependency updates and apply the upstream patch when published.

## Build toolchain

The site is built with Astro 7.4.12 and `@astrojs/cloudflare` 14.4.8. Cloudflare Workers Builds and GitHub Actions are pinned to Node 22.23.4 and npm 10.9.2; Wrangler is pinned to 4.164.0. Astro, its integrations, TypeScript, and Wrangler are build-time tools and are classified as development dependencies because the deployed Worker is the generated bundle.

## Preview deployment safety

The isolated preview Worker is named `astro-blog-starter-v2-preview` and uses the generated Astro entrypoint and client assets only. It intentionally has no D1 binding or LOS intake URL. In addition, the public lead intake, Census lookup, and RentCast valuation endpoints enforce an exact `yourbrokerpal.com` / `www.yourbrokerpal.com` host allowlist; Workers Builds preview URLs and `workers.dev` URLs receive HTTP 503 before any lead forwarding or external provider request. This remains a defense even if a preview build inherits production bindings.

## Property usage D1 migration notes

The production `PROPERTY_USAGE_DB` binding points to `yourbrokerpal-property-usage` (`3089c709-9f68-4740-b15e-2c7d6060a0b6`). The migration directory currently contains two differently named `0001` files: `0001_property_usage.sql` and `0001_rentcast_usage.sql`. They create the same `rentcast_monthly_usage` table, `rentcast_valuation_cache` table, and cache index, all with `IF NOT EXISTS`. They are redundant but safe as no-op duplicates; do not delete or rewrite either until the remote D1 migration ledger has been checked. Before changing this database, inspect `npx wrangler d1 migrations list yourbrokerpal-property-usage --remote` and the actual table schema. No D1 migration was applied as part of this branch work.
The PR workflow now attempts that migration-list command read-only, but the current Cloudflare API token returned error `7403` (account invalid or not authorized for D1 query access). The step is non-blocking, so a green website build does **not** mean the remote migration ledger or table schema has been verified. Grant the CI token D1 read/query permission or run the command with an appropriately scoped token before any production schema change. Do not grant write permission just for this check.

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
