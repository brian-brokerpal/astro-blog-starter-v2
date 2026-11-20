import test from "node:test";
import assert from "node:assert/strict";
import { buildAttribution } from "../src/scripts/attribution.js";

test("captures the first UTM touch and keeps latest touch fields distinct", () => {
  const value = buildAttribution({
    search: "?utm_source=google&utm_medium=organic&utm_campaign=investor-guide&utm_content=hero",
    hostname: "yourbrokerpal.com"
  });
  assert.equal(value.firstTouchSource, "google");
  assert.equal(value.firstTouchMedium, "organic");
  assert.equal(value.firstTouchCampaign, "investor-guide");
  assert.equal(value.latestTouchSource, "google");
  assert.equal(value.latestTouchCampaign, "investor-guide");
});

test("later campaign visits update latest touch without overwriting first touch", () => {
  const stored = buildAttribution({
    search: "?utm_source=google&utm_medium=organic&utm_campaign=first",
    hostname: "yourbrokerpal.com"
  });
  const later = buildAttribution({
    search: "?utm_source=linkedin&utm_medium=social&utm_campaign=retarget",
    hostname: "yourbrokerpal.com",
    stored
  });
  assert.equal(later.firstTouchSource, "google");
  assert.equal(later.firstTouchCampaign, "first");
  assert.equal(later.latestTouchSource, "linkedin");
  assert.equal(later.latestTouchMedium, "social");
  assert.equal(later.latestTouchCampaign, "retarget");
});

test("records referral codes as claims, not verified partner identity", () => {
  const value = buildAttribution({
    search: "?ref=agent_42",
    hostname: "yourbrokerpal.com"
  });
  assert.equal(value.firstTouchSource, "partner_referral");
  assert.equal(value.firstTouchMedium, "referral");
  assert.equal(value.referralCode, "agent_42");
});

test("classifies search referrers as organic without retaining the full URL", () => {
  const value = buildAttribution({
    referrer: "https://www.google.com/search?q=private",
    hostname: "yourbrokerpal.com"
  });
  assert.equal(value.firstTouchSource, "www.google.com");
  assert.equal(value.firstTouchMedium, "organic");
});

test("uses only the external referrer host and does not retain the full referrer URL", () => {
  const value = buildAttribution({
    referrer: "https://partner.example/listing?borrower=private",
    hostname: "yourbrokerpal.com"
  });
  assert.equal(value.firstTouchSource, "partner.example");
  assert.equal(value.firstTouchMedium, "referral");
  assert.equal(JSON.stringify(value).includes("borrower=private"), false);
});

test("bounds attribution fields and strips control characters", () => {
  const value = buildAttribution({
    search: "?utm_source=google&utm_medium=organic&utm_campaign=safe%0Aname"
  });
  assert.equal(value.latestTouchCampaign, "safename");
  const long = buildAttribution({ search: "?utm_source=" + "x".repeat(180) });
  assert.equal(long.firstTouchSource.length, 120);
});
