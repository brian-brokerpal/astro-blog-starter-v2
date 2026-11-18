export async function readLimitedJson(request, maxBytes) {
  if (!request.body) return { ok: false, error: "Invalid submission." };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch {}
        return { ok: false, error: "Submission is too large." };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(source) };
  } catch {
    try { await reader.cancel(); } catch {}
    return { ok: false, error: "Invalid submission." };
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}
