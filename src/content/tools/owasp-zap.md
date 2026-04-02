---
title: "OWASP ZAP — Web Application Security Scanner"
description: "OWASP ZAP (Zed Attack Proxy) is the world's most widely used open-source web application security scanner. It finds vulnerabilities in web apps through active scanning, passive analysis, and manual testing."
category: "Security"
pricing: "Free / Open Source"
pricingDetail: "OWASP ZAP is 100% free and open-source (Apache 2.0). Maintained by OWASP and a global community."
website: "https://www.zaproxy.org"
github: "https://github.com/zaproxy/zaproxy"
tags: ["security", "dast", "web-security", "penetration-testing", "owasp", "vulnerability-scanning", "api-security"]
pros:
  - "Best-in-class DAST: finds real vulnerabilities in running applications (XSS, SQLi, etc.)"
  - "Free and open-source — enterprise-grade web security testing without licensing costs"
  - "Built-in automation mode for CI/CD integration with Docker and GitHub Actions"
  - "Huge community, extensive documentation, and active development"
  - "REST API for programmatic control — automate complex scan workflows"
cons:
  - "Active scanning can disrupt staging environments if not carefully targeted"
  - "GUI is dated and complex for beginners"
  - "False positive rate requires manual verification for CI gates"
  - "Modern SPAs and JavaScript-heavy apps require additional configuration"
date: "2026-04-02"
---

## What is OWASP ZAP?

OWASP ZAP (Zed Attack Proxy) is the world's most widely used free security tool for finding vulnerabilities in web applications. It's both an intercepting proxy (like Burp Suite) for manual testing and an automated scanner that can be integrated into CI/CD pipelines.

ZAP finds vulnerabilities from the OWASP Top 10 and beyond:
- SQL injection
- Cross-site scripting (XSS)
- Broken authentication
- Sensitive data exposure
- Security misconfigurations
- Insecure direct object references

## Quick Start

```bash
# Run ZAP in Docker (automated scan)
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-staging-app.example.com \
  -r zap-report.html

# Full scan (more thorough, longer)
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t https://your-staging-app.example.com \
  -r zap-report.html

# API scan
docker run -t owasp/zap2docker-stable zap-api-scan.py \
  -t https://api.example.com/openapi.json \
  -f openapi \
  -r api-scan-report.html
```

## Scan Types

### Baseline Scan
Passive scan only — no active attacks. Finds obvious misconfigurations and security headers. Safe for production (no dangerous requests):

```bash
zap-baseline.py -t https://app.example.com \
  -J baseline-report.json \
  -I  # Ignore warnings (only fail on alerts)
```

### Full Scan
Active scanning — attempts actual attack payloads. Use only on staging/test environments:

```bash
zap-full-scan.py -t https://staging.example.com \
  -J full-scan-report.json \
  -m 10  # Max crawl time in minutes
```

### API Scan
Targeted at REST APIs using OpenAPI/Swagger or GraphQL schemas:

```bash
zap-api-scan.py \
  -t https://api.example.com/openapi.yaml \
  -f openapi \
  -J api-report.json \
  -d  # Enable debug output
```

## CI/CD Integration

### GitHub Actions

```yaml
name: ZAP Security Scan
on:
  push:
    branches: [main]

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Start test application
        run: docker-compose up -d

      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          fail_action: false  # Set true to fail on findings

      - name: Upload ZAP Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: zap-report
          path: report_html.html
```

### GitLab CI

```yaml
zap-scan:
  image: owasp/zap2docker-stable
  stage: security
  script:
    - zap-baseline.py -t $STAGING_URL -J zap-report.json
  artifacts:
    reports:
      security: zap-report.json
    paths:
      - zap-report.json
  allow_failure: true
```

## Automation Framework

ZAP 2.x introduced the Automation Framework — YAML-based scan configuration:

```yaml
# zap-automation.yaml
env:
  contexts:
    - name: "My App"
      urls:
        - "https://staging.example.com"
      includePaths:
        - "https://staging.example.com/api/.*"
      excludePaths:
        - "https://staging.example.com/logout"

jobs:
  - type: passiveScan-config
    parameters:
      maxAlertsPerRule: 10

  - type: spider
    parameters:
      maxDuration: 5  # minutes

  - type: activeScan
    parameters:
      maxRuleDurationInMins: 5

  - type: report
    parameters:
      template: "modern"
      reportDir: "/reports"
      reportFile: "zap-report"
```

```bash
# Run with automation framework
docker run -v $(pwd):/zap/wrk:rw \
  owasp/zap2docker-stable \
  zap.sh -cmd -autorun /zap/wrk/zap-automation.yaml
```

## Managing False Positives

Control which rules run and their alert levels:

```
# .zap/rules.tsv
# Rule ID  Action  Parameter
10016  IGNORE  # Web Browser XSS Protection Not Enabled (legacy header)
10020  IGNORE  # X-Frame-Options Header
10021  WARN    # X-Content-Type-Options Header Missing
```

## Authenticated Scanning

ZAP supports multiple authentication methods for scanning behind login:

```yaml
# Form-based authentication
authentication:
  method: "form"
  parameters:
    loginUrl: "https://app.example.com/login"
    loginRequestData: "username={%username%}&password={%password%}"

users:
  - name: testuser
    credentials:
      username: test@example.com
      password: testpassword
```

ZAP is the go-to tool for DAST (Dynamic Application Security Testing) when you need to understand what vulnerabilities actually exist in your running application — not just in your source code.
