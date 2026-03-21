/**
 * POST /api/subscribe
 * Shortcut alias for /api/newsletter/subscribe
 * Accepts { email, source? } and stores to Cloudflare KV (NEWSLETTER_KV).
 * Works without any external API keys — signups are always captured locally.
 * When BUTTONDOWN_API_KEY is set, also syncs to Buttondown.
 * When RESEND_API_KEY is set, sends a welcome email.
 */

const FROM_EMAIL = 'DevPlaybook <newsletter@devplaybook.cc>';
const SITE_URL = 'https://devplaybook.cc';

async function sendWelcomeEmail(email, resendApiKey) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#38bdf8;font-size:24px;margin:0;">DevPlaybook</h1>
    <p style="color:#94a3b8;font-size:13px;margin:4px 0 0;">Developer Productivity Playbooks</p>
  </div>
  <h2 style="color:#f1f5f9;font-size:20px;">Welcome aboard! 🎉</h2>
  <p style="color:#cbd5e1;line-height:1.6;">You're now subscribed to DevPlaybook's weekly newsletter.</p>
  <ul style="color:#cbd5e1;line-height:2;">
    <li>🛠️ Developer tool guides &amp; deep dives</li>
    <li>⚡ Productivity playbooks that actually work</li>
    <li>🤖 AI workflow tips for developers</li>
    <li>📦 Free resources &amp; templates</li>
  </ul>
  <div style="margin:32px 0;text-align:center;">
    <a href="${SITE_URL}/free-checklist" style="background:#38bdf8;color:#0f172a;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
      Grab Your Free Dev Checklist →
    </a>
  </div>
  <p style="color:#64748b;font-size:13px;line-height:1.6;">
    If you didn't subscribe, you can safely ignore this email.<br>
    To unsubscribe, reply with "unsubscribe" in the subject line.
  </p>
  <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;">
  <p style="color:#475569;font-size:12px;text-align:center;">
    DevPlaybook · <a href="${SITE_URL}" style="color:#38bdf8;">${SITE_URL}</a>
  </p>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Welcome to DevPlaybook Newsletter 🚀',
      html,
    }),
  });
  return res.ok;
}

async function syncToButtondown(email, source, apiKey) {
  const res = await fetch('https://api.buttondown.email/v1/subscribers', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, tags: [source || 'website'] }),
  });
  return res.ok || res.status === 409; // 409 = already exists
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();
    const source = (body.source || 'website').slice(0, 50);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Valid email required' }, 400);
    }

    const kv = env.NEWSLETTER_KV;
    if (!kv) {
      return json({ error: 'Service unavailable' }, 503);
    }

    // Idempotent — already subscribed is a success
    const existing = await kv.get(`subscriber:${email}`);
    if (existing) {
      return json({ success: true, message: 'Already subscribed!' });
    }

    const subscriber = {
      email,
      subscribedAt: new Date().toISOString(),
      source,
      welcomeEmailSent: false,
      buttondDownSynced: false,
    };

    // Welcome email via Resend (non-blocking)
    if (env.RESEND_API_KEY) {
      try {
        subscriber.welcomeEmailSent = await sendWelcomeEmail(email, env.RESEND_API_KEY);
      } catch { /* non-fatal */ }
    }

    // Sync to Buttondown when API key is available (non-blocking)
    if (env.BUTTONDOWN_API_KEY) {
      try {
        subscriber.buttondDownSynced = await syncToButtondown(email, source, env.BUTTONDOWN_API_KEY);
      } catch { /* non-fatal */ }
    }

    await kv.put(`subscriber:${email}`, JSON.stringify(subscriber));

    // Increment total count
    const countStr = await kv.get('meta:count');
    const count = parseInt(countStr || '0', 10) + 1;
    await kv.put('meta:count', String(count));

    return json({ success: true, message: 'Subscribed successfully!' });
  } catch {
    return json({ error: 'Internal error' }, 500);
  }
}
