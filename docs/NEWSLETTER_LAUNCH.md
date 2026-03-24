# Newsletter Launch Checklist

The email newsletter system is **fully built and deployed**. All subscription forms are live on the site.
You just need to connect a newsletter service to manage your subscriber list.

## Current State

| Component | Status |
|-----------|--------|
| `/newsletter` landing page | ✅ Live |
| Subscribe forms (homepage, footer, blog, tools) | ✅ Live |
| `/api/newsletter/subscribe` API | ✅ Live |
| Cloudflare KV subscriber storage (`NEWSLETTER_KV`) | ✅ Configured |
| Welcome email (Resend) | ⚙️ Needs `RESEND_API_KEY` |
| Newsletter list sync (MailerLite) | ⚙️ Needs `MAILERLITE_API_KEY` |
| First 15 newsletter issues written | ✅ Ready in `devplaybook-newsletter/` |

---

## Option A — MailerLite (Recommended Free Plan)

**Free tier:** up to 1,000 subscribers, 12,000 emails/month. No credit card needed.

### Step 1 — Create MailerLite Account
1. Go to [mailerlite.com](https://www.mailerlite.com) → Sign up free
2. Sender name: `DevPlaybook`
3. From email: `newsletter@devplaybook.cc`

### Step 2 — Create a Group
1. Subscribers → Groups → Create group
2. Name: `DevPlaybook Main List`
3. Copy the **Group ID** from the URL

### Step 3 — Get API Key
1. Integrations → MailerLite API → Generate new token
2. Copy the token

### Step 4 — Add to Cloudflare Pages
1. Cloudflare Dashboard → Pages → devplaybook → Settings → Environment variables
2. Add: `MAILERLITE_API_KEY` = your token
3. Add: `MAILERLITE_GROUP_ID` = your group ID
4. **Redeploy** the site after adding vars

### Step 5 — Set Up Welcome Automation in MailerLite
1. Automations → Create automation
2. Trigger: "When subscriber joins group" → DevPlaybook Main List
3. Add email action — use template from `devplaybook/newsletter-emails/welcome-sequence.md` (Email 1)
4. Add delay (2 days) → Email 2
5. Add delay (3 days) → Email 3
6. Activate automation

### Step 6 — Send First Issue
First newsletter content is ready at: `devplaybook-newsletter/newsletter-01-welcome.md`

In MailerLite:
1. Campaigns → Create campaign → Regular campaign
2. Segment: DevPlaybook Main List
3. Subject: `The only browser tab you need for dev tools (42 and counting)`
4. Paste the content from `newsletter-01-welcome.md`
5. Schedule or send immediately

---

## Option B — Buttondown

**Free tier:** up to 100 subscribers. Simple, developer-focused.

1. Create account at [buttondown.com](https://buttondown.com)
2. Settings → API → Get API key
3. Add `BUTTONDOWN_API_KEY` to Cloudflare Pages env vars
4. Copy welcome emails from `devplaybook/newsletter-emails/welcome-sequence.md`
5. Settings → Automations → Set up 3-email welcome sequence

---

## Option C — Welcome Email via Resend Only (Minimal Setup)

If you just want welcome emails without a full list manager:

1. Sign up at [resend.com](https://resend.com) (free: 100 emails/day)
2. Add DNS records for `devplaybook.cc` (SPF/DKIM)
3. Add `RESEND_API_KEY` to Cloudflare Pages env vars
4. Subscribers are stored in KV — you manage the list manually

---

## First Newsletter Issues Ready to Send

| File | Topic |
|------|-------|
| `newsletter-01-welcome.md` | Welcome + Top 3 Tools |
| `newsletter-02-json-tools.md` | JSON Tools Deep Dive |
| `newsletter-03-api-testing.md` | API Testing Tools |
| `newsletter-04-security-tools.md` | Security Tools |
| `newsletter-05-regex.md` | Regex Mastery |
| `newsletter-06-ai-tools.md` | AI Coding Tools |
| ... (15 total) | |

All files are in `C:/OpenClaw_Pro/devplaybook-newsletter/`

---

## After Setup

Once `MAILERLITE_API_KEY` is in Cloudflare Pages, every subscriber who fills out any form on devplaybook.cc will automatically be added to MailerLite. No further code changes needed.
