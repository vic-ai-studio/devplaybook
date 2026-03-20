/**
 * GET /api/auth/session
 * Return the current session info (email, plan) from cookie.
 *
 * Returns:
 *   { loggedIn: boolean, email?: string, plan?: string }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const COOKIE_NAME = 'dp_session';

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return v || '';
  }
  return null;
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const sessionId = getCookie(cookieHeader, COOKIE_NAME);

  if (!sessionId || !env.AUTH_KV) {
    return new Response(
      JSON.stringify({ loggedIn: false }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const raw = await env.AUTH_KV.get(`session:${sessionId}`);
  if (!raw) {
    return new Response(
      JSON.stringify({ loggedIn: false }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  let session;
  try {
    session = JSON.parse(raw);
  } catch {
    return new Response(
      JSON.stringify({ loggedIn: false }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  // Re-sync plan from SUBSCRIBERS in case it changed
  let plan = session.plan || 'free';
  if (env.SUBSCRIBERS && session.email) {
    const subRaw = await env.SUBSCRIBERS.get(`subscriber:${session.email}`);
    if (subRaw) {
      try {
        const sub = JSON.parse(subRaw);
        plan = sub.status === 'active' ? 'pro' : 'free';
      } catch {}
    } else {
      plan = 'free';
    }
  }

  return new Response(
    JSON.stringify({
      loggedIn: true,
      email: session.email,
      plan,
      isPro: plan === 'pro',
    }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
}
