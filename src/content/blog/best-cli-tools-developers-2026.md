---
title: "20 Best CLI Tools Every Developer Needs in 2026"
description: "The definitive list of CLI tools that actually improve developer productivity in 2026: navigation, file ops, search, git, system monitoring, terminal setup, and dev utilities — with install commands and real usage examples."
date: "2026-04-01"
tags: [cli, terminal, developer-tools, productivity]
readingTime: "11 min read"
---

# 20 Best CLI Tools Every Developer Needs in 2026

The terminal has never been better. Rust-based rewrites of classic Unix tools have raised the bar on speed, ergonomics, and output quality. Meanwhile, a wave of new tools has tackled problems that `find`, `grep`, and `ls` were never designed for.

Below is a curated list of 20 CLI tools that cover every part of the development workflow — with install commands, usage examples, and honest assessments of when each tool earns its place.

## Quick Reference Table

| Tool | Replaces | Category | Install |
|------|----------|----------|---------|
| zoxide | `cd` | Navigation | `cargo install zoxide` |
| broot | `tree` | Navigation | `cargo install broot` |
| fzf | — | Navigation | `brew install fzf` |
| bat | `cat` | File ops | `brew install bat` |
| eza | `ls` | File ops | `brew install eza` |
| fd | `find` | File ops | `brew install fd` |
| ripgrep (rg) | `grep` | Search | `brew install ripgrep` |
| ast-grep (sg) | — | Search | `brew install ast-grep` |
| jq | — | Search/transform | `brew install jq` |
| yq | — | Search/transform | `brew install yq` |
| lazygit | — | Git | `brew install lazygit` |
| delta | `diff-so-fancy` | Git | `brew install git-delta` |
| gh | — | Git | `brew install gh` |
| btop | `htop` | System | `brew install btop` |
| dust | `du` | System | `brew install dust` |
| procs | `ps` | System | `brew install procs` |
| starship | — | Terminal | `brew install starship` |
| zellij | `tmux` | Terminal | `brew install zellij` |
| atuin | — | Terminal | `brew install atuin` |
| httpie/xh | `curl` | Dev | `brew install xh` |
| tokei | `cloc` | Dev | `brew install tokei` |
| watchexec | `watch` | Dev | `brew install watchexec` |

---

## Navigation

### zoxide — Smart `cd` That Learns Your Habits

`zoxide` is a smarter `cd` command that tracks your most-visited directories and lets you jump to them with partial names. After a week of use, navigating deep directory trees becomes a one-word operation.

```bash
# Install
cargo install zoxide
# or
brew install zoxide

# Add to ~/.zshrc or ~/.bashrc
eval "$(zoxide init zsh)"

# Usage
z proj          # jumps to ~/code/projects/my-project
z doc api       # jumps to ~/code/projects/my-project/docs/api
zi              # interactive selection with fzf
```

What sets it apart: the frecency algorithm (frequency + recency) means it gets better the longer you use it. There's no configuration needed — it works from day one.

### broot — Interactive Directory Navigator

`broot` renders your directory tree interactively and lets you search, preview, and navigate without leaving the terminal. It's particularly useful for exploring unfamiliar codebases.

```bash
# Install
brew install broot

# Launch
br

# Inside broot: type to filter, enter to go, :e to open in editor
# Example: type "test" to instantly filter all paths containing "test"
```

The `br` shell function enables `cd` integration — when you exit broot on a directory, your shell navigates there. Pair it with `bat` for file previews.

### fzf — Fuzzy Finder for Everything

`fzf` is a general-purpose fuzzy finder that integrates with nearly everything: file selection, git branches, command history, kill lists, and more. It's the glue that makes other tools interactive.

```bash
# Install
brew install fzf

# Add keybindings and completions
$(brew --prefix)/opt/fzf/install

# Usage
# Ctrl+R: fuzzy search command history
# Ctrl+T: fuzzy search files in current directory
# Alt+C: fuzzy cd into subdirectory

# Pipe anything into fzf
git branch | fzf | xargs git checkout
ps aux | fzf | awk '{print $2}' | xargs kill
```

Combine with `bat` for syntax-highlighted file previews: `fzf --preview 'bat --color=always {}'`

If you maintain shell aliases, the [Shell Alias Generator](/tools/shell-alias-generator) can help you build and organize fzf-based shortcuts quickly.

---

## File Operations

### bat — `cat` with Syntax Highlighting and Git Integration

`bat` replaces `cat` with syntax highlighting for 200+ languages, line numbers, git change markers, and automatic paging. It also serves as the preview pane for `fzf`.

```bash
# Install
brew install bat

# Basic usage (same API as cat)
bat README.md
bat src/main.rs

# As a pager for man pages
alias man='MANPAGER="sh -c \"col -bx | bat -l man -p\"" man'

# Diff view
bat --diff file.py
```

`bat` respects `.gitignore` for syntax detection and supports themes — `bat --list-themes` to see options. `--theme="Dracula"` is a popular choice.

### eza — Modern `ls` Replacement

`eza` is a feature-rich `ls` replacement with color coding, Git integration, icons, and tree views. It's the maintained fork of the archived `exa`.

```bash
# Install
brew install eza

# Common aliases to add to ~/.zshrc
alias ls='eza --icons'
alias ll='eza -la --icons --git'
alias lt='eza --tree --icons -L 2'
alias la='eza -la --icons --git --time-style=long-iso'

# Git-aware listing
eza -la --git                    # shows modified/staged status per file
eza --tree --git-ignore -L 3     # tree view, respects .gitignore
```

The `--git` flag makes it immediately obvious which files have been modified without running `git status`.

### fd — Fast and Ergonomic `find` Replacement

`fd` is a simpler, faster alternative to `find` with sensible defaults: it respects `.gitignore`, searches hidden files only when asked, and uses colored output.

```bash
# Install
brew install fd

# Basic search (no need to quote patterns)
fd config             # find all files named "config"
fd -e js              # find all .js files
fd -t d node_modules  # find all directories named node_modules

# Execute commands on results
fd -e ts --exec prettier --write {}
fd -t f -e log --exec rm {}
```

Speed comparison: `fd` is typically 5-10x faster than `find` on large directories due to parallel traversal and smarter pruning.

---

## Search

### ripgrep (rg) — The Fastest Code Search

`ripgrep` is the standard for searching code. It's faster than `grep`, `ag`, and `ack`, respects `.gitignore` automatically, and produces clean, readable output with line numbers and context.

```bash
# Install
brew install ripgrep

# Basic search
rg "TODO" src/
rg -i "error" --type py        # case-insensitive, Python files only
rg -l "useEffect"              # list matching files only
rg -C 3 "database.connect"    # 3 lines of context

# Common patterns
rg --type-list                 # list all file types
rg -g "*.ts" -g "!*.test.ts" "useState"  # TypeScript, excluding tests
rg "fn\s+\w+" --type rust      # find all Rust function definitions
```

`ripgrep` is fast enough that using a `.rgignore` file for project-specific exclusions is worth it for large monorepos.

### ast-grep (sg) — Structural Code Search

`ast-grep` searches code by structure, not text. It understands syntax, so you can find patterns regardless of formatting or variable naming.

```bash
# Install
brew install ast-grep

# Find all React hooks calls
sg -p 'useState($$$)' -l js

# Find functions with a specific return pattern
sg -p 'function $FUNC($$$) { return $$$; }' -l ts

# Refactor: rename a function call across all files
sg -p 'oldFunction($ARGS)' -r 'newFunction($ARGS)' --lang js
```

This is the tool to reach for when `rg` gives you too many false positives on naming patterns or when you need to perform a code transformation safely.

### jq and yq — JSON and YAML from the Command Line

`jq` is the standard for parsing and transforming JSON in shell scripts. `yq` extends the same interface to YAML, TOML, and XML.

```bash
# Install
brew install jq yq

# jq — JSON processing
curl -s api.github.com/users/octocat | jq '.public_repos'
cat data.json | jq '.items[] | select(.active == true) | .name'
jq -r '.dependencies | to_entries[] | "\(.key): \(.value)"' package.json

# yq — YAML processing
yq '.services.web.image' docker-compose.yml
yq -i '.version = "2.0"' config.yml        # in-place edit
cat k8s.yaml | yq '.spec.containers[0].image'
```

Use the [Crontab Builder](/tools/crontab-builder) to generate scheduled jobs that pipe API responses through `jq` for monitoring or alerting workflows.

---

## Git

### lazygit — Full Git TUI

`lazygit` is a terminal UI for Git that handles branching, staging, rebasing, stashing, and more — without memorizing obscure command flags. It's particularly powerful for interactive rebases and partial-file staging.

```bash
# Install
brew install lazygit

# Launch (from any git repo)
lg

# Key workflows:
# Space = stage/unstage file
# Enter = open file diff
# c = commit
# P = push
# p = pull
# r = rebase onto branch
# i = interactive rebase
```

`lazygit` shines for interactive rebases that would otherwise require `git rebase -i HEAD~N` and careful squash/fixup choreography.

### delta — Better Git Diffs

`delta` replaces git's default diff output with syntax-highlighted, side-by-side diffs with line numbers and configurable themes.

```bash
# Install
brew install git-delta

# Configure in ~/.gitconfig
[core]
    pager = delta

[interactive]
    diffFilter = delta --color-only

[delta]
    navigate = true       # n/N to move between files
    side-by-side = true
    line-numbers = true
    syntax-theme = Dracula
```

Once configured, all `git diff`, `git show`, and `git log -p` output uses delta automatically.

### gh CLI — GitHub from the Terminal

The official GitHub CLI covers the full GitHub workflow: PRs, issues, releases, Actions, code search, and gist management.

```bash
# Install
brew install gh

# Authentication
gh auth login

# Pull request workflow
gh pr create --title "feat: add auth" --body "Implements OAuth2 flow"
gh pr list --state open
gh pr checkout 123
gh pr merge 123 --squash

# Issues
gh issue create --title "Bug: login fails on Safari"
gh issue list --assignee @me

# Actions
gh run list
gh run watch 12345

# Code search
gh search code "useState" --language typescript --repo myorg/myrepo
```

Pair `gh` with shell functions in your `.zshrc` to create one-command PR + review workflows.

---

## System Monitoring

### btop — Modern Process Monitor

`btop` is a resource monitor with a polished TUI showing CPU, memory, disk I/O, network, and process trees. It's a significant upgrade over `htop` in both visuals and information density.

```bash
# Install
brew install btop
# or on Linux
sudo apt install btop

# Launch
btop

# Key shortcuts:
# F: filter processes
# k: kill process
# c: CPU view
# m: memory view
# d: disk view
```

`btop` renders well in all modern terminal emulators and supports mouse interaction for process management.

### dust — Intuitive Disk Usage

`dust` replaces `du` with a visual tree that makes it immediately clear where disk space is being consumed.

```bash
# Install
brew install dust

# Usage
dust                      # current directory
dust -d 2                 # limit depth to 2
dust /var/log             # specific path
dust -r                   # reverse order (largest last)
dust -X .git              # exclude .git directory
```

On a typical developer machine, `dust ~/code` in 30 seconds identifies the node_modules directories consuming gigabytes.

### procs — Better `ps`

`procs` is a modern process viewer with color output, tree view, and filtering by name, user, or PID.

```bash
# Install
brew install procs

# Usage
procs node              # find all node processes
procs --tree            # process tree view
procs --watch           # auto-refresh (like top)
procs --sortd cpu       # sort by CPU descending
```

---

## Terminal Enhancement

### starship — Cross-Shell Prompt

`starship` is a fast, highly configurable prompt written in Rust that works across zsh, bash, fish, and PowerShell. It shows git status, language versions, AWS profile, Kubernetes context, and more — only when relevant.

```toml
# ~/.config/starship.toml

[character]
success_symbol = "[❯](bold green)"
error_symbol = "[❯](bold red)"

[git_branch]
symbol = " "
format = "[$symbol$branch]($style) "

[nodejs]
format = "[$symbol($version )]($style)"
symbol = " "

[python]
format = '[${symbol}${pyenv_prefix}(${version} )(\($virtualenv\) )]($style)'

[aws]
format = '[$symbol($profile )(\($region\) )]($style)'
disabled = false
```

```bash
# Install
brew install starship

# Add to ~/.zshrc
eval "$(starship init zsh)"
```

### zellij — Modern Terminal Multiplexer

`zellij` is a terminal multiplexer (like tmux) with a built-in UI, better defaults, and a plugin system. It shows available keybindings at the bottom, making it accessible without memorizing shortcuts.

```bash
# Install
brew install zellij

# Launch
zellij

# Key shortcuts (shown in UI)
# Ctrl+p: pane mode (new, split, close, focus)
# Ctrl+t: tab mode (new, rename, close)
# Ctrl+n: resize mode
# Ctrl+s: scroll mode (search, navigate)

# Start with a layout
zellij --layout development
```

Configure layouts in `~/.config/zellij/layouts/development.kdl` for project-specific pane setups that launch automatically.

### atuin — Synced Shell History

`atuin` replaces your shell history with a SQLite database that supports full-text search, filtering by directory, exit code, and duration — and optionally syncs across machines via an encrypted server.

```bash
# Install
brew install atuin

# Add to ~/.zshrc
eval "$(atuin init zsh)"

# Ctrl+R now opens atuin's interactive search
# Filter options inside search:
# --cwd          only commands from current directory
# --exit 0       only successful commands
# --before 2d    only commands from before 2 days ago

# Sync setup (optional, end-to-end encrypted)
atuin register -u username -e email -p password
atuin sync
```

Once you've used `atuin` for a month, going back to standard `Ctrl+R` history feels like a regression.

---

## Developer Utilities

### xh — Fast HTTP Client

`xh` is a fast rewrite of HTTPie with a cleaner API. It's the go-to for testing APIs from the terminal — more readable than `curl` for interactive use, faster to type.

```bash
# Install
brew install xh

# GET request
xh httpbin.org/get

# POST with JSON
xh POST api.example.com/users name=Alice email=alice@example.com

# With headers and auth
xh GET api.example.com/protected Authorization:"Bearer $TOKEN"

# Download file
xh --download https://example.com/file.zip

# Follow redirects, verbose
xh -v -F https://example.com/redirect
```

`xh` automatically sets `Content-Type: application/json` for key=value arguments — no flags needed.

### tokei — Code Statistics

`tokei` counts lines of code, comments, and blank lines across a project, broken down by language. Useful for project overviews, documentation, and tracking growth over time.

```bash
# Install
brew install tokei

# Usage
tokei                      # current directory
tokei src/ tests/          # specific paths
tokei --exclude target/    # exclude directories
tokei -s lines             # sort by lines
tokei -o json | jq '.'     # JSON output for scripting
```

Running `tokei` before and after a major refactor gives an objective measure of code reduction or complexity growth.

### watchexec — Run Commands on File Change

`watchexec` watches files and re-runs commands when they change. It's faster and more reliable than `nodemon` or `entr` for language-agnostic file watching.

```bash
# Install
brew install watchexec

# Run tests on any .rs file change
watchexec -e rs cargo test

# Restart a server on .py changes
watchexec -e py -r python server.py

# Build on any change, clear screen, ignore .git
watchexec -c -i .git make build

# Only watch a specific directory
watchexec -w src/ -e ts npm run build
```

Combine with the [Crontab Builder](/tools/crontab-builder) to set up scheduled checks alongside your development file watchers.

---

## Building Your Toolkit

The most effective approach is incremental adoption. Start with the tools that replace daily commands:

1. **Week 1:** `bat`, `eza`, `fd`, `ripgrep` — drop-in replacements with immediate payoff
2. **Week 2:** `fzf` + `zoxide` — transforms how you navigate
3. **Week 3:** `lazygit` + `delta` — upgrades your git workflow
4. **Week 4:** `starship` + `atuin` — polish your shell environment

Use the [Shell Alias Generator](/tools/shell-alias-generator) to set up consistent aliases across your machines, then commit them to a dotfiles repository managed with `chezmoi` or a bare git repo.

Each tool here has minimal configuration friction — most work well with defaults, letting you adopt them without committing to deep customization before you've validated their value in your workflow.
