---
title: "Checkov — Infrastructure as Code Security Scanner"
description: "Leading open-source IaC scanner — finds misconfigurations in Terraform, CloudFormation, Kubernetes, Helm, and Dockerfile before they reach production."
category: "Security"
pricing: "Free / Open Source"
pricingDetail: "Checkov is 100% free and open-source (Apache 2.0). Prisma Cloud by Palo Alto Networks offers enterprise features."
website: "https://www.checkov.io"
github: "https://github.com/bridgecrewio/checkov"
tags: ["security", "iac", "terraform", "kubernetes", "devsecops", "cloudformation", "helm", "compliance"]
pros:
  - "Broadest IaC support: Terraform, TF plan, CloudFormation, Kubernetes, Helm, Bicep, CDK, Dockerfile, GitHub Actions"
  - "2,000+ built-in security and compliance checks"
  - "Custom checks in Python or YAML — no DSL required"
  - "Compliance frameworks: CIS, NIST, PCI DSS, SOC 2, HIPAA, ISO27001"
  - "Terraform plan scanning: catches misconfigurations in generated plans, not just source"
cons:
  - "Can generate significant noise in large IaC codebases without tuning"
  - "Some checks are overly strict for legitimate configurations"
  - "Python 3.7+ dependency may conflict with some environments"
  - "Advanced features (graph-based analysis) require Bridgecrew/Prisma Cloud"
date: "2026-04-02"
---

## What is Checkov?

Checkov is an open-source static analysis tool for Infrastructure as Code (IaC). Created by Bridgecrew (acquired by Palo Alto Networks), it scans your Terraform, CloudFormation, Kubernetes manifests, Helm charts, Dockerfiles, and more for security misconfigurations and compliance violations *before* they're deployed to production.

Checkov catches issues like:
- S3 buckets with public access enabled
- Security groups allowing inbound access from 0.0.0.0/0
- Kubernetes containers running as root
- Unencrypted RDS databases
- Missing resource limits on containers
- Exposed database ports in security groups

## Quick Start

```bash
# Install Checkov
pip install checkov

# Scan a Terraform directory
checkov -d ./terraform

# Scan a specific file
checkov -f main.tf

# Scan Kubernetes manifests
checkov -d ./k8s

# Scan Dockerfile
checkov -f Dockerfile

# Scan Helm chart
checkov -d ./charts/myapp --framework helm

# Scan Terraform plan (catch runtime misconfigs)
terraform plan -out plan.tfplan
terraform show -json plan.tfplan > plan.json
checkov -f plan.json --framework terraform_plan
```

## Output and Formatting

```bash
# Compact output (default)
checkov -d ./terraform

# JSON output for pipeline processing
checkov -d ./terraform -o json > checkov-results.json

# SARIF for GitHub Security tab
checkov -d ./terraform -o sarif > checkov.sarif

# JUnit XML for CI reporting
checkov -d ./terraform -o junitxml > checkov-junit.xml
```

Example output:
```
Check: CKV_AWS_18: "Ensure the S3 bucket has access logging enabled"
  FAILED for resource: aws_s3_bucket.data_bucket
  File: /terraform/s3.tf:5-15

Check: CKV_AWS_20: "S3 Bucket has an ACL defined which allows public READ access"
  PASSED for resource: aws_s3_bucket.data_bucket
```

## CI/CD Integration

### GitHub Actions

```yaml
name: IaC Security Scan
on:
  push:
  pull_request:

jobs:
  checkov:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Checkov GitHub Action
        uses: bridgecrewio/checkov-action@master
        with:
          directory: terraform/
          framework: terraform
          output_format: sarif
          output_file_path: checkov-results.sarif
          soft_fail: false

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: checkov-results.sarif
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/bridgecrewio/checkov
    rev: '3.1.0'
    hooks:
      - id: checkov
        args: ['--framework', 'terraform', '--quiet']
```

## Skip and Suppress Checks

```hcl
# In Terraform: suppress specific check inline
resource "aws_s3_bucket" "logs" {
  bucket = "my-logs-bucket"

  # checkov:skip=CKV_AWS_18:Logging bucket doesn't need access logging
  # checkov:skip=CKV_AWS_144:Cross-region replication not required for logs
}
```

```bash
# CLI: skip specific checks
checkov -d ./terraform --skip-check CKV_AWS_18,CKV_AWS_20

# Run only specific compliance framework checks
checkov -d ./terraform --check CKV_AWS_3,CKV_AWS_18,CKV_AWS_20

# Run CIS AWS benchmark
checkov -d ./terraform --framework terraform --check CUSTOM_CIS_AWS
```

## Writing Custom Checks

### Python Custom Check

```python
from checkov.common.models.enums import CheckResult, CheckCategories
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck

class S3BucketEncryptionCheck(BaseResourceCheck):
    def __init__(self):
        name = "Ensure S3 bucket uses AES-256 encryption"
        id = "CKV_CUSTOM_1"
        supported_resources = ['aws_s3_bucket']
        categories = [CheckCategories.ENCRYPTION]
        super().__init__(name=name, id=id, categories=categories,
                        supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        encryption = conf.get("server_side_encryption_configuration", [{}])
        if encryption:
            sse_algo = encryption[0].get("rule", [{}])[0].get(
                "apply_server_side_encryption_by_default", [{}]
            )[0].get("sse_algorithm", "")
            if sse_algo == "AES256":
                return CheckResult.PASSED
        return CheckResult.FAILED

scanner = S3BucketEncryptionCheck()
```

### YAML Custom Check

```yaml
# custom_checks/require_tags.yaml
metadata:
  name: "Ensure required tags are present"
  id: "CKV2_CUSTOM_TAG_1"
  category: "GENERAL_SECURITY"

definition:
  and:
    - cond_type: "attribute"
      resource_types: ["aws_instance", "aws_s3_bucket"]
      attribute: "tags.Environment"
      operator: "exists"
    - cond_type: "attribute"
      resource_types: ["aws_instance", "aws_s3_bucket"]
      attribute: "tags.Owner"
      operator: "exists"
```

## Compliance Framework Coverage

Checkov maps findings to major compliance frameworks:

| Framework | Coverage |
|-----------|---------|
| CIS AWS Benchmark | Full |
| CIS GCP Benchmark | Full |
| CIS Azure Benchmark | Full |
| CIS Kubernetes | Full |
| NIST 800-53 | Partial |
| PCI DSS | Partial |
| SOC 2 | Partial |
| HIPAA | Partial |

```bash
# Run with specific compliance framework
checkov -d ./terraform --compliance pci

# Run CIS AWS checks only
checkov -d ./terraform --framework terraform \
  --check $(checkov -d . --list 2>&1 | grep CKV_AWS | awk '{print $1}' | tr '\n' ',')
```

Checkov is the standard tool for shift-left IaC security — catching misconfigurations at PR time rather than after deployment.
