---
title: "Dev Containers — Reproducible Development Environments in Docker"
description: "VS Code's container-based development environment spec — define your entire dev environment in a JSON file, run it in Docker, and get identical environments across your whole team."
category: "Documentation & DX Tools"
pricing: "Free"
pricingDetail: "Open source spec; free with VS Code, GitHub Codespaces (free tier: 60h/month)"
website: "https://containers.dev"
github: "https://github.com/devcontainers/spec"
tags: [developer-tools, docker, vscode, devex, environments, containers, codespaces]
pros:
  - "Reproducible environments — 'works on my machine' becomes 'works in the container'"
  - "One-click setup — new hires clone repo and run, no setup docs needed"
  - "Works with GitHub Codespaces for cloud development"
  - "Lifecycle hooks: `postCreateCommand`, `postStartCommand` for automated setup"
  - "Feature library: pre-built features for Node, Python, AWS CLI, kubectl, etc."
cons:
  - "Requires Docker running locally — overhead on less powerful machines"
  - "First build can be slow (pulling images, installing tools)"
  - "Volume mounts on Windows/macOS slower than native Linux"
  - "Container rebuild needed when devcontainer.json changes"
date: "2026-04-02"
---

## Overview

Dev Containers define your development environment as code. Instead of a long README of setup steps, a `.devcontainer/devcontainer.json` file specifies the Docker image, VS Code extensions, port forwarding, and environment setup scripts. Anyone on the team (or GitHub Codespaces) opens the repo and gets an identical, ready-to-code environment.

## Basic Configuration

```json
// .devcontainer/devcontainer.json
{
  "name": "Node.js & TypeScript",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm",

  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/aws-cli:1": {}
  },

  "forwardPorts": [3000, 5432, 6379],

  "postCreateCommand": "npm install",
  "postStartCommand": "npm run db:migrate",

  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-azuretools.vscode-docker"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
      }
    }
  }
}
```

## Full Stack with Docker Compose

For apps that need multiple services (app + database + cache):

```yaml
# .devcontainer/docker-compose.yml
services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ../..:/workspaces:cached
    command: sleep infinity  # VS Code attaches here

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: myapp_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpassword
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  postgres-data:
```

```json
// .devcontainer/devcontainer.json (with compose)
{
  "name": "Full Stack Dev",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "postCreateCommand": "npm install && npm run db:migrate"
}
```

## Using Features

Features are reusable dev environment components:

```json
{
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    },
    "ghcr.io/devcontainers/features/python:1": {
      "version": "3.12"
    },
    "ghcr.io/devcontainers/features/kubectl-helm-minikube:1": {
      "version": "latest"
    }
  }
}
```

Browse 100+ official features at `containers.dev/features`.

## GitHub Codespaces

The same `devcontainer.json` powers GitHub Codespaces — a full VS Code environment in the browser:

```bash
# From any GitHub repo: press . (period) for quick editor
# Or: Code → Codespaces → Create codespace on main

# Free tier: 60 hours/month of 2-core machines
```

This means contributors never need to install anything locally — they open a Codespace and start coding immediately.

## Best For

- **Teams with complex local setup** — projects requiring specific Node/Python versions, databases, Redis, or external services that take hours to set up manually
- **Open-source projects** wanting zero-friction contributor onboarding — add a devcontainer and contributors start coding in minutes, not hours
- **Enterprise teams on Windows** where inconsistent WSL setups cause "works on my machine" problems
- **Bootcamps and courses** — students all get identical environments without debugging 10 different laptop configurations
- **Regulated environments** where exact dependency versions must be auditable and reproducible

## Dev Containers vs. Alternatives

| | Dev Containers | Docker + Makefile | Nix | Vagrant |
|--|----------------|-------------------|-----|---------|
| IDE integration | Deep (VS Code, JetBrains) | Manual | Partial | Manual |
| Setup speed | Fast (pull image) | Medium | Slow (first build) | Slow |
| GitHub Codespaces | ✅ Native | ✗ | ✗ | ✗ |
| Learning curve | Low | Low | High | Medium |
| Best for | VS Code teams, OSS projects | Any CI setup | NixOS users, reproducibility purists | Multi-VM setups |

Dev Containers have the best IDE integration and Codespaces support. For projects that need reproducible builds in CI but not local dev, a plain Dockerfile + Makefile is simpler.

## Concrete Use Case: Onboarding 10 Engineers in One Week with Zero Setup Friction

A growing fintech startup needed to onboard 10 new backend engineers in a single week. Their stack — a Python 3.12 monorepo with FastAPI, PostgreSQL 16, Redis, and Celery — required installing 14 tools locally, configuring database schemas, seeding test data, and setting up three `.env` files. Previous onboarding averaged 1.5 days per engineer, with at least one "works on my machine" blocker per person (usually a mismatched PostgreSQL version or missing system-level C library for a Python dependency). The engineering lead decided to invest one day building a Dev Container configuration before the cohort arrived.

The `.devcontainer/` directory included a `docker-compose.yml` spinning up the app container (based on `mcr.microsoft.com/devcontainers/python:3.12`), PostgreSQL 16, and Redis 7. The `devcontainer.json` used `postCreateCommand` to run `pip install -e ".[dev]" && alembic upgrade head && python scripts/seed_test_data.py`, ensuring that by the time VS Code opened, the database was migrated and seeded. Features pulled in the AWS CLI, GitHub CLI, and Docker-in-Docker for running integration tests. VS Code settings auto-installed the Python, Pylance, and GitLens extensions with the team's shared `settings.json` for consistent formatting and type-checking behavior.

On day one, each new engineer cloned the repo, opened it in VS Code, clicked "Reopen in Container," and had a fully working environment in under 4 minutes. The engineers using GitHub Codespaces (two were on company-issued Chromebooks) got the same experience in the browser. Zero setup tickets were filed that week. The Dev Container config became a living document — when the team later added a Kafka dependency, they added a Kafka service to the compose file, and every developer got it on their next container rebuild. The total onboarding time dropped from 1.5 days to 15 minutes, and "works on my machine" incidents dropped to zero for the quarter.

## When to Use Dev Containers

**Use Dev Containers when:**
- Your project has complex environment requirements (specific language versions, databases, system libraries) that are painful to install manually
- You onboard new team members frequently and want to eliminate setup documentation that goes stale
- Your team works across different operating systems (Windows, macOS, Linux) and you need consistent behavior everywhere
- You want to enforce identical tooling versions across the team (linter versions, formatter configs, CLI tools) without relying on each developer to maintain them
- You use GitHub Codespaces and want the same environment locally and in the cloud

**When NOT to use Dev Containers:**
- Your project is a single-file script or simple CLI tool with no external dependencies — the Docker overhead is not justified
- Your team works exclusively on high-performance native development (game engines, GPU-intensive ML training) where Docker's I/O and GPU passthrough limitations are deal-breakers
- Developers on your team have low-spec machines (under 8GB RAM) where running Docker Desktop alongside an IDE causes constant swapping
- Your organization prohibits Docker on developer workstations for security policy reasons and does not use GitHub Codespaces
