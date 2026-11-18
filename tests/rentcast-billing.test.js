import test from "node:test";
import assert from "node:assert/strict";
import { getRentCastBillingPeriodKey } from "../src/lib/rentcast-billing.js";

test("RentCast billing period key fails closed when missing", () => {
  assert.equal(getRentCastBillingPeriodKey(undefined), null);
  assert.equal(getRentCastBillingPeriodKey(""), null);
  assert.equal(getRentCastBillingPeriodKey("   "), null);
});

test("RentCast billing period key accepts a confirmed period identifier", () => {
  assert.equal(getRentCastBillingPeriodKey("2026-11-17"), "2026-11-17");
  assert.equal(getRentCastBillingPeriodKey("period_2026_11"), "period_2026_11");
});

test("RentCast billing period key rejects unsafe or oversized identifiers", () => {
  assert.equal(getRentCastBillingPeriodKey("../reset"), null);
  assert.equal(getRentCastBillingPeriodKey("2026 11 17"), null);
  assert.equal(getRentCastBillingPeriodKey("x".repeat(41)), null);
});

import { readFile } from "node:fs/promises";

test("property valuation fails closed without a confirmed period and reserves at most 50 requests before calling RentCast", async () => {
  const route = await readFile(new URL("../src/pages/api/property-valuation.json.ts", import.meta.url), "utf8");
  assert.match(route, /if \(!billingPeriodKey\).*No provider request was made/);
  assert.match(route, /WHERE request_count < 50 RETURNING request_count/);
  assert.match(route, /\.bind\(usagePeriodKey\)\.first\(\)/);
  assert.ok(route.indexOf("request_count < 50") < route.indexOf('fetch("https://api.rentcast.io/v1/avm/value?'));
});
