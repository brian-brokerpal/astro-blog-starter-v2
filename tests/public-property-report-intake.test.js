import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const form = await readFile(new URL('../src/pages/tools/property-report.astro', import.meta.url), 'utf8');
const proxy = await readFile(new URL('../src/pages/api/public-leads.ts', import.meta.url), 'utf8');

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
  assert.match(proxy, /readLimitedJson\(request, 12000\)/);
  assert.match(proxy, /total > maxBytes/);
  assert.match(proxy, /body: JSON\.stringify\(body\)/);
  assert.doesNotMatch(proxy, /await request\.json\(\)/);
});
