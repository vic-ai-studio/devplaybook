---
title: "GitHub Actions"
description: "GitHub's built-in CI/CD — automate build, test, and deploy workflows triggered by GitHub events with 20,000+ community actions in the marketplace."
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

## Concrete Use Case: Building a Multi-Stage Release Pipeline with Deployment Gates for a SaaS Platform

A DevOps team at a B2B SaaS company is replacing an aging Jenkins setup with GitHub Actions. Their existing CI pipeline runs tests sequentially (45 minutes end-to-end) with no parallel stages, no deployment gates, and no automated rollback. The new pipeline needs to run lint/type-check in parallel with tests, gate production deploys behind a staging verification step, require manual approval for production, and auto-rollback on health check failure — all against their existing AWS ECS Fargate infrastructure.

The team builds a three-workflow system. The `ci.yml` workflow runs on every PR: lint and type-checking run as one job, unit tests as a second parallel job split across four runners using a matrix strategy, and integration tests as a third job requiring the first two to pass. Total runtime drops from 45 minutes to 14 minutes. For deploys, a separate `deploy.yml` triggers on merge to `main`. It uses OIDC to authenticate to AWS without storing static credentials (`aws-actions/configure-aws-credentials@v4` with a role ARN), builds and pushes the Docker image to ECR, deploys to staging ECS, then runs a health-check job that polls the staging load balancer for five minutes. Only after the staging health check passes does the workflow surface a manual approval gate using GitHub Environments with a required reviewer — the on-call engineer must approve before the workflow continues to the production deploy job.

The rollback mechanism uses a `workflow_dispatch` trigger with a `version` input: the on-call engineer triggers a rollback from the GitHub Actions UI in 90 seconds by entering the previous image tag. The team also adds `concurrency: { group: deploy-production, cancel-in-progress: false }` to prevent concurrent production deploys when multiple PRs merge quickly. Within the first month, two incidents that previously required manual AWS console intervention are resolved via the rollback workflow without waking up a second engineer.

## When to Use GitHub Actions

**Use GitHub Actions when:**
- Your source code is hosted on GitHub and you want zero-friction CI/CD with no separate account setup, webhook configuration, or auth management
- You need a large library of pre-built integrations — the 20,000+ marketplace actions cover AWS, GCP, Azure, Docker, Kubernetes, Slack, and virtually every tool in the modern stack
- Your team wants matrix builds to test against multiple runtime versions in parallel, reducing CI time without managing separate CI configuration
- You want keyless cloud authentication via OIDC, eliminating the need to store long-lived cloud credentials as GitHub secrets

**When NOT to use GitHub Actions:**
- Your code lives on GitLab, Bitbucket, or an on-premises VCS — GitLab CI or Jenkins will integrate more naturally
- You need complex cross-repository pipeline orchestration — Tekton or dedicated pipeline orchestrators handle this more cleanly
- Strict compliance requirements mandate that CI/CD infrastructure runs on self-hosted, airgapped runners with full audit control over every execution environment
