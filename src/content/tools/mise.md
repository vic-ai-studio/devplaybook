---
title: "mise"
description: "The fast, modern version manager for Node, Python, Ruby, Go, and 500+ tools — successor to asdf with 10x faster performance, written in Rust, with built-in task runner and env management."
category: "Documentation & DX Tools"
pricing: "Free"
pricingDetail: "Open source (MIT)"
website: "https://mise.jdx.dev"
github: "https://github.com/jdx/mise"
tags: [developer-tools, version-manager, devex, rust, open-source, node, python]
pros:
  - "Replaces nvm, pyenv, rbenv, goenv, sdkman with one tool"
  - "10x faster than asdf (written in Rust vs shell scripts)"
  - "Backward compatible with asdf plugins and `.tool-versions` files"
  - "Built-in task runner (replaces Makefile for common dev tasks)"
  - "Environment variable management (.mise.toml replaces .envrc for many cases)"
cons:
  - "Newer than asdf — some edge cases not yet handled"
  - "Plugin ecosystem still catching up to asdf's full breadth"
  - "Task runner is less powerful than dedicated tools like just"
  - "Breaking changes possible as project matures"
date: "2026-04-02"
---

## Overview

mise (formerly rtx) is a fast, unified version manager that replaces the patchwork of `nvm`, `pyenv`, `rbenv`, and `asdf`. Written in Rust, it's 10x faster than asdf (which is bash), handles 500+ tools via plugins, and adds env management and a task runner. The `.mise.toml` file per project pins all tool versions for the entire team.

## Installation

```bash
# macOS
brew install mise

# Linux / Any
curl https://mise.run | sh

# Add to shell (~/.zshrc)
eval "$(mise activate zsh)"  # or bash, fish
```

## Per-Project Tool Versions

```toml
# .mise.toml (commit this!)
[tools]
node = "20.11.0"
python = "3.12.1"
go = "1.22.0"
terraform = "1.7.4"
awscli = "2.15.0"

[env]
NODE_ENV = "development"
DATABASE_URL = "postgresql://localhost/myapp_dev"
```

```bash
# Install all pinned versions
mise install

# Activate — tools are now in PATH
mise use  # or just cd into the directory (auto-activate)
```

## Global Defaults

```bash
# Set global defaults (used when no .mise.toml in project)
mise use --global node@20
mise use --global python@3.12

# List all installed versions
mise ls

# List available versions
mise ls-available node
```

## Task Runner

```toml
# .mise.toml — define tasks
[tasks.dev]
run = "npm run dev"
description = "Start dev server"

[tasks.test]
run = "npm test -- --coverage"
depends = ["lint"]

[tasks.lint]
run = "biome check ."

[tasks.db.migrate]
run = "npx prisma migrate dev"

[tasks.setup]
run = """
npm install
mise run db.migrate
echo 'Setup complete!'
"""
```

```bash
mise run dev          # Start dev server
mise run test         # Run tests (after lint)
mise run db.migrate   # Run migrations
```

## Plugin System

```bash
# Install via asdf-compatible plugins
mise plugin add rust
mise use rust@latest

# Or use short form for popular tools
mise use node@lts
mise use python@3.12
mise use deno@latest
```

## mise vs Alternatives

| | mise | asdf | nvm | pyenv |
|--|------|------|-----|-------|
| Speed | Fast (Rust) | Slow (bash) | Slow | Medium |
| Languages | 500+ | 500+ | Node only | Python only |
| Task runner | ✅ | ❌ | ❌ | ❌ |
| Env management | ✅ | ❌ | ❌ | ❌ |
| asdf compat | ✅ | N/A | ❌ | ❌ |
| Maturity | 2023+ | 2014+ | 2010+ | 2011+ |

For new projects, mise is the recommended choice. For existing asdf setups, mise is a drop-in replacement that reads `.tool-versions` files.
