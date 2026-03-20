/**
 * POST /api/keys — Generate a new API key
 * Body (optional): { email: string }  ← links to Pro subscriber record
 *
 * Free keys: 100 req/day
 * Pro keys: 1000 req/day (auto-detected from SUBSCRIBERS KV)
 *
 * KV structure:
 *   apikey:{key}  → JSON { key, email, plan, createdAt }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function generateApiKey() {
  // dp_ prefix, 32 hex chars, readable format
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `dp_${hex}`;
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch {}

  const email = (body.email || '').trim().toLowerCase();

  // Determine plan from SUBSCRIBERS KV
  let plan = 'free';
  if (email && email.includes('@') && env.SUBSCRIBERS) {
    const raw = await env.SUBSCRIBERS.get(`subscriber:${email}`);
    if (raw) {
      try {
        const rec = JSON.parse(raw);
        if (rec.status === 'active') plan = 'pro';
      } catch {}
    }
  }

  const key = generateApiKey();
  const record = {
    key,
    email: email || null,
    plan,
    createdAt: new Date().toISOString(),
  };

  if (env.SUBSCRIBERS) {
    // Store key → metadata (no expiry, keys are permanent until deleted)
    await env.SUBSCRIBERS.put(`apikey:${key}`, JSON.stringify(record));
    // Also index email → key list for future lookups
    if (email) {
      await env.SUBSCRIBERS.put(`apikeys:${email}`, key);
    }
  }

  return new Response(
    JSON.stringify({
      apiKey: key,
      plan,
      limits: {
        requestsPerDay: plan === 'pro' ? 1000 : 100,
      },
      usage: `https://devplaybook.cc/api-docs`,
    }),
    {
      status: 201,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    }
  );
}
