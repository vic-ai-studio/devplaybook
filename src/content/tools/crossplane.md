---
title: "Crossplane"
description: "Extend Kubernetes to provision and manage cloud infrastructure using the same GitOps workflows as your applications"
category: "cloud-native"
tags: ["kubernetes", "devops", "infrastructure-as-code", "cloud", "platform-engineering"]
pricing: "Open Source"
website: "https://www.crossplane.io"
github: "https://github.com/crossplane/crossplane"
date: "2026-04-03"
pros:
  - "Unifies infrastructure and application management under a single Kubernetes control plane"
  - "Composite Resources (XR) let platform teams expose curated, self-service infrastructure APIs"
  - "Rich provider ecosystem covering AWS, GCP, Azure, and Terraform-backed resources"
  - "Continuous drift detection and reconciliation keeps actual cloud state in sync with desired state"
cons:
  - "Significant conceptual overhead with Compositions, XRDs, Claims, and provider configs"
  - "Debugging failed cloud resource provisioning can be difficult across multiple abstraction layers"
  - "Provider maturity varies — some cloud resources have incomplete or lagging coverage"
---

## Crossplane: Infrastructure as Code for Kubernetes

Crossplane is an open source CNCF graduated project that extends Kubernetes to manage external cloud infrastructure. It transforms your Kubernetes cluster into a universal control plane, allowing you to provision and manage AWS, GCP, Azure, and other cloud resources using standard Kubernetes APIs and GitOps workflows.

## Key Features

- **Universal control plane**: Manage cloud resources (databases, buckets, networks, VMs) using `kubectl` and Kubernetes manifests
- **Composite resources (XR)**: Create abstracted, opinionated infrastructure APIs that hide provider complexity from developers
- **Provider ecosystem**: Official providers for AWS, GCP, Azure, Kubernetes, Helm, Terraform, and many more
- **GitOps native**: All infrastructure state lives in Git and is reconciled continuously by Kubernetes controllers
- **Self-service infrastructure**: Platform teams expose curated infrastructure APIs; application teams consume them without cloud knowledge
- **Drift detection**: Crossplane continuously reconciles desired state against actual cloud resource state
- **Compositions**: Build reusable infrastructure templates that assemble multiple cloud resources into a single logical unit
- **Claims**: Developers request infrastructure via simple, abstract Custom Resources without knowing underlying implementation

## Use Cases

- **Platform engineering**: Build internal developer platforms where teams provision databases, queues, and buckets via familiar Kubernetes tooling
- **Multi-cloud portability**: Abstract provider-specific resources behind custom APIs that work across cloud providers
- **Compliance enforcement**: Encode organizational standards into Composition templates so developers can only provision compliant resources
- **GitOps for infrastructure**: Manage all cloud resources in Git alongside application code with the same ArgoCD or Flux setup
- **Managed service provisioning**: Provision RDS, Cloud SQL, or Azure Database instances as part of application deployment pipelines

## Quick Start

Install Crossplane and the AWS provider:

```bash
# Install Crossplane via Helm
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm install crossplane \
  --namespace crossplane-system \
  --create-namespace \
  crossplane-stable/crossplane

# Install the AWS provider
kubectl apply -f - <<EOF
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v0.47.0
EOF
```

Configure AWS credentials and provision an S3 bucket:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-secret
  namespace: crossplane-system
type: Opaque
stringData:
  credentials: |
    [default]
    aws_access_key_id = YOUR_KEY
    aws_secret_access_key = YOUR_SECRET
---
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-secret
      key: credentials
---
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-app-bucket
spec:
  forProvider:
    region: us-east-1
  providerConfigRef:
    name: default
```

Define a Composition for a self-service database:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xpostgresqlinstances.db.example.com
spec:
  group: db.example.com
  names:
    kind: XPostgreSQLInstance
    plural: xpostgresqlinstances
  claimNames:
    kind: PostgreSQLInstance
    plural: postgresqlinstances
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
                    storageGB:
                      type: integer
```

## Comparison with Alternatives

| Feature | Crossplane | Terraform | Pulumi |
|---|---|---|---|
| Control plane | Kubernetes-native | CLI + state file | CLI + state file |
| GitOps native | Yes | Requires CI/CD | Requires CI/CD |
| Drift detection | Continuous | On `plan` run | On `preview` run |
| Developer UX | kubectl + CRDs | HCL files | Programming language |
| State management | Kubernetes etcd | Remote state | Pulumi Cloud / backends |
| Ecosystem | Growing | Massive | Growing |

**vs Terraform**: Terraform is the most mature IaC tool with the largest provider ecosystem, but relies on a separate state file and CI/CD pipeline. Crossplane integrates directly into Kubernetes, enabling continuous reconciliation. Teams already running Kubernetes find Crossplane's workflow more natural.

**vs Pulumi**: Pulumi uses real programming languages for infrastructure definition, which is powerful for complex logic. Crossplane uses declarative YAML/CRDs, which fits better into GitOps patterns but is less flexible for imperative workflows.

Crossplane is the ideal choice for platform engineering teams building Kubernetes-native internal developer platforms with self-service infrastructure capabilities.
