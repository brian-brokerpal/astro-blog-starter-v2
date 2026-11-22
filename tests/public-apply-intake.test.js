import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../src/pages/apply.astro', import.meta.url), 'utf8');
const proxy = await readFile(new URL('../src/pages/api/public-leads.ts', import.meta.url), 'utf8');

test('public Apply page captures a financing inquiry without sending borrowers to the staff-protected LOS page', () => {
  assert.match(page, /id="financing-inquiry-form"/);
  assert.match(page, /leadType:'financing_inquiry'/);
  assert.match(page, /fetch\('\/api\/public-leads'/);
  assert.doesNotMatch(page, /yourbrokerpal-los--dscr\.pages\.dev/);
  assert.doesNotMatch(page, /fetch\('\/api\/applications'/);
  assert.match(page, /name="firstName"/);
  assert.match(page, /name="email"/);
  assert.match(page, /name="phone"/);
  assert.match(page, /name="programInterest"/);
  assert.match(page, /name="loanPurpose"/);
  assert.match(page, /name="requestedAmount"/);
  assert.match(page, /name="monthlyMarketRent"/);
  assert.match(page, /submissionKey/);
  assert.match(page, /turnstileToken/);
  assert.match(page, /not consent to automated marketing calls or text messages/i);
  assert.match(page, /not a credit application/i);
});

test('public inquiry confirmation routes ready borrowers to the full secure application and document upload flow', () => {
  assert.match(page, /Continue to secure borrower application/);
  assert.match(page, /https:\/\/yourbrokerpal-los--dscr\.pages\.dev\/apply\.html/);
});

test('public Apply page preserves contact details and optional property fields for Lead Center intake', () => {
  for (const field of ['entityName','propertyAddress','propertyCity','propertyState','propertyZip','propertyType','units','purchasePrice','estimatedValue','requestedAmount','monthlyMarketRent','programInterest','loanPurpose']) {
    assert.match(page, new RegExp(field + '(?:\\s*:|\\s*,)'));
  }
  assert.match(page, /PUBLIC_TURNSTILE_SITE_KEY/);
});

test('public lead proxy has a canonical LOS fallback and rejects non-production browser origins', () => {
  assert.match(proxy, /origin !== 'https:\/\/yourbrokerpal\.com'/);
  assert.match(proxy, /https:\/\/yourbrokerpal-los--dscr\.pages\.dev\/api\/public-leads/);
  assert.match(proxy, /redirect: 'manual'/);
});
