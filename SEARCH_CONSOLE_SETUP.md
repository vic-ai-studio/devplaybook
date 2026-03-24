# Google Search Console Setup for devplaybook.cc

> **Who this is for:** VIC — one-time setup, ~15 minutes.

---

## Step 1: Add devplaybook.cc to Google Search Console

1. Go to: https://search.google.com/search-console/
2. Sign in with your Google account.
3. Click **"Add property"** → choose **URL prefix**.
4. Enter: `https://devplaybook.cc/` → click **Continue**.

---

## Step 2: Verify Site Ownership (Meta Tag method — recommended)

The site now supports verification via the `PUBLIC_GSC_SITE_VERIFICATION` environment variable (no code deploy needed):

1. In GSC, choose the **"HTML tag"** verification method.
2. Copy the content value from the meta tag shown — it looks like `abc123xyz...`.
3. Go to **Cloudflare Pages dashboard** → devplaybook → **Settings → Environment variables**.
4. Add variable: `PUBLIC_GSC_SITE_VERIFICATION` = `<paste the content value>`.
5. Trigger a new deploy (or it applies on next deploy).
6. Go back to GSC and click **"Verify"**.

### Alternative: HTML file method

1. In GSC, choose the **"HTML file"** method instead.
2. Download the verification file — it will be named like `google1234abcd5678efgh.html`.
3. Place the file in `C:/OpenClaw_Pro/devplaybook/public/`.
4. Push to GitHub — Cloudflare Pages auto-deploys.
5. Click **"Verify"** in GSC.

> **Tip:** The verification file in `public/` is already referenced in the sitemap filter — it will be deployed but excluded from search results automatically.

---

## Step 3: Submit the Sitemap

1. In GSC left sidebar, go to **Sitemaps**.
2. In the "Add a new sitemap" field, enter:
   ```
   sitemap-index.xml
   ```
3. Click **Submit**.

The full sitemap URL is: `https://devplaybook.cc/sitemap-index.xml`

This sitemap contains all tool pages, blog articles, and product pages with:
- `lastmod` dates
- `changefreq` hints
- `priority` scores (home=1.0, tools=0.9, products=0.8, blog=0.7)

---

## Step 4: Request Indexing for Key Pages (optional)

After verification, use the **URL Inspection** tool in GSC to request indexing for priority pages:

- `https://devplaybook.cc/`
- `https://devplaybook.cc/tools/`
- `https://devplaybook.cc/blog/`
- `https://devplaybook.cc/products/`

---

## Cloudflare Web Analytics Setup

The analytics beacon is already in the site code — you just need to set the token:

1. Go to **Cloudflare Dashboard** → **Analytics & Logs → Web Analytics**.
2. Click **Add site** → enter `devplaybook.cc`.
3. Copy the **JavaScript snippet token** (the long string after `token:`).
4. Go to **Workers & Pages** → devplaybook → **Settings → Environment variables**.
5. Add: `PUBLIC_CF_ANALYTICS_TOKEN` = `<paste token here>`.
6. Trigger a redeploy — analytics will start collecting on all pages automatically.

> Analytics data appears in Cloudflare Dashboard under **Analytics & Logs → Web Analytics → devplaybook.cc**.

---

## What's Already Done (No Action Needed)

| Item | Status |
|------|--------|
| Cloudflare Analytics beacon code | ✅ In BaseLayout.astro (needs token env var) |
| GSC meta tag verification support | ✅ `PUBLIC_GSC_SITE_VERIFICATION` env var |
| Sitemap auto-generation | ✅ `@astrojs/sitemap` — 145 blog + 119 tool pages |
| robots.txt | ✅ Allows all crawlers, references sitemap-index.xml |
| Bing + Yandex IndexNow submission | ✅ 129 URLs submitted 2026-03-21 |
| JSON-LD structured data | ✅ WebApplication, BlogPosting, Organization, BreadcrumbList, FAQPage |
| Core Web Vitals tracking | ✅ LCP, CLS, INP, FCP, TTFB via web-vitals |
| Open Graph / Twitter Card | ✅ All pages |
| Canonical URLs | ✅ All pages |

---

## Post-Deploy: Ping Search Engines

After each deployment, run this to notify Google and Bing to re-crawl:

```bash
cd C:/OpenClaw_Pro/devplaybook
node scripts/ping-sitemap.js
```

Or use the combined build + ping script:

```bash
npm run build:prod
```

---

## Troubleshooting

**Verification fails:** Make sure the HTML file is in `public/` (not `src/`) and that Cloudflare Pages has finished deploying. Check the deployment at: https://dash.cloudflare.com → Workers & Pages → devplaybook.

**Sitemap not found:** Confirm the site is deployed and visit `https://devplaybook.cc/sitemap-index.xml` in your browser. It should show an XML file listing `sitemap-0.xml`.

**Pages not indexed after 2 weeks:** Use the URL Inspection tool in GSC to check for crawl errors.
