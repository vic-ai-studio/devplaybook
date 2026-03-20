/**
 * Stripe Webhook handler
 * POST /api/stripe-webhook
 * Handles subscription lifecycle events from Stripe
 *
 * Required env vars:
 *   STRIPE_WEBHOOK_SECRET  - from Stripe Dashboard > Webhooks
 *   SUBSCRIBERS (KV)       - optional KV namespace to track Pro subscribers
 *
 * Events handled:
 *   checkout.session.completed       - new subscription started
 *   customer.subscription.deleted    - subscription cancelled
 *   invoice.payment_failed           - payment failed (dunning)
 */

async function verifyStripeSignature(payload, sigHeader, secret) {
  // Stripe uses HMAC-SHA256 with the raw body
  const parts = sigHeader.split(',');
  let timestamp = null;
  const signatures = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  // Reject if timestamp is older than 5 minutes
  const tsSeconds = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsSeconds) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return signatures.includes(expectedSig);
}

export async function onRequestPost({ request, env }) {
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await request.text();
  const sigHeader = request.headers.get('stripe-signature') || '';

  // Verify signature if webhook secret is configured
  if (webhookSecret) {
    const valid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const type = event.type;
  const data = event.data?.object;

  // Handle subscription events
  if (type === 'checkout.session.completed') {
    // New Pro subscriber
    const email = data.customer_email || data.customer_details?.email;
    const customerId = data.customer;
    const subscriptionId = data.subscription;

    if (email && env.SUBSCRIBERS) {
      const record = {
        email,
        customerId,
        subscriptionId,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      await env.SUBSCRIBERS.put(`subscriber:${email}`, JSON.stringify(record));
      // Also index by customerId for future lookups
      if (customerId) {
        await env.SUBSCRIBERS.put(`customer:${customerId}`, email);
      }
    }

    console.log(`[stripe-webhook] New Pro subscriber: ${email}`);

  } else if (type === 'customer.subscription.deleted') {
    // Subscription cancelled
    const customerId = data.customer;

    if (customerId && env.SUBSCRIBERS) {
      const email = await env.SUBSCRIBERS.get(`customer:${customerId}`);
      if (email) {
        const existing = await env.SUBSCRIBERS.get(`subscriber:${email}`);
        if (existing) {
          const record = JSON.parse(existing);
          record.status = 'cancelled';
          record.cancelledAt = new Date().toISOString();
          await env.SUBSCRIBERS.put(`subscriber:${email}`, JSON.stringify(record));
        }
      }
    }

    console.log(`[stripe-webhook] Subscription cancelled: customer ${customerId}`);

  } else if (type === 'invoice.payment_failed') {
    // Payment failed - could trigger dunning email via Stripe or log
    const customerId = data.customer;
    console.log(`[stripe-webhook] Payment failed: customer ${customerId}`);
  }

  // Acknowledge all events with 200
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
