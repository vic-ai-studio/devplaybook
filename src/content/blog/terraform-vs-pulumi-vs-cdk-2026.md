---
title: "Terraform vs Pulumi vs AWS CDK: Infrastructure as Code Comparison 2026"
description: "Complete comparison of Terraform, Pulumi, and AWS CDK for infrastructure as code in 2026. Covers language support, state management, learning curve, ecosystem, cloud support, pricing, and when to use each tool."
date: "2026-03-26"
tags: ["terraform", "pulumi", "aws-cdk", "iac", "infrastructure", "devops", "cloud", "aws"]
readingTime: "12 min read"
---

# Terraform vs Pulumi vs AWS CDK: Infrastructure as Code Comparison 2026

Infrastructure as code (IaC) is no longer optional — it's the baseline expectation for any team running cloud infrastructure. The three dominant tools in 2026 are **Terraform**, **Pulumi**, and **AWS CDK**. Each has a distinct philosophy, a loyal user base, and real trade-offs.

This guide cuts through the noise with a direct comparison across language support, state management, learning curve, ecosystem, cloud provider support, pricing, and practical recommendations for when to use each.

---

## Quick Summary

| Feature | Terraform | Pulumi | AWS CDK |
|---|---|---|---|
| Language | HCL (DSL) | Python, TS, Go, Java, C# | TypeScript, Python, Java, Go, C# |
| Cloud Support | Multi-cloud (all major) | Multi-cloud (all major) | AWS-only |
| State Management | Local / remote backends | Pulumi Cloud or self-hosted | CloudFormation (managed) |
| Learning Curve | Low-medium (HCL) | Medium (depends on language) | Medium-high (CDK constructs) |
| Ecosystem | Massive (3,000+ providers) | Growing fast | AWS-native, deep integrations |
| Free Tier | Open-source core free | Free for up to 1 user | Free (Apache 2.0) |
| Best For | Multi-cloud, large teams | Developer-first teams | AWS-heavy shops |

---

## Terraform: The Proven Standard

Terraform, originally by HashiCorp (now IBM), has dominated IaC for nearly a decade. Its declarative DSL — HCL (HashiCorp Configuration Language) — is purpose-built for describing infrastructure state.

### Language: HCL

HCL reads almost like JSON but is more human-friendly. You declare *what* you want, not *how* to get there.

```hcl
# Terraform: provision an S3 bucket + CloudFront distribution
resource "aws_s3_bucket" "site" {
  bucket = "my-app-${var.environment}"

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.site.id}"
  }

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.site.id}"

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

HCL is learnable in a day. The tradeoff: it's not a real programming language. Complex logic requires workarounds using `count`, `for_each`, and `dynamic` blocks.

### State Management

Terraform tracks infrastructure state in a `terraform.tfstate` file. For teams, this must live in a remote backend: S3 + DynamoDB lock, Terraform Cloud, or Azure Blob Storage. State management is manual — you're responsible for locking, versioning, and securing it.

### Ecosystem

Terraform's provider ecosystem is unmatched. The Terraform Registry lists 3,000+ providers covering AWS, GCP, Azure, Kubernetes, GitHub, Datadog, Cloudflare, and hundreds more. Finding a provider for any major SaaS product is routine.

### Pricing

- **Open-source (CLI)**: Free forever, including state in remote backends you manage yourself.
- **HCP Terraform (formerly Terraform Cloud)**: Free tier for up to 500 managed resources. Paid plans start at $20/user/month for teams.

### Terraform Strengths

- Largest provider ecosystem by far
- Stable, battle-tested in production at massive scale
- Declarative model prevents configuration drift
- Strong GitOps workflow support
- Wide hiring pool — Terraform skills are common

### Terraform Weaknesses

- HCL limits expressiveness for complex logic
- State file management adds operational burden
- HashiCorp's 2023 license change to BUSL (Business Source License) caused controversy — OpenTofu is the community fork that remains MPL-2.0
- Slower iteration speed for dynamic infrastructure patterns

---

## Pulumi: Infrastructure in Real Code

Pulumi takes a fundamentally different approach: write infrastructure using the same programming languages your application developers already use. TypeScript, Python, Go, Java, and C# are all supported.

### Language: Your Choice

The same S3 + CloudFront setup in Pulumi (TypeScript):

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const env = pulumi.getStack();

const bucket = new aws.s3.Bucket("site", {
  bucket: `my-app-${env}`,
  tags: {
    Environment: env,
    ManagedBy: "pulumi",
  },
});

const cdn = new aws.cloudfront.Distribution("cdn", {
  origins: [{
    domainName: bucket.bucketRegionalDomainName,
    originId: pulumi.interpolate`S3-${bucket.id}`,
  }],
  enabled: true,
  defaultRootObject: "index.html",
  defaultCacheBehavior: {
    allowedMethods: ["GET", "HEAD"],
    cachedMethods: ["GET", "HEAD"],
    targetOriginId: pulumi.interpolate`S3-${bucket.id}`,
    viewerProtocolPolicy: "redirect-to-https",
    forwardedValues: {
      queryString: false,
      cookies: { forward: "none" },
    },
  },
  restrictions: {
    geoRestriction: { restrictionType: "none" },
  },
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
});

export const bucketName = bucket.id;
export const cdnUrl = cdn.domainName;
```

The power becomes clear when logic gets complex. Loops, conditionals, functions, classes — all native. No HCL workarounds needed.

### State Management

Pulumi offers two options:

1. **Pulumi Cloud** (managed): Free for individuals, paid for teams. State is handled automatically with built-in encryption, history, and audit logs.
2. **Self-hosted backends**: S3, Azure Blob, GCS, or local. Full control, no vendor lock-in.

### Ecosystem

Pulumi supports 150+ providers, with native AWS, GCP, Azure, and Kubernetes providers that map 1:1 to the cloud provider APIs. The `pulumi-terraform-bridge` also lets you use any Terraform provider with Pulumi — giving access to most of Terraform's ecosystem.

### Pricing

- **Individual**: Free (unlimited resources)
- **Team**: $50/month for up to 10 members
- **Enterprise**: Custom pricing with SSO, audit logs, and policy enforcement

### Pulumi Strengths

- Real programming languages — full expressiveness
- Excellent for teams that want IaC in the same repo as application code
- Strong TypeScript/Python developer experience
- Pulumi AI for generating infrastructure code
- Self-hosted backends available (no vendor lock-in)

### Pulumi Weaknesses

- Smaller provider ecosystem than Terraform (though growing fast)
- More complex debugging than declarative HCL
- State management requires discipline with self-hosted backends
- Higher learning curve for ops-focused teams less comfortable with TypeScript/Python

---

## AWS CDK: AWS-Native, Developer-First

AWS Cloud Development Kit (CDK) is Amazon's answer to the "IaC in real code" question — but scoped exclusively to AWS. CDK synthesizes your code into CloudFormation templates, which AWS then deploys.

### Language: TypeScript, Python, Go, Java, C#

The same infrastructure in CDK (TypeScript):

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class MySiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `my-app-${this.stackName.toLowerCase()}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const distribution = new cloudfront.Distribution(this, 'SiteCDN', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
    });

    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'CdnUrl', { value: distribution.domainName });
  }
}
```

CDK's "constructs" are reusable building blocks that abstract CloudFormation complexity. A single CDK construct can represent what would be 200 lines of raw CloudFormation YAML.

### The Constructs Model

CDK has three levels of constructs:

- **L1 (Cfn resources)**: 1:1 mapping to CloudFormation resources. Low-level, verbose.
- **L2 (AWS constructs)**: Curated, opinionated wrappers with sensible defaults. Most commonly used.
- **L3 (Patterns)**: High-level patterns like `ApplicationLoadBalancedFargateService` that wire multiple L2 constructs together.

### State Management

CDK delegates state entirely to **CloudFormation**. CloudFormation tracks the deployed stack state, handles rollbacks, and manages drift detection. You don't manage a state file — AWS does it for you.

This is CDK's biggest operational advantage: no state backend to set up or secure.

### Ecosystem

CDK is AWS-only. If you need to manage GCP, Azure, Cloudflare, or GitHub resources alongside AWS, CDK can't help. The ecosystem is deep within AWS — every AWS service has official CDK support, often before Terraform and Pulumi catch up to new AWS launches.

CDK for Terraform (CDKTF) is a separate project that brings the CDK construct model to Terraform providers, but it's less mature and has its own trade-offs.

### Pricing

CDK itself is free and open-source (Apache 2.0). You pay for CloudFormation operations (free up to 1,000 handler operations per month, then $0.0009 per handler operation) and for the AWS resources CDK deploys.

### CDK Strengths

- Zero state management overhead (CloudFormation handles it)
- Deep AWS integration — new services supported immediately
- Excellent TypeScript/Python developer experience
- Constructs library provides pre-built, well-architected patterns
- Built-in drift detection and rollback via CloudFormation
- Free to use

### CDK Weaknesses

- AWS-only — no multi-cloud support
- CloudFormation's 500-resource stack limit can hit complex deployments
- Slower deployments than Terraform/Pulumi for large changes (CloudFormation speed)
- Debugging CDK → CloudFormation synthesis errors can be frustrating
- CloudFormation's eventual consistency can cause deployment flakiness

---

## Head-to-Head: Key Criteria

### Learning Curve

**Terraform** is easiest to start — HCL is purpose-built for infrastructure and the documentation is excellent. Most developers can be productive in a day.

**AWS CDK** has a moderate learning curve. Constructs are intuitive, but understanding L1/L2/L3 levels and CloudFormation's behavior underneath takes time.

**Pulumi** depends heavily on the language you choose. TypeScript developers will feel at home immediately. Python developers similarly. The Pulumi-specific async/output model adds cognitive overhead for complex configurations.

### Multi-Cloud Support

| Tool | AWS | GCP | Azure | Kubernetes | Other SaaS |
|---|---|---|---|---|---|
| Terraform | ✅ Excellent | ✅ Excellent | ✅ Excellent | ✅ Excellent | ✅ 3,000+ providers |
| Pulumi | ✅ Excellent | ✅ Good | ✅ Good | ✅ Excellent | ✅ 150+ providers |
| AWS CDK | ✅ Excellent | ❌ No | ❌ No | Limited | ❌ No |

If you're multi-cloud or need to manage non-AWS resources (GitHub, Cloudflare, Datadog), Terraform wins by ecosystem size. Pulumi is competitive with access to Terraform-bridged providers.

### Team Collaboration

**Terraform**: Remote state backends with locking (S3+DynamoDB or HCP Terraform) handle concurrency. Workspaces separate environments. CI/CD integration is mature.

**Pulumi**: Pulumi Cloud provides built-in collaboration with stack history and audit trails. Self-hosted is possible but more work. Strong GitHub Actions integration.

**AWS CDK**: CloudFormation handles state — no team coordination needed for state locking. AWS CodePipeline + CDK Pipelines provide native CI/CD. IAM controls access.

### Testing

**Terraform**: `terraform plan` is the primary validation tool. Unit testing via Terratest (Go) is possible but verbose.

**Pulumi**: First-class unit testing with Jest (TypeScript) or pytest (Python). Mock providers let you test without cloud credentials.

**AWS CDK**: Excellent testing via `aws-cdk-lib/assertions`. Snapshot tests catch unexpected changes. Integration tests deploy to real AWS accounts.

```typescript
// CDK unit test example
import { Template } from 'aws-cdk-lib/assertions';

test('S3 bucket created with correct name', () => {
  const app = new cdk.App();
  const stack = new MySiteStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: 'my-app-teststack',
  });
});
```

---

## When to Use Each Tool

### Choose Terraform when:

- You manage infrastructure across multiple cloud providers
- Your team has ops/DevOps backgrounds more comfortable with DSLs than code
- You need access to the widest possible provider ecosystem
- You want the most mature, battle-tested IaC tooling
- Your organization has existing Terraform knowledge and modules
- You want to avoid vendor lock-in (use open-source backend + OpenTofu)

### Choose Pulumi when:

- Your team is developer-heavy (TypeScript, Python, Go) and wants IaC in the same language as application code
- You have complex, dynamic infrastructure that benefits from real programming constructs
- You want multi-cloud with real language expressiveness
- You want strong unit testing for infrastructure code
- You value keeping infrastructure and application logic in the same monorepo

### Choose AWS CDK when:

- Your infrastructure is entirely on AWS (now and for the foreseeable future)
- You want zero state management overhead
- You're an AWS shop that wants to leverage AWS-native tooling and deep service integrations
- You want the best new-AWS-service support (CDK often supports new services before Terraform)
- Your team prefers TypeScript or Python and finds the constructs model intuitive
- You want CloudFormation rollbacks and drift detection without building the tooling yourself

---

## Migration Considerations

**Terraform to Pulumi**: Pulumi offers `pulumi convert --from terraform` to convert existing HCL. Works well for simple modules; complex dynamic configurations need manual review.

**Terraform to CDK**: No automated migration. CDK for Terraform (CDKTF) can import existing Terraform state, but it's a separate project with its own limitations.

**CDK to Terraform**: Requires rewriting stacks. CloudFormation state can be inspected to understand what resources exist, but you'll need to `terraform import` each resource.

---

## The 2026 Landscape

The IaC space has evolved significantly:

- **OpenTofu** (the open-source Terraform fork) reached 1.0 in 2024 and has growing adoption as teams avoid HashiCorp/IBM licensing risk
- **Pulumi AI** and **CDK Migrate** leverage LLMs to generate and convert infrastructure code
- **Crossplane** is emerging as a Kubernetes-native alternative for platform engineering teams
- All three tools now have strong GitHub Copilot/Claude integration for code generation

---

## Conclusion

There's no universally correct answer — the right tool depends on your team, your cloud strategy, and your existing tooling.

- **Terraform** remains the default for multi-cloud, heterogeneous infrastructure teams
- **Pulumi** is the best choice for developer-first teams who want real programming languages without sacrificing multi-cloud support
- **AWS CDK** wins for AWS-native shops that value deep integrations, zero state management overhead, and constructs-based abstractions

If you're starting fresh on AWS with a developer team, CDK is worth a serious look. If you're managing infrastructure across multiple clouds or need the widest ecosystem, Terraform (or OpenTofu) remains the pragmatic choice. Pulumi occupies an excellent middle ground for teams that want code-first IaC without the AWS lock-in.

The most important decision isn't which tool you pick — it's committing to IaC at all and building the discipline to keep it current.
