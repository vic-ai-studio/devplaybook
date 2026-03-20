/**
 * POST /api/pro-waitlist/join
 * Add an email to the Pro waitlist (stored in NEWSLETTER_KV with source=pro_waitlist).
 * Sends a confirmation email via Resend if RESEND_API_KEY is set.
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
    const index = indexRaw ? JSON.parse(indexRaw) : [];
    if (!index.includes(email)) {
      index.push(email);
      await kv.put(indexKey, JSON.stringify(index));
    }

    // Send confirmation email via Resend if configured
    if (env.RESEND_API_KEY) {
      const position = index.length;
      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#38bdf8;font-size:24px;margin:0;">DevPlaybook</h1>
    <p style="color:#94a3b8;font-size:13px;margin:4px 0 0;">Developer Productivity Playbooks</p>
  </div>
  <h2 style="color:#f1f5f9;font-size:20px;">You're on the list! 🚀</h2>
  <p style="color:#cbd5e1;line-height:1.6;">
    You're #${position} on the DevPlaybook Pro waitlist. You'll get early access and launch pricing before anyone else.
  </p>
  <p style="color:#cbd5e1;line-height:1.6;"><strong style="color:#f1f5f9;">DevPlaybook Pro includes:</strong></p>
  <ul style="color:#cbd5e1;line-height:2;">
    <li>🤖 AI Code Review — get instant feedback on your code</li>
    <li>📝 AI Doc Generator — auto-generate README and API docs</li>
    <li>🗄️ AI SQL Builder — natural language to SQL queries</li>
    <li>⚡ Batch processing — handle multiple files at once</li>
    <li>🔑 API access — integrate into your workflow</li>
    <li>🚫 No ads</li>
  </ul>
  <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-top:32px;">
    Didn't sign up? You can safely ignore this email.
  </p>
  <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;">
  <p style="color:#475569;font-size:12px;text-align:center;">
    DevPlaybook · <a href="https://devplaybook.cc" style="color:#38bdf8;">devplaybook.cc</a>
  </p>
</body>
</html>`;
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'DevPlaybook <newsletter@devplaybook.cc>',
            to: [email],
            subject: "You're on the DevPlaybook Pro waitlist 🚀",
            html,
          }),
        });
      } catch (emailErr) {
        console.error('Waitlist email error:', emailErr);
      }
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
