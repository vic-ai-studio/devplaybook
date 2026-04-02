---
title: "Trivy — Container & Kubernetes Vulnerability Scanner"
description: "Trivy is the most comprehensive open-source vulnerability scanner for containers, Kubernetes, code repositories, and IaC configurations. Fast, accurate, and easy to integrate into any CI/CD pipeline."
category: "Security"
pricing: "Free / Open Source"
pricingDetail: "Trivy is 100% free and open-source (Apache 2.0). Aqua Security offers a commercial platform (Aqua) built on top."
website: "https://trivy.dev"
github: "https://github.com/aquasecurity/trivy"
tags: ["security", "containers", "kubernetes", "vulnerability-scanning", "iac", "ci-cd", "sbom", "devsecops"]
pros:
  - "All-in-one scanner: containers, OS packages, language deps, IaC, secrets, SBOMs in one tool"
  - "Very fast — parallel scanning with smart caching makes repeated scans nearly instant"
  - "Comprehensive vulnerability database updated daily from NVD, Red Hat, Debian, Alpine, and more"
  - "Kubernetes-native: scan cluster configs, Helm charts, and running workloads"
  - "SBOM generation: produces CycloneDX or SPDX SBOMs for compliance requirements"
cons:
  - "Large vulnerability database can generate noise — needs tuning for meaningful signal"
  - "No automated fix PRs (unlike Snyk) — reporting only"
  - "Complex suppression/ignore rules when managing large number of accepted risks"
  - "License scanning requires paid Aqua features for completeness"
date: "2026-04-02"
---

## What is Trivy?

Trivy (pronounced "try-vee") is an open-source vulnerability and misconfiguration scanner created by Aqua Security. It's now the most widely adopted open-source security scanner in the cloud-native ecosystem, with over 22,000 GitHub stars and official integrations with GitHub Actions, GitLab CI, Jenkins, ArgoCD, and dozens of other tools.

What makes Trivy stand out is breadth: it scans containers, OS packages, language-specific dependencies (npm, pip, go.mod, Cargo.lock), IaC files (Terraform, CloudFormation, Kubernetes YAML), secrets, and can generate SBOMs (Software Bill of Materials). One tool covers the full attack surface.

## Quick Start

```bash
# Install Trivy
brew install aquasecurity/trivy/trivy  # macOS
# Or via shell script:
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh

# Scan a container image
trivy image nginx:latest

# Scan a local directory (code + IaC)
trivy fs .

# Scan a Git repository
trivy repo https://github.com/myorg/myapp

# Scan a running Kubernetes cluster
trivy k8s --report summary cluster

# Generate SBOM
trivy image --format cyclonedx --output sbom.json nginx:latest
```

## Key Features

### Container Image Scanning

Trivy scans container images for vulnerabilities in:
- OS packages (Alpine, Ubuntu, Debian, RHEL, CentOS)
- Application language packages (npm, pip, gem, cargo, go modules, maven, gradle)
- Base image vulnerabilities

```bash
# Scan with severity filter
trivy image --severity HIGH,CRITICAL nginx:1.25

# Output results as JSON for pipeline integration
trivy image --format json --output results.json nginx:latest

# Ignore unfixed vulnerabilities (common in CI gates)
trivy image --ignore-unfixed nginx:latest
```

### IaC Misconfiguration Detection

Trivy checks Terraform, CloudFormation, Helm charts, and Kubernetes YAML for security misconfigurations:

```bash
# Scan Terraform files
trivy config ./terraform/

# Scan Kubernetes manifests
trivy config ./k8s/

# Example findings:
# MEDIUM: Container running as root
# HIGH: Missing resource limits
# CRITICAL: Privileged container
```

### Secret Scanning

Trivy can detect hardcoded secrets in source code and container image layers:

```bash
# Scan filesystem for secrets
trivy fs --scanners secret .

# Detected secrets include:
# AWS access keys, GitHub tokens, private keys,
# database connection strings, API keys
```

### Kubernetes Cluster Scanning

```bash
# Full cluster scan
trivy k8s --report summary all

# Namespace-specific scan
trivy k8s --namespace production --report all all

# Scan a specific workload
trivy k8s deployment/payments-service
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Security Scan
on: [push, pull_request]

jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'  # Fail CI on findings
      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

### GitLab CI

```yaml
trivy-scan:
  image: aquasec/trivy:latest
  script:
    - trivy image --exit-code 1 --severity CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  allow_failure: false
```

## Ignore Rules and Policy

Manage accepted risks with a `.trivyignore` file:

```
# .trivyignore
# Ignore specific CVE (accepted risk with justification)
CVE-2023-1234  # Accepted: Not exploitable in our threat model, review 2026-06-01

# Ignore by path
*/test/*
```

Or use a policy file for more granular control:

```yaml
# trivy-ignore.yaml
ignoreCVEs:
  - id: CVE-2023-1234
    statement: "Not exploitable in our network-isolated environment"
    expiredAt: "2026-12-01"
```

## SBOM Generation

Generating SBOMs is increasingly required for compliance (US Executive Order 14028, EU CRA):

```bash
# Generate CycloneDX SBOM
trivy image --format cyclonedx --output sbom.json myapp:latest

# Generate SPDX SBOM
trivy image --format spdx-json --output sbom.spdx.json myapp:latest
```

## Trivy vs Snyk vs Grype

| Feature | Trivy | Snyk | Grype |
|---------|-------|------|-------|
| Price | Free | Free/Paid | Free |
| Container scanning | ✅ | ✅ | ✅ |
| IaC scanning | ✅ | ✅ | ❌ |
| Secret scanning | ✅ | ✅ | ❌ |
| SBOM generation | ✅ | Partial | ✅ |
| Auto fix PRs | ❌ | ✅ | ❌ |
| IDE integration | Limited | Excellent | Limited |

Trivy wins on breadth and open-source accessibility. Snyk wins on fix automation and developer experience. Use Trivy in CI/CD for comprehensive coverage; Snyk when you want automated fix PRs.
