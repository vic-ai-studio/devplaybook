---
title: "TruffleHog — Secret Scanning for Git Repos & CI/CD"
description: "TruffleHog finds leaked credentials, API keys, and secrets in Git history, code, and CI/CD pipelines. It uses entropy analysis and 700+ regex detectors to surface real secrets with verified status."
category: "Security"
pricing: "Free / Open Source"
pricingDetail: "TruffleHog OSS is free and open-source (AGPL-3.0). TruffleHog Enterprise adds real-time scanning, dashboards, and SaaS."
website: "https://trufflesecurity.com/trufflehog"
github: "https://github.com/trufflesecurity/trufflehog"
tags: ["security", "secrets-scanning", "git", "ci-cd", "credentials", "devsecops", "api-keys"]
pros:
  - "Secret verification: actively validates secrets against provider APIs (real or revoked?)"
  - "700+ detectors covering AWS, GitHub, Slack, Stripe, GCP, Azure, and hundreds more"
  - "Git history scanning: finds secrets committed years ago and since deleted"
  - "Fast: parallelized scanning handles large repos quickly"
  - "Active false positive reduction through verified vs unverified distinction"
cons:
  - "Active verification sends requests to external APIs (may be undesirable in air-gapped environments)"
  - "AGPL license requires sharing modifications (use Enterprise for proprietary integrations)"
  - "Can produce noise on codebases with test credentials"
  - "No native fix automation — reporting only"
date: "2026-04-02"
---

## What is TruffleHog?

TruffleHog is a secrets scanning tool that finds leaked credentials, API keys, tokens, and other secrets in your code, Git history, and CI/CD pipelines. It was originally built around entropy analysis (high-entropy strings = likely secrets), but modern TruffleHog uses 700+ detector patterns for specific credential types — and uniquely, it *verifies* detected secrets by testing them against provider APIs.

The verification step is crucial: it tells you whether a detected secret is active (immediate response required) or already revoked (lower priority).

## Quick Start

```bash
# Install TruffleHog
brew install trufflesecurity/trufflehog/trufflehog
# Or via Docker
docker pull trufflesecurity/trufflehog:latest

# Scan a Git repository (including full history)
trufflehog git https://github.com/myorg/myapp --only-verified

# Scan local directory
trufflehog filesystem --directory /path/to/codebase

# Scan GitHub organization
trufflehog github --org myorg --only-verified

# Scan stdin / pipe
cat my-config.env | trufflehog stdin

# Scan Docker image
trufflehog docker --image nginx:latest
```

## Scanning Modes

### Git History Scan

TruffleHog's most powerful feature — scans every commit in a repo's history:

```bash
# Full history scan (finds deleted secrets)
trufflehog git https://github.com/myorg/myapp \
  --since-commit HEAD~100 \  # Last 100 commits
  --only-verified \           # Only show active secrets
  --json                      # Machine-readable output
```

Example finding:
```json
{
  "SourceMetadata": {
    "Data": {
      "Git": {
        "commit": "abc123",
        "file": "config/database.yml",
        "line": 15,
        "author": "dev@example.com",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    }
  },
  "DetectorName": "AWS",
  "Verified": true,
  "Raw": "AKIAIOSFODNN7EXAMPLE",
  "RawV2": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

### GitHub Actions / CI Scan

```yaml
name: Secret Scan
on:
  push:
  pull_request:

jobs:
  trufflehog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history required

      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --only-verified
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/trufflesecurity/trufflehog
    rev: v3.63.0
    hooks:
      - id: trufflehog
        name: TruffleHog
        description: Detect secrets in your repository
        entry: bash -c 'trufflehog git file://. --only-verified --fail'
        language: system
        stages: [commit, push]
```

## Detectors: What TruffleHog Finds

TruffleHog v3 has 700+ detectors including:

| Provider | Secrets Detected |
|----------|-----------------|
| AWS | Access keys, secret keys, session tokens |
| GitHub | Personal access tokens, fine-grained tokens, OAuth tokens |
| Slack | Bot tokens, webhook URLs, API tokens |
| Google Cloud | Service account keys, API keys, OAuth secrets |
| Azure | Connection strings, subscription keys |
| Stripe | Live and test API keys |
| Twilio | Auth tokens, API keys |
| SendGrid | API keys |
| Shopify | Admin/storefront tokens |
| Databricks | Personal access tokens |
| npm | Auth tokens |
| PyPI | API tokens |

## Dealing with False Positives

Allowlist known safe patterns:

```yaml
# .trufflehog.yml
detectors:
  - name: GenericAPIKey
    excludePatterns:
      - "example_api_key_.*"
      - "test_key_.*"
      - "PLACEHOLDER.*"

exclude_paths:
  - "test/**"
  - "**/*.test.js"
  - "docs/**"
```

Or use inline comments to mark false positives:

```python
# trufflehog:ignore
TEST_API_KEY = "sk_test_NOTAREALKEY123"
```

## Responding to Found Secrets

When TruffleHog finds a verified secret:

1. **Revoke immediately**: Go to the service provider and revoke the credential
2. **Assess exposure**: Check audit logs for unauthorized use
3. **Rotate dependent systems**: Update anywhere that credential was used
4. **Remove from history**: Use `git filter-repo` or BFG Repo Cleaner (doesn't help if already pushed — revocation is the priority)
5. **Post-mortem**: How did this get committed? Add pre-commit hook to prevent recurrence

```bash
# Remove secrets from Git history (AFTER revoking)
git filter-repo --sensitive-data-removal \
  --replace-text replacements.txt

# Or use BFG
java -jar bfg.jar --replace-text passwords.txt myrepo.git
```

## TruffleHog vs GitLeaks vs GitHub Secret Scanning

| Feature | TruffleHog | GitLeaks | GitHub Secret Scanning |
|---------|-----------|---------|----------------------|
| Secret verification | ✅ | ❌ | Partial |
| Detector count | 700+ | 140+ | 200+ |
| Git history | ✅ | ✅ | ✅ |
| Pre-commit hook | ✅ | ✅ | ❌ |
| Non-GitHub repos | ✅ | ✅ | ❌ |
| Price | Free | Free | Free (GitHub repos) |

TruffleHog's verification capability is its key differentiator. Knowing whether a leaked secret is still active vs already revoked determines urgency — and saves enormous incident response time.
