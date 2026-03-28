---
title: "Crossplane: Infrastructure as Code Using Kubernetes"
description: "Crossplane turns Kubernetes into a universal control plane for infrastructure. Learn how to provision AWS, GCP, and Azure resources as Kubernetes CRDs using Crossplane providers, compositions, and XRDs."
date: "2026-03-28"
tags: [crossplane, kubernetes, infrastructure-as-code, platform-engineering, aws, devops]
readingTime: "10 min read"
author: "DevPlaybook Team"
---

# Crossplane: Infrastructure as Code Using Kubernetes

Crossplane turns your Kubernetes cluster into a universal infrastructure control plane. Instead of using separate tools for managing cloud resources (Terraform, Pulumi, CloudFormation), Crossplane lets you declare infrastructure resources as Kubernetes custom resources — and the Kubernetes reconciliation loop keeps them in the desired state.

The pitch: your platform team provides high-level abstractions (like a "DatabaseInstance" CRD), and application teams provision infrastructure by applying YAML to Kubernetes — the same workflow they already use for deploying applications.

## Why Crossplane?

Before comparing to Terraform, understand Crossplane's position: it's not competing with Terraform for all infrastructure-as-code use cases. It specifically targets **platform teams building internal developer platforms** on top of Kubernetes.

The value proposition:

1. **Single API surface**: Application teams interact with one system (Kubernetes) for both application deployments and infrastructure provisioning
2. **Self-service with guardrails**: Platform teams define allowed infrastructure configurations; application teams fill in parameters
3. **Continuous reconciliation**: Crossplane watches for configuration drift and corrects it automatically, just like Kubernetes does for deployments
4. **GitOps-native**: Infrastructure definitions are Kubernetes resources, so GitOps tools (ArgoCD, Flux) manage them naturally
5. **Composition**: Platform teams can compose multiple cloud resources into higher-level abstractions

## Architecture

Crossplane runs as a set of controllers in your Kubernetes cluster:

```
┌─────────────────────────────────────────────┐
│              Kubernetes Cluster              │
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │           Crossplane Core               ││
│  │   Provider-AWS   Provider-GCP           ││
│  │   Provider-Azure Provider-Helm          ││
│  └──────────────┬──────────────────────────┘│
│                 │ Reconcile                  │
│  ┌──────────────▼──────────────────────────┐│
│  │         Cloud Providers                 ││
│  │   AWS API    GCP API    Azure API        ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Providers** are the adapters for cloud platforms. Provider-AWS manages AWS resources; Provider-GCP manages GCP; Provider-Helm manages Helm releases in your cluster.

**Managed Resources (MRs)** are direct mappings to cloud provider resources — an RDS instance, an S3 bucket, a GKE cluster.

**Composite Resources (XRs)** and **Compositions** are platform team abstractions that compose multiple managed resources.

## Installation

```bash
# Install Crossplane
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm install crossplane --namespace crossplane-system \
  --create-namespace crossplane-stable/crossplane

# Verify installation
kubectl get pods -n crossplane-system
```

Install the AWS provider:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v1.1.0
```

Configure AWS credentials:

```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: InjectedIdentity  # Use IRSA or pod identity
```

For local development with static credentials:

```bash
# Create a credentials secret
kubectl create secret generic aws-credentials \
  -n crossplane-system \
  --from-file=credentials=./aws-credentials.txt
```

```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-credentials
      key: credentials
```

## Managed Resources: Direct Cloud Resources

Managed Resources are 1:1 mappings to cloud provider APIs. Platform teams use these to provision infrastructure directly, or application teams use them when full control is needed.

Provision an S3 bucket:

```yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-data-bucket
  annotations:
    crossplane.io/external-name: acme-my-data-bucket-prod
spec:
  forProvider:
    region: us-east-1
    tags:
      Owner: data-team
      Environment: production
  providerConfigRef:
    name: default
```

Provision an RDS instance:

```yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: payments-db
spec:
  forProvider:
    region: us-east-1
    instanceClass: db.t3.medium
    engine: postgres
    engineVersion: "15.4"
    allocatedStorage: 100
    storageType: gp3
    dbName: payments
    username: admin
    passwordSecretRef:
      namespace: crossplane-system
      name: db-password
      key: password
    vpcSecurityGroupIds:
      - sg-0123456789abcdef0
    dbSubnetGroupName: private-subnets
    backupRetentionPeriod: 7
    deletionProtection: true
    skipFinalSnapshot: false
    finalSnapshotIdentifier: payments-db-final
    tags:
      Owner: payments-team
  providerConfigRef:
    name: default
```

Crossplane creates this RDS instance and monitors it. If someone manually modifies the instance in the AWS console, Crossplane detects the drift and corrects it.

## Compositions: Higher-Level Abstractions

Compositions are where Crossplane's real power emerges. They let platform teams define higher-level abstractions from multiple managed resources.

### Defining a Composite Resource (XRD)

First, define the schema for your abstraction:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xpostgresinstances.platform.acme.io
spec:
  group: platform.acme.io
  names:
    kind: XPostgresInstance
    plural: xpostgresinstances
  claimNames:
    kind: PostgresInstance
    plural: postgresinstances
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                parameters:
                  type: object
                  properties:
                    size:
                      type: string
                      enum: [small, medium, large]
                      description: "Database instance size"
                    storageGB:
                      type: integer
                      minimum: 20
                      maximum: 1000
                    region:
                      type: string
                      default: us-east-1
                  required:
                    - size
                    - storageGB
```

### Defining the Composition

The composition maps the XRD parameters to actual managed resources:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresinstances.aws.platform.acme.io
  labels:
    provider: aws
spec:
  compositeTypeRef:
    apiVersion: platform.acme.io/v1alpha1
    kind: XPostgresInstance
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
            username: admin
            backupRetentionPeriod: 7
            deletionProtection: true
            skipFinalSnapshot: false
          providerConfigRef:
            name: default
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.storageGB
          toFieldPath: spec.forProvider.allocatedStorage
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.size
          toFieldPath: spec.forProvider.instanceClass
          transforms:
            - type: map
              map:
                small: db.t3.micro
                medium: db.t3.medium
                large: db.r6g.large
        - type: ToCompositeFieldPath
          fromFieldPath: status.atProvider.endpoint
          toFieldPath: status.endpoint

    - name: rds-subnet-group
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: SubnetGroup
        spec:
          forProvider:
            region: us-east-1
            subnetIds:
              - subnet-aaaa
              - subnet-bbbb
          providerConfigRef:
            name: default
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region
```

### Using the Abstraction

Application teams now provision databases using your high-level abstraction:

```yaml
apiVersion: platform.acme.io/v1alpha1
kind: PostgresInstance  # The claim type (namespaced)
metadata:
  name: payments-db
  namespace: payments-team
spec:
  parameters:
    size: medium
    storageGB: 100
    region: us-east-1
  compositionSelector:
    matchLabels:
      provider: aws
  writeConnectionSecretToRef:
    name: payments-db-credentials
```

The application team has no visibility into the underlying RDS implementation — they just request a `PostgresInstance` and get back a connection secret. Platform teams control the allowed sizes, regions, and configurations.

## Crossplane vs Terraform

The comparison is nuanced because the use cases overlap but aren't identical:

| Dimension | Crossplane | Terraform |
|-----------|------------|-----------|
| State storage | Kubernetes etcd | terraform.tfstate files / remote backend |
| Reconciliation | Continuous (like K8s) | Manual `terraform apply` |
| Drift detection | Automatic, continuous | Manual `terraform plan` |
| API | Kubernetes CRDs | HCL |
| Ecosystem | Growing (providers) | Mature (1000+ providers) |
| Self-service | Native (XRDs = abstraction layer) | Via Terraform modules + CI/CD |
| Non-K8s infrastructure | Limited | Full coverage |
| Learning curve | Higher (K8s knowledge required) | Lower (HCL is straightforward) |

**Crossplane is better when**: You're building a platform on Kubernetes and want application teams to provision infrastructure via Kubernetes APIs. The GitOps workflow is a first-class requirement.

**Terraform is better when**: You need to manage infrastructure beyond Kubernetes (VPCs, DNS, IAM, accounts), you have existing Terraform expertise, or your organization doesn't run Kubernetes.

Many organizations use both: Terraform for foundational infrastructure (accounts, networks, Kubernetes clusters themselves), Crossplane for application-level infrastructure provisioned by teams within those clusters.

## Real-World Pattern: Database-as-a-Service

A common Crossplane pattern: provide teams a self-service way to provision databases within approved guardrails.

Platform team provides:
- `XPostgresInstance` XRD with allowed sizes (small/medium/large)
- Composition that creates the RDS instance with company-standard settings (encryption, backups, logging)
- RBAC that allows teams to create `PostgresInstance` claims in their namespaces

Application team experience:
1. Apply a `PostgresInstance` claim YAML
2. Crossplane creates the RDS instance with platform-standard settings
3. Crossplane writes the connection string to a Kubernetes secret
4. The application references the secret — no manual credential handling

This pattern scales to any resource type: queues, caches, buckets, certificates, DNS records.

## Observability

Crossplane exposes status conditions following the Kubernetes conditions pattern:

```bash
# Check a managed resource status
kubectl get postgresinstance.platform.acme.io payments-db -o yaml

# Status section shows:
status:
  conditions:
    - type: Ready
      status: "True"
      reason: Available
    - type: Synced
      status: "True"
      reason: ReconcileSuccess
  endpoint: payments-db.xxxxx.us-east-1.rds.amazonaws.com
```

Tools that understand Kubernetes conditions — Backstage's Kubernetes plugin, Argo CD, monitoring systems — work with Crossplane resources naturally.

## Getting Started Path

1. Install Crossplane in a dev cluster
2. Install Provider-AWS and configure credentials
3. Provision a simple managed resource (an S3 bucket)
4. Define your first composition for a common resource type (RDS, Redis, etc.)
5. Expose the XRD to application teams
6. Integrate with your GitOps tool (ArgoCD or Flux)

The learning curve is real — Crossplane requires solid Kubernetes knowledge and the composition syntax has edge cases. Budget time for the first composition, and it gets easier from there.

## Conclusion

Crossplane earns its place in the platform engineering toolbox for teams building developer platforms on Kubernetes. The ability to define infrastructure abstractions as Kubernetes CRDs, reconcile continuously, and integrate natively with GitOps workflows makes it compelling for self-service infrastructure use cases.

For teams evaluating Crossplane vs Terraform: they're complementary more than competitive. Use Terraform for foundational infrastructure, Crossplane for the application-layer self-service infrastructure your developers provision day-to-day.
