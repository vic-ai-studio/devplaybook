---
title: "Terraform vs Pulumi vs AWS CDK: Infrastructure as Code Comparison 2025"
description: "Comprehensive comparison of Terraform, Pulumi, and AWS CDK for infrastructure as code. HCL vs TypeScript vs Python, state management, multi-cloud support, testing, and when to use each tool."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["DevOps", "Terraform", "Pulumi", "AWS CDK", "IaC", "Cloud", "Infrastructure"]
readingTime: "12 min read"
---

Infrastructure as Code (IaC) has settled into three dominant approaches: **Terraform's** declarative HCL, **Pulumi's** general-purpose language support, and **AWS CDK's** constructs-based abstraction. Each one reflects a different philosophy about how infrastructure should be defined and managed.

This comparison cuts through the marketing claims and focuses on what actually matters: language support, state management, cloud coverage, testing capabilities, and real-world migration paths.

---

## The Core Difference

Before diving into specifics, understand the fundamental split:

- **Terraform** — declarative configuration language (HCL) with a mature provider ecosystem
- **Pulumi** — imperative infrastructure using TypeScript, Python, Go, C#, or Java
- **AWS CDK** — higher-level constructs in TypeScript/Python that compile down to CloudFormation

This difference drives almost every practical tradeoff between them.

---

## Terraform

### What It Is

Terraform by HashiCorp (now IBM) is the incumbent IaC tool. It uses HashiCorp Configuration Language (HCL) — a declarative syntax purpose-built for infrastructure definition. You describe the desired state; Terraform figures out how to get there.

### Language: HCL

```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "app_data" {
  bucket = "${var.project_name}-data-${var.environment}"

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_s3_bucket_versioning" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

HCL is not a general-purpose programming language. It has conditionals, loops (`for_each`, `count`), and functions, but no classes, imports, or complex control flow. This is a feature, not a bug — Terraform configurations are readable by anyone, even people who don't write code.

### State Management

Terraform tracks deployed infrastructure in a state file (`terraform.tfstate`). This is Terraform's most important concept and its most common source of operational pain.

For team use, you need remote state:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

State drift (when real infrastructure diverges from state) is a real operational concern. `terraform import` and `terraform state` commands handle recovery, but these situations require manual intervention.

### Cloud Provider Support

Terraform's provider ecosystem is unmatched — 3,000+ providers covering every major cloud, SaaS platform, and service. AWS, GCP, Azure, Kubernetes, Datadog, GitHub, Cloudflare, Vault — if it has an API, there's probably a Terraform provider.

### Testing

Terraform testing has improved significantly. Terraform's built-in testing framework (added in v1.6) allows writing test files:

```hcl
# s3_bucket.tftest.hcl
run "creates_bucket_with_versioning" {
  command = plan

  assert {
    condition     = aws_s3_bucket_versioning.app_data.versioning_configuration[0].status == "Enabled"
    error_message = "Versioning must be enabled"
  }
}
```

Third-party tools like Terratest (Go) and Checkov (policy-as-code) are commonly used alongside native testing.

### Strengths

- Largest provider ecosystem — 3,000+ providers
- Declarative HCL is readable without programming experience
- Mature tooling, massive community, abundant hiring pool
- Works with any cloud or service that has an API
- Strong CI/CD integrations (Atlantis, Terraform Cloud)
- Battle-tested at scale

### Weaknesses

- HCL has real limitations — no native loops over complex data, limited abstractions
- State management requires operational discipline
- Module system is less powerful than a real package manager
- Slow plan/apply cycles for large configurations
- HashiCorp's BSL license change (2023) drove some teams to OpenTofu

---

## Pulumi

### What It Is

Pulumi lets you write infrastructure in TypeScript, Python, Go, C#, or Java using the same languages and tools you already use for application code. It doesn't introduce a new configuration language — you write real programs that define infrastructure.

### Language: Your Choice

```typescript
// index.ts (TypeScript)
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const env = config.require("environment");
const projectName = config.require("projectName");

const bucket = new aws.s3.Bucket(`${projectName}-data-${env}`, {
    versioning: {
        enabled: true,
    },
    tags: {
        Environment: env,
        Project: projectName,
    },
});

export const bucketName = bucket.bucket;
```

The same configuration in Python:

```python
import pulumi
import pulumi_aws as aws

config = pulumi.Config()
env = config.require("environment")
project_name = config.require("projectName")

bucket = aws.s3.Bucket(
    f"{project_name}-data-{env}",
    versioning=aws.s3.BucketVersioningArgs(enabled=True),
    tags={"Environment": env, "Project": project_name},
)

pulumi.export("bucket_name", bucket.bucket)
```

Because you're writing real programs, you can use loops, functions, classes, and imported libraries naturally:

```typescript
const environments = ["dev", "staging", "prod"];

for (const env of environments) {
    new aws.s3.Bucket(`app-data-${env}`, {
        versioning: { enabled: env === "prod" },
    });
}
```

### State Management

Pulumi uses the same state-based model as Terraform but manages it differently. The default backend is Pulumi Cloud (managed service). You can also use S3, Azure Blob, GCS, or local files:

```bash
pulumi login s3://my-pulumi-state-bucket
```

State conflicts are handled with the same locking mechanisms as Terraform, but the UX around state management is generally considered better.

### Cloud Provider Support

Pulumi has native providers for all major clouds and uses a bridge layer to support Terraform providers — giving you access to the same 3,000+ provider ecosystem when native providers don't exist. AWS, GCP, and Azure native providers are actively maintained and often expose more features than their Terraform equivalents.

### Testing

Testing is Pulumi's strongest advantage over Terraform. Because you're writing real code, you can use standard testing frameworks:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

pulumi.runtime.setMocks({
    newResource: (args) => ({
        id: `${args.name}_id`,
        state: args.inputs,
    }),
    call: (args) => ({ result: args.inputs }),
});

describe("S3 Bucket", () => {
    it("should have versioning enabled", async () => {
        const { Bucket } = await import("./index");
        const bucketVersioning = await Bucket.versioning.apply(v => v);
        expect(bucketVersioning?.enabled).toBe(true);
    });
});
```

Unit tests, integration tests, and property tests are all straightforward in Pulumi.

### Strengths

- Real programming languages — loops, abstractions, imports
- Best testing story — use standard test frameworks
- Strong TypeScript/Python support
- Component resources for reusable infrastructure patterns
- Pulumi AI for natural language → infrastructure
- Same skills apply to app code and infra code

### Weaknesses

- Smaller provider ecosystem than Terraform (native providers)
- Steeper learning curve for non-developers
- Pulumi Cloud required for team features (or self-manage backend)
- Less mature hiring pool than Terraform
- Runtime errors vs static HCL errors

---

## AWS CDK

### What It Is

AWS CDK (Cloud Development Kit) is AWS's official IaC framework. It uses TypeScript, Python, Java, or C# to define infrastructure as **constructs** that compile to CloudFormation templates. It's the highest-level abstraction of the three.

### Language and Constructs

CDK's key concept is the **construct** — a reusable component that encapsulates common infrastructure patterns:

```typescript
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class AppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const dataBucket = new s3.Bucket(this, "DataBucket", {
            versioned: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
    }
}

const app = new cdk.App();
new AppStack(app, "MyApp", {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
```

CDK includes **L2 constructs** with sensible defaults (like the S3 example above) and **L3 constructs** (patterns) that bundle common architectures:

```typescript
import * as patterns from "aws-cdk-lib/aws-ecs-patterns";

// Single construct for ALB + ECS Fargate service
const service = new patterns.ApplicationLoadBalancedFargateService(this, "Service", {
    cluster,
    memoryLimitMiB: 1024,
    desiredCount: 2,
    taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry("nginx:latest"),
    },
});
```

What would be 200 lines of CloudFormation or 50 lines of Terraform is 10 lines with CDK patterns.

### State Management

CDK compiles to CloudFormation, so state is managed by CloudFormation itself — tracked in CloudFormation stacks. This is both a strength (AWS manages the state) and a limitation (you're dependent on CloudFormation's deployment behavior and limits).

No separate state file to manage. CloudFormation handles drift detection, rollbacks, and change sets.

### Cloud Provider Support

CDK only supports AWS. This is a hard limit — CDK generates CloudFormation, which is an AWS-only service. If you run multi-cloud, CDK isn't the right tool.

### Testing

CDK has strong testing support through `aws-cdk-lib/assertions`:

```typescript
import { Template } from "aws-cdk-lib/assertions";

test("S3 bucket has versioning enabled", () => {
    const app = new cdk.App();
    const stack = new AppStack(app, "TestStack");
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::S3::Bucket", {
        VersioningConfiguration: {
            Status: "Enabled",
        },
    });
});
```

You're asserting against the generated CloudFormation template, which is reliable and fast.

### Strengths

- Highest-level abstractions — L2/L3 constructs reduce boilerplate dramatically
- No separate state management (CloudFormation handles it)
- Deep AWS integration — new services supported quickly
- Excellent TypeScript support and type safety for AWS APIs
- CDK Constructs Hub for community-maintained patterns
- Official AWS support

### Weaknesses

- AWS only — no multi-cloud
- CloudFormation limits apply (500 resource limit per stack)
- Compiling to CloudFormation adds a layer of indirection
- Slower deployments than Terraform for large stacks
- CloudFormation error messages can be cryptic

---

## Side-by-Side Comparison

| Feature | Terraform | Pulumi | AWS CDK |
|---------|-----------|--------|---------|
| **Language** | HCL (DSL) | TS/Python/Go/C#/Java | TS/Python/Java/C# |
| **Cloud support** | Multi-cloud | Multi-cloud | AWS only |
| **Provider ecosystem** | Largest (3,000+) | Large (+ TF bridge) | AWS only |
| **State management** | Self-managed | Pulumi Cloud or self | CloudFormation |
| **Testing** | Limited (improving) | Excellent | Good |
| **Abstraction level** | Low-Medium | Medium | High |
| **Learning curve** | Low (HCL) | Medium | Medium |
| **Non-developer readable** | Yes | Harder | Harder |
| **Hiring pool** | Largest | Medium | Medium |
| **License** | BSL 1.1 | Apache 2.0 | Apache 2.0 |

---

## Migration Paths

### From Terraform to Pulumi

Pulumi can import existing Terraform state:

```bash
pulumi convert --from terraform --language typescript
```

This auto-generates Pulumi code from your Terraform configuration. Results vary by complexity, but it's a viable starting point.

### From CloudFormation to CDK

CDK includes `CfnInclude` to wrap existing CloudFormation resources, allowing incremental migration:

```typescript
const cfnTemplate = new cfn_inc.CfnInclude(this, "ExistingTemplate", {
    templateFile: "existing-template.json",
});
```

### From CDK to Pulumi

AWS CDK compiles to CloudFormation JSON, which Pulumi can import — giving you a migration path if you later need multi-cloud support.

---

## When to Choose Each

### Choose Terraform when:
- You need **multi-cloud or non-AWS services** (GCP, Azure, Cloudflare, Datadog, etc.)
- Your team includes **non-developers** who need to read/write infrastructure config
- You want the **largest hiring pool** and community
- You're working with an existing Terraform codebase
- You need **OpenTofu compatibility** (open-source Terraform fork)

### Choose Pulumi when:
- Your team is **developer-first** and prefers real programming languages
- You need **complex loops, abstractions, or conditional logic** that HCL can't cleanly express
- **Testing** infrastructure code is a priority
- You're already writing TypeScript or Python and want **infrastructure in the same codebase**
- You need multi-cloud but want better language ergonomics than HCL

### Choose AWS CDK when:
- You're **100% AWS** with no plans to go multi-cloud
- You want the **highest-level abstractions** — L3 patterns for common architectures
- Your team writes TypeScript and values **deep AWS type safety**
- You want **CloudFormation-managed state** without the operational overhead
- You're building AWS-native applications and want tight integration with CDK Pipelines

---

## The Bottom Line

If you're greenfield and AWS-only: **CDK** is the best developer experience and reduces boilerplate significantly.

If you're multi-cloud or need non-AWS services: **Terraform** for the ecosystem, **Pulumi** for the language ergonomics.

If you have an existing Terraform codebase: stick with Terraform unless you have a concrete reason to switch — the migration cost is real.

The "best" IaC tool is the one your team will actually maintain consistently. A well-organized Terraform codebase will outlast a poorly written Pulumi program.
