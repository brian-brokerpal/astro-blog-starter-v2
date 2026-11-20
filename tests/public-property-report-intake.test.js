import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const form = await readFile(new URL('../src/pages/tools/property-report.astro', import.meta.url), 'utf8');
const proxy = await readFile(new URL('../src/pages/api/public-leads.ts', import.meta.url), 'utf8');
const contact = await readFile(new URL('../src/pages/contact.astro', import.meta.url), 'utf8');

test('Property Report retries reuse a key and successful submissions rotate it', () => {
  assert.match(form, /sessionStorage\.getItem\(reportSubmissionStorageKey\)/);
  assert.match(form, /sessionStorage\.setItem\(reportSubmissionStorageKey,key\)/);
  assert.match(form, /let reportSubmissionKey=getReportSubmissionKey\(\)/);
  assert.match(form, /submissionKey:reportSubmissionKey/);
  assert.match(form, /if\(!response\.ok\)throw[\s\S]*?reportSubmissionKey=createReportSubmissionKey\(\)/);
});

test('Property Report inquiries arrive as structured Property Report leads', () => {
  assert.match(form, /leadType:'property_report_request'/);
  for (const field of ['propertyAddress', 'propertyCity', 'propertyState', 'propertyZip', 'propertyType', 'purchasePrice', 'monthlyMarketRent']) {
    assert.match(form, new RegExp(field + ':'));
  }
  assert.match(form, /pattern="\[0-9\]\{5\}\(-\?\[0-9\]\{4\}\)\?"/);
  assert.match(form, /valid 5-digit or ZIP\+4 code/);
});

test('website proxy enforces a streamed body limit and forwards the parsed key unchanged', () => {
  assert.match(proxy, /request\.headers\.get\('Origin'\)/);
  assert.match(proxy, /origin !== 'https:\/\/yourbrokerpal\.com'/);
  assert.match(proxy, /typeof body !== 'object' \|\| Array\.isArray\(body\)/);
  assert.match(proxy, /readLimitedJson\(request, 12000\)/);
  assert.match(proxy, /total > maxBytes/);
  assert.match(proxy, /body: JSON\.stringify\(body\)/);
  assert.doesNotMatch(proxy, /await request\.json\(\)/);
});

test('Contact form creates a Lead Center financing inquiry with consent separated', () => {
  assert.match(contact, /id="contact-form"/);
  assert.match(contact, /leadType:'financing'/);
  assert.match(contact, /campaign:'Website Contact Form'/);
  assert.match(contact, /websitePath:'\/contact'/);
  assert.match(contact, /submissionKey,turnstileToken/);
  assert.match(contact, /emailMarketingConsent:data\.get\('emailMarketingConsent'\)==='on'/);
  assert.match(contact, /data\.get\('emailMarketingConsent'\)==='on'&&!email/);
  assert.match(contact, /Please provide an email address or phone number/);
  assert.match(contact, /sessionStorage\.getItem\(storageKey\)/);
  assert.match(contact, /submissionKey=newKey\(\)/);
  assert.match(contact, /not consent to automated marketing calls or text messages/i);
  assert.match(contact, /PUBLIC_TURNSTILE_SITE_KEY/);
});



test('website inquiry permission wording matches the LOS contact-consent records', () => {
  const financingConsent = 'By submitting, you ask Broker Pal to contact you about this inquiry using the contact information you provide. This is not consent to automated marketing calls or text messages.';
  const propertyReportConsent = 'By submitting, you ask Broker Pal to contact you about this property report and related financing inquiry. This is not consent to automated marketing calls or text messages.';
  assert.ok(contact.includes(financingConsent));
  assert.ok(form.includes(propertyReportConsent));
  assert.match(contact, /emailMarketingConsent:data\.get\('emailMarketingConsent'\)==='on'/);
  assert.match(form, /emailMarketingConsent:data\.get\('emailMarketingConsent'\)==='on'/);
  assert.match(contact, /leadType:'financing'/);
  assert.match(form, /leadType:'property_report_request'/);
});
