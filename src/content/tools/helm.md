---
title: "Helm"
description: "The package manager for Kubernetes that simplifies deploying and managing complex applications"
category: "cloud-native"
tags: ["kubernetes", "devops", "package-manager", "cloud", "deployment"]
pricing: "Open Source"
website: "https://helm.sh"
github: "https://github.com/helm/helm"
date: "2026-04-03"
pros:
  - "De facto standard for Kubernetes packaging with massive ecosystem on Artifact Hub"
  - "Release management with built-in rollback, upgrade history, and atomic installs"
  - "Go templating engine enables highly parameterized, reusable chart definitions"
  - "OCI registry support for storing charts alongside container images"
cons:
  - "Go template syntax can become complex and hard to debug in large charts"
  - "Helm charts can obscure the underlying Kubernetes resources, making troubleshooting harder"
  - "No built-in drift detection — Helm does not reconcile if resources are modified outside of Helm"
---

## Helm: Kubernetes Package Manager

Helm is the de facto package manager for Kubernetes. It helps you define, install, and upgrade even the most complex Kubernetes applications through reusable, versioned packages called charts. Helm is a CNCF graduated project and one of the most widely used tools in the Kubernetes ecosystem.

## Key Features

- **Charts**: Package Kubernetes manifests, default values, and metadata into reusable, versioned units
- **Templating engine**: Use Go templates to generate dynamic Kubernetes manifests from parameterized values
- **Release management**: Track every deployment as a named release with history, rollback, and upgrade support
- **Repository system**: Host and share charts publicly via Artifact Hub or privately in your own Helm registry
- **Dependency management**: Define chart dependencies that are automatically downloaded and installed
- **Hooks**: Execute jobs or operations at specific points in the release lifecycle (pre-install, post-upgrade, etc.)
- **Test framework**: Run Helm tests to validate that a release is functioning correctly after deployment
- **OCI support**: Store and distribute charts in OCI-compliant container registries

## Use Cases

- **Application packaging**: Bundle microservices and their dependencies into a single installable unit
- **Environment configuration**: Manage environment-specific values (dev/staging/prod) with values files and overrides
- **Third-party software**: Install databases, monitoring stacks, ingress controllers, and other OSS tools from Artifact Hub
- **CI/CD pipelines**: Automate versioned deployments with `helm upgrade --install` in your pipeline scripts
- **Platform engineering**: Build internal developer platforms that expose curated charts to application teams

## Quick Start

Install Helm and deploy your first chart:

```bash
# Install Helm (macOS)
brew install helm

# Add the official stable chart repository
helm repo add stable https://charts.helm.sh/stable
helm repo update

# Install nginx-ingress
helm install my-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Check the release status
helm status my-ingress -n ingress-nginx
```

Create a custom chart for your application:

```bash
# Scaffold a new chart
helm create my-app

# my-app/
#   Chart.yaml        — chart metadata
#   values.yaml       — default configuration values
#   templates/        — Kubernetes manifest templates
#   charts/           — chart dependencies

# Install with custom values
helm install my-app ./my-app \
  --set image.tag=v1.2.3 \
  --set replicaCount=3

# Upgrade and rollback
helm upgrade my-app ./my-app --set image.tag=v1.2.4
helm rollback my-app 1
```

Example `values.yaml` override for production:

```yaml
replicaCount: 5
image:
  repository: your-registry/my-app
  tag: "v1.2.3"
  pullPolicy: IfNotPresent
resources:
  limits:
    cpu: 500m
    memory: 512Mi
```

## Comparison with Alternatives

| Feature | Helm | Kustomize | Timoni |
|---|---|---|---|
| Approach | Template-based packaging | Patch-based overlays | CUE-based typed configs |
| Learning curve | Moderate | Low | High |
| Reusability | Excellent (charts) | Good (bases) | Good |
| Type safety | Limited (Go templates) | None | Strong (CUE) |
| Ecosystem | Massive (Artifact Hub) | Growing | Early stage |

**vs Kustomize**: Helm uses Go templates for parameterization while Kustomize uses strategic merge patches and overlays. Helm is better for packaging and distributing reusable applications; Kustomize excels at managing environment-specific variations of your own apps. Many teams use both together — Helm for third-party tools and Kustomize for their own services.

**vs raw manifests**: Writing plain YAML is fine for simple apps but quickly becomes unmaintainable at scale. Helm adds versioning, templating, and rollback that make complex deployments manageable.

Helm's massive ecosystem on Artifact Hub (thousands of charts for popular software) makes it indispensable for quickly deploying and managing third-party applications on Kubernetes.
