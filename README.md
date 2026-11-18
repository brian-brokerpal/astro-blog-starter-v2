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
| `LOS_PUBLIC_LEADS_URL` | Non-secret variable | Set in production `wrangler.json` to the LOS public intake endpoint; preview config intentionally omits it so preview forms do not send test leads to production |
| `PUBLIC_TURNSTILE_SITE_KEY` | GitHub Actions production environment variable | Public Cloudflare Turnstile site key embedded during the production build; the deploy workflow now fails closed if this value is missing |
| `PROPERTY_USAGE_DB` | D1 binding | Usage counter and 30-day response cache for property valuation requests; configured in `wrangler.json` |
| `CENSUS_API_KEY` | Encrypted secret | Server-side key for the Census API route |
| `RENTCAST_API_KEY` | Encrypted secret | Server-side key for the optional automated valuation route; use only RentCast's $0 Developer plan; route stays disabled if the billing-period key is missing |
| `RENTCAST_BILLING_PERIOD_KEY` | Non-secret Worker variable | Operator-managed identifier for the current provider billing period (for example, `2026-11-17`). Change it only after confirming the 50-request free allowance has reset in RentCast; the endpoint atomically caps attempts at 50 per key, including failed attempts |

On the LOS Worker, configure `ALLOWED_ORIGIN=https://yourbrokerpal.com` and the matching Turnstile `TURNSTILE_SECRET_KEY`. The site key and secret must belong to the same Turnstile widget and the widget must allow the production hostname. The LOS also needs its D1 binding and any desired transactional-email settings. Never put the Turnstile secret or email-provider API key in this website repository or a public build variable.

The website proxy returns a clear `503` if `LOS_PUBLIC_LEADS_URL` is missing. A successful website build does not prove that the upstream URL, Turnstile credentials, LOS database, or email alerts are configured. Verify a test submission in the LOS Lead Center before announcing the integration as live.

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
