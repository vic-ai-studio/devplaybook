# Gumroad Product Upload Guide

> DevOps verified: 2026-03-24
> Both products are ready. Requires Gumroad Pro first (see VIC-354).

---

## Prerequisites

1. Set up Gumroad Pro ($10/month) — see VIC-354
2. Log into gumroad.com → Dashboard → New Product

---

## Product 1: Developer Productivity Bundle

**Price:** $29
**ZIP file:** `devplaybook/products/zips/Developer-Productivity-Bundle-v1.0.zip` (14KB)

### Gumroad Setup Steps

1. Click **New Product** → choose **Digital product**
2. **Name:** `Developer Productivity Bundle`
3. **Tagline:** `Battle-tested dotfiles, Makefile templates, and VS Code settings used by senior engineers — copy, paste, ship.`
4. **Price:** $29
5. **Upload file:** `Developer-Productivity-Bundle-v1.0.zip`
6. **Description:** Copy from `devplaybook/products/developer-productivity-bundle/GUMROAD_LISTING.md` → "Description" section
7. **Tags:** `developer tools, dotfiles, productivity, zsh, git, tmux, vscode, makefile, devtools, terminal`
8. **Category:** Developer Tools / Productivity

---

## Product 2: AI Prompt Engineering Toolkit v2

**Price:** $19
**ZIP file:** `devplaybook/products/zips/AI-Prompt-Engineering-Toolkit-v2.0.zip` (20KB)

### Gumroad Setup Steps

1. Click **New Product** → choose **Digital product**
2. **Name:** `AI Prompt Engineering Toolkit v2`
3. **Tagline:** `80+ structured prompts for Claude, ChatGPT & Gemini — organized by use case, ready to copy.`
4. **Price:** $19
5. **Upload file:** `AI-Prompt-Engineering-Toolkit-v2.0.zip`
6. **Description:** Extracted from the ZIP → `ai-prompt-toolkit-v2/GUMROAD_LISTING.md`
7. **Tags:** `AI prompts, prompt engineering, ChatGPT prompts, Claude prompts, developer tools, productivity, prompt templates, AI toolkit`
8. **Category:** Developer Tools / AI Tools

---

## After Creating Both Products

1. Copy the Gumroad product URLs (e.g., `https://devplaybook.gumroad.com/l/dev-bundle`)
2. Update `devplaybook/src/content/tools/` or products page with buy buttons
3. Notify DevOps to integrate the Gumroad links into the website

---

## File Locations (Verified)

| Product | Directory | ZIP | Size |
|---------|-----------|-----|------|
| Developer Productivity Bundle | `devplaybook/products/developer-productivity-bundle/` | `zips/Developer-Productivity-Bundle-v1.0.zip` | 14KB |
| AI Prompt Toolkit v2 | `devplaybook/products/ai-prompt-toolkit-v2/` (inside ZIP) | `zips/AI-Prompt-Engineering-Toolkit-v2.0.zip` | 20KB |
