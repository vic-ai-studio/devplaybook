/**
 * GET /api/stats
 * Returns today's pageview count, top 5 pages, and avg Core Web Vitals.
 * Used by the dashboard for traffic monitoring.
 *
 * Response: {
 *   date: string,
 *   totalPageviews: number,
 *   topPages: Array<{ path: string, views: number }>,
 *   webVitals: { LCP?: number, FID?: number, CLS?: number, FCP?: number, INP?: number }
 * }
 */
export async function onRequestGet({ env, request }) {
  if (!env.ANALYTICS) {
    return jsonResponse({ error: 'Analytics KV not configured' }, 503);
  }

  // Allow CORS for dashboard access
  const origin = request.headers.get('Origin') ?? '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin.includes('devplaybook.cc') ? origin : 'https://devplaybook.cc',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  };

  const date = new Date().toISOString().slice(0, 10);

  try {
    // --- Pageviews ---
    const pvPrefix = `pv:${date}:`;
    const pvList = await env.ANALYTICS.list({ prefix: pvPrefix });

    let totalPageviews = 0;
    const pageMap = {};

    for (const { name } of pvList.keys) {
      const count = parseInt((await env.ANALYTICS.get(name)) ?? '0', 10);
      const pagePath = decodeURIComponent(name.replace(pvPrefix, ''));
      pageMap[pagePath] = (pageMap[pagePath] ?? 0) + count;
      totalPageviews += count;
    }

    const topPages = Object.entries(pageMap)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // --- Core Web Vitals (avg for today) ---
    const cwvPrefix = `cwv:${date}:`;
    const cwvList = await env.ANALYTICS.list({ prefix: cwvPrefix });
    const vitals = {};

    for (const { name } of cwvList.keys) {
      const parts = name.replace(cwvPrefix, '').split(':');
      const metric = parts[0]; // e.g. LCP
      const raw = await env.ANALYTICS.get(name);
      if (!raw) continue;
      const { sum, count } = JSON.parse(raw);
      if (!vitals[metric]) vitals[metric] = { sum: 0, count: 0 };
      vitals[metric].sum += sum;
      vitals[metric].count += count;
    }

    const webVitals = {};
    for (const [metric, { sum, count }] of Object.entries(vitals)) {
      webVitals[metric] = Math.round(sum / count);
    }

    return new Response(
      JSON.stringify({ date, totalPageviews, topPages, webVitals }),
      { headers: corsHeaders }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Failed to aggregate stats' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
