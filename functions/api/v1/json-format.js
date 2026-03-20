/**
 * POST /api/v1/json-format
 * Body: { json: string, indent: number }
 * Format, minify, or validate JSON.
 */
import { authenticate, json, CORS_HEADERS } from './_shared.js';

const MAX_SIZE = 100_000; // 100KB free tier
const PRO_MAX_SIZE = 1_000_000; // 1MB pro tier

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body. Expected JSON with a "json" field.' }, 400);
  }

  const input = body.json;
  const indent = Math.min(parseInt(body.indent ?? 2, 10), 8);
  const minify = body.minify === true;

  if (typeof input !== 'string') {
    return json({ error: '"json" field must be a string' }, 400);
  }

  const maxSize = auth.plan === 'pro' ? PRO_MAX_SIZE : MAX_SIZE;
  if (input.length > maxSize) {
    return json({
      error: `Input too large. Max ${maxSize / 1000}KB for ${auth.plan} plan.`,
      upgradeTo: auth.plan === 'free' ? 'https://devplaybook.cc/pricing' : null,
    }, 413);
  }

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    return json({ valid: false, error: `Parse error: ${e.message}` }, 400);
  }

  const output = minify
    ? JSON.stringify(parsed)
    : JSON.stringify(parsed, null, indent);

  return json(
    {
      valid: true,
      formatted: output,
      originalSize: input.length,
      formattedSize: output.length,
      compressionRatio: minify
        ? `${((1 - output.length / input.length) * 100).toFixed(1)}% smaller`
        : null,
    },
    200,
    {
      'X-RateLimit-Remaining': String(auth.remaining),
      'X-RateLimit-Limit': String(auth.limit),
      'X-RateLimit-Plan': auth.plan,
    }
  );
}
