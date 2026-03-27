---
title: "Webhook Testing: How to Debug, Inspect, and Replay Webhooks in 2026"
description: "Complete guide to webhook testing. Covers local tunneling, replay tools, signature verification, retry handling, and the best practices for testing webhooks without production data."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["webhook", "api", "testing", "debugging", "http"]
readingTime: "2 min read"
---

# Webhook Testing: How to Debug, Inspect, and Replay Webhooks in 2026

## What is a Webhook?

A webhook is an HTTP POST request sent from one service to another when an event happens. Your server receives it and reacts.

```
Stripe event happens (payment.success)
  → POST https://yoursite.com/api/webhook/stripe
  → Your server processes it
```

## Testing Webhooks Locally

### Step 1: Expose Localhost

```bash
# ngrok (free tier)
ngrok http 3000

# cloudflared (Cloudflare, free)
cloudflared tunnel --url http://localhost:3000

# Both give you a public URL like:
# https://abc123.ngrok.io
```

### Step 2: Register the Webhook

In your service dashboard (Stripe, GitHub, Slack):
```
Payload URL: https://abc123.ngrok.io/api/webhook/handler
Events: payment_intent.succeeded, payment_intent.failed
```

## Verifying Webhook Signatures

Always verify signatures. Never trust the payload blindly.

```javascript
// Express.js webhook handler with Stripe signature verification
const express = require('express');
const crypto = require('crypto');

const app = express();

app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(webhookSecret)
    );
    // ✅ Verified
    const payload = JSON.parse(req.body);
    handleEvent(payload);
    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

## Replaying Webhooks

```bash
# With Stripe CLI
stripe trigger payment_intent.succeeded

# Or replay a specific event
stripe events resend evt_1234567890
```

## Common Webhook Mistakes

| Mistake | Fix |
|---------|-----|
| Responding with non-2xx | Always return 200 quickly, process async |
| Not handling duplicates | Use idempotency keys |
| Forgetting to verify signatures | Always verify, always |
| Long-running processing | Queue the event, respond immediately |

## Retry Logic

Services like Stripe retry failed webhooks:

```
Attempt 1: Immediate
Attempt 2: 5 minutes later
Attempt 3: 30 minutes later
Attempt 4: 1 hour later
Attempt 5: 2 hours later
Total: ~3.5 hours before giving up
```

**Your handler should:**
1. Return 200 immediately
2. Queue the event for processing
3. Process in background

## Testing Tools

| Tool | Use Case |
|------|---------|
| ngrok | Local tunneling |
| RequestBin | Capture and replay |
| Webhook.site | Free webhook testing |
| Stripe CLI | Stripe-specific testing |
| GitHub CLI | GitHub webhook testing |
