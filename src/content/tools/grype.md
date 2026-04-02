---
title: "Grype — Vulnerability Scanner for Container Images & Filesystems"
description: "Grype is a fast, open-source vulnerability scanner for container images and filesystems by Anchore. It scans OS packages and language-specific dependencies with up-to-date vulnerability databases."
category: "Security"
pricing: "Free / Open Source"
pricingDetail: "Grype is 100% free and open-source (Apache 2.0). Anchore Enterprise adds policy enforcement, RBAC, and management UI."
website: "https://anchore.com/grype"
github: "https://github.com/anchore/grype"
tags: ["security", "vulnerability-scanning", "containers", "sbom", "ci-cd", "devsecops", "docker"]
pros:
  - "Extremely fast: scans typical container images in seconds"
  - "Works directly with SBOMs: pair with Syft for powerful SBOM-based workflows"
  - "Multiple output formats: table, JSON, SARIF, CycloneDX for pipeline integration"
  - "Watches multiple databases (NVD, GitHub Advisories, Red Hat, Debian, etc.)"
  - "Simple CLI with sensible defaults — works out of the box"
cons:
  - "No IaC or secrets scanning (container/filesystem focus only)"
  - "Less ecosystem integration than Snyk or Trivy"
  - "No automated remediation suggestions"
  - "Database update mechanism requires connectivity (or pre-downloaded DB)"
date: "2026-04-02"
---

## What is Grype?

Grype is a vulnerability scanner for container images and filesystems, created by Anchore (the same team behind Syft). It's designed to be fast, accurate, and easy to integrate into CI/CD pipelines. Grype pairs particularly well with Syft — Anchore's SBOM generator — enabling workflows where you generate an SBOM once and scan it multiple times.

## Quick Start

```bash
# Install Grype
brew install anchore/grype/grype
# Or via curl
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh

# Scan a container image
grype nginx:latest

# Scan a local directory
grype dir:/path/to/project

# Scan an SBOM (from Syft)
syft myapp:latest -o cyclonedx-json | grype

# Only show CRITICAL and HIGH
grype nginx:latest --fail-on critical

# Output as JSON
grype nginx:latest -o json > results.json
```

## Output Formats

```bash
# Table (default, human-readable)
grype nginx:latest

# JSON (for pipeline processing)
grype nginx:latest -o json

# SARIF (for GitHub Security tab)
grype nginx:latest -o sarif > grype.sarif

# CycloneDX JSON (for SBOM-based workflows)
grype nginx:latest -o cyclonedx-json
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Vulnerability Scan
on:
  push:
    branches: [main]
  pull_request:

jobs:
  grype:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Grype Vulnerability Scan
        uses: anchore/scan-action@v3
        with:
          image: "myapp:${{ github.sha }}"
          fail-build: true
          severity-cutoff: critical

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

### GitLab CI

```yaml
grype-scan:
  image: anchore/grype:latest
  stage: security
  script:
    - grype $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -o sarif > grype.sarif
    - grype $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA --fail-on critical
  artifacts:
    reports:
      container_scanning: grype.sarif
```

## Grype + Syft: The SBOM Workflow

The most powerful way to use Grype is with Syft for SBOM-driven security:

```bash
# Step 1: Generate SBOM with Syft
syft myapp:latest -o spdx-json > sbom.spdx.json

# Step 2: Scan SBOM with Grype (fast, no image pull needed)
grype sbom:./sbom.spdx.json

# Step 3: Store SBOM as release artifact, scan on demand
grype sbom:./sbom.spdx.json -o sarif > results.sarif
```

This decouples vulnerability scanning from image building — you can re-scan the same SBOM as new CVEs are disclosed without rebuilding the image.

## Configuration File

```yaml
# .grype.yaml
output: "json"
file: "grype-results.json"
quiet: false
check-for-app-update: true

fail-on-severity: "high"

ignore:
  # Accept risk for this specific CVE
  - vulnerability: CVE-2023-1234
    reason: "Mitigated by network policy"
  # Ignore by package
  - package:
      name: libssl
      version: "1.1.1f"
      type: deb

registry:
  insecure-skip-tls-verify: false
```

## Grype vs Trivy

Both are excellent open-source scanners. The main differences:

| Aspect | Grype | Trivy |
|--------|-------|-------|
| Focus | Container images + filesystems | Containers + IaC + secrets + k8s |
| SBOM integration | Native Syft integration | Generates SBOMs |
| Speed | Slightly faster on images | Comparable |
| Breadth | Narrower (containers) | Broader (full DevSecOps) |
| Best with | Syft-based SBOM workflows | All-in-one scanning |

Use **Trivy** when you need a single tool for containers, IaC, and secrets. Use **Grype + Syft** when you want the best SBOM-based workflow with a dedicated image scanner.
