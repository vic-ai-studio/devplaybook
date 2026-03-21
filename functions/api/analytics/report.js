/**
 * GET /api/analytics/report
 * Returns a comprehensive daily traffic report including:
 *   - Total pageviews (today + yesterday + 7-day)
 *   - Top pages and top tools
 *   - Conversion funnel: tool views → Pro CTA clicks
 *   - Newsletter subscriber count
 *   - Core Web Vitals (avg)
 *
 * Used by: export-traffic-report.py (writes to matrix/data/traffic_report.json)
 *
 * CORS: restricted to devplaybook.cc + localhost
 */

const ALLOWED_ORIGINS = new Set([
  'https://devplaybook.cc',
  'http://localhost:4321',
  'http://localhost:3000',
]);

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://devplaybook.cc';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status: status || 200, headers });
}

function dateStr(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function getPageviewsForDate(kv, date) {
  const prefix = `pv:${date}:`;
  const list = await kv.list({ prefix });
  const pageMap = {};
  let total = 0;
  for (const { name } of list.keys) {
    const count = parseInt((await kv.get(name)) ?? '0', 10);
    const page = decodeURIComponent(name.replace(prefix, ''));
    pageMap[page] = (pageMap[page] || 0) + count;
    total += count;
  }
  return { total, pageMap };
}

async function getConversionEvents(kv, date) {
  // Conversion events stored as: cv:{date}:{event} → count
  const prefix = `cv:${date}:`;
  const list = await kv.list({ prefix });
  const events = {};
  for (const { name } of list.keys) {
    const count = parseInt((await kv.get(name)) ?? '0', 10);
    const event = decodeURIComponent(name.replace(prefix, ''));
    events[event] = count;
  }
  return events;
}

async function getWebVitals(kv, date) {
  const prefix = `cwv:${date}:`;
  const list = await kv.list({ prefix });
  const vitals = {};
  for (const { name } of list.keys) {
    const parts = name.replace(prefix, '').split(':');
    const metric = parts[0];
    const raw = await kv.get(name);
    if (!raw) continue;
    try {
      const { sum, count } = JSON.parse(raw);
      if (!vitals[metric]) vitals[metric] = { sum: 0, count: 0 };
      vitals[metric].sum += sum;
      vitals[metric].count += count;
    } catch { /* skip malformed */ }
  }
  const result = {};
  for (const [m, { sum, count }] of Object.entries(vitals)) {
    result[m] = Math.round(sum / count);
  }
  return result;
}

function extractToolUsage(pageMap) {
  // Pages under /tools/* count as tool usage
  const tools = {};
  for (const [page, views] of Object.entries(pageMap)) {
    if (page.startsWith('/tools/')) {
      const toolName = page.replace('/tools/', '').split('/')[0] || page;
      tools[toolName] = (tools[toolName] || 0) + views;
    }
  }
  return Object.entries(tools)
    .map(([tool, views]) => ({ tool, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
}

function buildFunnel(pageMap, conversionEvents) {
  const toolViews = Object.entries(pageMap)
    .filter(([p]) => p.startsWith('/tools/'))
    .reduce((sum, [, v]) => sum + v, 0);

  const pricingViews = pageMap['/pricing'] || 0;
  const proCtaClicks = (conversionEvents['pro_cta_click'] || 0);
  const checkoutStarts = (conversionEvents['checkout_start'] || 0);

  return {
    tool_views: toolViews,
    pricing_views: pricingViews,
    pro_cta_clicks: proCtaClicks,
    checkout_starts: checkoutStarts,
    tool_to_pricing_rate: toolViews > 0 ? +(pricingViews / toolViews * 100).toFixed(1) : 0,
    pricing_to_cta_rate: pricingViews > 0 ? +(proCtaClicks / pricingViews * 100).toFixed(1) : 0,
  };
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get('Origin') ?? '';
  return new Response(null, { headers: corsHeaders(origin) });
}

export async function onRequestGet({ request, env }) {
  const origin = request.headers.get('Origin') ?? '';
  const headers = corsHeaders(origin);

  if (!env.ANALYTICS) {
    return json({ error: 'Analytics KV not configured' }, 503, headers);
  }

  try {
    const today = dateStr(0);
    const yesterday = dateStr(1);

    // Parallel fetch: today + yesterday + conversions + vitals
    const [todayData, yesterdayData, conversions, webVitals, subCount] = await Promise.all([
      getPageviewsForDate(env.ANALYTICS, today),
      getPageviewsForDate(env.ANALYTICS, yesterday),
      getConversionEvents(env.ANALYTICS, today),
      getWebVitals(env.ANALYTICS, today),
      env.NEWSLETTER_KV ? env.NEWSLETTER_KV.get('meta:count') : Promise.resolve(null),
    ]);

    // 7-day total
    let sevenDayTotal = todayData.total + yesterdayData.total;
    for (let i = 2; i <= 6; i++) {
      const d = await getPageviewsForDate(env.ANALYTICS, dateStr(i));
      sevenDayTotal += d.total;
    }

    const topPages = Object.entries(todayData.pageMap)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const report = {
      generatedAt: new Date().toISOString(),
      date: today,
      pageviews: {
        today: todayData.total,
        yesterday: yesterdayData.total,
        last7Days: sevenDayTotal,
      },
      topPages,
      topTools: extractToolUsage(todayData.pageMap),
      conversionFunnel: buildFunnel(todayData.pageMap, conversions),
      conversionEvents: conversions,
      subscribers: parseInt(subCount || '0', 10),
      webVitals,
    };

    return json(report, 200, headers);
  } catch (err) {
    return json({ error: 'Failed to generate report', detail: err.message }, 500, headers);
  }
}
