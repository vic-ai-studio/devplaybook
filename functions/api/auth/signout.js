/**
 * POST /api/auth/signout
 * Clear session cookie and delete session from KV.
 */

const COOKIE_NAME = 'dp_session';

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return v || '';
  }
  return null;
}

export async function onRequestPost({ request, env }) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const sessionId = getCookie(cookieHeader, COOKIE_NAME);

  // Delete session from KV
  if (sessionId && env.AUTH_KV) {
    await env.AUTH_KV.delete(`session:${sessionId}`);
  }

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;

  // Clear cookie and redirect to home
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${origin}/`,
      'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}
