# Show HN Draft — devplaybook.cc

**Status:** Draft ready. Best to post Monday–Tuesday 8–10 AM EST.

---

## Title

```
Show HN: DevPlaybook – 50+ free browser-based developer tools (no signup, no server)
```

## URL

```
https://devplaybook.cc/tools
```

## First Comment (post immediately after submitting)

Hi HN!

I built DevPlaybook to scratch my own itch — I was constantly switching between different browser tabs to format JSON, decode JWTs, test regex, generate crons, etc. Every tab was a different tool with different UI.

Everything runs in the browser. No data is sent to any server. No account required.

**Tools included:**

Data tools: JSON formatter/validator, YAML↔JSON converter, XML formatter, SQL formatter, Diff checker

Auth/crypto: JWT decoder, Hash generator (MD5/SHA-256/512), Password generator, Base64 encode/decode

Dev utilities: Regex tester, Cron builder, UUID/ULID generator, URL encoder/decoder, Timestamp converter

Frontend: CSS gradient generator, Flexbox playground, Color converter, Favicon generator, Open Graph preview

DevOps: Docker Compose generator, Git command generator, Chmod calculator, SSH keygen helper

**Tech stack:**
- Astro 4 for static generation — no server needed, first paint is fast
- Preact (~3KB) for interactive tool UIs
- Tailwind CSS, dark mode by default
- Cloudflare Pages (free tier) for global CDN

**Also:**
The site has a blog with 50+ technical articles — JWT explained, REST vs GraphQL, TypeScript generics, Node.js security, developer salary data, etc.

Link: https://devplaybook.cc

Would love feedback on what's useful, what's broken, and what's missing. Thanks.

---

## Posting Notes

- **Best time:** Monday–Tuesday, 8–10 AM EST (US east coast engineers settling in)
- **HN submission URL:** https://news.ycombinator.com/submit
- **Format:** Put URL in the URL field, don't repeat the URL in the text
- **Tone:** Technical, humble, genuine — HN hates marketing-speak
- **Follow-up:** Monitor for 2–3 hours, reply to every question promptly
- **Don't edit the title after posting** — HN penalizes that
