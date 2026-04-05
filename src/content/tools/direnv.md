---
title: "direnv — Automatic Environment Variables per Directory"
description: "Shell environment switcher — automatically load and unload environment variables, secrets, and PATH changes when you cd into a project directory."
category: "Documentation & DX Tools"
pricing: "Free"
pricingDetail: "Open source (MIT)"
website: "https://direnv.net"
github: "https://github.com/direnv/direnv"
tags: ["developer-tools", "shell", "environment", "devex", "open-source", "dotenv", "cli", "productivity"]
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

## Concrete Use Case: Managing Five Microservices with Different AWS Profiles and Node Versions

A backend team maintains five microservices: an API gateway (Node 20, AWS staging profile), a billing service (Node 18, AWS production profile with restricted IAM), a notification worker (Node 20, AWS staging profile plus SendGrid keys), an analytics pipeline (Python 3.11, AWS data-lake profile), and a legacy admin panel (Node 16, its own AWS profile with a different region). Without direnv, developers constantly run `nvm use`, `export AWS_PROFILE=...`, and `source .venv/bin/activate` manually — or worse, they forget and deploy with the wrong credentials.

The team creates an `.envrc` file in each service's repository root. The API gateway's `.envrc` runs `use nvm 20` and sets `AWS_PROFILE=gateway-staging` plus `AWS_REGION=us-east-1`. The billing service's `.envrc` uses `use nvm 18`, sets `AWS_PROFILE=billing-prod`, and loads sensitive Stripe keys from a gitignored `.env.local` via `dotenv_if_exists .env.local`. The analytics pipeline's `.envrc` runs `layout python3` to auto-activate a virtualenv and sets the data-lake AWS profile. Each developer runs `direnv allow` once per repo after cloning, and from that point forward, switching between services is just `cd ../billing-service` — the correct Node version activates, the right AWS profile loads, and the appropriate environment variables appear. No manual steps, no wrong-profile incidents.

The result is measurable: the team eliminates an entire class of "deployed to wrong environment" incidents that had occurred roughly once per quarter. Onboarding new developers drops from a half-day of environment setup per service to a single `direnv allow` command. The `.envrc` files are committed to each repository (containing only non-secret configuration like AWS profile names and Node versions), while actual secrets live in gitignored `.env.local` files that developers populate from the team's password manager.

## When to Use direnv

**Use direnv when:**
- You work across multiple projects that require different environment variables, SDK versions, or cloud profiles
- Your team frequently encounters "works on my machine" issues caused by mismatched environment configurations
- You want to automatically activate Python virtualenvs, Node versions (via nvm/mise), or Nix development shells per project
- You need a lightweight, shell-native solution that does not require a daemon, Docker, or heavy tooling
- You want to keep secrets out of shell history by loading them from files rather than typing `export` commands

**When NOT to use direnv:**
- You need centralized, audited secrets management across a team — use HashiCorp Vault, Doppler, or a cloud secrets manager instead
- Your project already uses Docker or Nix flakes as the sole development environment and all configuration is handled there
- You need to manage environment variables for non-shell contexts like GUI applications or IDE run configurations
- You require encrypted secret storage — direnv loads plaintext files and provides no encryption layer itself
