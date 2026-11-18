import test from "node:test";
import assert from "node:assert/strict";
import { readLimitedJson } from "../src/lib/read-limited-json.js";

test("public lead JSON reader accepts valid small JSON", async () => {
  const request = new Request("https://example.test/api", {
    method: "POST",
    body: JSON.stringify({ firstName: "Test" })
  });
  const result = await readLimitedJson(request, 12000);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { firstName: "Test" });
});

test("public lead JSON reader rejects oversized streamed bodies without content-length", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"message":"'));
      controller.enqueue(new Uint8Array(12001).fill(97));
      controller.close();
    }
  });
  const request = new Request("https://example.test/api", { method: "POST", body, duplex: "half" });
  const result = await readLimitedJson(request, 12000);
  assert.deepEqual(result, { ok: false, error: "Submission is too large." });
});

test("public lead JSON reader rejects malformed and invalid UTF-8 JSON", async () => {
  const malformed = await readLimitedJson(new Request("https://example.test/api", { method: "POST", body: "{" }), 12000);
  assert.equal(malformed.ok, false);
  const invalidUtf8 = new Request("https://example.test/api", {
    method: "POST",
    body: new Uint8Array([0xff, 0xfe]),
    duplex: "half"
  });
  const invalid = await readLimitedJson(invalidUtf8, 12000);
  assert.equal(invalid.ok, false);
});
