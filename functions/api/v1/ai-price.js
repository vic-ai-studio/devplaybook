/**
 * GET /api/v1/ai-price?model=gpt-4o&input_tokens=1000&output_tokens=500
 * POST /api/v1/ai-price  body: { model, input_tokens, output_tokens }
 *
 * Calculate AI API cost for given token counts.
 * Free: available. Pro: batch comparison (up to 10 models at once).
 *
 * Response: { model, input_tokens, output_tokens, cost_usd, breakdown }
 */
import { authenticate, json, CORS_HEADERS } from './_shared.js';

// Pricing as of 2025 (USD per 1M tokens)
const MODELS = {
  'gpt-4o':              { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':         { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':         { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo':       { input: 0.50,  output: 1.50  },
  'claude-3-5-sonnet':   { input: 3.00,  output: 15.00 },
  'claude-3-5-haiku':    { input: 0.80,  output: 4.00  },
  'claude-3-opus':       { input: 15.00, output: 75.00 },
  'claude-3-sonnet':     { input: 3.00,  output: 15.00 },
  'claude-3-haiku':      { input: 0.25,  output: 1.25  },
  'gemini-1.5-pro':      { input: 1.25,  output: 5.00  },
  'gemini-1.5-flash':    { input: 0.075, output: 0.30  },
  'gemini-2.0-flash':    { input: 0.10,  output: 0.40  },
  'llama-3.1-70b':       { input: 0.88,  output: 0.88  },
  'mistral-large':       { input: 2.00,  output: 6.00  },
};

function calcCost(model, inputTokens, outputTokens) {
  const pricing = MODELS[model];
  if (!pricing) return null;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return {
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: parseFloat((inputCost + outputCost).toFixed(6)),
    breakdown: {
      input_cost_usd: parseFloat(inputCost.toFixed(6)),
      output_cost_usd: parseFloat(outputCost.toFixed(6)),
      input_price_per_1m: pricing.input,
      output_price_per_1m: pricing.output,
    },
  };
}

async function parseParams(request) {
  const url = new URL(request.url);
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      return {
        model: body?.model,
        models: body?.models,
        input_tokens: parseInt(body?.input_tokens, 10),
        output_tokens: parseInt(body?.output_tokens || '0', 10),
      };
    } catch {
      return null;
    }
  }
  return {
    model: url.searchParams.get('model'),
    input_tokens: parseInt(url.searchParams.get('input_tokens') || '0', 10),
    output_tokens: parseInt(url.searchParams.get('output_tokens') || '0', 10),
  };
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

async function handle({ request, env }) {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  const params = await parseParams(request);
  if (!params) return json({ error: 'Invalid JSON body' }, 400);

  const rateHeaders = {
    'X-RateLimit-Remaining': String(auth.remaining),
    'X-RateLimit-Limit': String(auth.limit),
    'X-RateLimit-Plan': auth.plan,
  };

  // Pro: batch comparison across multiple models
  if (auth.plan === 'pro' && params.models) {
    const modelList = Array.isArray(params.models)
      ? params.models.slice(0, 10)
      : Object.keys(MODELS);
    const results = modelList.map(m => calcCost(m, params.input_tokens, params.output_tokens)).filter(Boolean);
    results.sort((a, b) => a.cost_usd - b.cost_usd);
    return json({ comparison: results, cheapest: results[0]?.model }, 200, rateHeaders);
  }

  // Single model lookup
  if (!params.model) {
    return json({
      error: 'Missing required param: model',
      available_models: Object.keys(MODELS),
    }, 400);
  }

  const result = calcCost(params.model, params.input_tokens, params.output_tokens);
  if (!result) {
    return json({
      error: `Unknown model: ${params.model}`,
      available_models: Object.keys(MODELS),
    }, 404);
  }

  return json(result, 200, rateHeaders);
}

export const onRequestGet = handle;
export const onRequestPost = handle;
