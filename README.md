# DevPlaybook.cc

<div align="center">

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fdevplaybook.cc&label=devplaybook.cc&style=flat-square)](https://devplaybook.cc)
[![Tools](https://img.shields.io/badge/tools-100%2B-blue?style=flat-square)](https://devplaybook.cc)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Cloudflare Pages](https://img.shields.io/badge/deployed%20on-Cloudflare%20Pages-orange?style=flat-square&logo=cloudflare)](https://devplaybook.cc)

**Free developer tools, templates, and guides — forever.**

[🌐 Visit DevPlaybook.cc](https://devplaybook.cc) · [📚 Browse Tools](https://devplaybook.cc/tools) · [⭐ Star this repo](#)

</div>

---

## What is DevPlaybook?

DevPlaybook is a curated collection of **100+ free developer tools** built with Astro, running entirely on Cloudflare's edge network. No logins required for free tools. Instant, zero-latency access from anywhere.

| Category | Examples |
|---|---|
| 🤖 AI Tools | Token calculator, commit generator, code reviewer, SQL builder |
| 🎨 CSS/Design | Color picker, gradient generator, box shadow, border radius |
| 🔧 Dev Utilities | UUID generator, cron validator, JSON formatter, regex tester |
| 🔐 Encoding | Base64, URL encoder, JWT decoder, hash generator |
| 📊 Calculators | API rate limit, aspect ratio, timestamp converter |

---

## Tech Stack

- **Frontend**: Astro + Preact + Tailwind CSS 4 (static output)
- **Backend**: Cloudflare Pages Functions (edge Workers)
- **Database**: Cloudflare KV (subscribers, sessions, analytics, API keys)
- **Auth**: Email magic links via Resend
- **Payments**: Gumroad (international) · ECPay (Taiwan)
- **Deploy**: Cloudflare Pages

---

## Pro Subscription

Premium tier with AI-powered tools, batch processing, and API access.

**Pricing**: $9/month · 7-day free trial · Cancel anytime

Available on [Gumroad](https://vicnail.gumroad.com) (international) and ECPay (Taiwan).

### Pro Features

- All premium tools & templates — future releases included
- Early access content before public release
- Member-only discounts on products
- Priority support
- API: unlimited requests/day (free tier = 100/day)
- Ad-free experience

---

## Public API (Free Tier)

Rate-limited, no auth required.

| Endpoint | Description |
|---|---|
| `GET /api/v1/uuid` | Generate UUIDs |
| `GET /api/v1/cron` | Parse/validate cron expressions |
| `GET /api/v1/regex` | Test regex patterns |
| `GET /api/v1/json-format` | Format/validate JSON |

Free tier: **100 requests/day** · Pro: unlimited

---

## Local Development

```bash
git clone https://github.com/[your-org]/devplaybook.git
cd devplaybook
npm install
npm run dev          # http://localhost:4321
```

For local Workers testing (env bindings + KV):

```bash
# Create .dev.vars (never commit)
cat > .dev.vars << EOF
RESEND_API_KEY=re_...
EOF

npx wrangler pages dev ./dist
```

---

## Project Structure

```
devplaybook/
├── functions/api/           # Cloudflare Pages Functions (edge API)
│   ├── auth/                # Magic link + session + signout
│   ├── subscription/        # GET /api/subscription/status
│   ├── keys.js              # POST /api/keys
│   └── v1/                  # Rate-limited public API
├── src/
│   ├── pages/
│   │   ├── tools/           # 100+ tool pages
│   │   ├── pricing.astro    # /pricing
│   │   ├── pro-dashboard.astro
│   │   └── signin.astro     # Magic link auth
│   ├── components/          # Preact interactive components
│   └── layouts/             # BaseLayout
└── wrangler.toml            # KV bindings + Cloudflare config
```

---

## KV Namespaces

| Binding | Purpose |
|---|---|
| `SUBSCRIBERS` | Pro subscriber records + API keys |
| `AUTH_KV` | Magic link tokens + session cookies |
| `NEWSLETTER_KV` | Newsletter subscribers |
| `DEV_SETUPS` | Community dev setup submissions |
| `ANALYTICS` | Page views + Web Vitals |

---

## Contributing

PRs welcome! To add a new tool:

1. Fork this repo and create a branch: `git checkout -b tool/your-tool-name`
2. Add your tool page in `src/pages/tools/your-tool-name.astro`
3. Follow the existing tool component pattern (see `src/pages/tools/uuid.astro` as an example)
4. Run `npm run dev` and verify it works locally
5. Open a PR — describe the tool and use case

**Guidelines:**
- Tools should be free and require no backend unless using existing Cloudflare Workers
- Keep components self-contained with Preact
- SEO: include `title`, `description`, and relevant `keywords` in frontmatter

---

## License

MIT — free to use, fork, and build on.

---

<div align="center">

Built with ☕ and edge computing · [devplaybook.cc](https://devplaybook.cc)

</div>
