---
title: "Top 10 VS Code Extensions Every Developer Needs in 2025"
description: "The 10 must-have VS Code extensions in 2025 — with install commands, configuration tips, and direct links. For every developer, regardless of stack."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["vscode", "extensions", "developer-tools", "productivity", "ide"]
readingTime: "9 min read"
---

VS Code has over 50,000 extensions in its marketplace. Most aren't worth your time. These 10 are — regardless of what language or stack you work in. Each one earns its place by solving a real problem that affects daily development work.

Install all 10 from the terminal in one shot:

```bash
code --install-extension esbenp.prettier-vscode \
     --install-extension dbaeumer.vscode-eslint \
     --install-extension eamodio.gitlens \
     --install-extension usernamehw.errorlens \
     --install-extension ms-vscode-remote.remote-ssh \
     --install-extension PKief.material-icon-theme \
     --install-extension christian-kohler.path-intellisense \
     --install-extension streetsidesoftware.code-spell-checker \
     --install-extension oderwat.indent-rainbow \
     --install-extension rangav.vscode-thunder-client
```

---

## 1. Prettier — Code Formatter

**Extension ID:** `esbenp.prettier-vscode`
**Downloads:** 35M+ installs
**Link:** [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

Prettier eliminates formatting debates permanently. It auto-formats your code on save — consistent quotes, indentation, line length, semicolons, trailing commas. Works across JavaScript, TypeScript, CSS, HTML, JSON, GraphQL, Markdown, and more.

**Setup:**
```json
// settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

**Project config** (`.prettierrc`):
```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "semi": false
}
```

Once Prettier is in your workflow, you never manually format code again. The few minutes spent configuring it once saves hours over a project's lifetime.

---

## 2. ESLint

**Extension ID:** `dbaeumer.vscode-eslint`
**Downloads:** 30M+ installs
**Link:** [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

ESLint catches bugs and style violations as you type — not at compile time, not at code review. It underlines problems inline with one-click fix suggestions. Essential for any JavaScript or TypeScript project.

The key benefit over running ESLint in CI only: you see problems while the code is still in front of you, before context switches happen.

**Quick fix integration:**
Press `Ctrl+.` (or `Cmd+.` on Mac) on any underlined ESLint error for quick-fix options. Most style violations fix in one keypress.

---

## 3. GitLens

**Extension ID:** `eamodio.gitlens`
**Downloads:** 25M+ installs
**Link:** [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens)

GitLens transforms git from a separate tool into a first-class part of the editor. Core features:

- **Inline blame:** See who wrote each line and when, directly in the editor as you move your cursor
- **Hover details:** Hover any line to see the full commit message and diff
- **File history:** Complete commit history for the file you're viewing
- **Commit graph:** Visual branch and merge timeline
- **Interactive rebase:** GUI rebase editor

The inline blame alone is worth installing. When you're debugging or reviewing code, knowing *when* and *why* a line was written is as important as what it does.

---

## 4. Error Lens

**Extension ID:** `usernamehw.errorlens`
**Downloads:** 10M+ installs
**Link:** [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens)

Error Lens takes every diagnostic from ESLint, TypeScript, and any language server — and displays the error message inline on the same line, instead of requiring you to hover or check the Problems panel.

Before Error Lens: error underline → move mouse to hover → read tooltip.
After Error Lens: error message is right there as you type.

The reduction in friction is significant. You catch and fix problems in seconds instead of context-switching to the Problems panel.

---

## 5. Remote — SSH

**Extension ID:** `ms-vscode-remote.remote-ssh`
**Downloads:** 20M+ installs
**Link:** [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)

Connect to any remote server over SSH and edit files as if they were local. VS Code installs a lightweight server on the remote, so autocomplete, IntelliSense, debugging, and extensions all work against the remote filesystem.

This extension effectively turns VS Code into a full remote IDE. Edit files on a Linux server from your Mac or Windows machine with complete editor features intact.

**Common use cases:**
- Editing code on a remote development server
- Working on files inside a remote Docker container
- Developing on a cloud VM while keeping your local machine clean

---

## 6. Material Icon Theme

**Extension ID:** `PKief.material-icon-theme`
**Downloads:** 18M+ installs
**Link:** [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme)

Replaces VS Code's default file icons with distinctive, colorful icons for every file type. The practical benefit: you process file types visually in the Explorer panel instead of reading extensions.

A `tsconfig.json` looks different from a `package.json` at a glance. A `Dockerfile` is instantly distinct from a `.yml` file. Small improvement, but you interact with the file tree hundreds of times per day.

---

## 7. Path Intellisense

**Extension ID:** `christian-kohler.path-intellisense`
**Downloads:** 12M+ installs
**Link:** [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=christian-kohler.path-intellisense)

Autocompletes file paths as you type them in import statements and require calls. As soon as you type `./` or `../../`, a dropdown shows the available files and folders.

If you've ever typed an import path from memory and gotten a runtime error because you remembered the directory structure wrong, Path Intellisense eliminates that class of mistake entirely.

**Works with:**
- JavaScript/TypeScript imports
- CSS `url()` references
- HTML `src` attributes
- Any file path string in any language

---

## 8. Code Spell Checker

**Extension ID:** `streetsidesoftware.code-spell-checker`
**Downloads:** 10M+ installs
**Link:** [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)

Spell checks your code — variable names, function names, comments, and strings. Understands `camelCase` and `PascalCase`, so `getUserName` correctly checks "get", "user", and "name" separately.

Why this matters: typos in variable names become bugs that are frustratingly hard to find. A misspelled API response field. A mistyped event name. A config key that's off by one letter. Spell checking catches these before they become runtime errors.

Custom words go in `.cspell.json` at your project root:
```json
{
  "words": ["devplaybook", "upsert", "prefetch", "authn"]
}
```

---

## 9. Indent Rainbow

**Extension ID:** `oderwat.indent-rainbow`
**Downloads:** 6M+ installs
**Link:** [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=oderwat.indent-rainbow)

Colors each indentation level a different color. Especially valuable in:
- **Python** — where indentation is syntactically significant
- **YAML/JSON** — deeply nested config files
- **JSX/TSX** — complex component trees
- Any code with 3+ levels of nesting

The visual distinction makes it dramatically easier to see where a block starts and ends without counting spaces. Misaligned indentation becomes immediately obvious.

---

## 10. Thunder Client

**Extension ID:** `rangav.vscode-thunder-client`
**Downloads:** 4M+ installs
**Link:** [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client)

A full API testing client built into VS Code. Send HTTP requests, manage collections, write tests — without leaving the editor or switching to a separate app.

For developers who work with APIs regularly, this removes a consistent context switch. Instead of opening Postman or Insomnia to test an endpoint during development, you test it right next to the code that calls it.

**Features:**
- Send GET, POST, PUT, DELETE, PATCH requests
- Set headers, auth (Bearer, Basic, OAuth)
- Request body: JSON, form data, binary
- Collections and environments
- Basic response assertions

It's not as full-featured as standalone Postman for complex workflows, but for quick API testing during development it's faster because it's already open.

---

## Configuration Tip: Sync Your Extensions

Once your setup is dialed in, sync it across machines with VS Code's built-in Settings Sync:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Search "Settings Sync: Turn On"
3. Sign in with GitHub or Microsoft account

Extensions, keybindings, snippets, and settings all sync automatically.

---

## Honorable Mentions

These didn't make the top 10 but are worth knowing about:

- **REST Client** (`humao.rest-client`) — send HTTP requests from `.http` files directly in VS Code
- **GitHub Copilot** (`GitHub.copilot`) — AI code completion, worth trying if you haven't
- **Docker** (`ms-azuretools.vscode-docker`) — manage containers and images without memorizing CLI flags
- **Todo Tree** (`Gruntfuggly.todo-tree`) — see all TODO/FIXME comments across your project in one panel
- **Auto Rename Tag** (`formulahendry.auto-rename-tag`) — rename HTML/JSX opening tag and closing tag renames automatically

---

## The Right Approach to Extensions

The goal isn't to install every extension — it's to remove friction from the tasks you do most. An over-extended VS Code starts slower and has more potential conflicts.

Start with the essentials (Prettier, ESLint, GitLens, Error Lens). Add others as you notice specific pain points. Audit your extensions quarterly and remove anything you haven't used.

The best extension is the one that makes you faster at the work you actually do, not the one with the most GitHub stars.
