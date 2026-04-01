---
title: "DevSecOps Tools Checklist 2026: 20 Essential Tools for Shift-Left Security"
description: "Complete DevSecOps tools checklist for 2026. 20 essential SAST, DAST, SCA, secrets scanning, and container security tools with free/open-source options."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["devsecops", "security", "sast", "dast", "devops", "shift-left", "vulnerability-scanning"]
readingTime: "13 min read"
---

Security vulnerabilities caught in production cost 30x more to fix than those caught during development. "Shift-left security" — moving security testing earlier in the development lifecycle — is the core principle of DevSecOps. In 2026, the tooling ecosystem has matured to the point where every team, regardless of size, can integrate automated security scanning into their CI/CD pipeline without a dedicated security engineer.

This checklist covers 20 essential tools across 5 categories, with GitHub Actions integration snippets and free tier information for each.

---

## What Is Shift-Left Security?

Traditional security (shift-right) meant running penetration tests before a production release — an expensive, slow feedback loop. Shift-left moves security checks to:

1. **Developer workstation** — pre-commit hooks, IDE plugins
2. **Pull request / merge request** — automated scanning on every code change
3. **CI/CD pipeline** — build-time security gates
4. **Container registry** — image scanning before deployment
5. **Production** — runtime protection (RASP, CSPM)

The goal: make security fast, automated, and part of the normal development workflow — not an afterthought.

---

## Category 1: SAST — Static Application Security Testing

SAST analyzes source code without executing it, finding vulnerabilities like SQL injection, XSS, insecure deserialization, and hardcoded credentials.

### 1. Semgrep

**What it does:** Pattern-based static analysis supporting 30+ languages. Write custom rules in YAML or use 5,000+ community rules. Semgrep OSS is free and open-source; Semgrep AppSec Platform adds managed rules and triage workflows.

**Free tier:** OSS core is fully free. Cloud platform has a free tier for individual developers.

**GitHub Actions integration:**

```yaml
# .github/workflows/semgrep.yml
name: Semgrep SAST

on:
  pull_request: {}
  push:
    branches: [main]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep
    steps:
      - uses: actions/checkout@v4

      - name: Run Semgrep
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
        run: |
          semgrep ci \
            --config=auto \
            --sarif \
            --output=semgrep.sarif

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep.sarif
```

**Custom rule example (find hardcoded AWS keys):**

```yaml
# semgrep-rules/aws-hardcoded-key.yml
rules:
  - id: hardcoded-aws-access-key
    patterns:
      - pattern: |
          "$KEY"
      - metavariable-regex:
          metavariable: $KEY
          regex: 'AKIA[0-9A-Z]{16}'
    message: "Hardcoded AWS Access Key detected: $KEY"
    languages: [python, javascript, typescript, go, java]
    severity: ERROR
```

---

### 2. CodeQL

**What it does:** GitHub's semantic code analysis engine. Treats code as data and uses SQL-like queries (QL) to find security vulnerabilities. Particularly strong for compiled languages (C/C++, Java, Go).

**Free tier:** Free for public repositories. Included in GitHub Advanced Security for enterprises.

**GitHub Actions integration:**

```yaml
name: CodeQL Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 6 * * 1"   # Weekly scan on Monday

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read

    strategy:
      matrix:
        language: [javascript-typescript, python, go]

    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: security-and-quality

      - name: Auto-build
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{ matrix.language }}"
```

---

### 3. SonarQube / SonarCloud

**What it does:** Comprehensive code quality and security platform. Detects bugs, code smells, and security hotspots. Provides a "Quality Gate" that can fail CI if thresholds aren't met.

**Free tier:** SonarCloud is free for public repositories. SonarQube Community Edition is free for self-hosted.

**GitHub Actions integration:**

```yaml
- name: SonarCloud Scan
  uses: SonarSource/sonarcloud-github-action@master
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
  with:
    args: >
      -Dsonar.projectKey=my-org_my-project
      -Dsonar.organization=my-org
      -Dsonar.sources=src
      -Dsonar.tests=tests
      -Dsonar.python.coverage.reportPaths=coverage.xml
```

---

## Category 2: DAST — Dynamic Application Security Testing

DAST tests a running application by sending attack payloads, simulating what a real attacker would do.

### 4. OWASP ZAP (Zed Attack Proxy)

**What it does:** The most widely used open-source DAST tool. Intercepts HTTP/HTTPS traffic, crawls the application, and runs active/passive security scans. Detects OWASP Top 10 vulnerabilities.

**Free tier:** Fully free and open-source.

**GitHub Actions integration:**

```yaml
- name: OWASP ZAP Full Scan
  uses: zaproxy/action-full-scan@v0.10.0
  with:
    target: "https://staging.example.com"
    rules_file_name: ".zap/rules.tsv"
    cmd_options: "-a"
    issue_title: "ZAP Full Scan Report"
    fail_action: true   # Fail CI if HIGH severity alerts found
    artifact_name: "zap-report"
```

**ZAP rules configuration (`.zap/rules.tsv`):**

```tsv
# Rule ID	Action	Reason
10016	IGNORE	Temporary: Missing Anti-CSRF Tokens (known false positive for our SPA)
10021	WARN	X-Content-Type-Options Header Missing
10038	FAIL	Content Security Policy Header Not Set
```

---

### 5. Burp Suite CI/CD (Enterprise)

**What it does:** Professional DAST platform with a CI-compatible scanner. More thorough than OWASP ZAP for complex authentication flows, multi-step processes, and modern SPAs.

**Free tier:** No free tier. Burp Suite Professional ($449/year) includes some CI integration. Enterprise Edition is required for full pipeline integration.

**Best for:** Teams with a dedicated security budget that need deep scanning of complex authenticated web applications.

---

## Category 3: SCA — Software Composition Analysis

SCA scans your dependencies (open-source libraries) for known CVEs.

### 6. Snyk

**What it does:** Scans dependencies in package.json, requirements.txt, go.mod, pom.xml, etc. for CVEs. Also offers container scanning, IaC scanning, and code scanning. Excellent developer experience with fix PRs.

**Free tier:** Free for open-source projects and individuals (up to 200 tests/month for private repos).

**GitHub Actions integration:**

```yaml
- name: Run Snyk to check for vulnerabilities
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high --fail-on=upgradable
    command: test

- name: Upload SARIF to GitHub Security
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: snyk.sarif
```

---

### 7. Dependabot

**What it does:** GitHub's built-in automated dependency update bot. Creates PRs to update vulnerable dependencies. Integrated with GitHub Security Advisories database.

**Free tier:** Free for all GitHub repositories.

**Configuration (`.github/dependabot.yml`):**

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "security"
      - "dependencies"
    ignore:
      - dependency-name: "lodash"
        versions: ["4.x"]   # Known incompatibility

  - package-ecosystem: "pip"
    directory: "/backend"
    schedule:
      interval: "daily"
    target-branch: "develop"

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

### 8. OWASP Dependency-Check

**What it does:** Scans project dependencies and identifies known CVEs using the NVD (National Vulnerability Database). Supports Java, .NET, JavaScript, Python, Ruby, PHP, and more.

**Free tier:** Fully free and open-source.

**GitHub Actions integration:**

```yaml
- name: OWASP Dependency-Check
  uses: dependency-check/Dependency-Check_Action@main
  with:
    project: "my-project"
    path: "."
    format: "HTML,SARIF"
    out: "reports"
    args: >
      --failOnCVSS 7
      --enableRetired
      --nvdApiKey ${{ secrets.NVD_API_KEY }}

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: reports/dependency-check-report.sarif
```

---

## Category 4: Secrets Scanning

Hard-coded secrets (API keys, passwords, tokens) in source code are one of the most common and dangerous security mistakes.

### 9. GitLeaks

**What it does:** Fast secrets scanner for git repositories. Detects 150+ secret patterns (AWS keys, GitHub tokens, Stripe keys, private keys, etc.) using regex and entropy analysis. Can scan commit history, not just the current state.

**Free tier:** Fully free and open-source.

**GitHub Actions integration:**

```yaml
- name: GitLeaks Secret Scan
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}   # Optional: for Teams features
```

**Custom configuration (`.gitleaks.toml`):**

```toml
title = "Custom GitLeaks Config"

[[rules]]
id = "custom-internal-api-key"
description = "Internal API key pattern"
regex = '''MYAPP_[A-Z0-9]{32}'''
tags = ["api-key", "internal"]
severity = "critical"

[allowlist]
description = "Allowlist known test credentials"
regexes = [
  '''EXAMPLE_KEY_FOR_TESTING''',
]
paths = [
  "tests/fixtures/.*",
]
```

---

### 10. TruffleHog

**What it does:** Deep secret scanning using both regex patterns and entropy analysis. Particularly good at finding secrets in git history and across branches. TruffleHog v3 has 700+ detectors with validation (actually checks if the credential is live).

**Free tier:** Open-source core is free. TruffleHog Enterprise adds more detectors.

**GitHub Actions integration:**

```yaml
- name: TruffleHog Secrets Scan
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
    extra_args: --only-verified --fail
```

---

### 11. detect-secrets (Yelp)

**What it does:** Pre-commit focused secrets detection from Yelp Engineering. Maintains a `.secrets.baseline` file of known acceptable secrets, reducing false positives. Integrates with pre-commit hooks.

**Free tier:** Fully free and open-source.

**Pre-commit configuration (`.pre-commit-config.yaml`):**

```yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args:
          - "--baseline"
          - ".secrets.baseline"
          - "--exclude-files"
          - ".*test.*"
```

```bash
# Initialize baseline (audit existing findings first)
detect-secrets scan > .secrets.baseline
detect-secrets audit .secrets.baseline

# Run scan
detect-secrets scan --baseline .secrets.baseline
```

---

## Category 5: Container and IaC Security

### 12. Trivy (Aqua Security)

**What it does:** Comprehensive vulnerability scanner for containers, filesystems, git repos, Kubernetes manifests, and IaC. Finds OS package CVEs, language-specific CVEs, misconfigurations, and secrets. Fast and easy to use.

**Free tier:** Fully free and open-source.

**GitHub Actions integration:**

```yaml
- name: Build Docker image
  run: docker build -t myapp:${{ github.sha }} .

- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: "myapp:${{ github.sha }}"
    format: "sarif"
    output: "trivy-results.sarif"
    severity: "CRITICAL,HIGH"
    exit-code: "1"
    ignore-unfixed: true

- name: Upload Trivy scan results to GitHub Security
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: "trivy-results.sarif"
```

---

### 13. Checkov (Bridgecrew/Palo Alto)

**What it does:** IaC security scanner for Terraform, CloudFormation, ARM, Kubernetes manifests, Helm charts, Dockerfiles, and more. 1,000+ built-in policies. Finds misconfigurations like public S3 buckets, unrestricted security groups, missing encryption.

**Free tier:** Fully free and open-source.

**GitHub Actions integration:**

```yaml
- name: Checkov IaC Scan
  uses: bridgecrewio/checkov-action@master
  with:
    directory: infrastructure/
    framework: terraform
    output_format: sarif
    output_file_path: checkov-results.sarif
    soft_fail: false
    skip_check: CKV_AWS_18,CKV_AWS_21   # Skip specific checks
    check: CKV_AWS_2,CKV_AWS_3           # Run only specific checks
```

---

### 14. Hadolint

**What it does:** Dockerfile linter that checks for best practices and security issues. Catches problems like running as root, using `latest` tags, not using COPY over ADD, and missing `--no-cache` in apt-get.

**Free tier:** Fully free and open-source.

**GitHub Actions integration:**

```yaml
- name: Hadolint Dockerfile Linting
  uses: hadolint/hadolint-action@v3.1.0
  with:
    dockerfile: Dockerfile
    format: sarif
    output-file: hadolint-results.sarif
    no-fail: false
    ignore: DL3018   # Ignore specific rule
```

**Inline rule suppression:**

```dockerfile
# hadolint ignore=DL3008
RUN apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*
```

---

### 15. Grype (Anchore)

**What it does:** Fast container vulnerability scanner with support for SBOM (Software Bill of Materials) generation via Syft. Excellent for multi-arch images and offline scanning.

**Free tier:** Fully free and open-source.

```yaml
- name: Scan with Grype
  uses: anchore/scan-action@v3
  with:
    image: "myapp:${{ github.sha }}"
    fail-build: true
    severity-cutoff: high
    output-format: sarif
```

---

## Bonus Tools (5 More Worth Knowing)

| Tool | Category | What it does | Free |
|---|---|---|---|
| **Bandit** | SAST | Python-specific security scanner | Yes (OSS) |
| **ESLint Security Plugin** | SAST | JavaScript/TypeScript security rules | Yes (OSS) |
| **Falco** | Runtime | Kubernetes runtime security (syscall monitoring) | Yes (OSS) |
| **Prowler** | Cloud CSPM | AWS/Azure/GCP security posture scanning | Yes (OSS) |
| **KICS** | IaC | Infrastructure code security scanner (Checkmarx) | Yes (OSS) |

---

## Implementation Priority Checklist

Use this checklist to roll out DevSecOps tooling incrementally. Start with the highest ROI, lowest friction tools first.

### Phase 1: Quick Wins (Week 1-2)

- [ ] Add **Dependabot** for automated dependency updates (zero configuration)
- [ ] Add **GitLeaks** or **TruffleHog** to block new secrets from entering the repo
- [ ] Add **Hadolint** if your team uses Dockerfiles
- [ ] Add **Trivy** container scanning to your build pipeline

### Phase 2: Code Scanning (Week 3-4)

- [ ] Enable **CodeQL** on GitHub (free for public repos)
- [ ] Add **Semgrep** with default `auto` ruleset to PRs
- [ ] Configure **detect-secrets** as a pre-commit hook across the team

### Phase 3: Dependency and IaC Security (Week 5-6)

- [ ] Add **Snyk** or **OWASP Dependency-Check** for deeper SCA
- [ ] Add **Checkov** to your Terraform/Kubernetes pipelines
- [ ] Set up SARIF upload to GitHub Security to centralize findings

### Phase 4: Dynamic Testing (Week 7-8)

- [ ] Set up **OWASP ZAP** against your staging environment on every deployment
- [ ] Configure Quality Gates: fail CI on CRITICAL/HIGH severity unresolved findings
- [ ] Establish a vulnerability triage workflow (who reviews, SLAs by severity)

### Phase 5: Mature Program (Ongoing)

- [ ] Track **Mean Time to Remediate (MTTR)** by severity
- [ ] Add custom **Semgrep rules** for your application-specific patterns
- [ ] Implement **Falco** for production runtime security monitoring
- [ ] Run periodic **Prowler** scans for cloud misconfiguration drift

---

## Security Gate Thresholds (Recommended)

| Severity | CI/CD Action | Remediation SLA |
|---|---|---|
| Critical | Block merge immediately | 24 hours |
| High | Block merge | 7 days |
| Medium | Warn (non-blocking) | 30 days |
| Low | Report only | 90 days |
| Informational | Report only | Best effort |

---

## Conclusion

Shift-left security doesn't require a dedicated security team. With the 20 tools in this checklist, you can automate the detection of the vast majority of common vulnerabilities — SQL injection, XSS, hardcoded secrets, vulnerable dependencies, misconfigured containers, and insecure IaC — directly in your CI/CD pipeline.

Start with Phase 1. Add Dependabot and secrets scanning today. It takes under an hour and immediately reduces your risk surface. Each subsequent phase builds on the last, progressively hardening your pipeline without disrupting developer velocity.

The best security tool is the one your team actually runs on every commit.
