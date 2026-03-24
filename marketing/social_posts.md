# DevPlaybook Social Posts — Twitter/X, Reddit, HackerNews

> **Status:** Draft ready. Review before posting. Space posts out — do NOT post all at once.
> **Tone rule:** Natural, authentic, developer-first. No marketing-speak. No "check out my tool!" energy.

---

## Twitter/X Posts (5)

### Post 1 — Thread: Privacy Rant + Client-Side Tools

```
I'm genuinely tired of pasting my JWTs, API keys, and DB schemas into random websites.

Found myself using 6 different "online tools" last week.
Every one of them is a server-side black box.

Thread: why client-side tools matter, and what I switched to 🧵

---

Most "online dev tools" send your data to a server.
You paste a JWT → someone's backend decodes it.
You paste a schema → it hits their DB.

For internal tooling, test credentials, or anything sensitive — this is a real risk.

---

Client-side tools fix this.
Everything runs in your browser.
Nothing leaves your machine.

devplaybook.cc does this for 100+ tools:
- JWT Decoder
- SQL Formatter
- API Request Builder
- Docker Compose Generator
- Regex Tester
...and many more

---

Not saying every tool needs this.
Formatting public JSON? Doesn't matter.
Decoding tokens from your staging env? Matters a lot.

Just know the difference before you paste.
```

**Best time:** Tuesday–Thursday, 10–11 AM EST
**Format:** Post as a thread (separate each section with a reply)

---

### Post 2 — Single Tweet: Quick Tip (JWT)

```
Quick dev tip: before debugging any JWT auth issue, decode the token first.

9/10 times the problem is already visible:
- wrong `exp`
- missing `sub`
- audience mismatch

devplaybook.cc/tools/jwt-decoder — paste it in, no server involved, no data leaves your browser.

Saves the "why isn't this working" spiral.
```

**Best time:** Monday morning or Wednesday, 8–10 AM EST
**Note:** Pair with a screenshot of the tool UI if possible

---

### Post 3 — Thread: AI Tools for Dev Workflows

```
AI tools I actually use in my dev workflow (not hype, just what saved me time this week):

🧵

---

→ AI Code Review
Paste a function, get a review focused on readability, edge cases, and performance.
Not a replacement for a teammate — good for a quick sanity check before PR.
devplaybook.cc/tools/ai-code-review

---

→ AI Commit Generator
Paste your diff, get 3 commit message options.
Sounds lazy, but I use it because I write bad commit messages at 11 PM.
devplaybook.cc/tools/ai-commit-generator

---

→ AI Error Explainer
Paste a stack trace, get a plain-English explanation + suggested fixes.
Especially useful for cryptic compile errors or unfamiliar frameworks.
devplaybook.cc/tools/ai-error-explainer

---

→ AI Regex Explainer
Write a regex → get it explained line by line.
Great for reading someone else's code, or your own from 3 months ago.
devplaybook.cc/tools/ai-regex-explainer

---

None of these replace understanding the fundamentals.
But if they save 10 minutes per day, that compounds.

What AI tools actually made it into your daily workflow?
```

**Best time:** Thursday or Friday, 9–11 AM EST
**Format:** Thread

---

### Post 4 — Single Tweet: Cron Expression

```
Cron syntax is one of those things I relearn every single time.

* * * * * — which one is minute again?

Built a visual cron builder that lets you click what you want (every Monday at 9 AM, etc.) and shows you the expression.

devplaybook.cc/tools/cron-generator

Also explains each field. Bookmarking it was the right call.
```

**Best time:** Any weekday, 9 AM–12 PM EST

---

### Post 5 — Building in Public Tweet

```
Shipped another batch of tools to devplaybook.cc this week.

Running total: 100+ free browser-based dev tools.
Zero backend. Zero signup. Everything client-side.

The ones I use most (that I didn't expect to):
- Docker Compose Generator (saves me from the docs every time)
- Color Blindness Simulator (accessibility testing in 2 clicks)
- API Response Formatter (stops me from squinting at raw JSON)

What tools do you wish existed as simple browser utilities?
```

**Best time:** Friday or weekend, 10 AM–2 PM EST

---

## Reddit Posts (3)

### Post 1 — r/webdev: Free Dev Tools

**Title:**
> I built 100+ free browser-based developer tools — everything runs client-side, nothing leaves your browser

**Post Body:**
> Hey r/webdev — I've been building **devplaybook.cc** over the past few months. It's a collection of free developer tools that run entirely in your browser with no backend.
>
> Current tools include:
>
> **Data & Text**
> - JSON Formatter & Validator
> - YAML ↔ JSON Converter
> - SQL Formatter
> - XML Formatter
> - Diff Checker
> - Markdown Previewer
>
> **Auth & Crypto**
> - JWT Decoder
> - Hash Generator (MD5, SHA-256, SHA-512)
> - Password Generator
> - Base64 Encode/Decode
>
> **Dev Utilities**
> - Regex Tester (with group highlighting)
> - Cron Expression Builder (visual)
> - UUID/ULID Generator
> - Timestamp Converter
> - URL Encoder/Decoder
>
> **Frontend**
> - CSS Gradient Generator
> - Color Converter (HEX/RGB/HSL)
> - Box Shadow Generator
> - Border Radius Generator
> - Color Contrast Checker (WCAG)
>
> **DevOps**
> - Docker Compose Generator
> - Git Command Generator
> - Chmod Calculator
> - CORS Tester
>
> **AI-Powered**
> - AI Code Review
> - AI Commit Generator
> - AI Error Explainer
> - AI Regex Explainer
>
> ...and 70+ more at https://devplaybook.cc/tools
>
> Everything is static — Astro + Preact + Cloudflare Pages. No server, no account, no tracking beyond Cloudflare's privacy-first analytics.
>
> Would genuinely love feedback on what's missing, what's broken, or what you'd add. Happy to answer questions about how any of the tools are built.

**Subreddit:** r/webdev
**Flair:** Resource
**Best posting time:** Tuesday or Wednesday, 9–11 AM EST
**Note:** Reply to every comment in the first hour. Don't upvote-beg.

---

### Post 2 — r/programming: Technical Article

**Title:**
> The practical difference between REST and GraphQL (and when to pick each)

**Post Body:**
> I see a lot of "REST vs GraphQL" takes online that mostly argue about philosophy. Here's a more practical breakdown based on actually building both.
>
> **When REST wins:**
> - Simple CRUD with predictable data shapes
> - Public APIs where clients are unknown (easier to document, easier to cache)
> - Teams unfamiliar with GraphQL's resolver model
> - When you don't want to think about N+1 query problems
>
> **When GraphQL wins:**
> - Frontend teams that need flexible queries without back-and-forth with backend
> - Mobile clients where bandwidth matters (fetch only what you need)
> - Products with complex, deeply nested data models
> - Rapid product iteration where the schema evolves fast
>
> **The underrated factor:** operations team familiarity
> REST is much easier to debug with curl, Postman, and standard HTTP tooling. GraphQL introspection is powerful but adds cognitive overhead for people not used to it.
>
> Full article with code examples: https://devplaybook.cc/blog/rest-vs-graphql
>
> I also built an API tester tool if you want to poke at both styles: https://devplaybook.cc/tools/api-tester
>
> Happy to discuss in the comments — especially the caching and federation topics where I glossed over a lot.

**Subreddit:** r/programming
**Flair:** Discussion
**Best posting time:** Thursday, 9–11 AM EST
**Note:** Lead with value, mention the site secondarily. HN and r/programming audiences are hostile to obvious promotion.

---

### Post 3 — r/devtools: Curated Tools Roundup

**Title:**
> Free browser-based dev tools that respect your data (no server, no account)

**Post Body:**
> Compiled a list of tools I've been building specifically because I didn't want to paste sensitive data (tokens, schemas, API keys) into third-party servers.
>
> Everything at **devplaybook.cc/tools** runs 100% client-side:
>
> 🔐 **Privacy-sensitive tasks:**
> - JWT Decoder — decode tokens locally, never sent to a server
> - Hash Generator — SHA-256/512/MD5 in-browser
> - Password Generator — generated locally, not via an API
>
> 🛠️ **Daily workflow:**
> - JSON Formatter with validation
> - SQL Formatter
> - Regex Tester with real-time match highlighting
> - Cron Expression Builder (visual + syntax)
>
> 🎨 **Frontend tools:**
> - Color Contrast Checker (WCAG AA/AAA)
> - Color Blindness Simulator
> - CSS Gradient Generator
> - Box Shadow Generator
>
> 🤖 **AI-powered (opt-in):**
> - AI Code Review
> - AI Commit Message Generator
> - AI Error Explainer
>
> Open to feedback on what's missing or what could be more useful. What tools do you have bookmarked for daily use?

**Subreddit:** r/devtools
**Flair:** Tool (or Resource if no Tool flair)
**Best posting time:** Wednesday or Thursday, 9–11 AM EST

---

## HackerNews Posts (2)

### Post 1 — Show HN: Main Site

**Title:**
> Show HN: DevPlaybook – 100+ free browser-based developer tools (no signup, no backend)

**URL:** https://devplaybook.cc/tools

**First comment (post immediately after submitting):**
> Hi HN — I built DevPlaybook because I got tired of switching between 20 different browser tabs for everyday dev tasks, and because I was uncomfortable pasting JWTs, schemas, and internal API responses into random third-party sites.
>
> Everything runs in the browser. No data is sent to a server. No account required.
>
> **What's in it:**
>
> Data & text: JSON formatter/validator, YAML↔JSON converter, XML formatter, SQL formatter, Markdown previewer, Diff checker
> Auth/crypto: JWT decoder, Hash generator (MD5/SHA-256/SHA-512), Password generator, Base64 encode/decode
> Dev utilities: Regex tester (with group highlighting), Cron builder (visual), UUID/ULID generator, Timestamp converter, URL encoder/decoder, Chmod calculator
> Frontend: CSS gradient generator, Color converter (HEX/RGB/HSL), Box shadow, Border radius, Color contrast checker (WCAG), Color blindness simulator, Flexbox playground
> DevOps: Docker Compose generator, Git command generator, CORS tester, API tester, API rate limit calculator
> AI-powered (opt-in): Code review, Commit message generator, Error explainer, Regex explainer, SQL builder, Test generator
> ...and 70+ more
>
> **Stack:** Astro (static generation) + Preact (interactive islands) + Tailwind CSS + Cloudflare Pages. Zero backend for the tools themselves. The AI tools call a lightweight Cloudflare Worker that proxies to the model API.
>
> **Honest status:** Traffic is low, still working on SEO and distribution. Built this for my own use first, now trying to see if it's useful to others.
>
> Would love feedback on what's broken, what's missing, and what the HN audience actually reaches for in their daily workflow.

**Best time to submit:** Monday or Tuesday, 8–10 AM EST (US engineers settling in for the week)
**Note:** HN Show HN posts work best early in the week, early morning. Don't use adjectives like "amazing" or "the best." Be direct and technical.

---

### Post 2 — Show HN: AI Dev Tools (Focused)

**Title:**
> Show HN: Free AI-powered developer tools that run in the browser (code review, commit messages, error explainer)

**URL:** https://devplaybook.cc/tools/ai-code-review

**First comment (post immediately after submitting):**
> Hi HN — I added a set of AI-powered tools to devplaybook.cc, focused on tasks I actually use AI for in my dev workflow:
>
> **AI Code Review** — paste a function or class, get feedback on readability, edge cases, and potential bugs. Not a full analysis but a fast gut-check before opening a PR.
>
> **AI Commit Message Generator** — paste your diff, get 3 commit message options (conventional commits format). Most useful at end-of-day when you're summarizing 8 hours of changes.
>
> **AI Error Explainer** — paste a stack trace or error message, get a plain-English explanation and suggested next steps. Especially useful for cryptic errors in unfamiliar frameworks.
>
> **AI Regex Explainer** — paste a regex pattern, get it explained token by token. Useful for reading inherited code.
>
> **AI SQL Builder** — describe what you want in plain English, get a SQL query. Handles joins, aggregates, subqueries. Useful when you know what you want but not the exact syntax.
>
> **AI Test Generator** — paste a function, get unit test stubs. Handles edge cases you might miss when writing tests quickly.
>
> The AI tools call a Cloudflare Worker proxy (the static pages themselves have no backend). The rest of the 100+ tools on the site are fully client-side — no server, no account.
>
> Happy to discuss the architecture or the specific prompting approach for any of these. Curious what AI-assisted dev tasks the HN community has actually found valuable vs. hype.

**Best time to submit:** Wednesday or Thursday, 8–10 AM EST
**Note:** This post targets a different angle than Post 1 — lead with the AI tools specifically. Only submit one Show HN per site per few months; pick whichever angle fits the current HN zeitgeist better.

---

## Posting Schedule

| Week | Day | Platform | Post |
|------|-----|----------|------|
| Week 1 | Monday | HackerNews | Show HN: Main site |
| Week 1 | Wednesday | Twitter/X | Thread: Privacy + client-side tools |
| Week 1 | Thursday | r/devtools | Privacy-respecting tools |
| Week 2 | Tuesday | r/webdev | 100+ free dev tools |
| Week 2 | Thursday | Twitter/X | AI tools thread |
| Week 2 | Friday | Twitter/X | Building in public |
| Week 3 | Monday | Twitter/X | JWT quick tip |
| Week 3 | Wednesday | r/programming | REST vs GraphQL article |
| Week 3 | Thursday | Twitter/X | Cron expression tweet |
| Week 4 | Wednesday | HackerNews | Show HN: AI tools (if first Show HN got traction) |

## Rules

1. **One platform per day max** — staggered looks organic, clustered looks like a campaign
2. **Engage in comments** — reply to every comment in the first hour; HN/Reddit algorithms reward early engagement
3. **Don't cross-post** — each post is written for its community, don't repost word-for-word
4. **No upvote-begging** — never ask people to upvote, share, or RT
5. **Lead with value, not the product** — especially on HN and r/programming
6. **Check subreddit rules before posting** — r/webdev and r/programming have self-promotion limits
7. **Use an aged account** — brand-new Reddit accounts get shadow-filtered
8. **For HN Show HN:** only submit once per domain per few months; picking the right day+time matters more than anything
