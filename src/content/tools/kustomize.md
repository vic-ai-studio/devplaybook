---
title: "Kustomize"
description: "Template-free Kubernetes configuration management using layered overlays and strategic merge patches"
category: "cloud-native"
tags: ["kubernetes", "devops", "configuration", "cloud", "gitops", "cloud-native", "k8s", "infrastructure"]
pricing: "Open Source"
pricingDetail: "Free and open-source (Apache 2.0). Built into kubectl since v1.14 — no separate installation or licensing required."
website: "https://kustomize.io"
github: "https://github.com/kubernetes-sigs/kustomize"
date: "2026-04-03"
pros:
  - "Template-free approach keeps manifests as plain, valid YAML that can be applied directly"
  - "Built into kubectl — no additional tool installation required"
  - "Base and overlay pattern makes multi-environment config management clean and auditable"
  - "First-class support in ArgoCD and FluxCD for GitOps workflows"
cons:
  - "Limited expressiveness compared to Helm templates for complex conditional logic"
  - "Strategic merge patches can be confusing when dealing with lists and nested structures"
  - "No built-in package sharing or repository system like Helm's Artifact Hub"
---

## Kustomize: Kubernetes Configuration Management

Kustomize is a configuration management tool built into `kubectl` that lets you customize raw Kubernetes YAML files across environments without using templates. It works by layering patches and overlays on top of a base configuration, keeping your manifests DRY and environment-specific differences explicit and auditable.

## Key Features

- **Template-free**: No templating language required — work with plain YAML and apply targeted patches
- **Base and overlays**: Define a base configuration once, then create environment overlays that only specify differences
- **Strategic merge patches**: Merge partial YAML documents onto existing resources without duplicating the entire spec
- **JSON 6902 patches**: Apply precise surgical changes using RFC 6902 JSON Patch operations
- **Built into kubectl**: Available natively via `kubectl apply -k` without any additional installation
- **Image tag management**: Update container image tags across manifests from a single `images` field
- **ConfigMap and Secret generation**: Generate ConfigMaps and Secrets from files, env files, or literals
- **Name and label transformers**: Automatically add prefixes, suffixes, labels, and annotations to all resources

## Use Cases

- **Multi-environment configuration**: Maintain a single base for an application and override settings per environment (dev/staging/prod)
- **Namespace promotion**: Promote the same application to different namespaces with minimal duplication
- **Centralized label management**: Add organization-wide labels and annotations without modifying individual manifests
- **GitOps with Flux or ArgoCD**: Both GitOps tools natively support Kustomize as a rendering engine
- **Config inheritance**: Share base configurations across multiple teams or microservices that need similar boilerplate

## Quick Start

Directory structure for a multi-environment setup:

```
k8s/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── overlays/
    ├── dev/
    │   └── kustomization.yaml
    └── production/
        ├── kustomization.yaml
        └── replica-patch.yaml
```

Base `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
commonLabels:
  app: my-app
```

Production overlay `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../../base
namePrefix: prod-
images:
  - name: my-app
    newTag: "v1.2.3"
patches:
  - path: replica-patch.yaml
```

Production `replica-patch.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 5
  template:
    spec:
      containers:
        - name: my-app
          resources:
            limits:
              cpu: 500m
              memory: 512Mi
```

Apply the production overlay:

```bash
# Preview the rendered output
kubectl kustomize k8s/overlays/production

# Apply directly
kubectl apply -k k8s/overlays/production
```

## Comparison with Alternatives

| Feature | Kustomize | Helm | Jsonnet |
|---|---|---|---|
| Approach | Patch overlays | Go templates | Functional language |
| Learning curve | Low | Moderate | High |
| Template language | None (plain YAML) | Go templates | Jsonnet DSL |
| Reusability | Bases and components | Charts | Libraries |
| Built into kubectl | Yes | No | No |
| Type safety | None | Limited | Strong |

**vs Helm**: Kustomize is simpler for managing your own application configs with environment differences, while Helm is better suited for packaging and distributing applications. For applications you own, Kustomize is often cleaner; for third-party software, Helm's chart ecosystem wins. The two are frequently used together.

**vs Jsonnet**: Jsonnet offers a full programming language for generating Kubernetes configs with strong type-checking, but requires learning an entirely new syntax. Kustomize requires no new language and is easier to onboard for teams already familiar with YAML.

Kustomize is the natural first choice for teams wanting simple, declarative environment management without introducing a templating language into their Kubernetes workflow.
