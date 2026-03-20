/**
 * Shared Pro session auth helper for AI endpoints
 * Reads dp_session cookie, looks up session in AUTH_KV,
 * cross-checks subscription status in SUBSCRIBERS KV.
 *
 * Returns { ok: true, email, plan } or { ok: false, response: Response }
 */

const COOKIE_NAME = 'dp_session';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return v || '';
  }
  return null;
}

export async function requirePro(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const sessionId = getCookie(cookieHeader, COOKIE_NAME);

  if (!sessionId || !env.AUTH_KV) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Sign in required', code: 'UNAUTHENTICATED' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      ),
    };
  }

  const raw = await env.AUTH_KV.get(`session:${sessionId}`);
  if (!raw) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Session expired — please sign in again', code: 'SESSION_EXPIRED' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      ),
    };
  }

  let session;
  try {
    session = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Invalid session', code: 'SESSION_INVALID' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Check Pro status from SUBSCRIBERS KV (source of truth)
  let isPro = false;
  if (env.SUBSCRIBERS && session.email) {
    const subRaw = await env.SUBSCRIBERS.get(`subscriber:${session.email}`);
    if (subRaw) {
      try {
        const sub = JSON.parse(subRaw);
        isPro = sub.status === 'active';
      } catch {}
    }
  }

  if (!isPro) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Pro subscription required', code: 'UPGRADE_REQUIRED' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { ok: true, email: session.email, plan: 'pro' };
}
