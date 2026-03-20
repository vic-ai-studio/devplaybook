/**
 * POST /api/vitals
 * Records a Core Web Vital metric in KV for aggregation.
 * Body: { name: string, value: number, rating: string, path: string }
 * KV key: cwv:{YYYY-MM-DD}:{metric}:{path} → JSON { sum, count }
 * Expires: 30 days
 */
export async function onRequestPost({ request, env }) {
  if (!env.ANALYTICS) {
    return new Response('Analytics KV not configured', { status: 503 });
  }

  let name, value, rating, path;
  try {
    const body = await request.json();
    ({ name, value, rating, path } = body);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const VALID_METRICS = ['LCP', 'CLS', 'INP', 'FCP', 'TTFB'];
  if (!VALID_METRICS.includes(name) || typeof value !== 'number') {
    return new Response('Bad Request', { status: 400 });
  }

  const normalized = (path ?? '/').split('?')[0].slice(0, 200);
  const date = new Date().toISOString().slice(0, 10);
  const key = `cwv:${date}:${name}:${encodeURIComponent(normalized)}`;

  try {
    const existing = JSON.parse((await env.ANALYTICS.get(key)) ?? '{"sum":0,"count":0}');
    existing.sum += value;
    existing.count += 1;
    await env.ANALYTICS.put(key, JSON.stringify(existing), {
      expirationTtl: 86400 * 30, // 30 days
    });
    return new Response(null, { status: 204 });
  } catch {
    return new Response('Internal Error', { status: 500 });
  }
}
