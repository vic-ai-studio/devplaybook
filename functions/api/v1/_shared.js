/**
 * Shared rate-limit middleware for public API v1 endpoints
 * - Reads X-API-Key header or ?key= query param
 * - Checks SUBSCRIBERS KV for key metadata and plan
 * - Enforces: free=100/day, pro=1000/day
 * - Returns { user, plan, remaining } or a 401/429 Response
 */

const FREE_LIMIT = 100;
const PRO_LIMIT = 1000;

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Authenticate + rate-limit the request.
 * Returns { plan, remaining, key } on success, or a Response on failure.
 */
export async function authenticate(request, env) {
  const url = new URL(request.url);
  const key =
    request.headers.get('X-API-Key') ||
    url.searchParams.get('key') ||
    '';

  if (!key.startsWith('dp_')) {
    return new Response(
      JSON.stringify({
        error: 'API key required. Get one free at https://devplaybook.cc/api-docs',
      }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  // Look up key metadata
  let plan = 'free';
  if (env.SUBSCRIBERS) {
    const raw = await env.SUBSCRIBERS.get(`apikey:${key}`);
    if (!raw) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }
    try {
      const meta = JSON.parse(raw);
      plan = meta.plan || 'free';
    } catch {}
  }

  const limit = plan === 'pro' ? PRO_LIMIT : FREE_LIMIT;
  const rateLimitKey = `ratelimit:${key}:${today()}`;

  let used = 0;
  if (env.SUBSCRIBERS) {
    const val = await env.SUBSCRIBERS.get(rateLimitKey);
    used = val ? parseInt(val, 10) : 0;
  }

  if (used >= limit) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        limit,
        plan,
        resetAt: `${today()}T23:59:59Z`,
        upgradeTo: 'https://devplaybook.cc/pricing',
      }),
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Plan': plan,
        },
      }
    );
  }

  // Increment counter (TTL = 86400s = 1 day)
  if (env.SUBSCRIBERS) {
    await env.SUBSCRIBERS.put(rateLimitKey, String(used + 1), { expirationTtl: 86400 });
  }

  const remaining = limit - used - 1;
  return { plan, remaining, limit, key };
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      ...extra,
    },
  });
}
