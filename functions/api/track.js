/**
 * POST /api/track
 * Records a pageview in KV. Called client-side on each page load.
 * Body: { path: string }
 * KV key: pv:{YYYY-MM-DD}:{encoded-path} → count
 * Expires: 90 days
 */
export async function onRequestPost({ request, env }) {
  // ANALYTICS KV must be bound in wrangler.toml / Cloudflare Pages settings
  if (!env.ANALYTICS) {
    return new Response('Analytics KV not configured', { status: 503 });
  }

  let path;
  try {
    const body = await request.json();
    path = body?.path;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  if (!path || typeof path !== 'string' || path.length > 512) {
    return new Response('Bad Request', { status: 400 });
  }

  // Normalize: strip query strings, keep only pathname
  const normalized = path.split('?')[0].slice(0, 200);
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `pv:${date}:${encodeURIComponent(normalized)}`;

  try {
    const current = parseInt((await env.ANALYTICS.get(key)) ?? '0', 10);
    await env.ANALYTICS.put(key, String(current + 1), {
      expirationTtl: 86400 * 90, // 90 days
    });
    return new Response(null, { status: 204 });
  } catch {
    return new Response('Internal Error', { status: 500 });
  }
}
