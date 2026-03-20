---
title: "I built 50+ free developer tools that run entirely in your browser"
published: false
description: "DevPlaybook — JWT decoder, JSON formatter, regex tester, cron builder, and 50+ more. Zero backend, zero tracking, 100% client-side. Here's why and how I built it."
tags: webdev, javascript, productivity, opensource
cover_image: https://devplaybook.cc/og-image.png
canonical_url: https://devplaybook.cc
---

## The Problem

Every developer has a mental bookmark list of random utility sites:

- One site for JSON formatting
- Another for Base64 encoding
- A third for generating UUIDs
- A different one for testing regex patterns
- And none of them have dark mode

I was tired of context-switching between 15 different tools. So I built one site that has everything I use daily.

---

## Meet DevPlaybook

[**DevPlaybook**](https://devplaybook.cc) is a collection of 50+ free online developer tools. Everything runs in your browser — no backend, no tracking, no data leaves your machine.

### Tools Available

| Category | Tools |
|----------|-------|
| **Data** | JSON Formatter, YAML↔JSON, XML Formatter, SQL Formatter, Diff Checker |
| **Encoding** | Base64, URL Encode/Decode |
| **Generators** | UUID/ULID, Hash (SHA-256/512/MD5), Cron Expression, Password |
| **Testing** | Regex Tester, JWT Decoder |
| **Converters** | Color (HEX/RGB/HSL), Timestamp, Markdown→HTML |
| **Frontend** | CSS Gradient Generator, Flexbox Playground, Open Graph Preview |
| **DevOps** | Docker Compose Generator, Git Command Generator, Chmod Calculator |

Plus a **technical blog** with 50+ articles on JWT, REST vs GraphQL, TypeScript, Node.js security, and developer career topics.

---

## The Tech Stack

```
Astro 4        → Static HTML generation, first paint < 1s
Preact         → ~3KB interactive components per tool
Tailwind CSS   → Utility-first styling, dark mode built-in
Cloudflare Pages → Free hosting, global CDN, zero server cost
```

**Why Astro?** Each tool page is static HTML with a small interactive island. The JSON formatter doesn't need React hydration — it just needs a small input/output component. Astro only ships JS for the parts that actually need it.

**Why Preact over React?** For standalone interactive forms, Preact's ~3KB runtime is more than enough. The tools are simple state machines — no routing, no global state, no context.

**Why 100% client-side?** Three reasons:
1. No server costs — still at $0/month infrastructure
2. No GDPR issues — no data to store, no consent to manage
3. Works offline once cached by the service worker

---

## Design Decisions

### 1. No accounts, no tracking

You open the page. You use the tool. That's it. No sign-up walls, no cookie banners, no analytics on what you type. The entire value prop is instant utility.

### 2. SEO-first architecture

Each tool has its own URL with:
- Structured data (JSON-LD `SoftwareApplication`)
- Open Graph tags with tool-specific previews
- Descriptive meta with actual use case copy

When someone Googles "jwt decoder online", I want DevPlaybook to show up. Long-tail tool queries have high intent and convert well.

### 3. Dark mode by default

Respects `prefers-color-scheme`. Manual toggle available. Developers default to dark mode at 2 AM when debugging production issues — this is not optional.

### 4. Mobile-friendly

Every tool works on mobile. Yes, developers use their phones to quickly check a Base64 string or decode a JWT from a mobile API response. Responsive layouts, touch-friendly inputs.

---

## The Blog

I added a technical blog because:
1. Tools get you traffic from people with immediate needs
2. Articles get you traffic from people researching topics
3. Combined, they cover the full developer discovery funnel

The blog has 50+ articles including:
- [JWT explained: what it is, how it works, and when not to use it](https://devplaybook.cc/blog/jwt-explained)
- [REST vs GraphQL vs tRPC: when to use each in 2026](https://devplaybook.cc/blog/rest-vs-graphql)
- [TypeScript generics: the patterns that actually matter](https://devplaybook.cc/blog/typescript-generics)
- [Node.js security: the 12 checks every API needs](https://devplaybook.cc/blog/nodejs-security)
- [Developer salary negotiation guide 2026](https://devplaybook.cc/blog/developer-salary-negotiation-guide)

---

## Lessons Learned

### 1. Client-side tools have surprising edge cases

JSON parsing: `JSON.parse("{}")` works, but people paste things like `'{"key": undefined}'`. You need graceful error states everywhere.

Regex flags: the difference between `/pattern/` and `/pattern/gi` matters enormously for the test output. Make flags visible and editable.

Cron expressions: people use both standard cron and quartz cron (6-part with seconds). Have to handle both.

### 2. The first 90 days are SEO purgatory

Tool sites don't get organic traffic until Google trusts the domain. The first traffic comes from:
- HN / Reddit posts (burst)
- Dev.to / Hashnode articles (slow build)
- Direct links from other tools

Plan for 3–6 months before organic search traffic becomes meaningful.

### 3. Speed is a feature users notice

I measured this: users who see a tool render in <500ms use it more. Tools that take >1.5s to load get closed. Astro's partial hydration kept almost every tool page under 200ms first paint.

---

## What's Next

- More DevOps tools (kubectl cheatsheet, Terraform helper)
- API tester with history and auth header management
- CSV ↔ JSON bidirectional converter
- Image to Base64 drag-and-drop

---

## Try It Out

🌐 **Live site:** [devplaybook.cc](https://devplaybook.cc)
🔧 **Tools:** [devplaybook.cc/tools](https://devplaybook.cc/tools)
📖 **Blog:** [devplaybook.cc/blog](https://devplaybook.cc/blog)

What tools do you wish existed? Drop a comment — I'm actively adding based on feedback.

---

*Built with Astro 4 + Preact + Tailwind CSS. Deployed on Cloudflare Pages.*
