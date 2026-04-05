---
title: "SonarQube — Continuous Code Quality & Security Analysis"
description: "Static code analysis and code quality platform — detect bugs, security vulnerabilities, and code smells across 30+ languages with quality gates that block bad code from merging."
category: "API Testing & CI/CD"
pricing: "Freemium"
pricingDetail: "Community Edition: free (self-hosted); Developer Edition from $150/year; Enterprise/Data Center custom; SonarCloud free for open source"
website: "https://www.sonarsource.com/products/sonarqube"
github: "https://github.com/SonarSource/sonarqube"
tags: [code-quality, static-analysis, security, testing, ci-cd, devops, open-source]
pros:
  - "Quality Gates: block PRs that introduce new bugs, vulnerabilities, or coverage drops"
  - "30+ languages supported including JS/TS, Python, Java, Go, C#"
  - "Security hotspot detection with OWASP/CWE categorization"
  - "PR decoration: inline comments on GitHub/GitLab/Bitbucket with issue details"
  - "Technical debt tracking: quantifies maintenance effort required"
cons:
  - "Community Edition lacks branch analysis (need Developer Edition for PR analysis)"
  - "Self-hosted setup requires dedicated infrastructure (Java + PostgreSQL)"
  - "Can produce false positives that require triage"
  - "SonarCloud (cloud version) requires paid tier for private repos"
date: "2026-04-02"
---

## Overview

SonarQube analyzes source code for bugs, vulnerabilities, code smells, and test coverage, then enforces quality standards through Quality Gates — configurable thresholds that fail CI when code quality drops below acceptable levels. It's the most widely adopted code quality platform in enterprise environments.

## Quick Start with Docker

```yaml
# docker-compose.yml
services:
  sonarqube:
    image: sonarqube:community
    ports:
      - "9000:9000"
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://db:5432/sonar
      SONAR_JDBC_USERNAME: sonar
      SONAR_JDBC_PASSWORD: sonar
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_logs:/opt/sonarqube/logs
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: sonar
      POSTGRES_PASSWORD: sonar
      POSTGRES_DB: sonar
    volumes:
      - postgresql_data:/var/lib/postgresql/data

volumes:
  sonarqube_data:
  sonarqube_logs:
  postgresql_data:
```

Access at `http://localhost:9000` (default login: `admin`/`admin`).

## Scanning a Project

```bash
# Install Sonar Scanner
npm install -g sonarqube-scanner

# sonar-project.properties
cat > sonar-project.properties << EOF
sonar.projectKey=my-project
sonar.projectName=My Project
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.spec.ts
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.tsconfigPath=tsconfig.json
EOF

# Run analysis (after npm test -- --coverage)
sonar-scanner \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=$SONAR_TOKEN
```

## GitHub Actions Integration

```yaml
name: SonarQube Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  sonar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for blame annotations

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm test -- --coverage

      - uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
        with:
          args: >
            -Dsonar.projectKey=my-project
            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
```

## Quality Gates

Quality Gates define pass/fail thresholds. Default "Sonar way" gate requires:

```
New Code conditions:
✅ Coverage ≥ 80%
✅ Duplicated Lines ≤ 3%
✅ Maintainability Rating = A
✅ Reliability Rating = A   (no new bugs)
✅ Security Rating = A      (no new vulnerabilities)
✅ Security Hotspots Reviewed = 100%
```

When a PR fails the Quality Gate, SonarQube decorates it with inline comments:

```
⚠️ SonarQube Quality Gate failed
  ❌ Coverage on new code (65.2%) is less than 80%
  ❌ 1 new Bug
  ✅ 0 new Vulnerabilities
  ✅ Duplications: 1.2%
```

## Custom Rules with SonarLint

Catch issues in your IDE before pushing:

```bash
# VS Code: install SonarLint extension
# Connect to your SonarQube instance for synchronized rules:
# Settings > SonarLint > Connected Mode > Add Connection
```

SonarLint in connected mode uses your project's custom rule profiles, ensuring local analysis matches CI results.
