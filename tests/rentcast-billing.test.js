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
