---
title: "Code Quality Gates with SonarQube: Setup & CI Integration 2026"
description: "SonarQube code quality gates guide: Docker setup, quality gate rules, GitHub Actions integration, code coverage thresholds, tracking technical debt, and team enforcement."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["SonarQube", "code quality", "static analysis", "CI/CD", "technical debt", "code quality", "quality gates"]
readingTime: "8 min read"
category: "testing"
---

Code reviews catch logic errors. Linters catch style issues. But neither gives you a systematic, historical view of code quality trends — technical debt accumulation, security hotspots, declining test coverage. That's the job of a quality gate.

SonarQube is the industry-standard platform for this. A quality gate is a set of conditions that must pass before code merges. If new code introduces a blocker bug, drops coverage below 80%, or adds critical security vulnerabilities, the build fails — automatically, before it reaches production.

This guide walks through setting up SonarQube from scratch, connecting it to a Node.js/TypeScript project, and enforcing quality gates in GitHub Actions.

## What Is a Quality Gate?

A quality gate is a threshold-based pass/fail check on your code analysis. SonarQube's default "Sonar Way" gate fails if new code has:

- Coverage on new code below 80%
- Any blocker or critical bugs
- Any security vulnerabilities
- Technical debt ratio above 5%

The critical phrase is **"new code"**. SonarQube tracks a "new code period" (typically since last version or last 30 days), so the gate applies pressure to new changes without requiring you to fix all legacy issues on day one.

## Docker Compose Setup

The fastest way to run SonarQube locally or on a server is Docker.

```yaml
# docker-compose.yml
version: '3.8'

services:
  sonarqube:
    image: sonarqube:10-community
    container_name: sonarqube
    ports:
      - '9000:9000'
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://db:5432/sonar
      SONAR_JDBC_USERNAME: sonar
      SONAR_JDBC_PASSWORD: sonar
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
    depends_on:
      - db

  db:
    image: postgres:15
    container_name: sonarqube_db
    environment:
      POSTGRES_USER: sonar
      POSTGRES_PASSWORD: sonar
      POSTGRES_DB: sonar
    volumes:
      - postgresql_data:/var/lib/postgresql/data

volumes:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:
  postgresql_data:
```

**System prerequisite** — SonarQube requires `vm.max_map_count >= 524288`:

```bash
sudo sysctl -w vm.max_map_count=524288
# Make it permanent
echo "vm.max_map_count=524288" | sudo tee -a /etc/sysctl.conf
```

Start SonarQube:

```bash
docker compose up -d
```

Access `http://localhost:9000`. Default credentials: `admin` / `admin`. You'll be prompted to change the password on first login.

## Connecting a Node.js/TypeScript Project

**Step 1: Generate a project token**

In SonarQube UI: Administration → Security → Users → Tokens → Generate token. Copy the token — you'll only see it once.

**Step 2: Install sonar-scanner**

```bash
npm install -D sonarqube-scanner
```

**Step 3: Create `sonar-project.properties`**

```properties
# sonar-project.properties
sonar.projectKey=my-nodejs-api
sonar.projectName=My Node.js API
sonar.projectVersion=1.0

# Source directory
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.spec.ts
sonar.exclusions=**/node_modules/**,**/dist/**,**/*.d.ts

# TypeScript configuration
sonar.typescript.lcov.reportPaths=coverage/lcov.info

# Encoding
sonar.sourceEncoding=UTF-8
```

**Step 4: Add a scan script to `package.json`**

```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "sonar": "node -e \"const scanner = require('sonarqube-scanner'); scanner({ serverUrl: process.env.SONAR_HOST_URL, token: process.env.SONAR_TOKEN }, () => process.exit());\"",
    "quality-check": "npm run test:coverage && npm run sonar"
  }
}
```

**Step 5: Run analysis locally**

```bash
SONAR_HOST_URL=http://localhost:9000 \
SONAR_TOKEN=your_token_here \
npm run quality-check
```

After the scan completes, navigate to your project in the SonarQube UI to see the results.

## GitHub Actions Integration

For PR-level analysis with inline annotations, use the `sonarqube-scan-action`:

```yaml
# .github/workflows/quality-gate.yml
name: Code Quality Gate

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  sonarqube:
    name: SonarQube Analysis
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for accurate blame information

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

      - name: Check Quality Gate
        uses: SonarSource/sonarqube-quality-gate-action@master
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

Add these secrets in your GitHub repo: Settings → Secrets → Actions:
- `SONAR_TOKEN` — the token generated earlier
- `SONAR_HOST_URL` — your SonarQube server URL (or `https://sonarcloud.io` for SonarCloud)

When a PR is opened, SonarQube analyzes only the changed code and posts a PR decoration showing the quality gate status. If the gate fails, the GitHub check turns red.

## Configuring Quality Gate Rules

In SonarQube UI: Quality Gates → Create → Add conditions.

A recommended starting point for a TypeScript backend:

```
Conditions on New Code:
- Coverage < 80%             → FAILED
- Duplicated Lines (%) > 3%  → FAILED
- Blocker Issues > 0         → FAILED
- Critical Issues > 0        → FAILED
- Security Rating worse than A → FAILED
- Reliability Rating worse than A → FAILED
- Maintainability Rating worse than B → WARN
```

Set your gate as the default: Quality Gates → your gate → Set as Default. Then assign it to your project: Project Settings → Quality Gate.

## Reading SonarQube Reports

The project dashboard shows four key ratings, each graded A–E:

**Reliability** — Bug count and severity. An "A" rating means zero bugs. A single blocker bug drops you to "E".

**Security** — Vulnerability count. SQL injection, hardcoded credentials, insecure random number generation are common findings.

**Maintainability** — Technical debt in hours/days. Based on code smells: overly complex functions, duplicated code, unused variables. The debt ratio compares estimated fix time to total development time.

**Coverage** — Line and branch coverage from your test reports.

Example findings for a Node.js API:

```
Reliability:  A (0 bugs)
Security:     B (2 vulnerabilities - SQL query without parameterization)
Maintainability: A (4h debt - 3 complex functions, 1 duplicated block)
Coverage:     82.4% (new code: 91.2%)
```

Click any finding to see the exact file, line number, and a remediation explanation.

## SonarCloud for Open Source

If your project is open source, [SonarCloud](https://sonarcloud.io) is free. It's a hosted version of SonarQube with GitHub, GitLab, and Bitbucket integration built in. No Docker setup required.

Just connect your repository, and SonarCloud automatically detects your language and runs analysis on every push and PR.

For private projects, SonarCloud pricing is per-line-of-code. For small teams, self-hosted Community Edition (free) is often the better choice.

## Fixing Common Issues

**"Coverage report not found"** — The `lcov.info` path in `sonar-project.properties` must match where your test runner outputs coverage. For Vitest: `coverage/lcov.info`. For Jest with `--coverage`: `coverage/lcov.info`.

**"Quality Gate: FAILED" on first run** — This is expected if your project has existing issues. Use the "Previous Version" new code period (Administration → Configuration → Settings → New Code) to focus the gate on code written after a specific baseline.

**Duplicate code false positives** — Add generated files to exclusions:
```properties
sonar.exclusions=**/node_modules/**,**/dist/**,**/__generated__/**,**/*.d.ts
```

**Token authentication errors in CI** — Verify the token has "Execute Analysis" permission and hasn't expired. In newer SonarQube versions, use a project-scoped token rather than a user token for CI.

## Technical Debt Tracking Over Time

One of SonarQube's most underused features is trend analysis. The "Activity" tab on each project shows coverage, debt, and issue counts over time. Use this in sprint reviews: is technical debt growing or shrinking?

Set up a weekly Slack/Discord notification by using SonarQube's webhook feature (Administration → Configuration → Webhooks) to POST to your notification service when an analysis completes.

## Conclusion

Quality gates turn code quality from a vague aspiration into a concrete, automated enforcement mechanism. The investment is real: initial setup takes 2–4 hours, and fixing first-run findings takes longer. But once running, quality gates catch regressions automatically. Coverage stops quietly declining. Security issues get flagged before they reach production.

Start with SonarCloud if you want the fastest path to PR integration. Move to self-hosted Community Edition when you need more control or have private repositories at scale.
