---
title: "Prowler — AWS, GCP & Azure Cloud Security Tool"
description: "Prowler is the open-source cloud security tool that audits AWS, GCP, and Azure for misconfigurations, compliance violations, and security best practices across hundreds of automated checks."
category: "Security"
pricing: "Free / Open Source"
pricingDetail: "Prowler OSS is 100% free (Apache 2.0). Prowler Cloud SaaS offers continuous monitoring, dashboards, and team features."
website: "https://prowler.com"
github: "https://github.com/prowler-cloud/prowler"
tags: ["security", "aws", "gcp", "azure", "cloud-security", "compliance", "cspm", "devsecops"]
pros:
  - "Multi-cloud: audits AWS, GCP, Azure, and Kubernetes from a single tool"
  - "1000+ checks covering CIS, NIST, PCI DSS, GDPR, SOC 2, ISO 27001"
  - "Runs with read-only IAM permissions — no risk of modifying your infrastructure"
  - "Multiple output formats: CSV, JSON, HTML, SARIF for any downstream system"
  - "Fast: parallel execution scans entire AWS accounts in minutes"
cons:
  - "Python dependency management can be complex"
  - "Output volume requires filtering to focus on actionable items"
  - "Not a real-time monitoring tool — point-in-time audits only (Prowler Cloud for continuous)"
  - "Complex multi-account AWS setups require additional IAM configuration"
date: "2026-04-02"
---

## What is Prowler?

Prowler is an open-source cloud security tool for performing audits, incident response, continuous monitoring, hardening, and forensics across AWS, GCP, and Azure. It runs hundreds of automated checks against your cloud infrastructure and tells you exactly what's misconfigured, which compliance frameworks are violated, and what to fix.

It's widely used by security teams, DevSecOps engineers, and cloud architects to answer: "How secure is our AWS account right now?"

## Quick Start

```bash
# Install Prowler
pip install prowler

# AWS audit (uses default AWS credentials)
prowler aws

# Specific service scan
prowler aws --service s3 iam ec2

# GCP scan
prowler gcp --project-id my-project-id

# Azure scan
prowler azure --sp-env-auth

# Kubernetes scan
prowler kubernetes

# Output as HTML report
prowler aws -M html -o ./reports
```

## AWS IAM Setup

Prowler requires read-only IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "securityhub:BatchImportFindings",
        "securityhub:GetFindings"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::*:role/ProwlerScanRole"
    }
  ]
}
```

Attach `SecurityAudit` and `ViewOnlyAccess` managed policies for comprehensive scanning.

## Key Checks by Category

### IAM Security
- Password policy enforcement
- MFA enabled for root and IAM users
- Access keys rotated within 90 days
- Root account not used recently
- Unused IAM credentials (>90 days)
- IAM policies with admin permissions
- Cross-account trust relationships

### S3 Security
- Public buckets (read and write)
- Encryption at rest enabled
- Access logging enabled
- Versioning enabled for sensitive buckets
- MFA delete for critical buckets
- Bucket policy allows unauthenticated access

### EC2 and Network Security
- Security groups with 0.0.0.0/0 for sensitive ports
- EBS volumes not encrypted
- Default VPCs in use
- Unused security groups
- Instances with public IP and overly permissive SGs
- IMDSv1 enabled (prefer IMDSv2)

### Monitoring and Logging
- CloudTrail enabled across all regions
- CloudTrail log file validation
- VPC flow logs enabled
- GuardDuty enabled
- Config service enabled
- CloudWatch alarms for root activity

## Compliance Framework Scans

```bash
# CIS AWS Foundations Benchmark
prowler aws --compliance cis_1.5_aws

# PCI DSS 3.2.1
prowler aws --compliance pci_3.2.1_aws

# SOC 2
prowler aws --compliance soc2_aws

# NIST 800-53
prowler aws --compliance nist_800_53_revision_5_aws

# GDPR (EU-based)
prowler aws --compliance gdpr_aws

# AWS Well-Architected Framework
prowler aws --compliance aws_well_architected_framework_security_pillar_aws
```

## Multi-Account AWS Scanning

For AWS Organizations with multiple accounts:

```bash
# Assume role in each account
prowler aws \
  --role arn:aws:iam::123456789:role/ProwlerRole \
  --role arn:aws:iam::987654321:role/ProwlerRole

# Scan all accounts in an Organization
prowler aws \
  --organizations-role arn:aws:iam::MGMT_ACCOUNT:role/ProwlerOrgRole
```

## CI/CD Integration

### GitHub Actions (Weekly Audit)

```yaml
name: Security Audit
on:
  schedule:
    - cron: '0 8 * * 1'  # Every Monday 8AM
  workflow_dispatch:

jobs:
  prowler:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/ProwlerRole
          aws-region: us-east-1

      - name: Run Prowler
        run: |
          pip install prowler
          prowler aws \
            --compliance cis_1.5_aws \
            -M json \
            -o ./prowler-output

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: prowler-report-${{ github.run_id }}
          path: ./prowler-output/
```

## Output Formats

```bash
# HTML Report (visual, shareable)
prowler aws -M html -o ./reports

# JSON (for SIEM integration)
prowler aws -M json -o ./reports

# CSV (for spreadsheet analysis)
prowler aws -M csv -o ./reports

# OCSF (Open Cybersecurity Schema Framework)
prowler aws -M ocsf -o ./reports

# Send to AWS Security Hub
prowler aws --security-hub
```

## Filtering Results

```bash
# Scan only specific services
prowler aws --service s3 iam cloudtrail guardduty

# Exclude specific checks
prowler aws --excluded-checks prowler_aws_access_analyzer_enabled

# Only high and critical severity
prowler aws --severity high critical

# Only failed checks
prowler aws --status FAIL
```

## Prowler vs AWS Security Hub vs Scout Suite

| Feature | Prowler | AWS Security Hub | Scout Suite |
|---------|---------|-----------------|-------------|
| Multi-cloud | ✅ | AWS only | ✅ |
| Open source | ✅ | ❌ | ✅ |
| Compliance frameworks | 40+ | CIS, PCI | CIS, custom |
| Real-time monitoring | ❌ | ✅ | ❌ |
| Cost | Free | ~$10K+/year | Free |
| CI/CD integration | ✅ | Via Lambda | ✅ |

Prowler is the best free option for comprehensive multi-cloud auditing. AWS Security Hub is worth the investment for real-time continuous monitoring in production.
