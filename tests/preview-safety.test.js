import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isProductionHost } from "../src/lib/production-host.js";

test("production host allowlist accepts only the public Broker Pal domains", () => {
  assert.equal(isProductionHost("yourbrokerpal.com"), true);
  assert.equal(isProductionHost("www.yourbrokerpal.com"), true);
  assert.equal(isProductionHost("YOURBROKERPAL.COM"), true);
  assert.equal(isProductionHost("yourbrokerpal.com."), true);
  assert.equal(isProductionHost("astro-blog-starter-v2-preview.workers.dev"), false);
  assert.equal(isProductionHost("preview.yourbrokerpal.com"), false);
  assert.equal(isProductionHost("evil-yourbrokerpal.com"), false);
  assert.equal(isProductionHost(""), false);
});

test("preview hosts cannot submit leads or call Census and RentCast providers", async () => {
  const paths = [
    "../src/pages/api/public-leads.ts",
    "../src/pages/api/census.json.ts",
    "../src/pages/api/property-valuation.json.ts"
  ];
  for (const path of paths) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /isProductionHost\(new URL\(request\.url\)\.hostname\)/);
  }
  const leads = await readFile(new URL("../src/pages/api/public-leads.ts", import.meta.url), "utf8");
  assert.ok(leads.indexOf("isProductionHost(") < leads.indexOf("fetch(upstream"));
  const valuation = await readFile(new URL("../src/pages/api/property-valuation.json.ts", import.meta.url), "utf8");
  assert.ok(valuation.indexOf("isProductionHost(") < valuation.indexOf('fetch("https://api.rentcast.io/'));
});


test("property report provides the email action referenced by its report builder", async () => {
  const page = await readFile(new URL("../src/pages/tools/property-report.astro", import.meta.url), "utf8");
  assert.match(page, /<a id="email" href="mailto:brian@yourbrokerpal\.com">/);
  assert.match(page, /el\('email'\)\.href\s*=\s*'mailto:brian@yourbrokerpal\.com/);
});

test("Property Report handoff sends structured property fields to Lead Center intake", async () => {
  const page = await readFile(new URL("../src/pages/tools/property-report.astro", import.meta.url), "utf8");
  for (const field of [
    "propertyAddress:el('address').value.trim()",
    "propertyCity:el('city').value.trim()",
    "propertyState:el('state').value.trim()",
    "propertyZip:el('zip').value.trim()",
    "propertyType:el('type').value",
    "purchasePrice:el('asking').value",
    "monthlyMarketRent:el('rent').value"
  ]) assert.ok(page.includes(field), `Missing structured lead field: ${field}`);
  assert.match(page, /leadType:'property_report_request'/);
  assert.match(page, /emailMarketingConsent:data\.get\('emailMarketingConsent'\)==='on'/);
});
