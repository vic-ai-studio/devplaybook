# DevPlaybook Distribution Tracker

Track all distribution channels, submission status, and content drafts.

Last updated: 2026-03-24

---

## Status Overview

| Channel | Status | Priority | Notes |
|---------|--------|----------|-------|
| Product Hunt | ⏳ Draft ready | High | Schedule for weekday AM |
| GitHub Awesome Lists | ⏳ PRs identified | High | 3 lists ready to submit |
| Hacker News Show HN | ⏳ Draft ready | High | Best on weekday morning |
| DEV.to | ⏳ Draft ready | Medium | Cross-post from blog |
| Reddit r/webdev | ⏳ Draft ready | Medium | No self-promo spam |
| Reddit r/programming | ⏳ Draft ready | Medium | Must be genuinely useful |

---

## 1. Product Hunt

**Status:** ⏳ Not yet submitted
**Best time:** Tuesday–Thursday, 12:01 AM PST (midnight)
**URL:** https://www.producthunt.com/posts/new

### Draft Post

**Name:** DevPlaybook
**Tagline:** 40+ free developer tools — all browser-based, no account needed
**Description:**
```
DevPlaybook is a free collection of developer utilities that run entirely in your browser.

No account. No data sent to a server. No annoying paywalls on the basics.

What's included:
→ JSON Formatter & Validator
→ Regex Tester with live highlighting
→ Base64 Encoder/Decoder
→ Cron Expression Generator
→ JWT Decoder
→ Color Converter & Contrast Checker
→ Hash Generator (MD5, SHA-256)
→ URL Encoder/Decoder
→ ...and 35+ more tools

Built for developers who want utilities that just work. 100% open for use.

Also: weekly dev guides and a growing library of technical articles.
```

**Topics:** Developer Tools, Productivity, Open Source
**Website:** https://devplaybook.cc
**Screenshots needed:** Homepage, JSON tool, Regex tool

### Action Items
- [ ] Create/log into Product Hunt account
- [ ] Take screenshots of key tools
- [ ] Upload assets
- [ ] Schedule for Tuesday or Wednesday morning PST
- [ ] Line up 5–10 upvote supporters for launch day

---

## 2. GitHub Awesome Lists

**Status:** ⏳ Identified lists, PRs ready to submit
**How:** Fork repo → add entry → submit PR

### Target Lists

#### awesome-developer-tools
- Repo: Search `awesome developer tools` on GitHub
- Where to add: Under "Online Tools" or "Developer Utilities" section
- Entry format: `- [DevPlaybook](https://devplaybook.cc) - 40+ browser-based developer tools including JSON formatter, regex tester, Base64 encoder, and cron generator.`

#### awesome-json
- Repo: Search `awesome-json` on GitHub
- Where to add: Under "Online Tools" section
- Entry: `- [DevPlaybook JSON Formatter](https://devplaybook.cc/json-formatter) - Fast browser-based JSON formatter, validator, and tree viewer. No server uploads.`

#### awesome-regex
- Repo: Search for regex awesome list
- Entry: `- [DevPlaybook Regex Tester](https://devplaybook.cc/regex-tester) - Live regex testing with capture group visualization and common pattern library.`

### PR Template
```markdown
## Adding DevPlaybook to the list

DevPlaybook (https://devplaybook.cc) is a free collection of 40+ browser-based
developer tools including JSON formatter, regex tester, Base64 encoder/decoder,
cron expression generator, and more.

All tools run client-side — no account or server upload required.

The site is actively maintained (last updated March 2026) and has regular new
tools and technical articles.

Following the contributing guidelines in CONTRIBUTING.md.
```

### Action Items
- [ ] Find specific awesome-developer-tools repo (check awesome.re)
- [ ] Fork and add entry for each list
- [ ] Submit PRs with the template above
- [ ] Follow up after 1 week if no response

---

## 3. Hacker News Show HN

**Status:** ⏳ Draft ready
**Best time:** Weekday morning (Mon–Wed 8–10 AM PT)
**URL:** https://news.ycombinator.com/submit

### Draft Post

**Title:** Show HN: DevPlaybook – 40+ free browser-based developer tools

**Comment to post:**
```
Hey HN,

I built DevPlaybook (https://devplaybook.cc), a collection of 40+ free developer
tools that run entirely in your browser.

The main design decision: everything runs client-side. No accounts, no server
uploads, no data collection. I got tired of tools that either require login for
basic functionality or send your code/data to a server.

Current tools include:
- JSON formatter/validator with tree view
- Regex tester with live highlighting and capture group visualization
- Base64 encoder/decoder
- Cron expression generator with human-readable preview
- JWT decoder
- Color converter and contrast checker
- Hash generator (MD5, SHA-1, SHA-256)
- URL encoder/decoder
- ...and 35+ more

Also shipping regular developer guides and SEO articles.

Tech stack: Astro 6 + Preact + Tailwind, deployed on Cloudflare Pages.

Would love feedback on which tools are most useful or what's missing.
```

### Action Items
- [ ] Create/verify HN account (needs karma > 0 for Show HN)
- [ ] Post on Tuesday or Wednesday morning
- [ ] Respond to all comments within the first hour
- [ ] Don't resubmit if it doesn't get traction (HN penalizes reposts)

---

## 4. DEV.to

**Status:** ⏳ Draft ready
**Best time:** Tuesday–Thursday
**URL:** https://dev.to/new

### Article Draft

**Title:** I built 40+ free browser-based developer tools — here's what I learned

**Tags:** webdev, javascript, tools, productivity

**Content (excerpt):**
```markdown
# I Built 40+ Free Developer Tools and Deployed Them on Cloudflare Pages

TL;DR: DevPlaybook (https://devplaybook.cc) — free dev tools, no account, runs in browser.

## Why I built this

Every developer has a list of online tools they use constantly. JSON formatters, regex testers, Base64 encoders. The problem: most of them are:

1. **Ad-stuffed** — 3 banner ads around a textarea
2. **Server-dependent** — your code gets uploaded somewhere
3. **Account-gated** — "Sign in to format more than 500 characters"

So I built my own. All client-side. No account. No data collected.

## The Tech Stack

- **Astro 6** — static HTML, no runtime overhead
- **Preact** — for interactive tools (regex live testing, etc.)
- **Tailwind CSS 4** — styling
- **Cloudflare Pages** — free hosting, global CDN

[Continue with tech decisions, performance notes, what I'd do differently...]

## Current Tools

40+ tools including:
- JSON Formatter & Validator
- Regex Tester with live highlighting
- Base64 Encoder/Decoder
- Cron Expression Generator
- [full list at devplaybook.cc]

## What I Learned

[Add 3-4 genuine lessons from building this]

---

Check it out: https://devplaybook.cc

What tools do you find yourself reaching for that aren't there? Happy to add them.
```

**Canonical URL:** https://devplaybook.cc/blog/[matching-article-slug]

### Action Items
- [ ] Create DEV.to account (or use existing)
- [ ] Set canonical URL to devplaybook.cc to avoid duplicate content penalty
- [ ] Add proper cover image
- [ ] Post and engage with comments

---

## 5. Reddit r/webdev

**Status:** ⏳ Draft ready
**Rules:** No self-promotion without genuine value; must contribute to the subreddit
**URL:** https://reddit.com/r/webdev/submit

### Post Draft

**Title:** I got tired of JSON formatters that require login, so I built 40+ free browser-based dev tools

**Body:**
```
Hey r/webdev,

I got annoyed that basic developer utilities kept requiring accounts or uploading
my code to a server. So I built DevPlaybook (devplaybook.cc) — 40+ tools that
run entirely in your browser.

No account. No server uploads. No ads in the middle of the tool.

Current tools:
- JSON formatter/validator with syntax highlighting and tree view
- Regex tester with live highlighting and capture groups
- Base64 encoder/decoder (with URL-safe variant)
- Cron expression generator with next-run preview
- JWT decoder (no payload sent to any server)
- Hash generator, URL encoder, color converter, and 35+ more

Stack: Astro + Preact + Cloudflare Pages.

What would you add? Genuinely asking — trying to fill gaps in tools people actually use.
```

### Action Items
- [ ] Check r/webdev posting rules before submitting
- [ ] Post between 10 AM–2 PM Eastern on weekdays
- [ ] Reply to every comment in the first 2 hours
- [ ] Don't repost if removed (different subreddit, different format)

---

## 6. Reddit r/programming

**Status:** ⏳ Draft ready
**Note:** r/programming is stricter — focus on technical angle, not product promotion

### Post Draft

**Title:** Deployed 40+ browser-based developer utilities on Cloudflare Pages — here's the architecture

**Approach:** Frame as a technical post about building/deploying, mention the URL as context, not as the main pitch. Focus on: Astro SSG performance, edge deployment, client-side-only architecture decisions.

### Action Items
- [ ] Write technical article first (then post with article link)
- [ ] Check recent r/programming posts for tone guidance
- [ ] May be better to skip and focus on r/webdev

---

## Tracking Metrics

After each submission, track:

| Channel | Submitted | Views | Upvotes/Engagement | New Users | Notes |
|---------|-----------|-------|-------------------|-----------|-------|
| Product Hunt | - | - | - | - | - |
| HN Show HN | - | - | - | - | - |
| DEV.to | - | - | - | - | - |
| r/webdev | - | - | - | - | - |
| GitHub PRs | - | - | # PRs merged | - | - |

---

## Priority Order

1. **GitHub Awesome Lists** — passive, long-term backlinks, no spam risk
2. **DEV.to** — canonical URL SEO benefit, engaged developer audience
3. **HN Show HN** — high upside if it lands, requires good timing
4. **Product Hunt** — best for a coordinated "launch day" push
5. **Reddit** — highest risk of being removed, do last and carefully
