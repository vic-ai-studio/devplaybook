# DevPlaybook.cc — 15 平台提交指南
> 狀態：素材準備完畢，待人工提交
> 更新：2026-03-24
> 目標：1,000+ UV / 週

---

## 提交優先順序與預期流量

| # | 平台 | 預期流量 | 難度 | 狀態 |
|---|------|---------|------|------|
| 1 | Hacker News (Show HN) | 500–5,000 UV | 中 | 素材就緒 |
| 2 | Product Hunt | 200–2,000 UV | 中 | 素材就緒 |
| 3 | DEV.to | 100–500 UV | 低 | 素材就緒 |
| 4 | Reddit r/webdev | 100–500 UV | 低 | 素材就緒 |
| 5 | Reddit r/programming | 50–300 UV | 低 | 素材就緒 |
| 6 | Reddit r/learnprogramming | 50–300 UV | 低 | 素材就緒 |
| 7 | Reddit r/SideProject | 50–200 UV | 低 | 素材就緒 |
| 8 | Indie Hackers | 100–400 UV | 低 | 素材就緒 |
| 9 | BetaList | 50–300 UV | 低 | 素材就緒 |
| 10 | Lobsters | 100–500 UV | 中 | 素材就緒 |
| 11 | AlternativeTo | 50–200 UV 持續 | 低 | 素材就緒 |
| 12 | SaaSHub | 30–150 UV 持續 | 低 | 素材就緒 |
| 13 | GitHub awesome-lists | 50–500 UV 持續 | 低 | PR 清單就緒 |
| 14 | Uneed.best | 50–200 UV | 低 | 素材就緒 |
| 15 | There's This Thing | 30–100 UV | 低 | 素材就緒 |

---

## 1. Hacker News — Show HN

**提交網址：** https://news.ycombinator.com/submit
**最佳時間：** 週一或週二，上午 8–10 點 EST（台灣時間：週一/週二晚上 9–11 點）

**標題（直接複製）：**
```
Show HN: DevPlaybook – 100+ free browser-based developer tools (no signup, no server)
```

**URL 欄位：**
```
https://devplaybook.cc/tools
```

**第一則留言（提交後立即貼上）：**

```
Hi HN!

I built DevPlaybook to scratch my own itch — I was constantly switching between tabs to format JSON, decode JWTs, test regex, validate crons, etc. Every tab was a different tool with different UI.

Everything runs in the browser. No data sent to any server. No account required.

Tools included:
- Data: JSON formatter/validator, YAML↔JSON, XML formatter, SQL formatter, Diff checker
- Auth/Crypto: JWT decoder, Hash generator (MD5/SHA-256/512), Password generator, Base64
- Dev utilities: Regex tester, Cron builder, UUID/ULID generator, URL encoder, Timestamp converter
- Frontend: CSS gradient generator, Flexbox playground, Color converter, Open Graph preview
- DevOps: Docker Compose generator, Git command generator, Chmod calculator

Tech: Astro + Preact (static output) + Cloudflare Pages. First paint <1s, works offline.

Also has a blog with 50+ technical articles (JWT, REST vs GraphQL, TypeScript, Node.js security).

Link: https://devplaybook.cc

Would love feedback on what's useful, what's broken, and what's missing.
```

⚠️ **注意：** 提交後 2–3 小時內積極回覆留言，這是 HN 排名的關鍵。

---

## 2. Product Hunt

**提交網址：** https://www.producthunt.com/posts/new
**最佳時間：** 週二，凌晨 12:01 AM PST（台灣時間週二下午 4 點）

**Tagline（140字以內）：**
```
100+ free developer tools — JWT decoder, JSON formatter, regex tester. No signup, no server, 100% browser-based.
```

**Description：**
```
DevPlaybook is a curated collection of 100+ free developer tools. Everything runs in your browser — no backend, no tracking, no data leaves your machine.

🛠️ Tools include:
• JSON Formatter & Validator
• JWT Decoder
• Regex Tester with highlighting
• SQL Formatter
• Base64 / URL Encode-Decode
• UUID/ULID Generator
• Cron Expression Builder
• CSS Gradient Generator
• Docker Compose Generator
• Git Command Generator
• ...and 90+ more

⚡ Built on Astro + Preact + Cloudflare Pages — first paint <1s, works offline.

📝 Also includes a technical blog with 50+ articles on JWT, REST vs GraphQL, TypeScript generics, Node.js security, and developer career content.

🆓 100% free. No account required. No ads (yet).
```

**Topics to add:** Developer Tools, Productivity, Open Source, JavaScript, Web Development

**Screenshot 素材：** 截 https://devplaybook.cc 首頁 + 任一工具頁面

---

## 3. DEV.to

**提交網址：** https://dev.to/new
**完整文章：** 見 `devplaybook/marketing/devto-article.md`（已準備好）

**操作步驟：**
1. 登入 dev.to
2. 點 "New Post"
3. 貼上 `devto-article.md` 的全部內容
4. 將 `published: false` 改為 `published: true`
5. 確認 tags: `webdev, javascript, productivity, opensource`
6. 點 Publish

---

## 4. Reddit r/webdev

**提交網址：** https://www.reddit.com/r/webdev/submit
**最佳時間：** 週二或週三，上午 9–11 點 EST

**標題：**
```
I built 100+ free browser-based developer tools — no signup, no server, all client-side
```

**內文：** 見 `devplaybook/marketing/reddit-posts.md` 第一段

---

## 5. Reddit r/programming

見 `devplaybook/marketing/reddit-posts.md` 第二段

---

## 6. Reddit r/learnprogramming

見 `devplaybook/marketing/reddit-posts.md` 第三段

---

## 7. Reddit r/SideProject

見 `devplaybook/marketing/reddit-posts.md` 第四段

---

## 8. Indie Hackers

**提交網址：** https://www.indiehackers.com/products/new
**類型：** Product listing + forum post

**Product 頁面填寫：**
- Name: `DevPlaybook`
- URL: `https://devplaybook.cc`
- Tagline: `100+ free developer tools. No signup, no server.`
- Revenue: $0 MRR (free product)
- Stage: Beta / Growth

**Forum 貼文（貼在 #show-inh）：**

```
Title: I launched DevPlaybook — 100+ free browser-based developer tools

Hey IH! After building this on the side for several months, I finally launched DevPlaybook.

The pain point: I kept switching between 10 different browser tabs to do basic dev tasks (format JSON, decode a JWT, test a regex, build a cron expression). Every site had a different UI and half of them had intrusive ads or paywalls.

So I built one site that has everything I use daily.

Key decisions:
- 100% client-side (no server = no cost, no GDPR headaches)
- Astro + Preact (static pages, <1s first paint)
- Cloudflare Pages (free CDN, global edge)
- Currently $0 MRR — monetizing via Pro tier ($9/month) once I have enough traffic

What I learned so far:
- SEO for tool sites is slow (3–6 months) but compounds well
- Reddit/HN drive spiky traffic; SEO drives long-tail steady traffic
- Dark mode is not optional for devs (should have done it on day 1)

Current traction: [X] page views/month, growing week-over-week

Would love feedback on monetization strategy or what tools are missing.

Site: https://devplaybook.cc
```

---

## 9. BetaList

**提交網址：** https://betalist.com/submit
**填寫內容：**

- Product name: `DevPlaybook`
- Tagline: `100+ free browser-based developer tools. No signup required.`
- Website: `https://devplaybook.cc`
- Category: Developer Tools
- Description:
```
DevPlaybook is a curated collection of 100+ free online developer tools — JWT decoder, JSON formatter, regex tester, cron builder, UUID generator, CSS gradient generator, and more. Everything runs in your browser. No accounts, no tracking, no servers.

Built on Astro + Cloudflare Pages. First paint under 1 second. Works offline.

Also features a technical blog with 50+ articles on web development, APIs, TypeScript, and Node.js.
```

---

## 10. Lobsters

**提交網址：** https://lobste.rs/stories/new (需要邀請碼加入)

**標題：**
```
DevPlaybook – 100+ free browser-based developer tools (no signup, no backend)
```

**URL：** `https://devplaybook.cc/tools`

**Tags:** `web, tools, javascript, programming`

⚠️ **注意：** Lobsters 需要邀請才能加入。如果沒有帳號，請找有帳號的開發者朋友幫忙發。

---

## 11. AlternativeTo

**提交網址：** https://alternativeto.net/software/add
**填寫內容：**

- Name: `DevPlaybook`
- URL: `https://devplaybook.cc`
- Description: `Free collection of 100+ browser-based developer tools including JWT decoder, JSON formatter, regex tester, cron builder, UUID generator, and more. No signup required, no data sent to servers.`
- Alternatives to add (在各工具頁面添加作為替代品):
  - Alternatives to: JSONFormatter.org, jwt.io, regex101.com, crontab.guru

---

## 12. SaaSHub

**提交網址：** https://www.saashub.com/suggest
**填寫：**
- Product: `DevPlaybook`
- URL: `https://devplaybook.cc`
- Category: Developer Tools / Utilities

---

## 13. GitHub Awesome Lists — PR 提交清單

提交 PR 到以下 awesome lists，在各自的 "Online Tools" 或 "Developer Tools" 章節加入 DevPlaybook：

| Repo | 提交位置 |
|------|---------|
| `awesome-lists/awesome` | 在 Dev Tools 章節 |
| `trimstray/the-book-of-secret-knowledge` | Online tools 章節 |
| `sindresorhus/awesome-nodejs` | Developer tools |
| `matiassingers/awesome-readme` | Tools for developers |
| `best-of-lists/best-of-developer-tools` | Web tools |

**PR 說明模板：**
```
Add DevPlaybook to online developer tools

DevPlaybook (https://devplaybook.cc) is a collection of 100+ free browser-based
developer tools including JWT decoder, JSON formatter, regex tester, cron builder,
UUID generator, and more. No signup required, no server-side processing.

Tech: Astro + Preact + Cloudflare Pages
```

---

## 14. Uneed.best

**提交網址：** https://www.uneed.best/submit
**填寫：**
- Name: `DevPlaybook`
- URL: `https://devplaybook.cc`
- Category: Developer Tools
- Tagline: `100+ free browser-based developer tools`

---

## 15. There's This Thing (TTTT)

**提交網址：** https://www.theresathing.com/submit
**填寫：**
- Name: `DevPlaybook`
- URL: `https://devplaybook.cc`
- Description: `100+ free browser-based developer tools — JWT decoder, JSON formatter, regex tester, and more. No signup, no server.`
- Category: Developer Tools

---

## 提交排程建議

```
Week 1:
  Mon: Hacker News Show HN  ← 最高優先，流量最大
  Wed: DEV.to article
  Fri: Reddit r/webdev

Week 2:
  Mon: Product Hunt  ← 需要在凌晨 12:01 AM PST 提交
  Tue: Reddit r/learnprogramming
  Thu: Indie Hackers

Week 3:
  Mon: BetaList
  Wed: Reddit r/programming
  Fri: Reddit r/SideProject

Ongoing (any order):
  AlternativeTo, SaaSHub, Uneed, TTTT, GitHub awesome-lists PRs, Lobsters
```

---

## 追蹤成效

建議在 Google Analytics 或 Cloudflare Analytics 設定 UTM 參數：
- HN: `?utm_source=hackernews&utm_medium=social`
- Product Hunt: `?utm_source=producthunt&utm_medium=launch`
- Reddit: `?utm_source=reddit&utm_medium=social&utm_campaign=r_webdev`

---

## 需要人工操作的項目

以下需要您（Vic）親自處理，因為需要登入帳號：
1. ⚠️ Hacker News 帳號 — 需要提交
2. ⚠️ Product Hunt — 最好有 500+ followers 的帳號，或找 hunter 幫發
3. ⚠️ Reddit 帳號 — 確保帳號有足夠 karma（避免被 shadowban）
4. ⚠️ DEV.to 帳號 — 貼文
5. ⚠️ Lobsters — 需要邀請碼

如果沒有這些帳號，優先創建 HN 和 Reddit（這兩個最快見效）。
