---
title: "VS Code Extensions That Make You 10x More Productive"
description: "The best VS Code extensions for code quality, Git, navigation, and remote dev — curated picks that genuinely change how you work, not just bloat your editor."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["vscode", "productivity", "developer-tools", "extensions", "ide"]
readingTime: "8 min read"
---

VS Code ships lean by design — its real power comes from extensions. But the marketplace has 50,000+ options, and most aren't worth installing. Here are the extensions that genuinely change how you work, grouped by what problem they solve.

## Code Intelligence

### Prettier — Code Formatter

**ID:** `esbenp.prettier-vscode`

Stop arguing about formatting. Prettier auto-formats your code on save — consistent quotes, indentation, line length, trailing commas. Works with JavaScript, TypeScript, CSS, HTML, JSON, Markdown, and more.

Setup in `settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

Once you have Prettier, you never manually format code again.

### ESLint

**ID:** `dbaeumer.vscode-eslint`

Catches bugs and style violations as you type — not at compile time or code review. Underlines problems inline with quick-fix suggestions. Essential for any JavaScript or TypeScript project.

### Error Lens

**ID:** `usernamehw.errorlens`

Takes ESLint, TypeScript errors, and any other diagnostic — and displays the message inline on the same line as the error, instead of requiring you to hover. Immediate feedback with zero extra keystrokes.

## Navigation and Search

### GitLens

**ID:** `eamodio.gitlens`

The most powerful Git extension available. Key features:
- **Inline blame:** See who wrote each line and when, directly in the editor
- **File history:** Full commit history for the current file
- **Line history:** See every change to a specific line over time
- **Interactive rebase:** Visual rebase editor
- **Commit graph:** Visual branch/merge timeline

GitLens makes git history feel like a first-class part of the editor, not an external tool.

### Path Intellisense

**ID:** `christian-kohler.path-intellisense`

Autocompletes file paths as you type them in import statements. If you've ever typed `../../components/` and stared at the ceiling trying to remember the filename, this extension fixes that.

### TODO Highlight

**ID:** `wayou.vscode-todo-highlight`

Highlights `TODO:`, `FIXME:`, and `HACK:` comments in your code so they're impossible to miss. Configurable patterns and colors. Pair with the "Todo Tree" extension to see all TODOs across your project in one panel.

## Git and Collaboration

### Git Graph

**ID:** `mhutchie.git-graph`

Visual commit graph showing branches, merges, and tags. Right-click on any commit to checkout, cherry-pick, revert, create a branch, or compare. Much easier to reason about branch history than the terminal output.

### GitHub Pull Requests

**ID:** `github.vscode-pull-request-github`

Review and manage GitHub pull requests directly in VS Code. See PR diffs, add comments, approve, merge — without leaving the editor. If your team uses GitHub, this is a significant workflow improvement.

## Productivity Boosters

### Auto Rename Tag

**ID:** `formulahendry.auto-rename-tag`

When you rename an HTML/JSX opening tag, the closing tag renames automatically. Small quality-of-life improvement that removes a whole category of silly bugs.

### Multiple Cursor Case Preserve

**ID:** `Cardinal90.multi-cursor-case-preserve`

When using multi-cursor to rename a variable, this extension preserves the case of each occurrence — camelCase stays camelCase, PascalCase stays PascalCase, CONSTANT_CASE stays constant. Without it, every occurrence gets the same case as what you typed.

### Bookmarks

**ID:** `alefragnani.Bookmarks`

Mark lines in any file and jump back to them with a keyboard shortcut. Essential when you're working across multiple large files and need to move between specific spots repeatedly.

Shortcuts: `Ctrl+Alt+K` toggle bookmark, `Ctrl+Alt+J/L` previous/next bookmark.

## Remote Development

### Remote - SSH

**ID:** `ms-vscode-remote.remote-ssh`

Connect to any remote server over SSH and edit files as if they were local. The extension runs a VS Code server on the remote, so autocomplete, debugging, and extensions all work against the remote filesystem. Transforms VS Code into a full remote IDE.

### Docker

**ID:** `ms-azuretools.vscode-docker`

Manage containers, images, and compose files from VS Code. View running containers, inspect logs, exec into a shell, rebuild images — without memorizing Docker CLI flags. Essential if you work with Docker daily.

## Appearance and Usability

### Indent Rainbow

**ID:** `oderwat.indent-rainbow`

Colors each indentation level differently. Makes nested code dramatically easier to read — especially useful in Python, YAML, and deeply-nested JSX.

### Better Comments

**ID:** `aaron-bond.better-comments`

Colors comments by type:
- `// !` → red (important/warning)
- `// ?` → blue (questions)
- `// TODO` → orange
- `// *` → green (highlights)

Adds semantic meaning to comments without changing your code.

## The Essential Starter Set

If you're setting up a new VS Code installation, start with these five:

```
esbenp.prettier-vscode
dbaeumer.vscode-eslint
eamodio.gitlens
usernamehw.errorlens
ms-vscode-remote.remote-ssh
```

Install them all at once from the terminal:

```bash
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension eamodio.gitlens
code --install-extension usernamehw.errorlens
code --install-extension ms-vscode-remote.remote-ssh
```

## Honorable Mentions

- **REST Client** (`humao.rest-client`) — send HTTP requests from `.http` files directly in VS Code, like a lightweight Postman built into the editor
- **Markdown All in One** (`yzhang.markdown-all-in-one`) — table of contents, preview, shortcuts, math support
- **Thunder Client** (`rangav.vscode-thunder-client`) — full API testing GUI inside VS Code
- **Code Spell Checker** (`streetsidesoftware.code-spellchecker`) — catches typos in variable names, comments, and strings

The goal isn't to install everything — it's to remove friction from the tasks you do most. Start with the essentials, then add one new extension when you notice a recurring pain point. Your setup should evolve with your workflow, not front-load it.
