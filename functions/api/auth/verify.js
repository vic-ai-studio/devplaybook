/**
 * GET /api/auth/verify?token=xxx
 * Verify a magic link token, create a session, set cookie, redirect to dashboard.
 *
 * Required env vars:
 *   AUTH_KV    - KV namespace for tokens and sessions
 *   SUBSCRIBERS - KV namespace for Pro subscriber lookup
 *
 * KV reads:  magic:{token}   → { email }
 * KV writes: session:{id}    → { email, plan, createdAt } (TTL 30 days)
 */

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const COOKIE_NAME = 'dp_session';

function generateSessionId() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = (url.searchParams.get('token') || '').trim();
  const origin = `${url.protocol}//${url.host}`;

  if (!token) {
    return Response.redirect(`${origin}/signin?error=missing_token`, 302);
  }

  if (!env.AUTH_KV) {
    // KV not configured (local dev without bindings)
    return Response.redirect(`${origin}/signin?error=not_configured`, 302);
  }

  // Look up token
  const raw = await env.AUTH_KV.get(`magic:${token}`);
  if (!raw) {
    return Response.redirect(`${origin}/signin?error=invalid_or_expired`, 302);
  }

  let tokenData;
  try {
    tokenData = JSON.parse(raw);
  } catch {
    return Response.redirect(`${origin}/signin?error=invalid_token`, 302);
  }

  const email = tokenData.email;

  // Delete the one-time token immediately
  await env.AUTH_KV.delete(`magic:${token}`);

  // Check subscription plan
  let plan = 'free';
  if (env.SUBSCRIBERS) {
    const subRaw = await env.SUBSCRIBERS.get(`subscriber:${email}`);
    if (subRaw) {
      try {
        const sub = JSON.parse(subRaw);
        if (sub.status === 'active') plan = 'pro';
      } catch {}
    }
  }

  // Create session
  const sessionId = generateSessionId();
  const sessionData = {
    email,
    plan,
    createdAt: new Date().toISOString(),
  };
  await env.AUTH_KV.put(
    `session:${sessionId}`,
    JSON.stringify(sessionData),
    { expirationTtl: SESSION_TTL_SECONDS }
  );

  // Set session cookie (HttpOnly, Secure, SameSite=Lax, 30 days)
  const cookieValue = `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${origin}/pro-dashboard`,
      'Set-Cookie': cookieValue,
    },
  });
}
