---
title: "Terraform IaC Complete Guide: Modules, State & CI/CD"
description: "Terraform infrastructure as code guide: HCL syntax, resource definitions, modules, remote state with S3/Terraform Cloud, workspaces, taint/import, and GitHub Actions CI/CD."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Terraform", "IaC", "infrastructure as code", "HashiCorp", "AWS", "CI/CD", "modules"]
readingTime: "11 min read"
category: "devops"
---

Terraform has become the de facto standard for infrastructure as code. Whether you are provisioning a single EC2 instance or managing a multi-account AWS organization, Terraform's declarative model lets you describe what you want and lets the tool figure out how to get there. This guide covers everything from first `terraform init` to production CI/CD pipelines.

## HCL Fundamentals

HashiCorp Configuration Language (HCL) is Terraform's native syntax. It is human-readable and designed to express infrastructure intent clearly.

```hcl
# variables.tf
variable "region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region to deploy into"
}

variable "environment" {
  type    = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# main.tf
terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
```

The `required_version` and `required_providers` constraints prevent silent breakage when a colleague runs a different Terraform version or when providers release breaking changes.

## Defining Resources

Resources are the core building blocks. Here is a practical VPC + subnet setup:

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true
}

data "aws_availability_zones" "available" {
  state = "available"
}

output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID of the created VPC"
}
```

Note the use of `count` to create multiple subnets and `cidrsubnet()` to carve out non-overlapping CIDR blocks automatically.

## Building Reusable Modules

Modules are the primary reuse mechanism. Structure them with clear inputs, outputs, and a single responsibility:

```
modules/
  rds-postgres/
    main.tf
    variables.tf
    outputs.tf
    README.md
```

```hcl
# modules/rds-postgres/variables.tf
variable "identifier"         { type = string }
variable "instance_class"     { type = string }
variable "allocated_storage"  { type = number; default = 20 }
variable "subnet_ids"         { type = list(string) }
variable "vpc_security_group_ids" { type = list(string) }
variable "db_name"            { type = string }
variable "username"           { type = string }

# modules/rds-postgres/main.tf
resource "aws_db_instance" "this" {
  identifier             = var.identifier
  engine                 = "postgres"
  engine_version         = "16.2"
  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage
  db_name                = var.db_name
  username               = var.username
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = var.vpc_security_group_ids
  skip_final_snapshot    = false
  deletion_protection    = true
  storage_encrypted      = true
}

resource "random_password" "db" {
  length  = 32
  special = false
}

# modules/rds-postgres/outputs.tf
output "endpoint"  { value = aws_db_instance.this.endpoint }
output "db_name"   { value = aws_db_instance.this.db_name }
output "password"  { value = random_password.db.result; sensitive = true }
```

Call the module from your environment configuration:

```hcl
module "app_db" {
  source = "../../modules/rds-postgres"

  identifier    = "app-${var.environment}"
  instance_class = var.environment == "prod" ? "db.t4g.medium" : "db.t4g.micro"
  subnet_ids    = module.vpc.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_name       = "appdb"
  username      = "appuser"
}
```

## Remote State with S3 and DynamoDB

Local state is fine for solo experimentation but breaks down with teams. Use S3 for storage and DynamoDB for state locking to prevent concurrent applies from corrupting state.

```hcl
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "production/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

Bootstrap the S3 bucket and DynamoDB table themselves with a separate Terraform configuration (the "bootstrap" pattern) before pointing other configs at them. Never manage the state backend with the same config that uses it.

Alternatively, **Terraform Cloud** (now HCP Terraform) provides state storage, locking, and a run interface with no self-managed infrastructure:

```hcl
terraform {
  cloud {
    organization = "my-company"
    workspaces {
      name = "production-vpc"
    }
  }
}
```

## Workspaces for Environment Isolation

Workspaces allow one configuration to manage multiple state files, useful for lightweight environment separation:

```bash
terraform workspace new staging
terraform workspace select staging
terraform apply -var="environment=staging"
```

In HCL, reference the workspace name to vary behavior:

```hcl
locals {
  is_prod = terraform.workspace == "production"

  instance_type = local.is_prod ? "t3.large" : "t3.micro"
}
```

For larger organizations, prefer **separate state files per environment in separate directories** over workspaces. Workspaces share the same configuration, which can make environment drift harder to manage safely.

## Importing Existing Resources and Taint

To bring existing infrastructure under Terraform management without recreating it:

```bash
# Import an existing S3 bucket
terraform import aws_s3_bucket.assets my-existing-bucket-name

# Terraform 1.5+ declarative import blocks
import {
  to = aws_s3_bucket.assets
  id = "my-existing-bucket-name"
}
```

To force recreation of a resource (for example, to rotate a certificate or replace a broken instance):

```bash
# Mark resource for recreation on next apply
terraform taint aws_instance.web

# Terraform 1.2+ preferred approach
terraform apply -replace="aws_instance.web"
```

## GitHub Actions CI/CD Pipeline

Automate your Terraform workflow with a pull request-based pipeline:

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    paths: ["infra/**"]
  push:
    branches: [main]
    paths: ["infra/**"]

env:
  TF_VERSION: "1.7.5"
  AWS_REGION: "us-east-1"

jobs:
  plan:
    name: Terraform Plan
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra/production

    steps:
    - uses: actions/checkout@v4

    - uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: ${{ env.TF_VERSION }}

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: arn:aws:iam::123456789:role/GitHubActionsRole
        aws-region: ${{ env.AWS_REGION }}

    - name: Terraform Init
      run: terraform init

    - name: Terraform Validate
      run: terraform validate

    - name: Terraform Plan
      id: plan
      run: terraform plan -out=tfplan -no-color 2>&1 | tee plan.txt

    - name: Post Plan to PR
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const plan = fs.readFileSync('infra/production/plan.txt', 'utf8');
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `**Terraform Plan**\n\`\`\`\n${plan.slice(0, 60000)}\n\`\`\``
          });

  apply:
    name: Terraform Apply
    runs-on: ubuntu-latest
    needs: plan
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
    - uses: actions/checkout@v4
    - uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: ${{ env.TF_VERSION }}
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: arn:aws:iam::123456789:role/GitHubActionsRole
        aws-region: ${{ env.AWS_REGION }}
    - run: terraform init
    - run: terraform apply -auto-approve
      working-directory: infra/production
```

The `environment: production` block enables GitHub's environment protection rules, requiring manual approval before `apply` runs on the main branch.

## Essential Terraform Hygiene

**Pin provider versions** using `~>` (allows patch updates only) rather than leaving them unpinned.

**Use `terraform fmt`** in pre-commit hooks to keep code consistently formatted:

```bash
# .pre-commit-config.yaml
repos:
- repo: https://github.com/antonbabenko/pre-commit-terraform
  rev: v1.89.0
  hooks:
  - id: terraform_fmt
  - id: terraform_validate
  - id: terraform_tflint
```

**Never commit `.tfstate` files** or files containing secrets. Add these to `.gitignore`:

```
*.tfstate
*.tfstate.backup
.terraform/
*.tfvars
```

**Use `terraform plan` output as your change review mechanism** — treat any `destroy` action in a plan as a red flag requiring human review before merging.

With these practices in place, your Terraform codebase becomes a reliable source of truth for your infrastructure, auditable via Git history and safe to modify through automated pipelines.
