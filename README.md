# DevPlaybook.cc

Developer tools, templates, and guides. Free tier forever. Pro subscription for premium access.

## Tech Stack

- **Frontend**: Astro + Preact + Tailwind CSS 4 (static output)
- **Backend**: Cloudflare Pages Functions (edge Workers)
- **Database**: Cloudflare KV (subscribers, sessions, analytics, API keys)
- **Auth**: Email magic links via Resend
- **Payments**: Stripe (subscriptions + webhook)
- **Deploy**: Cloudflare Pages

---

## Pro Subscription — 3-Step Stripe Activation

Everything is built and ready. When you have your Stripe credentials, activate in 3 steps:

### Step 1 — Set Stripe secrets in Cloudflare Pages

```bash
# From the devplaybook/ directory
wrangler pages secret put STRIPE_SECRET_KEY
# Paste your Stripe secret key (sk_live_... or sk_test_...)

wrangler pages secret put STRIPE_PUBLISHABLE_KEY
# Paste your Stripe publishable key (pk_live_... or pk_test_...)

wrangler pages secret put RESEND_API_KEY
# Paste your Resend.com API key (for magic link emails)
```

### Step 2 — Create the Stripe webhook

In the Stripe Dashboard → Developers → Webhooks → Add endpoint:

- **Endpoint URL**: `https://devplaybook.cc/api/stripe-webhook`
- **Events to listen for**:
  - `checkout.session.completed`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copy the **Signing secret** (`whsec_...`) and set it:

```bash
wrangler pages secret put STRIPE_WEBHOOK_SECRET
```

### Step 3 — Deploy

```bash
cd devplaybook
npm run build
wrangler pages deploy ./dist
```

Done. Pricing page, checkout flow, webhook handling, Pro dashboard, and API rate limits are all live immediately.

---

## KV Namespaces

All KV IDs are already configured in `wrangler.toml`:

| Binding         | Purpose                               |
| --------------- | ------------------------------------- |
| `SUBSCRIBERS`   | Pro subscriber records + API keys     |
| `AUTH_KV`       | Magic link tokens + session cookies   |
| `NEWSLETTER_KV` | Newsletter subscribers                |
| `DEV_SETUPS`    | Community dev setup submissions       |
| `ANALYTICS`     | Page views + Web Vitals               |

---

## Local Development

```bash
npm install
npm run dev          # Astro dev server at localhost:4321
```

For local Workers testing (env bindings + KV):

```bash
# Create a .dev.vars file (never commit this)
cat > .dev.vars << EOF
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
EOF

npx wrangler pages dev ./dist
```

---

## Key API Endpoints

| Endpoint                        | Description                                       |
| ------------------------------- | ------------------------------------------------- |
| `POST /api/stripe-checkout`     | Create Stripe Checkout session                    |
| `POST /api/stripe-webhook`      | Handle Stripe subscription lifecycle events       |
| `GET /api/subscription/status`  | Return Pro/free tier for current session or email |
| `POST /api/keys`                | Generate API key (free=100/day, pro=1000/day)     |
| `POST /api/auth/magic-link`     | Send magic link login email                       |
| `GET /api/auth/session`         | Return current session (email + plan)             |
| `POST /api/auth/signout`        | Clear session cookie                              |
| `GET /api/v1/uuid`              | Generate UUIDs (rate-limited)                     |
| `GET /api/v1/cron`              | Parse/validate cron expression (rate-limited)     |
| `GET /api/v1/regex`             | Test regex pattern (rate-limited)                 |
| `GET /api/v1/json-format`       | Format/validate JSON (rate-limited)               |

---

## Pro Features

- All premium tools & templates — future releases included
- Early access content before public release
- Member-only discounts on Gumroad products
- Priority support
- API: unlimited requests/day (free tier = 100/day)
- Ad-free experience

**Pricing**: $9/month · 7-day free trial · Cancel anytime

---

## Project Structure

```
devplaybook/
├── functions/api/           # Cloudflare Pages Functions (edge API)
│   ├── auth/                # Magic link + session + signout
│   ├── subscription/        # GET /api/subscription/status
│   ├── stripe-checkout.js   # POST /api/stripe-checkout
│   ├── stripe-webhook.js    # POST /api/stripe-webhook
│   ├── keys.js              # POST /api/keys
│   └── v1/                  # Rate-limited public API
├── src/
│   ├── pages/               # Astro pages
│   │   ├── pricing.astro         # /pricing
│   │   ├── pro-dashboard.astro   # /pro-dashboard
│   │   ├── pro-success.astro     # /pro-success
│   │   ├── pro-cancel.astro      # /pro-cancel
│   │   └── signin.astro          # /signin (magic link)
│   ├── components/          # Preact interactive components
│   └── layouts/             # BaseLayout
└── wrangler.toml            # KV bindings + Cloudflare config
```
