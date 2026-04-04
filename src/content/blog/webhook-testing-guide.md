---
title: "Webhook Testing: How to Debug, Inspect, and Replay Webhooks in 2026"
description: "Complete guide to webhook testing. Covers local tunneling, replay tools, signature verification, retry handling, and the best practices for testing webhooks without production data."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["webhook", "api", "testing", "debugging", "http"]
readingTime: "9 min read"
---

# Webhook Testing: How to Debug, Inspect, and Replay Webhooks in 2026

Webhooks are deceptively tricky. They look simple — someone sends you an HTTP POST, you handle it. But testing them involves challenges that don't exist with normal API calls: you need a publicly reachable URL during development, you need to handle retries and duplicates, and you need to verify signatures without breaking the raw body.

This guide covers the full webhook testing workflow: from exposing your localhost to writing automated tests that don't depend on a real third-party service.

## What is a Webhook?

A webhook is an HTTP POST request sent from one service to yours when an event occurs on their end. Instead of you repeatedly polling "did anything happen?", they push events to you.

```
Payment succeeds on Stripe
  → Stripe POST /api/webhooks/stripe { "type": "payment_intent.succeeded", ... }
  → Your server handles it (send confirmation email, provision access, etc.)
```

Other common webhook sources: GitHub (push/PR events), Shopify (orders), Twilio (SMS/calls), SendGrid (email bounces), Linear/Jira (issue updates).

## The Core Challenge: Testing Webhooks Locally

Webhook senders need a public URL to POST to. Your `localhost:3000` isn't accessible from the internet. You have three options:

### Option 1: ngrok (Most Popular)

```bash
npm install -g ngrok
ngrok http 3000
# Gives you: https://abc123.ngrok.io -> http://localhost:3000
# Web interface at: http://localhost:4040
```

ngrok's web interface at `localhost:4040` shows every request with full headers and body, and lets you replay any request with one click. This is invaluable for debugging.

### Option 2: Cloudflare Tunnel (Free, Persistent)

```bash
brew install cloudflare/cloudflare/cloudflared
cloudflared tunnel --url http://localhost:3000
```

### Option 3: webhook.site (No Local Server Needed)

Go to webhook.site, get a unique URL, and register it with the service. Every incoming webhook shows up in your browser in real time. Perfect for "what does this event actually look like?" questions.

## Step-by-Step: Testing a Stripe Webhook Locally

**Step 1: Start your local server**
```bash
npm run dev  # Server running on port 3000
```

**Step 2: Install Stripe CLI and forward events**
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Output: > Ready! Your webhook signing secret is: whsec_xxxxx (copy this)
```

**Step 3: Trigger a test event**
```bash
stripe trigger payment_intent.succeeded
# Your server will receive the webhook immediately
```

**Step 4: Replay a real event from Stripe dashboard**
```bash
stripe events resend evt_1234567890
```

## Verifying Webhook Signatures — The Right Way

Never trust an incoming webhook payload without verifying it came from the expected sender.

```javascript
// Express.js: Stripe webhook with proper signature verification
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// CRITICAL: Use express.raw() for webhook routes, NOT express.json()
// Stripe verifies against the raw body — if you parse it first, verification fails
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      handlePaymentSuccess(event.data.object);
      break;
    case 'customer.subscription.deleted':
      handleSubscriptionCancelled(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});
```

The most common mistake: calling `express.json()` for your webhook route. JSON body parsers consume the raw body, and without the raw body, signature verification always fails.

### GitHub Webhook Verification

```javascript
const crypto = require('crypto');

function verifyGitHubWebhook(req, secret) {
  const signature = req.headers['x-hub-signature-256'];
  const body = req.rawBody;

  const expectedSignature = 'sha256=' +
    crypto.createHmac('sha256', secret).update(body).digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Handling Retries and Idempotency

Webhook senders retry failed deliveries. Stripe's retry schedule:

```
Attempt 1: Immediate
Attempt 2: 5 minutes later
Attempt 3: 30 minutes later
Attempt 4: 1 hour later
Attempt 5: 2 hours later
Total: ~3.5 hours before permanently failing
```

This means **your webhook handler can receive the same event multiple times**. You must handle this gracefully.

```javascript
async function handlePaymentSuccess(event) {
  const eventId = event.id;

  // Check if we've already processed this event
  const alreadyProcessed = await db.webhookEvents.findOne({ eventId });
  if (alreadyProcessed) {
    console.log(`Skipping duplicate event: ${eventId}`);
    return;
  }

  // Process the event
  const paymentIntent = event.data.object;
  await db.orders.update(
    { stripePaymentIntentId: paymentIntent.id },
    { status: 'paid', paidAt: new Date() }
  );

  // Mark as processed
  await db.webhookEvents.insert({ eventId, processedAt: new Date() });
}
```

## Return 200 Immediately, Process Async

Webhook senders have short timeouts (Stripe's is 30 seconds). If your handler does something slow, the sender will time out and retry.

```javascript
// Enqueue the event, respond immediately
app.post('/api/webhooks/stripe', async (req, res) => {
  const event = verifyAndParse(req);

  await queue.add('process-stripe-event', { event });

  // Return 200 before processing
  res.json({ received: true });
});

// Worker processes in background
queue.process('process-stripe-event', async (job) => {
  const { event } = job.data;
  await sendWelcomeEmail(event.data.object.customer_email);
  await generatePDFInvoice(event.data.object);
});
```

## Writing Automated Tests for Webhooks

Don't depend on a live ngrok tunnel to run your tests. Test webhook handler logic directly:

```javascript
import { test, expect } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app.js';

function createStripeSignature(body, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

const WEBHOOK_SECRET = 'whsec_test_secret_for_testing';

test('valid Stripe webhook is processed', async () => {
  const body = JSON.stringify({ id: 'evt_001', type: 'payment_intent.succeeded', data: { object: {} } });
  const signature = createStripeSignature(body, WEBHOOK_SECRET);

  const response = await request(app)
    .post('/api/webhooks/stripe')
    .set('stripe-signature', signature)
    .set('Content-Type', 'application/json')
    .send(body);

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ received: true });
});

test('webhook with invalid signature returns 400', async () => {
  const body = JSON.stringify({ id: 'evt_001', type: 'payment_intent.succeeded', data: {} });

  const response = await request(app)
    .post('/api/webhooks/stripe')
    .set('stripe-signature', 'invalid-signature')
    .send(body);

  expect(response.status).toBe(400);
});
```

## Key Takeaways

- Use ngrok or Stripe CLI to expose localhost during development.
- **Always verify webhook signatures** using timing-safe comparison.
- Use `express.raw()` for webhook routes — JSON body parsers break signature verification.
- Return 200 immediately and process async.
- Make your handlers idempotent — the same event can arrive multiple times.
- Write automated tests with synthetic payloads.

## Testing Tools Reference

| Tool | Use Case |
|------|---------|
| ngrok | Local tunneling, request inspector UI |
| cloudflared | Cloudflare tunnel, free persistent URLs |
| webhook.site | Inspect payloads without writing code |
| Stripe CLI | Stripe event forwarding and triggering |
| Hookdeck | Webhook debugging, replay, queue in production |

## FAQ

**Why does Stripe signature verification always fail?**
You're probably using `express.json()` on your webhook route. Switch to `express.raw({ type: 'application/json' })`.

**How do I test webhooks in CI without real credentials?**
Write tests that directly invoke your handler with synthetic event payloads. Mock the signature verification in test mode.

**What if my webhook processing fails partway through?**
The sender will retry. This is why idempotency is critical — always check if you've already processed the event.

**Can I test GitHub webhooks locally?**
Yes. Use ngrok or `gh webhook forward` if you have the GitHub CLI installed.
