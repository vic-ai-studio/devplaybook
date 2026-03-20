/**
 * GET /api/v1/uuid?count=1&version=4
 * Generate UUID(s). Free: up to 10/request. Pro: up to 100/request.
 */
import { authenticate, json, CORS_HEADERS } from './_shared.js';

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const maxCount = auth.plan === 'pro' ? 100 : 10;
  const count = Math.min(parseInt(url.searchParams.get('count') || '1', 10), maxCount);
  const version = url.searchParams.get('version') || '4';

  if (version !== '4') {
    return json({ error: 'Only UUID v4 is supported' }, 400);
  }

  const uuids = Array.from({ length: count }, () => crypto.randomUUID());

  return json(
    { uuids, count },
    200,
    {
      'X-RateLimit-Remaining': String(auth.remaining),
      'X-RateLimit-Limit': String(auth.limit),
      'X-RateLimit-Plan': auth.plan,
    }
  );
}
