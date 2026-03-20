# Reddit Distribution Drafts — devplaybook.cc

> **Status:** Draft ready. Do NOT post all at once. Space out over 1–2 weeks.

---

## 1. r/webdev — Free Dev Tools

**Title:**
> I built 50+ free browser-based developer tools — no signup, no server, all client-side

**Post Body:**
> Hey r/webdev — I've been building a collection of browser-based developer tools and wanted to share it with the community.
>
> **devplaybook.cc** — free tools include:
> - JSON Formatter & Validator
> - JWT Decoder
> - Regex Tester
> - SQL Formatter
> - Base64 Encode/Decode
> - URL Encoder/Decoder
> - Cron Expression Builder
> - UUID/ULID Generator
> - Password Generator
> - Diff Checker
> - CSS Gradient Generator
> - Color Converter (HEX/RGB/HSL)
> - Docker Compose Generator
> - Git Command Generator
> - ...and 40+ more
>
> Everything runs client-side in your browser — your data never leaves your machine. No account required.
>
> I built it because I kept bouncing between 10 different tabs to do basic dev tasks. Would love feedback on what's useful, what's missing, or what could be better.
>
> Link: https://devplaybook.cc/tools

**Subreddit:** r/webdev
**Flair:** Resource
**Best posting time:** Tuesday or Wednesday, 9–11 AM EST

---

## 2. r/programming — Technical Article

**Title:**
> Salary negotiation for developers: what the data actually says in 2026

**Post Body:**
> Been doing research into developer salary negotiation and wanted to share some of the patterns I found most useful.
>
> Key points from the data:
> - Location still matters enormously (remote premium has compressed but not disappeared)
> - YoE is the strongest predictor for IC roles up to senior; after that, scope/impact matters more
> - Backend and ML/AI roles command 15–25% premium over equivalent frontend roles at most companies
> - Most developers leave 10–20% on the table by not counter-offering the initial offer
>
> Full article (with sources + breakdown by role/region): https://devplaybook.cc/blog/developer-salary-negotiation-guide
>
> Also built a salary calculator tool to benchmark your range: https://devplaybook.cc/tools/salary-calculator
>
> Happy to discuss methodology or specific market segments in the comments.

**Subreddit:** r/programming
**Flair:** Discussion
**Note:** If salary article not yet live, use REST vs GraphQL or TypeScript Generics article instead.

---

## 3. r/learnprogramming — Beginner-Friendly Tools

**Title:**
> Free tools that helped me understand web dev concepts (not just use them)

**Post Body:**
> When I was learning web development, I often used tools without really understanding what was happening under the hood. Here are a few tools that helped me *understand* concepts, not just use them:
>
> **JWT Decoder** (https://devplaybook.cc/tools/jwt-decoder)
> Paste any JWT and see the three parts: header (algorithm), payload (your actual data), and signature. Helps demystify auth in a way that reading about Base64 encoding alone doesn't.
>
> **Regex Tester** (https://devplaybook.cc/tools/regex-tester)
> Write a regex and see which parts of your test string it matches, with group highlighting. Way faster than running code.
>
> **Cron Expression Builder** (https://devplaybook.cc/tools/cron-generator)
> Click the schedule you want (every day at 9 AM, every Monday, etc.) and it generates the cron syntax. Then you can read the expression and start to understand the pattern.
>
> **JSON Formatter** (https://devplaybook.cc/tools/json-formatter)
> Paste minified JSON (like API responses) and see it indented. Helps you understand nested data structures visually.
>
> **Base64 Decode** (https://devplaybook.cc/tools/base64)
> Decode the parts of a JWT by hand — helps you understand that JWTs aren't encrypted, just encoded.
>
> All free, no signup, at devplaybook.cc. What tools helped *you* understand concepts when you were learning?

**Subreddit:** r/learnprogramming
**Flair:** Resource
**Best posting time:** Weekday evenings 7–10 PM EST (when students are studying)

---

## 4. r/SideProject — Building in Public

**Title:**
> I built a free developer tools site with 50+ tools — here's what I learned

**Post Body:**
> Sharing my side project: **devplaybook.cc** — a collection of 50+ free browser-based developer tools.
>
> What I learned building it:
> - Client-side tools are surprisingly hard to test well — edge cases in JSON parsing, regex flags, cron syntax
> - Astro + Preact is an underrated combo for tool sites: static pages with tiny interactive islands
> - SEO takes 3–6 months to kick in for tool sites; Reddit/HN traffic comes first
> - People really want dark mode (obvious in hindsight)
>
> Tech stack: Astro 4, Preact, Tailwind CSS, Cloudflare Pages (free tier, still no infrastructure cost)
>
> Site: https://devplaybook.cc
> Blog: https://devplaybook.cc/blog (50+ technical articles on dev tools, APIs, TypeScript, etc.)
>
> What tools do you use most in your dev workflow?

**Subreddit:** r/SideProject
**Flair:** Show & Tell
**Best posting time:** Weekends, 10 AM–2 PM EST

---

## Submission Schedule

| Day | Platform | Post |
|-----|----------|------|
| Monday | HackerNews | Show HN |
| Wednesday | r/learnprogramming | Beginner tools |
| Following Tuesday | r/webdev | Free tools |
| Following Thursday | r/programming | Technical article |
| Following Saturday | r/SideProject | Building story |

## Rules

1. **Don't post all 4 on the same day** — looks like spam
2. **Engage in comments** — reply to every comment within the first hour
3. **Don't cross-post** — each subreddit should feel specifically written for that community
4. **Check subreddit rules first** — r/programming and r/webdev have rules about self-promotion
5. **Use an account with karma** — brand new accounts get shadow-filtered on Reddit
