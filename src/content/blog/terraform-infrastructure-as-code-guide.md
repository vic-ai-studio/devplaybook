---
title: "Terraform Infrastructure as Code: Complete 2024 Guide"
description: "Master Terraform for infrastructure as code. Learn HCL syntax, providers, state management, modules, and best practices to automate your cloud infrastructure."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["terraform", "infrastructure-as-code", "devops", "cloud", "iac", "aws"]
readingTime: "12 min read"
---

Infrastructure as code (IaC) has fundamentally changed how teams provision and manage cloud resources. Instead of clicking through consoles or running ad-hoc scripts, you define your infrastructure declaratively in version-controlled files. Terraform, created by HashiCorp, is the dominant tool in this space — and for good reason.

This guide walks you through everything you need to know about Terraform: from basic syntax to production-grade module patterns.

---

## What Is Terraform?

Terraform is an open-source IaC tool that lets you define cloud and on-premises infrastructure in human-readable configuration files. You describe the desired state of your infrastructure, and Terraform figures out how to reach that state.

**Key characteristics:**

- **Declarative**: describe *what* you want, not *how* to do it
- **Provider-agnostic**: works with AWS, GCP, Azure, Kubernetes, GitHub, and 1,000+ providers
- **State-driven**: tracks what infrastructure exists via a state file
- **Idempotent**: running the same config multiple times produces the same result

---

## Installing Terraform

```bash
# macOS via Homebrew
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Verify
terraform version
```

---

## HCL Basics: HashiCorp Configuration Language

Terraform uses HCL (HashiCorp Configuration Language), a human-friendly declarative language.

### Providers

Providers are plugins that talk to external APIs. Every Terraform config needs at least one:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.6.0"
}

provider "aws" {
  region = "us-east-1"
}
```

### Resources

Resources are the core building block — they represent infrastructure objects:

```hcl
resource "aws_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name        = "web-server"
    Environment = "production"
  }
}
```

The syntax is always `resource "<PROVIDER>_<TYPE>" "<NAME>"`.

### Variables

Variables make your configs reusable:

```hcl
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"

  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
    error_message = "Must be a valid t3 instance type."
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
}
```

Pass values via CLI, `.tfvars` files, or environment variables:

```bash
# CLI flag
terraform apply -var="instance_type=t3.small"

# .tfvars file
terraform apply -var-file="production.tfvars"

# Environment variable
export TF_VAR_instance_type="t3.small"
```

### Outputs

Outputs expose values from your infrastructure for use elsewhere:

```hcl
output "instance_public_ip" {
  description = "Public IP of the web server"
  value       = aws_instance.web_server.public_ip
}

output "instance_id" {
  value     = aws_instance.web_server.id
  sensitive = false
}
```

### Data Sources

Data sources let you query existing infrastructure:

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
}
```

---

## Core Workflow: Plan, Apply, Destroy

Terraform's workflow is three commands:

```bash
# Initialize: download providers and modules
terraform init

# Preview changes (dry run)
terraform plan

# Apply changes
terraform apply

# Destroy all managed infrastructure
terraform destroy
```

The `plan` command is crucial — it shows you exactly what Terraform will create, modify, or delete before you commit.

```
Plan: 3 to add, 1 to change, 0 to destroy.

+ aws_instance.web_server
+ aws_security_group.allow_http
+ aws_security_group_rule.ingress_http
~ aws_s3_bucket.assets (tags updated)
```

---

## State Management

Terraform tracks your infrastructure in a **state file** (`terraform.tfstate`). This is how it knows what exists and what changes to make.

### Remote State (Critical for Teams)

Never store state locally in production. Use remote backends:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

The DynamoDB table provides state locking — prevents two people from applying changes simultaneously.

### State Commands

```bash
# List all resources in state
terraform state list

# Show details of a resource
terraform state show aws_instance.web_server

# Move a resource (useful during refactors)
terraform state mv aws_instance.old_name aws_instance.new_name

# Remove a resource from state (without destroying it)
terraform state rm aws_instance.web_server

# Import existing infrastructure
terraform import aws_instance.web_server i-1234567890abcdef0
```

---

## Modules: Reusable Infrastructure Packages

Modules are the primary way to organize and reuse Terraform configurations.

### Creating a Module

```
modules/
  vpc/
    main.tf
    variables.tf
    outputs.tf
    README.md
```

`modules/vpc/main.tf`:
```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = var.name
  }
}

resource "aws_subnet" "public" {
  count             = length(var.public_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = true
}
```

`modules/vpc/variables.tf`:
```hcl
variable "name" {
  type = string
}

variable "cidr_block" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnets" {
  type = list(string)
}

variable "availability_zones" {
  type = list(string)
}
```

`modules/vpc/outputs.tf`:
```hcl
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}
```

### Using a Module

```hcl
module "production_vpc" {
  source = "./modules/vpc"

  name               = "production"
  cidr_block         = "10.0.0.0/16"
  public_subnets     = ["10.0.1.0/24", "10.0.2.0/24"]
  availability_zones = ["us-east-1a", "us-east-1b"]
}

# Reference module outputs
resource "aws_instance" "app" {
  subnet_id = module.production_vpc.public_subnet_ids[0]
  # ...
}
```

### Public Registry Modules

HashiCorp maintains a registry of pre-built modules:

```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "my-cluster"
  cluster_version = "1.29"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
}
```

---

## Workspaces: Managing Multiple Environments

Workspaces let you maintain separate state files for different environments from the same config:

```bash
# Create and switch to staging workspace
terraform workspace new staging
terraform workspace new production

# List workspaces
terraform workspace list
# * default
#   staging
#   production

# Switch workspace
terraform workspace select staging
```

Use `terraform.workspace` in your config:

```hcl
locals {
  instance_type = {
    default    = "t3.micro"
    staging    = "t3.small"
    production = "t3.large"
  }
}

resource "aws_instance" "app" {
  instance_type = local.instance_type[terraform.workspace]
}
```

---

## Best Practices

### 1. Use `terraform fmt` and `terraform validate`

```bash
# Format all .tf files
terraform fmt -recursive

# Validate configuration syntax
terraform validate
```

Integrate both into your CI pipeline.

### 2. Pin Provider Versions

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 5.31.0"  # Pin exact version in production
    }
  }
}
```

### 3. Use Locals for Complex Expressions

```hcl
locals {
  common_tags = {
    Project     = "my-app"
    Environment = terraform.workspace
    ManagedBy   = "terraform"
  }

  name_prefix = "${var.project}-${terraform.workspace}"
}

resource "aws_s3_bucket" "assets" {
  bucket = "${local.name_prefix}-assets"
  tags   = local.common_tags
}
```

### 4. Separate State per Environment

Don't share state between environments. Use separate S3 prefixes or separate buckets:

```
prod/terraform.tfstate
staging/terraform.tfstate
dev/terraform.tfstate
```

### 5. Use `count` and `for_each` for Dynamic Resources

```hcl
# for_each is preferred over count (stable identifiers)
variable "buckets" {
  type = map(object({
    versioning = bool
    region     = string
  }))
}

resource "aws_s3_bucket" "data" {
  for_each = var.buckets
  bucket   = each.key

  region = each.value.region
}

resource "aws_s3_bucket_versioning" "data" {
  for_each = { for k, v in var.buckets : k => v if v.versioning }
  bucket   = aws_s3_bucket.data[each.key].id

  versioning_configuration {
    status = "Enabled"
  }
}
```

### 6. Never Commit Secrets

```hcl
# BAD - never do this
resource "aws_db_instance" "main" {
  password = "my-secret-password"  # committed to git!
}

# GOOD - use secrets manager or environment variables
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/database/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

---

## CI/CD Integration

A typical Terraform pipeline in GitHub Actions:

```yaml
name: Terraform

on:
  push:
    branches: [main]
  pull_request:

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"

      - name: Terraform Init
        run: terraform init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Terraform Format Check
        run: terraform fmt -check

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        if: github.event_name == 'pull_request'

      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan
        if: github.ref == 'refs/heads/main'
```

---

## Key Takeaways

Terraform has become the standard for infrastructure as code because it:

- Works across every major cloud provider with a consistent workflow
- Enables teams to version, review, and collaborate on infrastructure changes
- Provides a clear execution plan before any changes are made
- Scales from a single VM to complex multi-cloud architectures

Start small: convert one piece of manual infrastructure to Terraform, learn the workflow, then expand. Once your team is comfortable reading Terraform plans in pull requests, you'll wonder how you ever managed infrastructure any other way.

---

## Further Reading

- [Terraform Registry](https://registry.terraform.io) — official modules and providers
- [terraform-aws-modules](https://github.com/terraform-aws-modules) — battle-tested AWS modules
- OpenTofu — the open-source Terraform fork maintained by the Linux Foundation
