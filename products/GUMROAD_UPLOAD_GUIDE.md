# Gumroad Product Upload Guide — DevPlaybook

> **前置條件**：必須先完成 Gumroad Pro 訂閱（$10/月），才能建立產品。
> 參考任務：VIC-354

---

## Product 1：Developer Productivity Bundle ($29)

### Step 1 — 在 Gumroad 建立新產品

1. 登入 [gumroad.com](https://gumroad.com)
2. 點選 **"New product"**
3. 選擇 **"Digital product"**

### Step 2 — 填寫基本資訊

| 欄位 | 填入內容 |
|------|---------|
| **Name** | `Developer Productivity Bundle` |
| **Price** | `$29` |
| **Summary (Tagline)** | `Battle-tested dotfiles, Makefile templates, and VS Code settings used by senior engineers — copy, paste, ship.` |

### Step 3 — 上傳檔案

- 上傳：`devplaybook/products/zips/Developer-Productivity-Bundle-v1.0.zip`（14KB）

### Step 4 — 貼上產品描述

複製以下內容貼入 Gumroad 描述欄（支援 Markdown）：

```
Stop wasting time configuring your dev environment from scratch every time.

This bundle includes the exact config files I use daily — optimized for speed, built for professionals.

### What You Get

**Zsh Config (.zshrc)**
- Optimized history settings (50,000 entries, no duplicates)
- Smart directory navigation (auto-cd, pushd stack)
- Useful functions: mkcd, extract, killport, f (quick find)
- Pre-configured prompt with Git branch display
- NVM lazy loading for faster shell startup

**50+ Git Aliases (git-aliases.sh)**
- `gs` = status, `ga` = add, `gc` = commit
- Smart push/pull aliases (`gpsu` sets upstream automatically)
- Stash shortcuts (`gst`, `gstp`, `gstl`)
- History/search helpers (`glog`, `gblame`, `git_recent`)
- Safety-first undo/reset aliases

**VS Code Settings (settings.json)**
- Format on save with Prettier + ESLint auto-fix
- Optimized for TypeScript, JavaScript, Python, Go
- Minimal UI (no minimap, sticky scroll, limited open tabs)
- True color terminal, JetBrains Mono font
- Smart search exclusions (no node_modules noise)

**tmux Config + Cheatsheet**
- Prefix remapped to Ctrl+a (screen-style)
- vim-hjkl pane navigation
- Intuitive splits: `|` for horizontal, `-` for vertical
- Mouse support enabled
- Clean status bar with session/host info

**Universal Makefiles (3 templates)**
- Node.js: install, dev, build, test, lint, docker
- Python: venv, install, test, coverage, format (ruff)
- Docker: build, up, down, logs, exec, push, health

### Who This Is For

- Developers tired of manually setting up new machines
- Engineers joining new teams who need a solid baseline config
- Anyone who's ever lost their dotfiles and had to start over
- Developers who want consistent tooling across multiple machines

### Requirements

- macOS, Linux, or WSL (Windows Subsystem for Linux)
- Zsh, Bash, or Fish (most configs are portable)
- tmux 3.0+, VS Code, Git
```

### Step 5 — 設定 Tags

```
developer tools, dotfiles, productivity, zsh, git, tmux, vscode, makefile, devtools, terminal
```

### Step 6 — 發布

- 點選 **"Publish"**
- 確認產品 URL（複製備用，更新到網站的購買連結）

---

## Product 2：AI Prompt Engineering Toolkit v2 ($19)

### Step 1 — 建立新產品

1. 點選 **"New product"** → **"Digital product"**

### Step 2 — 填寫基本資訊

| 欄位 | 填入內容 |
|------|---------|
| **Name** | `AI Prompt Engineering Toolkit v2` |
| **Price** | `$19` |
| **Summary (Tagline)** | `80+ structured prompts for Claude, ChatGPT & Gemini — organized by use case, ready to copy.` |

### Step 3 — 上傳檔案

- 上傳：`devplaybook/products/zips/AI-Prompt-Engineering-Toolkit-v2.0.zip`（20KB）

### Step 4 — 貼上產品描述

```
Stop staring at a blank chat window.

This toolkit gives you battle-tested prompt templates for every common developer, designer, and business task — just fill in the blanks and send.

### What You Get

**30 Development Prompts**
- Code review, security audit, performance analysis
- Debugging, refactoring, writing tests
- API design, database schema, system architecture
- Docker, CI/CD, load testing, rate limiting

**25 Design & Writing Prompts**
- Landing page copy, UX copy, error messages
- Blog posts, documentation, changelogs
- Email sequences, feature announcements
- Competitive positioning, A/B test variants

**25 Business & Productivity Prompts**
- Meeting notes → action items
- OKRs, project proposals, business cases
- Performance reviews, risk assessments
- Post-mortems, retrospectives, status reports

**Prompt Engineering Guide**
- 10 reusable patterns (Chain-of-Thought, Few-Shot, Role Assignment, etc.)
- Model selection guide (Claude vs ChatGPT vs Gemini)
- Temperature settings reference
- Anti-patterns to avoid

### Total: 80+ prompts + 10 patterns

### Who This Is For

- Developers who use AI tools daily and want to get better results
- Product managers who want consistent, professional outputs
- Anyone tired of rewriting the same prompts from scratch
- Teams who want a shared prompt library

### How It Works

1. Open the category that matches your task (dev, design, or business)
2. Find the prompt (numbered: DEV-1, DW-15, BP-8)
3. Replace `{{PLACEHOLDERS}}` with your content
4. Paste into Claude / ChatGPT / Gemini

No setup. No API keys. Works with the free tier of any AI assistant.

### Requirements

- Any AI assistant (Claude, ChatGPT, Gemini, or others)
- A text editor to customize placeholders
- That's it
```

### Step 5 — 設定 Tags

```
AI prompts, prompt engineering, ChatGPT prompts, Claude prompts, developer tools, productivity, prompt templates, AI toolkit
```

### Step 6 — 發布

- 點選 **"Publish"**
- 複製產品 URL，更新到 devplaybook.cc 的購買連結

---

## 發布後：更新網站購買連結

產品建立後，需要更新 devplaybook.cc 上的購買按鈕 URL：

1. 找到 `devplaybook/src/` 中引用這兩個產品的頁面
2. 將佔位 URL 換成 Gumroad 產品 URL（格式：`https://app.gumroad.com/l/xxxxx`）
3. 確認網站購買流程正常運作

---

## 檔案位置（備查）

| 產品 | ZIP 路徑 | 大小 | 狀態 |
|------|---------|------|------|
| Developer Productivity Bundle | `products/zips/Developer-Productivity-Bundle-v1.0.zip` | 14KB | ✅ 就緒 |
| AI Prompt Engineering Toolkit v2 | `products/zips/AI-Prompt-Engineering-Toolkit-v2.0.zip` | 20KB | ✅ 就緒 |
