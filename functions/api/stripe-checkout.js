/**
 * Stripe Checkout Session endpoint
 * POST /api/stripe-checkout
 * Creates a Stripe Checkout Session for Pro subscription
 * Uses Cloudflare Pages Functions with env bindings
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const PRO_PRICE = 900; // $9.00/month in cents

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const stripeSecretKey = env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // email is optional; proceed with empty body
  }

  // Derive success/cancel URLs from request origin
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const successUrl = `${origin}/pro-success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/?pro_cancelled=1`;

  // Build Stripe Checkout Session payload
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': 'DevPlaybook Pro',
    'line_items[0][price_data][product_data][description]':
      'Early access to new tools, exclusive templates, priority support, and member-only discounts.',
    'line_items[0][price_data][recurring][interval]': 'month',
    'line_items[0][price_data][unit_amount]': String(PRO_PRICE),
    'line_items[0][quantity]': '1',
    success_url: successUrl,
    cancel_url: cancelUrl,
    'payment_method_types[0]': 'card',
    'subscription_data[metadata][source]': 'devplaybook_pro',
    'subscription_data[trial_period_days]': '7',
  });

  // Attach email if provided (pre-fills Stripe Checkout form)
  if (body.email && typeof body.email === 'string' && body.email.includes('@')) {
    params.append('customer_email', body.email.trim().slice(0, 200));
  }

  // Call Stripe API using fetch (no SDK dependency required)
  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await stripeResponse.json();

  if (!stripeResponse.ok) {
    return new Response(
      JSON.stringify({ error: session.error?.message || 'Stripe error' }),
      {
        status: stripeResponse.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
