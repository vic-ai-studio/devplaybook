/**
 * POST /api/newsletter/subscribe
 * Subscribe an email to the newsletter (stored in Cloudflare KV)
 */
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const kv = env.NEWSLETTER_KV;
    if (!kv) {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if already subscribed
    const existing = await kv.get(`subscriber:${email}`);
    if (existing) {
      return new Response(JSON.stringify({ success: true, message: 'Already subscribed!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Store subscriber with metadata
    const subscriber = {
      email,
      subscribedAt: new Date().toISOString(),
      source: body.source || 'website',
    };
    await kv.put(`subscriber:${email}`, JSON.stringify(subscriber));

    // Update total count
    const countStr = await kv.get('meta:count');
    const count = parseInt(countStr || '0', 10) + 1;
    await kv.put('meta:count', String(count));

    return new Response(JSON.stringify({ success: true, message: 'Subscribed successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
