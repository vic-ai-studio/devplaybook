---
title: "Crossplane vs Terraform for Platform Engineering: Infrastructure-as-Code in 2026"
description: "Compare Crossplane and Terraform for platform engineering. Control plane vs declarative IaC, use cases, strengths, and which to choose for your infrastructure automation strategy."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["crossplane", "terraform", "platform-engineering", "infrastructure-as-code", "kubernetes", "devops", "iac"]
readingTime: "10 min read"
---

Platform engineering teams face a core tension: developers want self-service infrastructure, but infrastructure teams need guardrails, consistency, and auditability. How you provision and manage cloud infrastructure determines how well that tension resolves.

Two tools define the infrastructure-as-code landscape for platform engineers in 2026: **Terraform** and **Crossplane**. They look similar from the outside—both provision cloud resources declaratively—but they're solving different problems with different architectural assumptions. Choosing between them (or combining them) shapes your platform team's operational model for years.

---

## IaC Approaches: The Core Difference

**Terraform** is a plan-and-apply execution engine. You write HCL (or Terraform CDK), run `terraform plan` to preview changes, and `terraform apply` to execute them. State is stored externally (S3, Terraform Cloud). Drift detection requires periodic `terraform plan` runs. The human or CI/CD system drives the apply.

**Crossplane** is a Kubernetes control plane extension. You define desired infrastructure state as Kubernetes CRDs, and Crossplane controllers continuously reconcile actual cloud state to match. No CLI apply step—the cluster is the engine. Drift is detected and corrected automatically.

This is the fundamental architectural difference: **Terraform is a tool you run; Crossplane is a system that runs**.

---

## Terraform in Depth

Terraform was created by HashiCorp (now IBM) in 2014. It's the default IaC tool for most organizations, with provider support for 3,000+ services.

### How It Works

```hcl
# main.tf
resource "aws_s3_bucket" "data_lake" {
  bucket = "my-company-data-lake-${var.environment}"
  tags = {
    Environment = var.environment
    Team        = "data-platform"
  }
}

resource "aws_s3_bucket_versioning" "data_lake_versioning" {
  bucket = aws_s3_bucket.data_lake.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

The workflow:
```bash
terraform init     # download providers
terraform plan     # preview changes
terraform apply    # execute changes
terraform destroy  # tear down resources
```

State is stored remotely and tracks the mapping between Terraform resources and actual cloud resources. The state file is the source of truth for what Terraform manages.

### Terraform for Platform Engineering

Platform teams use Terraform modules to create reusable infrastructure templates:

```hcl
# modules/rds-postgres/main.tf
module "rds_postgres" {
  source = "./modules/rds-postgres"

  identifier        = "app-${var.team}-${var.environment}"
  engine_version    = "15.4"
  instance_class    = var.instance_class
  allocated_storage = var.storage_gb
  db_name           = var.database_name

  # VPC config inherited from platform module
  vpc_id             = module.vpc.id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [aws_security_group.rds.id]
}
```

Developer teams call the module with approved parameters. The platform team controls what's allowed by the module's variable constraints and validation rules.

### Terraform Strengths

**Mature ecosystem**: 3,000+ providers, OpenTofu fork (Apache 2.0), Pulumi compatibility, CDK for Terraform. Whatever you need to provision exists as a provider.

**Universal**: Works against any cloud, on-prem, SaaS APIs. Kubernetes, AWS, Azure, GCP, Datadog, PagerDuty, Snowflake—all from the same toolchain.

**GitOps-compatible**: Terraform Cloud, Atlantis, and env0 implement Git-triggered plan/apply workflows.

**Readable plan output**: The diff between current and desired state is human-readable before apply. Essential for change management processes.

**State inspection**: `terraform state list`, `terraform state show`, `terraform console`—comprehensive tools for understanding current state.

### Terraform Weaknesses

**Drift requires manual remediation**: Terraform detects drift on the next `terraform plan`, but doesn't auto-correct. Someone has to run `terraform apply`.

**Apply is a point-in-time operation**: Between applies, infrastructure can drift without anyone noticing unless you run periodic drift detection.

**Module versioning is the developer UX**: Developers calling your modules need to know Terraform. Self-service without platform team involvement requires developer HCL literacy.

**State file is sensitive**: Contains resource IDs, sometimes secrets. Access control and remote state encryption are required operational concerns.

---

## Crossplane in Depth

Crossplane is a CNCF graduated project that extends Kubernetes to provision and manage cloud infrastructure. It was created by Upbound in 2018.

### How It Works

Crossplane installs providers as Kubernetes controllers. Each provider maps cloud resource types to Kubernetes CRDs. You declare infrastructure as Kubernetes objects:

```yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: data-lake
  namespace: platform
spec:
  forProvider:
    region: us-east-1
    tags:
      Environment: production
      Team: data-platform
  providerConfigRef:
    name: aws-provider
```

Apply it:
```bash
kubectl apply -f bucket.yaml
```

Crossplane's S3 controller detects the object, calls AWS APIs to create the bucket, and continuously reconciles—if someone modifies or deletes the bucket outside Kubernetes, the controller recreates it.

### Composite Resources: The Platform Engineering Superpower

Crossplane's killer feature for platform engineering is **Composite Resource Definitions (XRDs)**. These allow platform teams to define abstract, self-service infrastructure APIs that developers consume without knowing the underlying implementation.

Define a `PostgreSQLInstance` abstraction:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xpostgresqlinstances.database.platform.io
spec:
  group: database.platform.io
  names:
    kind: XPostgreSQLInstance
    plural: xpostgresqlinstances
  claimNames:
    kind: PostgreSQLInstance
    plural: postgresqlinstances
  versions:
  - name: v1alpha1
    schema:
      openAPIV3Schema:
        properties:
          spec:
            properties:
              parameters:
                properties:
                  size:
                    type: string
                    enum: [small, medium, large]
                  databaseName:
                    type: string
```

Define a `Composition` that maps the abstract API to real AWS RDS resources:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresqlinstances-aws
spec:
  compositeTypeRef:
    apiVersion: database.platform.io/v1alpha1
    kind: XPostgreSQLInstance
  resources:
  - name: rds-instance
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          region: us-east-1
          engine: postgres
          engineVersion: "15.4"
    patches:
    - fromFieldPath: "spec.parameters.size"
      toFieldPath: "spec.forProvider.instanceClass"
      transforms:
      - type: map
        map:
          small: db.t3.micro
          medium: db.t3.medium
          large: db.r5.large
```

Developers now request a database with:

```yaml
apiVersion: database.platform.io/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: app-database
  namespace: my-team
spec:
  parameters:
    size: medium
    databaseName: app_prod
  writeConnectionSecretToRef:
    name: app-db-credentials
```

The developer has no idea whether they're getting RDS, Cloud SQL, or Azure Database. The platform team controls the implementation. Connection credentials are automatically written to a Kubernetes Secret.

### Crossplane Strengths

**Continuous reconciliation**: Drift is detected and corrected automatically. No manual apply required, no drift monitoring pipelines.

**Self-service abstractions**: XRDs let platform teams build developer-facing APIs with approved configurations. Developers use `kubectl` (or any Kubernetes client) without HCL knowledge.

**Kubernetes-native**: Lives inside your cluster. Works with existing RBAC, GitOps tooling (ArgoCD/Flux), admission webhooks, and audit logging.

**Multi-cloud composition**: A single `Composition` can reference resources across AWS, Azure, and GCP in one object.

**Connection secret management**: Providers automatically create Kubernetes Secrets with connection details—credentials never leave the cluster.

### Crossplane Weaknesses

**Kubernetes is required**: If you don't run Kubernetes, Crossplane doesn't apply. Not appropriate for organizations without Kubernetes expertise.

**Provider maturity varies**: AWS and GCP providers (via Upbound's official providers) are production-grade. Smaller providers may be community-maintained with gaps.

**Debugging is harder**: When a resource fails to reconcile, the error is in Kubernetes events and controller logs—not a clear CLI diff like `terraform plan`.

**Initial complexity**: XRDs and Compositions have a learning curve. A platform team needs to design the abstraction layer thoughtfully before developers can self-serve.

**State is implicit**: The Kubernetes cluster IS the state store. Cluster disasters require careful backup and recovery strategies.

---

## Control Plane vs Declarative IaC: When Each Shines

| Scenario | Terraform | Crossplane |
|----------|-----------|------------|
| Small team, few cloud resources | ✅ Simple, low overhead | Overkill |
| Developer self-service at scale | Possible (with Atlantis/modules) | ✅ XRDs purpose-built for this |
| Multi-cloud single workflow | ✅ Universal providers | ✅ Provider ecosystem growing |
| Drift auto-remediation | Manual | ✅ Automatic |
| Non-Kubernetes infrastructure | ✅ | ❌ Requires Kubernetes |
| Platform abstractions | Via modules | ✅ XRDs are purpose-built |
| VM/legacy workloads | ✅ | Limited |
| Existing Terraform codebase | ✅ | Migration effort |

---

## Use Case Fit

### When to Choose Terraform

**You're provisioning non-Kubernetes infrastructure.** VMs, legacy services, DNS, CDN configuration, SaaS integrations—Terraform is the universal tool. Crossplane's value proposition assumes Kubernetes centrality.

**Your team isn't Kubernetes-first.** Terraform's HCL is a lower adoption barrier than becoming proficient with Kubernetes controllers, CRDs, and the reconciliation model.

**You need plan/apply approval workflows.** Regulated environments often require explicit human review of planned infrastructure changes before apply. Terraform's plan-then-apply model maps cleanly to change management processes.

**You have significant existing Terraform codebase.** The migration cost to Crossplane is rarely worth it unless you're building a new platform.

### When to Choose Crossplane

**You're building an internal developer platform (IDP) on Kubernetes.** Crossplane + ArgoCD/Flux is the IDP stack. Developers get a self-service API; platform teams maintain control.

**Drift auto-remediation is a compliance requirement.** Continuous reconciliation means you can guarantee infrastructure matches spec without manual intervention.

**Your platform team wants to abstract cloud providers.** XRDs let you swap from AWS RDS to Azure Database without changing the developer API—true multi-cloud portability.

---

## Using Both Together

The pragmatic answer for many platform teams is: **use Terraform for foundational infrastructure, Crossplane for developer-facing self-service**.

Common pattern:
- **Terraform**: VPC, subnets, IAM roles, EKS/GKE cluster bootstrap, global DNS
- **Crossplane**: Developer-requested databases, queues, object storage, secrets

Terraform provisions the Kubernetes cluster and baseline infrastructure. Crossplane runs in that cluster and handles developer self-service from there. The provider-by-provider boundary keeps each tool in its strength zone.

---

## Conclusion

Terraform remains the default choice for infrastructure provisioning in 2026—battle-tested, universally applicable, and widely understood. If you're not building a Kubernetes-centric internal developer platform, Terraform is the right answer.

Crossplane is the right choice when you're building a platform, not just writing IaC. Its XRD-based abstraction model enables developer self-service at scale in a way Terraform modules can approximate but not match. The continuous reconciliation model eliminates an entire class of operational drift problems.

The question is: are you an infrastructure team writing IaC, or are you a platform engineering team building a product for developers? That distinction answers the Terraform vs Crossplane question cleanly.
