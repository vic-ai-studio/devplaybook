# Analytics Setup — devplaybook.cc

## Overview

devplaybook.cc uses a **three-layer analytics stack**:

| Layer | Tool | Purpose |
|---|---|---|
| 1 | **Google Analytics 4** | Standard web analytics + conversion tracking |
| 2 | **Cloudflare Web Analytics** | Privacy-first page views (no cookies) |
| 3 | **Custom localStorage** (`pc_events`) | Client-side event log, no external API |

---

## 1. Google Analytics 4 (GA4)

### Setup

1. Create a GA4 property at [analytics.google.com](https://analytics.google.com)
2. Go to **Admin → Data Streams → Web** → copy the **Measurement ID** (format: `G-XXXXXXXXXX`)
3. In Cloudflare Pages → Settings → Environment Variables, add:
   ```
   PUBLIC_GA4_MEASUREMENT_ID = G-XXXXXXXXXX
   ```
4. Redeploy. GA4 will auto-initialize via `gtag.js`.

### Tracked Events

| Event Name | Trigger | Parameters |
|---|---|---|
| `page_view` | Every page load (auto) | `page_location`, `page_title` |
| `pro_upgrade_click` | User views /pro page (once per session) | `page` |
| `pro_checkout_start` | Click "Start Free Trial" or "Get Yearly" button | `plan`, `currency`, `value` |
| `pro_checkout_complete` | Land on /pro-success after Stripe checkout | `plan`, `currency`, `value` |
| `pro_cta_click` | Click on Pro/Bundle CTA button (global) | `source`, `value`, `item_name` |
| `begin_checkout` | Click Gumroad buy button | `currency`, `value`, `item_name` |
| `newsletter_signup` | Newsletter form submit | `source` |
| `bmc_click` | Buy Me a Coffee widget click | — |
| `article_read_time` | 30s / 60s / 120s / 180s on blog page | `seconds`, `path` |
| `article_exit` | Leave blog page | `read_seconds`, `path` |

### Conversion Goals (set in GA4 Dashboard)

Mark these as **Conversions** in GA4 → Admin → Events → Mark as conversion:

- `pro_upgrade_click` — Pro page view (top of funnel)
- `pro_checkout_start` — Checkout initiated (mid funnel)
- `pro_checkout_complete` — Subscription confirmed (bottom of funnel, highest value)
- `begin_checkout` — Gumroad purchase intent
- `newsletter_signup` — Email list growth

---

## 2. Cloudflare Web Analytics

### Setup

1. Cloudflare Dashboard → Analytics → Web Analytics → Add site → copy token
2. Set env var:
   ```
   PUBLIC_CF_ANALYTICS_TOKEN = <token>
   ```

No cookies, GDPR-friendly. Dashboard at `dash.cloudflare.com`.

---

## 3. Custom Analytics (localStorage `pc_events`)

Client-side only. Data stored in browser's `localStorage` under key `pc_events` (last 500 events). Useful for debugging user flows without external calls.

Access via browser DevTools:
```js
JSON.parse(localStorage.getItem('pc_events'))
```

The public `/analytics` page shows aggregated stats from the Cloudflare KV `ANALYTICS` namespace (server-side page view counts).

---

## 4. Core Web Vitals

Tracked via `web-vitals` npm package. Sent to `/api/vitals` endpoint → stored in Cloudflare KV.

Metrics tracked: LCP, CLS, INP, FCP, TTFB.

---

## Event Instrumentation

To track a click event, add `data-track` attribute to any element:

```html
<a href="..." data-track="pro_cta_click" data-product-name="Pro Bundle" data-product-price="79">
  Buy Pro
</a>
```

To track a form submission:

```html
<form data-track-submit="newsletter_footer">...</form>
```

Both `pcTrack` (localStorage), `dpTrack` (Zaraz/Cloudflare), and `ga4Track` (GA4) will fire automatically.
