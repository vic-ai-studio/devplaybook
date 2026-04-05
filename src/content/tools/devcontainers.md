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
