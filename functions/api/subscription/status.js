/**
 * GET /api/subscription/status
 * Returns the subscription tier for the current session or a given email.
 *
 * Auth: reads dp_session cookie (preferred) OR ?email= query param
 *
 * Returns:
 *   { isPro: boolean, plan: "free"|"pro", status: string, email?: string }
 *
 * Required env bindings:
 *   AUTH_KV      - session store (optional; fallback = not logged in)
 *   SUBSCRIBERS  - Pro subscriber records (optional; fallback = free tier)
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  // --- 1. Try session cookie first ---
  const cookieHeader = request.headers.get('Cookie') || '';
  const sessionId = getCookie(cookieHeader, COOKIE_NAME);

  if (sessionId && env.AUTH_KV) {
    const raw = await env.AUTH_KV.get(`session:${sessionId}`);
    if (raw) {
      let session;
      try {
        session = JSON.parse(raw);
      } catch {
        return json({ isPro: false, plan: 'free', status: 'inactive' });
      }

      const email = session.email;
      let plan = session.plan || 'free';

      // Re-sync plan from SUBSCRIBERS in case it changed
      if (env.SUBSCRIBERS && email) {
        const subRaw = await env.SUBSCRIBERS.get(`subscriber:${email}`);
        if (subRaw) {
          try {
            const rec = JSON.parse(subRaw);
            plan = rec.status === 'active' ? 'pro' : 'free';
          } catch {}
        }
      }

      return json({
        isPro: plan === 'pro',
        plan,
        status: plan === 'pro' ? 'active' : 'inactive',
        email,
      });
    }
  }

  // --- 2. Fallback: ?email= query param ---
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();

  if (!email) {
    return json({ isPro: false, plan: 'free', status: 'inactive' });
  }

  if (!env.SUBSCRIBERS) {
    return json({ isPro: false, plan: 'free', status: 'inactive' });
  }

  const raw = await env.SUBSCRIBERS.get(`subscriber:${email}`);
  if (!raw) {
    return json({ isPro: false, plan: 'free', status: 'inactive' });
  }

  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    return json({ isPro: false, plan: 'free', status: 'unknown' });
  }

  const isPro = record.status === 'active';
  return json({
    isPro,
    plan: isPro ? 'pro' : 'free',
    status: record.status || 'unknown',
    email,
    subscribedAt: record.createdAt,
  });
}
