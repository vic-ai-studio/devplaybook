/**
 * POST /api/auth/magic-link
 * Request a magic link login email.
 *
 * Body: { email: string }
 *
 * Required env vars:
 *   AUTH_KV       - KV namespace for storing tokens
 *   RESEND_API_KEY - Resend.com API key for sending emails
 *
 * KV entry: magic:{token} → { email } (TTL 15 min)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const FROM_EMAIL = 'DevPlaybook <noreply@devplaybook.cc>';
const SITE_NAME = 'DevPlaybook';

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'Valid email required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Rate limit: max 3 magic links per email per 15 min
  if (env.AUTH_KV) {
    const rlKey = `rl:magic:${email}`;
    const rlRaw = await env.AUTH_KV.get(rlKey);
    const count = rlRaw ? parseInt(rlRaw, 10) : 0;
    if (count >= 3) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait 15 minutes.' }),
        {
          status: 429,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }
    await env.AUTH_KV.put(rlKey, String(count + 1), { expirationTtl: TOKEN_TTL_SECONDS });
  }

  // Generate token and store in KV
  const token = generateToken();
  if (env.AUTH_KV) {
    await env.AUTH_KV.put(
      `magic:${token}`,
      JSON.stringify({ email, createdAt: new Date().toISOString() }),
      { expirationTtl: TOKEN_TTL_SECONDS }
    );
  }

  // Derive verify URL from request origin
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const verifyUrl = `${origin}/api/auth/verify?token=${token}`;

  // Send email via Resend
  if (env.RESEND_API_KEY) {
    const emailBody = {
      from: FROM_EMAIL,
      to: [email],
      subject: `Sign in to ${SITE_NAME}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#6366f1">Sign in to ${SITE_NAME}</h2>
          <p>Click the button below to sign in. This link expires in 15 minutes.</p>
          <a href="${verifyUrl}"
             style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
            Sign in to ${SITE_NAME}
          </a>
          <p style="color:#888;font-size:13px">
            If you did not request this, you can safely ignore this email.<br>
            Link: <a href="${verifyUrl}">${verifyUrl}</a>
          </p>
        </div>
      `,
    };

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json().catch(() => ({}));
      console.error('[magic-link] Resend error:', err);
      return new Response(
        JSON.stringify({ error: 'Failed to send email. Please try again.' }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }
  } else {
    // Dev mode: log token to console (no email service configured)
    console.log(`[magic-link] DEV MODE — verify URL: ${verifyUrl}`);
  }

  return new Response(
    JSON.stringify({ ok: true, message: 'Magic link sent. Check your email.' }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
}
