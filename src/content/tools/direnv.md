---
title: "direnv"
description: "Shell environment switcher — automatically load and unload environment variables, secrets, and PATH changes when you cd into a project directory."
category: "Documentation & DX Tools"
pricing: "Free"
pricingDetail: "Open source (MIT)"
website: "https://direnv.net"
github: "https://github.com/direnv/direnv"
tags: [developer-tools, shell, environment, devex, open-source, dotenv]
pros:
  - "Zero friction — environments activate on `cd`, deactivate on `cd ..`"
  - "Works with any shell (bash, zsh, fish, elvish)"
  - "Safe: `.envrc` must be explicitly `direnv allow`-ed before loading"
  - "Integrates with nix develop, venv, rvm, nvm, and more"
  - "Keeps secrets out of shell history — load from files, not typed commands"
cons:
  - "Requires shell hook setup (one-time per shell)"
  - "`.envrc` must not be committed if it contains secrets"
  - "Changes to `.envrc` require re-running `direnv allow`"
  - "Complex stdlib functions can be confusing initially"
date: "2026-04-02"
---

## Overview

direnv extends your shell to automatically load environment variables when entering a directory. The problem it solves: juggling different AWS profiles, Node versions, Python virtualenvs, and API keys across multiple projects. With direnv, you `cd` into a project and everything is set up. You `cd` out and it's cleaned up.

## Installation

```bash
# macOS
brew install direnv

# Linux
curl -sfL https://direnv.net/install.sh | bash

# Add hook to your shell (~/.zshrc or ~/.bashrc)
eval "$(direnv hook zsh)"   # or bash, fish
```

## Basic .envrc

```bash
# .envrc
export DATABASE_URL="postgresql://localhost/myproject_dev"
export REDIS_URL="redis://localhost:6379"
export NODE_ENV="development"
export AWS_PROFILE="myproject-dev"
export AWS_REGION="us-east-1"
```

```bash
# Allow direnv to load this file
direnv allow .

# Now cd out and back in:
cd .. && cd myproject
# direnv: loading /path/to/myproject/.envrc
# direnv: export +DATABASE_URL +REDIS_URL ...
```

## Loading .env Files

```bash
# .envrc — load a .env file (not committed)
dotenv .env

# Or load from multiple files
dotenv_if_exists .env.local
dotenv .env.defaults
```

## Node Version Management

```bash
# .envrc — use a specific Node version (with nvm)
use nvm 20.0.0

# With mise/asdf
use mise
```

When you enter the directory, direnv switches Node version automatically.

## Python Virtual Environments

```bash
# .envrc — auto-activate virtualenv
layout python3

# Or activate an existing venv
source venv/bin/activate
```

## Nix Integration

direnv + Nix flakes is a powerful combo:

```bash
# .envrc — auto-enter nix develop shell
use flake

# Now cd into the project and get all Nix packages in PATH
# No manual `nix develop` needed
```

## AWS Profile Per Project

```bash
# project-a/.envrc
export AWS_PROFILE=project-a-staging
export AWS_REGION=us-west-2

# project-b/.envrc
export AWS_PROFILE=project-b-prod
export AWS_REGION=eu-west-1
```

Switch between AWS accounts by switching projects — no more `AWS_PROFILE=xxx aws` prefix on every command.

## Security

direnv will refuse to load an `.envrc` that hasn't been explicitly allowed:

```bash
direnv: error .envrc is blocked. Run `direnv allow` to approve its content.
```

This prevents malicious `.envrc` files in repositories from automatically executing. After reviewing the contents, run `direnv allow` to trust it.

**Never commit `.envrc` files that contain actual secrets.** Use `.env` (gitignored) loaded via `dotenv .env` in the `.envrc`.
