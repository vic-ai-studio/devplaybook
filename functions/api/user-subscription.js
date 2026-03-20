/**
 * GET /api/user-subscription?email=user@example.com
 * Check if an email has an active Pro subscription (looks up SUBSCRIBERS KV)
 *
 * Returns:
 *   { isPro: boolean, status: string, plan: string }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return new Response(
      JSON.stringify({ error: 'email query param required' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  if (!env.SUBSCRIBERS) {
    // KV not configured → treat everyone as free
    return new Response(
      JSON.stringify({ isPro: false, plan: 'free', status: 'inactive' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const raw = await env.SUBSCRIBERS.get(`subscriber:${email}`);
  if (!raw) {
    return new Response(
      JSON.stringify({ isPro: false, plan: 'free', status: 'inactive' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    return new Response(
      JSON.stringify({ isPro: false, plan: 'free', status: 'unknown' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const isPro = record.status === 'active';

  return new Response(
    JSON.stringify({
      isPro,
      plan: isPro ? 'pro' : 'free',
      status: record.status || 'unknown',
      subscribedAt: record.createdAt,
    }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
}
