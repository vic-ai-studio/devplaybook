/**
 * POST /api/v1/token-count
 * Estimate token count for text (approximation of OpenAI/Claude tokenization).
 * Free: up to 10,000 chars/request. Pro: up to 100,000 chars/request.
 *
 * Body: { "text": "..." }
 * Response: { tokens, words, chars, model_estimates }
 */
import { authenticate, json, CORS_HEADERS } from './_shared.js';

const FREE_MAX_CHARS = 10_000;
const PRO_MAX_CHARS = 100_000;

/**
 * Rough token estimator.
 * Rule of thumb: 1 token ≈ 4 chars in English, ~3 chars in code.
 * We use a simple word-based split as a closer approximation.
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Split on whitespace and punctuation boundaries
  const tokens = text.match(/\S+/g) || [];
  let count = 0;
  for (const tok of tokens) {
    // Long words / code tokens split into subtokens
    count += Math.ceil(tok.length / 4);
  }
  return count;
}

function countWords(text) {
  return (text.match(/\S+/g) || []).length;
}

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

  const tokens = estimateTokens(text);
  const words = countWords(text);
  const chars = text.length;

  // Per-model cost estimates (USD per 1M input tokens, 2025 pricing)
  const pricePerMillion = {
    'gpt-4o': 2.50,
    'gpt-4o-mini': 0.15,
    'gpt-4-turbo': 10.00,
    'claude-3-5-sonnet': 3.00,
    'claude-3-5-haiku': 0.80,
    'claude-3-opus': 15.00,
    'gemini-1.5-pro': 1.25,
    'gemini-1.5-flash': 0.075,
  };

  const model_estimates = {};
  for (const [model, price] of Object.entries(pricePerMillion)) {
    model_estimates[model] = {
      estimated_cost_usd: parseFloat(((tokens / 1_000_000) * price).toFixed(6)),
      price_per_1m_tokens: price,
    };
  }

  return json(
    { tokens, words, chars, model_estimates },
    200,
    {
      'X-RateLimit-Remaining': String(auth.remaining),
      'X-RateLimit-Limit': String(auth.limit),
      'X-RateLimit-Plan': auth.plan,
    }
  );
}
