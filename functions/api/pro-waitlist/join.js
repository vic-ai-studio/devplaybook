/**
 * POST /api/pro-waitlist/join
 * Add an email to the Pro waitlist (stored in NEWSLETTER_KV with source=pro_waitlist).
 * Does not send emails — VIC will set up Buttondown export later.
 */

export async function onRequestPost({ request, env }) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const kv = env.NEWSLETTER_KV;
    if (!kv) {
      // Graceful degradation — still report success to user (don't expose infra issues)
      console.error('NEWSLETTER_KV not bound');
      return new Response(JSON.stringify({ success: true, message: "You're on the list!" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const kvKey = `pro_waitlist:${email}`;
    const existing = await kv.get(kvKey);
    if (existing) {
      return new Response(JSON.stringify({ success: true, message: "You're already on the list!" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const entry = {
      email,
      joinedAt: new Date().toISOString(),
      source: 'pro_waitlist',
    };

    await kv.put(kvKey, JSON.stringify(entry));

    // Maintain a sorted index for easy CSV export
    const indexKey = 'pro_waitlist:__index__';
    const indexRaw = await kv.get(indexKey);
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    if (!index.includes(email)) {
      index.push(email);
      await kv.put(indexKey, JSON.stringify(index));
    }

    return new Response(JSON.stringify({ success: true, message: "You're on the list! We'll email you when Pro launches." }), {
      status: 200,
      headers: corsHeaders,
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
