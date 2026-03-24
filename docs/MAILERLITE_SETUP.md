# MailerLite Setup Guide for DevPlaybook Newsletter

## Overview

The DevPlaybook newsletter currently uses a custom form → `/api/newsletter/subscribe` → Resend (email) + Buttondown (list management).

MailerLite is ready to be activated as an **alternative or replacement** subscriber list. All code placeholders are in place — you just need to:

1. Create a free MailerLite account
2. Create a form
3. Paste your Account ID and Form ID into the code

---

## Step 1: Create MailerLite Account

1. Go to [mailerlite.com](https://www.mailerlite.com)
2. Sign up for a **free account** (up to 1,000 subscribers, 12,000 emails/month — free forever)
3. Verify your email address
4. Complete the profile setup (sender name: `DevPlaybook`, from email: `newsletter@devplaybook.cc`)

---

## Step 2: Create a Subscriber Group

1. Go to **Subscribers → Groups**
2. Click **"Create group"**
3. Name it: `DevPlaybook Main List`
4. Note the Group ID from the URL (you'll need it for API calls)

---

## Step 3: Create an Embedded Form

1. Go to **Forms → Embedded forms**
2. Click **"Create new form"**
3. Choose a simple email-only form style
4. Set the group to `DevPlaybook Main List`
5. Customize styling to match the dark theme if desired
6. Click **Publish**
7. On the embed page, you'll see two things:
   - **Account ID**: the number in `ml('account', 'YOUR_NUMBER')`
   - **Form ID**: the string in `data-form="YOUR_STRING"`

---

## Step 4: Activate the MailerLite Embed

Open `/src/pages/newsletter.astro` and find the commented-out block:

```html
<!-- MailerLite Embed (activate after Vic creates MailerLite account...) -->
<!--
  ...
  ml('account', 'MAILERLITE_ACCOUNT_ID');
  ...
  <div class="ml-embedded ... data-form="MAILERLITE_FORM_ID"></div>
-->
```

1. Replace `MAILERLITE_ACCOUNT_ID` with your account number (e.g., `123456`)
2. Replace `MAILERLITE_FORM_ID` with your form ID (e.g., `abc123XYZ`)
3. **Uncomment the block** (remove the `<!--` and `-->` wrapping the script+div)

---

## Step 5: Add MailerLite Universal Script to BaseLayout (Optional)

If you want MailerLite tracking/forms site-wide, add the universal script to `src/layouts/BaseLayout.astro` in the `<head>` section:

```html
<!-- MailerLite Universal -->
<script>
  (function(w,d,e,u,f,l,n){w[f]=w[f]||function(){(w[f].q=w[f].q||[]).push(arguments);},l=d.createElement(e),l.async=1,l.src=u,n=d.getElementsByTagName(e)[0],n.parentNode.insertBefore(l,n);})(window,document,'script','https://assets.mailerlite.com/js/universal.js','ml');
  ml('account', 'YOUR_ACCOUNT_ID');
</script>
```

---

## Step 6: Set Up Welcome Email in MailerLite

1. Go to **Automations → Create automation**
2. Trigger: "When subscriber joins a group" → `DevPlaybook Main List`
3. Action: "Send email"
4. Subject: `Welcome to DevPlaybook Newsletter 🚀`
5. Use the template below:

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#38bdf8;font-size:24px;margin:0;">DevPlaybook</h1>
    <p style="color:#94a3b8;font-size:13px;margin:4px 0 0;">Developer Productivity Playbooks</p>
  </div>
  <h2 style="color:#f1f5f9;font-size:20px;">Welcome aboard! 🎉</h2>
  <p style="color:#cbd5e1;line-height:1.6;">You're now subscribed to DevPlaybook's weekly newsletter.</p>
  <p style="color:#cbd5e1;line-height:1.6;">Every week you'll get:</p>
  <ul style="color:#cbd5e1;line-height:2;">
    <li>🛠️ Developer tool guides & deep dives</li>
    <li>⚡ Productivity playbooks that actually work</li>
    <li>🤖 AI workflow tips for developers</li>
    <li>📦 Free resources & templates</li>
  </ul>
  <div style="margin:32px 0;text-align:center;">
    <a href="https://devplaybook.cc/free-checklist" style="background:#38bdf8;color:#0f172a;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
      Grab Your Free Dev Checklist →
    </a>
  </div>
  <p style="color:#64748b;font-size:13px;line-height:1.6;">
    If you didn't subscribe, you can safely ignore this email.
  </p>
  <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;">
  <p style="color:#475569;font-size:12px;text-align:center;">
    DevPlaybook · <a href="https://devplaybook.cc" style="color:#38bdf8;">devplaybook.cc</a>
  </p>
</body>
</html>
```

---

## Current State (Before MailerLite Activation)

| Feature | Status |
|---------|--------|
| `/newsletter` landing page | ✅ Live |
| Footer newsletter CTA (all pages) | ✅ Live |
| Tool page newsletter CTA | ✅ Live (ToolPageCta component) |
| Custom form → `/api/newsletter/subscribe` | ✅ Live (uses Resend + Buttondown) |
| MailerLite embed code | ✅ Ready (commented out in newsletter.astro) |
| Welcome email | ✅ Sent automatically by `/api/newsletter/subscribe` via Resend |

Once MailerLite is set up, you can run both systems in parallel or migrate fully to MailerLite.

---

## MailerLite API Key (Optional — for programmatic sync)

If you want to sync subscribers from the custom form to MailerLite automatically:

1. Go to **Integrations → MailerLite API**
2. Generate an API token
3. Add to Cloudflare Pages environment variables as `MAILERLITE_API_KEY`
4. Update `/functions/api/newsletter/subscribe.js` to call the MailerLite Groups API

```js
// Add to subscribe.js after successful subscription
if (env.MAILERLITE_API_KEY) {
  await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.MAILERLITE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      groups: ['YOUR_GROUP_ID'],
    }),
  });
}
```
