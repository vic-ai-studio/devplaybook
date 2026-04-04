---
title: "GitHub Actions"
description: "GitHub's built-in CI/CD platform — automate build, test, and deployment workflows triggered by GitHub events with 20,000+ community-built actions in the marketplace."
category: "API Testing & CI/CD"
pricing: "Freemium"
pricingDetail: "Free: 2,000 minutes/month (public repos unlimited); Pro $4/month includes more minutes; self-hosted runners are free"
website: "https://github.com/features/actions"
github: "https://github.com/actions"
tags: [ci-cd, automation, github, devops, deployment, testing, workflows]
pros:
  - "Zero setup for GitHub projects — native integration"
  - "20,000+ marketplace actions for common integrations"
  - "Matrix builds: test against multiple versions in parallel"
  - "Self-hosted runners for private infrastructure or specialized hardware"
  - "OIDC for keyless cloud authentication (AWS, GCP, Azure)"
cons:
  - "Vendor lock-in to GitHub (syntax not portable to other CI systems)"
  - "Limited debugging — must push to see run results"
  - "Large workflows can be hard to maintain"
  - "Free tier minutes limited for private repos"
date: "2026-04-02"
---

## Overview

GitHub Actions is the most widely used CI/CD platform in 2026, largely because it's built into GitHub — no separate account, no separate auth, no webhook setup. If your code is on GitHub, Actions is zero-friction to adopt.

## Basic CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test -- --coverage

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
```

## Matrix Builds

```yaml
jobs:
  test:
    strategy:
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
      fail-fast: false  # Don't cancel all if one fails

    runs-on: ${{ matrix.os }}
    name: Node ${{ matrix.node }} on ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci && npm test
```

## Deployment with OIDC (No Secrets)

```yaml
jobs:
  deploy:
    permissions:
      id-token: write  # Enable OIDC
      contents: read

    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GitHubDeploy
          aws-region: us-east-1
          # No AWS_SECRET_ACCESS_KEY needed! OIDC handles auth

      - run: aws s3 sync ./dist s3://my-bucket/
```

## Reusable Workflows

```yaml
# .github/workflows/deploy-shared.yml
on:
  workflow_call:
    inputs:
      environment:
        type: string
        required: true

jobs:
  deploy:
    environment: ${{ inputs.environment }}
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying to ${{ inputs.environment }}"

# Caller workflow
- uses: ./.github/workflows/deploy-shared.yml
  with:
    environment: production
```

## Caching

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      .turbo
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: ${{ runner.os }}-node-
```

## Tips & Best Practices

- **Pin action versions to a full SHA**, not a floating tag like `@v4`. Tags can be force-pushed by the action author; a SHA is immutable. Use tools like `dependabot` or `renovate` to keep pins up to date automatically.

- **Use `concurrency` groups to cancel redundant runs.** When a developer pushes multiple commits quickly, you usually only want the latest run to finish. Add `concurrency: { group: ${{ github.ref }}, cancel-in-progress: true }` at the workflow level to avoid wasting minutes on stale commits.

- **Separate fast checks from slow ones.** Put lint and type-check in an early job that runs in ~60 seconds. Only run full integration tests in later jobs that depend on the fast job passing. Developers get signal faster and you don't waste runner time on code that doesn't even compile.

- **Use `if: always()` on artifact uploads and notification steps.** Without it, a test failure will skip your coverage upload or Slack notification, leaving you without the artifacts you need to diagnose the failure.

- **Store secrets in GitHub Environments, not repo-level secrets.** Environments let you require manual approval before a job can access production credentials, add deployment protection rules, and get per-environment audit logs. This is especially important for production deploy jobs.
