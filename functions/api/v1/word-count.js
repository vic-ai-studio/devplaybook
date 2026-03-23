/**
 * POST /api/v1/word-count
 * Count words, sentences, paragraphs, and reading time for text.
 * Free: up to 50,000 chars/request. Pro: up to 500,000 chars/request.
 *
 * Body: { "text": "..." }
 * Response: { words, chars, chars_no_spaces, sentences, paragraphs, reading_time_min }
 */
import { authenticate, json, CORS_HEADERS } from './_shared.js';

const FREE_MAX_CHARS = 50_000;
const PRO_MAX_CHARS = 500_000;

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
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const text = body?.text;
  if (typeof text !== 'string') {
    return json({ error: 'Missing required field: text (string)' }, 400);
  }

  const maxChars = auth.plan === 'pro' ? PRO_MAX_CHARS : FREE_MAX_CHARS;
  if (text.length > maxChars) {
    return json({
      error: `Text too long. Max ${maxChars.toLocaleString()} chars for ${auth.plan} plan.`,
      upgrade: auth.plan === 'free' ? 'https://devplaybook.cc/pricing' : undefined,
    }, 413);
  }

  const words = (text.match(/\S+/g) || []).length;
  const chars = text.length;
  const chars_no_spaces = text.replace(/\s/g, '').length;
  const sentences = (text.match(/[^.!?]*[.!?]+/g) || []).length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  const reading_time_min = parseFloat((words / 200).toFixed(1)); // avg 200 wpm

  return json(
    { words, chars, chars_no_spaces, sentences, paragraphs, reading_time_min },
    200,
    {
      'X-RateLimit-Remaining': String(auth.remaining),
      'X-RateLimit-Limit': String(auth.limit),
      'X-RateLimit-Plan': auth.plan,
    }
  );
}
