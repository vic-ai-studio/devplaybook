---
title: "GitHub Actions Workflow Examples: 15 Ready-to-Use CI/CD Templates"
description: "Copy-paste GitHub Actions workflow examples for Node.js, Python, Docker, deployment, scheduled tasks, and more. Real templates that work out of the box."
date: "2026-03-24"
tags: ["github-actions", "ci-cd", "devops", "automation", "workflow-templates"]
readingTime: "10 min read"
---

# GitHub Actions Workflow Examples: 15 Ready-to-Use CI/CD Templates

The hardest part of GitHub Actions isn't understanding the concepts — it's finding a working example that matches what you're actually trying to do. Most documentation shows toy examples; real projects need to handle caching, secrets, matrix builds, and conditional deployment.

This page collects 15 battle-tested workflow templates you can copy and adapt. Each includes a brief explanation of what it does and why.

---

## Before You Start

All workflows go in `.github/workflows/` in your repository root. Each file is independent — you can have multiple workflows running in parallel.

Key concepts used throughout:

- `on:` — what triggers the workflow (push, PR, schedule, manual)
- `jobs:` — parallel units of work
- `steps:` — sequential commands within a job
- `secrets.VARIABLE_NAME` — encrypted variables from your repo Settings > Secrets

---

## Node.js Templates

### 1. Node.js CI (Test + Lint on Every PR)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - run: npm ci
      - run: npm run lint
      - run: npm test
```

**Why the matrix?** Testing on multiple Node versions catches compatibility issues before your users hit them.

---

### 2. Node.js with Coverage Report

```yaml
name: Test with Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
```

---

### 3. Build and Deploy to Vercel

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: "--prod"
```

---

## Python Templates

### 4. Python CI (pytest + flake8)

```yaml
name: Python CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        python-version: ["3.11", "3.12"]

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest flake8

      - run: flake8 . --max-line-length=100
      - run: pytest -v
```

---

### 5. Python with Docker Build

```yaml
name: Build Docker Image

on:
  push:
    tags: ["v*"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            myuser/myapp:latest
            myuser/myapp:${{ github.ref_name }}
```

**Note:** This triggers only on version tags (`v1.0.0`, `v2.1.3`), not on every push.

---

## Docker Templates

### 6. Multi-Platform Docker Build (AMD64 + ARM64)

```yaml
name: Multi-Platform Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64,linux/arm64
          push: true
          tags: myuser/myapp:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Security Templates

### 7. Dependency Security Scan

```yaml
name: Security Scan

on:
  push:
    branches: [main]
  schedule:
    - cron: "0 0 * * 1"  # every Monday at midnight

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

Use [DevPlaybook Cron Generator](https://devplaybook.cc/tools/cron-generator) to build and validate cron expressions for scheduled workflows.

---

### 8. Secret Detection (Pre-Push Guard)

```yaml
name: Secret Detection

on: [push, pull_request]

jobs:
  detect-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Detect secrets
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Release and Deployment Templates

### 9. Automated Changelog + GitHub Release

```yaml
name: Release

on:
  push:
    tags: ["v*"]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate changelog
        uses: orhun/git-cliff-action@v3
        with:
          config: cliff.toml
          args: --verbose
        env:
          OUTPUT: CHANGELOG.md

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body_path: CHANGELOG.md
          files: dist/*
```

---

### 10. Deploy to AWS S3 (Static Site)

```yaml
name: Deploy to S3

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci && npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Sync to S3
        run: |
          aws s3 sync ./dist s3://${{ secrets.S3_BUCKET }} --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} \
            --paths "/*"
```

---

## Utility Templates

### 11. Scheduled Job (Cron)

```yaml
name: Daily Cleanup

on:
  schedule:
    - cron: "0 2 * * *"  # 2am UTC every day

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: node scripts/cleanup.js
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

### 12. Manual Trigger with Inputs

```yaml
name: Manual Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options: [staging, production]
      version:
        description: "Version to deploy"
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.version }}
      - run: ./scripts/deploy.sh ${{ inputs.environment }}
```

**Use case:** Give non-developers a one-click deploy button without terminal access.

---

### 13. PR Labeler (Auto-Tag PRs)

```yaml
name: Label PR

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  label:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

Pairs with `.github/labeler.yml`:

```yaml
bug:
  - head-branch: ["bug/*", "fix/*"]
feature:
  - head-branch: ["feat/*", "feature/*"]
docs:
  - changed-files:
      - any-glob-to-any-file: ["docs/**", "*.md"]
```

---

### 14. Lint Commit Messages

```yaml
name: Lint Commits

on:
  pull_request:

jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: wagoid/commitlint-github-action@v6
```

Enforces [Conventional Commits](https://www.conventionalcommits.org/) format. Use [DevPlaybook Git Commit Generator](https://devplaybook.cc/tools/git-commit-generator) to generate properly formatted commit messages.

---

### 15. Build Status Badge Updater

```yaml
name: Update Badge

on:
  push:
    branches: [main]

jobs:
  badge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci && npm test
      - name: Update README badge
        uses: schneegans/dynamic-badges-action@v1.7.0
        with:
          auth: ${{ secrets.GIST_SECRET }}
          gistID: YOUR_GIST_ID
          filename: badge.json
          label: tests
          message: passing
          color: brightgreen
```

---

## Generate Workflows Automatically

Instead of writing YAML from scratch, use [DevPlaybook GitHub Actions Generator](https://devplaybook.cc/tools/github-actions-generator) to generate workflow files by selecting your stack and requirements. It produces valid YAML you can drop directly into your repo.

For validating cron schedules, use [DevPlaybook Cron Validator](https://devplaybook.cc/tools/cron-validator) — cron syntax is notoriously hard to read.

---

## Common Mistakes

**Not caching dependencies.** Always use `cache: "npm"` or `cache: "pip"` — it cuts 2-3 minutes off every run.

**Using `actions/checkout` without `fetch-depth: 0`.** Some operations (changelog generation, tag-based logic) need full git history.

**Storing secrets in workflow YAML.** Everything in `secrets.*` is encrypted; never inline API keys or tokens.

**Not pinning action versions.** `actions/checkout@v4` is fine; `actions/checkout@main` is a supply chain risk.

---

**Need more workflow templates?** [DevPlaybook Pro](https://devplaybook.cc/pro) includes a full library of battle-tested CI/CD templates, plus AI-assisted workflow generation for your specific stack.
