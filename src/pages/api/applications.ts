import type { APIRoute } from 'astro';

export const prerender = false;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (request.headers.get('Origin') !== 'https://yourbrokerpal.com') {
    return json({ error: 'Request origin is not allowed.' }, 403);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return json({ error: 'Expected a secure application form submission.' }, 415);
  }

  const length = Number(request.headers.get('content-length') || 0);
  if (length > 55 * 1024 * 1024) return json({ error: 'Total upload size exceeds the 50 MB inquiry limit.' }, 413);
  if (!request.body) return json({ error: 'Invalid application submission.' }, 400);

  const runtime = (locals as any).runtime;
  const env = runtime?.env || {};
  const upstream = String(env.LOS_APPLICATIONS_URL || 'https://yourbrokerpal-los--dscr.pages.dev/api/applications').trim();
  let target: URL;
  try {
    target = new URL(upstream);
    if (target.protocol !== 'https:') return json({ error: 'The secure application service URL is invalid.' }, 503);
  } catch {
    return json({ error: 'The secure application service URL is invalid.' }, 503);
  }

  const headers = new Headers({
    'content-type': contentType,
    'origin': 'https://yourbrokerpal.com'
  });
  const clientIp = request.headers.get('CF-Connecting-IP');
  if (clientIp) headers.set('CF-Connecting-IP', clientIp);

  try {
    const response = await fetch(target.toString(), {
      method: 'POST',
      headers,
      body: request.body,
      redirect: 'manual'
    });

    if (response.status >= 300 && response.status < 400) {
      return json({
        error: 'The loan application service is protected by an access gate. Public application access must be enabled for this endpoint before borrowers can submit.'
      }, 502);
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff'
      }
    });
  } catch {
    return json({ error: 'The secure application service is temporarily unavailable. Please try again or contact Broker Pal directly.' }, 502);
  }
};
