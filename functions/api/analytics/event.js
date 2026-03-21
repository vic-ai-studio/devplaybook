/**
 * POST /api/analytics/event
 * Records a conversion event (Pro CTA click, checkout start, etc.)
 * Body: { event: string, path?: string }
 *
 * Allowed events: pro_cta_click, checkout_start, newsletter_open, tool_share
 * KV key: cv:{YYYY-MM-DD}:{event} → count (expires 90 days)
 */

const ALLOWED_EVENTS = new Set([
  'pro_cta_click',
  'checkout_start',
  'newsletter_open',
  'tool_share',
  'free_checklist_download',
  'bundle_view',
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  if (!env.ANALYTICS) {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let event;
  try {
    const body = await request.json();
    event = body?.event;
  } catch {
    return new Response(null, { status: 204, headers: CORS_HEADERS }); // silent fail
  }

  if (!event || !ALLOWED_EVENTS.has(event)) {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const date = new Date().toISOString().slice(0, 10);
  const key = `cv:${date}:${encodeURIComponent(event)}`;

  try {
    const current = parseInt((await env.ANALYTICS.get(key)) ?? '0', 10);
    await env.ANALYTICS.put(key, String(current + 1), {
      expirationTtl: 86400 * 90,
    });
  } catch { /* non-fatal */ }

  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
