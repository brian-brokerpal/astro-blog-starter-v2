import type { APIRoute } from 'astro';

export const prerender = false;

async function readLimitedJson(request: Request, maxBytes: number): Promise<{ ok: true; value: unknown } | { ok: false; status: number }> {
  if (!request.body) return { ok: false, status: 400 };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch {}
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
  } catch {
    try { await reader.cancel(); } catch {}
    return { ok: false, status: 400 };
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const origin = request.headers.get('Origin');
  if (origin !== 'https://yourbrokerpal.com') {
    return new Response(JSON.stringify({ error: 'Request origin is not allowed.' }), {
      status: 403, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
  const runtime = (locals as any).runtime;
  const env = runtime?.env || {};
  // Keep the production website connected to the established LOS Pages API even
  // when the optional Worker variable has not been populated. Preview requests are
  // still blocked by the exact production-origin check above; they never fall back
  // to sending test submissions into the live lead database.
  const upstream = String(env.LOS_PUBLIC_LEADS_URL || 'https://yourbrokerpal-los--dscr.pages.dev/api/public-leads').trim();
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Expected a website inquiry submission.' }), {
      status: 415, headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 12000) return new Response(JSON.stringify({ error: 'Submission is too large.' }), { status: 413 });
  const parsed = await readLimitedJson(request, 12000);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.status === 413 ? 'Submission is too large.' : 'Invalid submission.' }), {
      status: parsed.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
  const body = parsed.value;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return new Response(JSON.stringify({ error: 'Invalid submission.' }), {
      status: 400, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
  try {
    // Preserve the edge-observed client IP for server-side Turnstile verification
    // and the LOS consent audit record. Cloudflare supplies this header at the edge.
    const clientIp = request.headers.get('CF-Connecting-IP');
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'origin': 'https://yourbrokerpal.com'
    };
    if (clientIp) headers['CF-Connecting-IP'] = clientIp;
    const response = await fetch(upstream, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const payload = await response.text();
    return new Response(payload, {
      status: response.status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'The inquiry service is temporarily unavailable. Please try again.' }), {
      status: 502, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
};
