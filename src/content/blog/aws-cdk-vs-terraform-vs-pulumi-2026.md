---
title: "AWS CDK vs Terraform vs Pulumi: Infrastructure as Code Comparison 2026"
description: "Complete comparison of AWS CDK, Terraform, and Pulumi for infrastructure as code in 2026 — language support, state management, multi-cloud, community, and when to use each."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["aws-cdk", "terraform", "pulumi", "iac", "devops", "infrastructure", "cloud"]
readingTime: "14 min read"
---

Infrastructure as Code has three dominant tools in 2026: AWS CDK, Terraform, and Pulumi. Each has won specific battles in the ecosystem, and the "best" tool depends entirely on your context. This guide gives you an honest comparison so you can make the call for your team.

---

## Quick Summary

| | AWS CDK | Terraform | Pulumi |
|--|---------|-----------|--------|
| Language | TypeScript, Python, Java, Go, C# | HCL (Terraform DSL) | TypeScript, Python, Go, Java, C# |
| Cloud scope | AWS-first (some multi-cloud via L1) | Multi-cloud | Multi-cloud |
| State management | AWS CloudFormation | Local / S3 / Terraform Cloud | Local / S3 / Pulumi Cloud |
| Pricing | Free (AWS costs only) | Free + Terraform Cloud tiers | Free + Pulumi Cloud tiers |
| Learning curve | Medium (TypeScript/Python) | Low-medium (HCL) | Medium (TypeScript/Python) |
| Maturity | High | Very high | High |
| Community size | Large | Largest | Growing |

---

## AWS CDK

AWS CDK (Cloud Development Kit) lets you define AWS infrastructure using real programming languages. Under the hood, CDK synthesizes to CloudFormation templates — so everything that runs through AWS CloudFormation applies.

### Core Concepts

CDK is structured around three layers of abstraction:

- **L1 constructs** (`CfnBucket`, `CfnFunction`): 1:1 mapping to CloudFormation resources — maximum control, maximum verbosity
- **L2 constructs** (`Bucket`, `Function`): Higher-level abstractions with sane defaults and helper methods
- **L3 constructs (Patterns)**: Full application patterns like `ApplicationLoadBalancedFargateService`

### Example: S3 Bucket + Lambda + API Gateway

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket with encryption and versioning
    const assetBucket = new s3.Bucket(this, 'AssetBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
    });

    // Lambda function
    const handler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
      environment: {
        BUCKET_NAME: assetBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // Grant Lambda access to bucket
    assetBucket.grantReadWrite(handler);

    // API Gateway
    const api = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: 'My Service',
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
    });

    const items = api.root.addResource('items');
    items.addMethod('GET', new apigateway.LambdaIntegration(handler));
    items.addMethod('POST', new apigateway.LambdaIntegration(handler));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
  }
}
```

### CDK Aspects

CDK Aspects let you apply policies across all resources in a stack — useful for compliance:

```typescript
class RequireEncryption implements cdk.IAspect {
  visit(node: IConstruct) {
    if (node instanceof s3.CfnBucket) {
      if (!node.bucketEncryption) {
        cdk.Annotations.of(node).addError('S3 bucket must have encryption enabled');
      }
    }
  }
}

cdk.Aspects.of(app).add(new RequireEncryption());
```

### CDK Deployment

```bash
# Install CDK CLI
npm install -g aws-cdk

# Bootstrap (first time only per region/account)
cdk bootstrap aws://123456789012/us-east-1

# Deploy
cdk deploy --profile production

# Show diff before deploying
cdk diff

# Destroy (careful!)
cdk destroy
```

### CDK Strengths and Limitations

**Strengths:**
- Full programming languages: loops, conditionals, functions, unit tests for infrastructure
- L2/L3 constructs encode AWS best practices (permissions, encryption defaults)
- CDK Construct Hub has thousands of community constructs
- Native IDE support: autocomplete, type checking on infrastructure code

**Limitations:**
- AWS-first: multi-cloud requires custom L1 constructs and is painful
- Tied to CloudFormation: inherits its stack size limits and drift behavior
- Synthesized templates can be large and hard to debug
- `cdk deploy` is significantly slower than Terraform apply for large stacks

---

## Terraform

Terraform by HashiCorp has been the industry standard since 2014. Its HCL (HashiCorp Configuration Language) is purpose-built for infrastructure and is readable even by people who don't write code regularly.

### Core Concepts

- **Providers**: plugins that map to cloud/service APIs (~3,000 official and community providers)
- **Resources**: cloud objects you manage (`aws_s3_bucket`, `google_container_cluster`)
- **State**: Terraform tracks what it manages in a `.tfstate` file
- **Modules**: reusable infrastructure components

### Example: Same S3 + Lambda + API Gateway in Terraform

```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "my-terraform-state"
    key    = "api-stack/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 Bucket
resource "aws_s3_bucket" "assets" {
  bucket = "${var.project_name}-assets-${var.environment}"
  tags   = local.common_tags
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lambda
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "api_handler" {
  filename         = data.archive_file.lambda.output_path
  function_name    = "${var.project_name}-api-handler"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  source_code_hash = data.archive_file.lambda.output_base64sha256
  timeout          = 30
  memory_size      = 512

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.assets.bucket
    }
  }
}

# API Gateway
resource "aws_api_gateway_rest_api" "main" {
  name = "${var.project_name}-api"
}

output "api_url" {
  value = "${aws_api_gateway_rest_api.main.execution_arn}/prod"
}
```

### Modules

Terraform modules are the primary reuse mechanism:

```hcl
# Using the official VPC module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}
```

### State Management

Terraform state is its most powerful and most dangerous feature. Always use remote state:

```hcl
# Store state in S3 with DynamoDB locking
terraform {
  backend "s3" {
    bucket         = "terraform-state-prod"
    key            = "network/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

### Terraform Commands

```bash
terraform init          # Install providers, initialize backend
terraform plan          # Preview changes
terraform apply         # Apply changes (prompts for confirmation)
terraform apply -auto-approve  # Skip confirmation (CI use)
terraform destroy       # Tear down infrastructure
terraform import aws_s3_bucket.existing my-existing-bucket  # Import existing resource
terraform state list    # List all managed resources
```

### Terraform Strengths and Limitations

**Strengths:**
- ~3,000 providers: AWS, GCP, Azure, GitHub, Cloudflare, Datadog, everything
- HCL is readable by non-engineers (security, ops, auditors)
- Mature ecosystem: Terraform Registry, Sentinel policies, Atlantis, Spacelift
- Excellent drift detection
- Import existing infrastructure

**Limitations:**
- HCL has limited programming constructs (no real loops or conditionals pre-0.13)
- `count` and `for_each` for resource iteration is clunky
- State file conflicts in large teams without Terraform Cloud / remote backend
- OpenTofu fork creates ecosystem fragmentation (post-BSL license change)

---

## Pulumi

Pulumi uses real programming languages (TypeScript, Python, Go, Java, C#) like CDK, but supports multi-cloud like Terraform. It's the newest of the three but has found a strong following among developers who hate HCL.

### Example: Same Stack in TypeScript

```typescript
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const environment = config.require('environment');

// S3 Bucket
const assetBucket = new aws.s3.Bucket('assets', {
  bucket: `my-project-assets-${environment}`,
  versioning: { enabled: true },
  serverSideEncryptionConfiguration: {
    rule: {
      applyServerSideEncryptionByDefault: {
        sseAlgorithm: 'AES256',
      },
    },
  },
  tags: { Environment: environment },
});

// Lambda
const lambdaRole = new aws.iam.Role('lambdaRole', {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: 'lambda.amazonaws.com' }),
});

const handler = new aws.lambda.Function('apiHandler', {
  code: new pulumi.asset.AssetArchive({ '.': new pulumi.asset.FileArchive('./lambda') }),
  role: lambdaRole.arn,
  handler: 'index.handler',
  runtime: aws.lambda.Runtime.NodeJS22dX,
  timeout: 30,
  memorySize: 512,
  environment: {
    variables: { BUCKET_NAME: assetBucket.bucket },
  },
});

// Multi-cloud: deploy same pattern to GCP
import * as gcp from '@pulumi/gcp';
const gcpBucket = new gcp.storage.Bucket('gcp-assets', {
  location: 'US',
  uniformBucketLevelAccess: true,
});

export const apiUrl = handler.invokeArn;
export const bucketName = assetBucket.bucket;
```

### Pulumi vs CDK: Key Difference

Both use programming languages, but Pulumi does NOT synthesize to CloudFormation. It has its own resource engine that talks directly to cloud provider APIs, which means:
- Faster deploys (no CloudFormation stack management)
- Works across clouds with a single codebase
- No 500-resource CloudFormation limit
- State managed by Pulumi (not AWS)

### Pulumi Commands

```bash
pulumi new typescript  # Scaffold a new project
pulumi stack init dev  # Create a new stack
pulumi up              # Preview and deploy
pulumi up --yes        # Deploy without confirmation
pulumi preview         # Preview only
pulumi destroy         # Tear down
pulumi stack export    # Export state
```

### Multi-Cloud in Practice

```typescript
// Deploy to AWS and GCP in the same program
import * as aws from '@pulumi/aws';
import * as gcp from '@pulumi/gcp';
import * as cloudflare from '@pulumi/cloudflare';

const awsBucket = new aws.s3.Bucket('primary-storage');
const gcpBucket = new gcp.storage.Bucket('backup-storage', { location: 'US' });

// Cloudflare DNS pointing to AWS
new cloudflare.Record('dns', {
  zoneId: config.require('cfZoneId'),
  name: 'api',
  type: 'CNAME',
  value: awsAlb.dnsName,
});
```

### Pulumi Strengths and Limitations

**Strengths:**
- Real programming languages with proper loops, functions, classes
- True multi-cloud without provider-specific workarounds
- Better secret management (Pulumi Secrets encrypts by default)
- Familiar test patterns: Jest, pytest for infrastructure tests

**Limitations:**
- Smallest community of the three
- Pulumi Cloud required for team state management (free tier exists)
- More complex debugging than HCL
- Fewer community modules than Terraform Registry

---

## Learning Curve Comparison

| Audience | Best Starting Point |
|----------|-------------------|
| New to IaC, no strong language preference | Terraform (HCL is learnable in days) |
| AWS-focused TypeScript/Python developer | AWS CDK |
| Multi-cloud TypeScript/Python developer | Pulumi |
| Large enterprise, multiple cloud providers | Terraform (widest tooling ecosystem) |
| Startup, AWS-only, moving fast | AWS CDK |

---

## State Management Deep Dive

State management is where teams make the biggest mistakes. Here's the production setup for each:

**Terraform:**
```hcl
# S3 backend with locking
backend "s3" {
  bucket         = "tf-state-prod"
  key            = "infra/terraform.tfstate"
  region         = "us-east-1"
  dynamodb_table = "tf-lock"
  encrypt        = true
}
```

**Pulumi:**
```bash
# Use Pulumi Cloud (managed) or self-host
pulumi login  # Pulumi Cloud
pulumi login s3://my-state-bucket  # S3 backend
```

**CDK:**
No state management — CloudFormation is the state store. This is convenient but creates drift detection issues if you modify AWS resources outside of CDK.

---

## Cost

| Tool | Self-hosted | Managed |
|------|------------|---------|
| Terraform | Free (OpenTofu) | Terraform Cloud: $20/user/month |
| Pulumi | Free (OSS) | Pulumi Cloud: Free tier (1 user), $50/month (team) |
| AWS CDK | Free | Free (CloudFormation is free) |

---

## Decision Guide

**Choose AWS CDK if:**
- You're 100% AWS-only
- Your team writes TypeScript or Python daily
- You want the richest AWS-native constructs and best practices built in
- You're building complex AWS architectures where L2/L3 constructs save significant time

**Choose Terraform if:**
- You manage infrastructure across multiple cloud providers
- Your team includes non-engineers who need to read/review infra code
- You need the widest ecosystem of modules and provider integrations
- Compliance/audit requires version-controlled, reviewable infrastructure definitions

**Choose Pulumi if:**
- You want multi-cloud with a real programming language (not HCL)
- Your team is developer-heavy and HCL feels limiting
- You need tight integration between app code and infra code in the same repo
- You want built-in secrets management

---

## The Honest Answer

In 2026, **Terraform remains the safest enterprise choice** due to its ecosystem depth and HCL's readability for mixed teams. **CDK wins for AWS-heavy TypeScript shops** where developer productivity matters more than multi-cloud flexibility. **Pulumi is the right call** when you're tired of HCL's limitations but need multi-cloud support.

Most platform engineering teams of 10+ people end up with Terraform. Most product engineering teams shipping AWS-first SaaS end up with CDK. Most teams that pick Pulumi love it and don't look back.

---

## Resources

- [AWS CDK docs](https://docs.aws.amazon.com/cdk/v2/guide/home.html) — construct library, best practices
- [Terraform docs](https://developer.hashicorp.com/terraform/docs) — providers, modules, backends
- [Pulumi docs](https://www.pulumi.com/docs) — language guides, examples
- [CDK Construct Hub](https://constructs.dev) — community constructs
- [Terraform Registry](https://registry.terraform.io) — 3,000+ providers and modules
- [OpenTofu](https://opentofu.org) — open-source Terraform fork
