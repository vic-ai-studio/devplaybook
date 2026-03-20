# Google Search Console Setup Guide for devplaybook.cc

## What's Already Done (No Action Needed)
- ✅ **IndexNow** - 129 URLs submitted to Bing, Yandex, Seznam (2026-03-21)
- ✅ `submit-gsc.py` script ready to run (just needs credentials)
- ✅ `submit-bing-webmaster.js` script ready (just needs API key)

## Step 1: Google Search Console (15 min setup)

### 1a. Verify Site Ownership
1. Go to: https://search.google.com/search-console/
2. Click "Add Property" → choose **URL prefix** → enter `https://devplaybook.cc/`
3. For verification, choose **HTML file** method:
   - Download the verification file (e.g., `google1234abcd.html`)
   - Place it in `C:/OpenClaw_Pro/devplaybook/public/`
   - Deploy to Cloudflare Pages (git push or manual upload)
   - Click "Verify" in GSC

### 1b. Create Service Account for API (optional, for automation)
1. Go to: https://console.cloud.google.com/
2. Create new project or use existing
3. Enable APIs:
   - "Google Search Console API"
   - "Web Search Indexing API"
4. Go to IAM → Service Accounts → Create Service Account
5. Download JSON key file
6. In GSC, go to Settings → Users and permissions → Add user (paste service account email, set as Owner)
7. Run: `GSC_SERVICE_ACCOUNT_JSON=./key.json python3 scripts/submit-gsc.py`

## Step 2: Bing Webmaster Tools API Key (10 min)

1. Go to: https://www.bing.com/webmasters/
2. Sign in with Microsoft account
3. Add `https://devplaybook.cc/` (site already indexed via IndexNow)
4. Go to **Settings → API Access** → Generate API Key
5. Copy the key, then run:
   ```
   BING_WEBMASTER_API_KEY=your-key node scripts/submit-bing-webmaster.js
   ```

## Current Status Summary

| Engine | Status | Method |
|--------|--------|--------|
| Bing | ✅ 129 URLs submitted | IndexNow (2026-03-21) |
| Yandex | ✅ 129 URLs submitted | IndexNow (2026-03-21) |
| Google | ⏳ Needs GSC account | Manual setup required |
| Bing API | ⏳ Needs API key | Manual setup required |

**IndexNow covers Bing already** — the Bing Webmaster API step is optional for deeper analytics/sitemap submission tracking.
