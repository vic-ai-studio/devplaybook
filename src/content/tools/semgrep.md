---
title: "Semgrep — Static Analysis & SAST for Modern Engineering Teams"
description: "Semgrep is a fast, open-source static analysis tool that finds bugs and security issues using pattern-based rules. Write rules in the same language as your code — no DSL required."
category: "Security"
pricing: "Free / Paid"
pricingDetail: "Semgrep OSS is free. Semgrep Code (SAST) starts at $40/developer/month. AppSec Platform includes Supply Chain and Secrets."
website: "https://semgrep.dev"
github: "https://github.com/semgrep/semgrep"
tags: ["security", "sast", "static-analysis", "code-quality", "devsecops", "ci-cd", "vulnerability-scanning"]
pros:
  - "Intuitive rule syntax: rules look like the code they match — easy to write and understand"
  - "Fast: analyzes entire codebases in seconds with inter-file analysis"
  - "Massive rule registry: 3,000+ community and security research rules"
  - "Multi-language: 30+ languages including Python, JS/TS, Go, Java, Ruby, PHP, Rust"
  - "Taint analysis: tracks data flow from untrusted sources to dangerous sinks"
cons:
  - "Some advanced analysis features require paid tier"
  - "Can produce false positives that require annotation/suppression"
  - "Inter-procedural analysis is less mature than commercial tools"
  - "Configuration and rule management complexity at scale"
date: "2026-04-02"
---

## What is Semgrep?

Semgrep is a static analysis tool that finds bugs, security vulnerabilities, and code quality issues using pattern matching. What makes Semgrep unique is that rules are written using patterns that look almost exactly like the code they're searching for — no complex DSL or regex required.

This makes Semgrep rules unusually readable and writable. A security engineer who knows Python can write a Semgrep rule for Python vulnerabilities without learning a separate query language.

## Quick Start

```bash
# Install Semgrep
pip install semgrep
# Or via Homebrew
brew install semgrep

# Scan with the auto configuration (curated default rules)
semgrep --config auto .

# Scan with specific rulesets
semgrep --config p/security-audit .
semgrep --config p/owasp-top-ten .
semgrep --config p/nodejs .

# Output results as JSON
semgrep --config auto --json -o results.json .
```

## Writing Custom Rules

Semgrep rules are written in YAML and use pattern matching:

```yaml
rules:
  - id: hardcoded-jwt-secret
    patterns:
      - pattern: |
          jwt.sign($PAYLOAD, "$SECRET", ...)
      - pattern-not: |
          jwt.sign($PAYLOAD, process.env.$ENV_VAR, ...)
    message: >
      Hardcoded JWT secret found. Use environment variables for secrets.
      Found: $SECRET
    severity: ERROR
    languages: [javascript, typescript]
    metadata:
      cwe: CWE-798
      owasp: "A07:2021 - Identification and Authentication Failures"
```

### Pattern Matching Examples

```yaml
# Match SQL injection patterns
- id: sql-injection-risk
  patterns:
    - pattern: |
        db.query("... " + $USER_INPUT + " ...")
    - pattern: |
        db.query(`... ${$USER_INPUT} ...`)
  message: "Potential SQL injection: user input in query string"
  severity: ERROR
  languages: [javascript, typescript, python]

# Match insecure random number generation
- id: insecure-random
  pattern: Math.random()
  message: "Math.random() is not cryptographically secure"
  severity: WARNING
  languages: [javascript, typescript]
  fix: crypto.randomBytes(16).toString('hex')

# Taint tracking: user input → dangerous function
- id: path-traversal
  mode: taint
  pattern-sources:
    - pattern: req.params.$INPUT
    - pattern: req.query.$INPUT
  pattern-sinks:
    - pattern: fs.readFile($PATH, ...)
    - pattern: path.join($BASE, $PATH)
  message: "Path traversal: user input used in file path"
  severity: ERROR
  languages: [javascript]
```

## Rule Registry

Semgrep has a public registry of 3,000+ rules at semgrep.dev/r:

```bash
# Run OWASP Top 10 rules
semgrep --config p/owasp-top-ten .

# Language-specific security rules
semgrep --config p/python .
semgrep --config p/javascript .
semgrep --config p/golang .
semgrep --config p/java .
semgrep --config p/ruby .

# Framework-specific rules
semgrep --config p/react .
semgrep --config p/django .
semgrep --config p/express .

# Corporate best practices
semgrep --config p/secrets .
semgrep --config p/jwt .
semgrep --config p/sql-injection .
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Semgrep Scan
on:
  push:
    branches: [main]
  pull_request:

jobs:
  semgrep:
    runs-on: ubuntu-latest
    container:
      image: returntocorp/semgrep
    steps:
      - uses: actions/checkout@v4
      - name: Run Semgrep
        run: |
          semgrep \
            --config auto \
            --sarif \
            --output semgrep-results.sarif \
            .
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep-results.sarif
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/semgrep/semgrep
    rev: v1.50.0
    hooks:
      - id: semgrep
        args: ['--config', 'p/secrets', '--error']
```

## Suppressing False Positives

```python
# nosemgrep: hardcoded-jwt-secret
JWT_TEST_SECRET = "test-secret-for-unit-tests-only"

# Or inline comment
password = "example"  # nosemgrep: hardcoded-password
```

## Taint Analysis for Data Flow

Semgrep's taint mode tracks untrusted data from sources to sinks:

```yaml
- id: xss-react
  mode: taint
  pattern-sources:
    - patterns:
      - pattern: this.props.$PROP
      - pattern: useParams().$PARAM
  pattern-sinks:
    - patterns:
      - pattern: dangerouslySetInnerHTML={{ __html: $SINK }}
  message: "XSS: user-controlled data in dangerouslySetInnerHTML"
  severity: ERROR
  languages: [javascript, typescript]
```

## Semgrep vs Other SAST Tools

| Feature | Semgrep | SonarQube | CodeQL |
|---------|---------|-----------|--------|
| Rule language | Intuitive patterns | XPath-like | Custom QL |
| Speed | Very fast | Slow | Slow |
| Custom rules | Easy | Moderate | Complex |
| Taint analysis | Good | Good | Excellent |
| Price | Free tier | Free (Community) | Free for OSS |
| CI integration | Easy | Moderate | Easy |

Semgrep is the best choice for teams that want to write custom security rules quickly. CodeQL offers more powerful analysis but has a much steeper learning curve.
