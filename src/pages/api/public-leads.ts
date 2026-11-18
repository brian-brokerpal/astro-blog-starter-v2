import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isProductionHost } from '../../lib/production-host.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isProductionHost(new URL(request.url).hostname)) {
    return new Response(JSON.stringify({ error: 'Website inquiry intake is disabled on preview deployments.' }), {
      status: 503, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
  const upstream = String(env.LOS_PUBLIC_LEADS_URL || '').trim();
  if (!upstream) {
    return new Response(JSON.stringify({ error: 'Secure inquiry intake is not configured yet.' }), {
      status: 503, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Expected a website inquiry submission.' }), {
      status: 415, headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 12000) return new Response(JSON.stringify({ error: 'Submission is too large.' }), { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid submission.' }), { status: 400 });
  }
  try {
    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'origin': 'https://yourbrokerpal.com' },
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
