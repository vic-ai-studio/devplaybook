---
title: "Tekton — Cloud-Native CI/CD Pipeline Framework for Kubernetes"
description: "Cloud-native CI/CD framework for Kubernetes that defines pipelines as reusable, composable building blocks"
category: "cloud-native"
tags: ["kubernetes", "devops", "ci-cd", "cloud", "pipelines", "cloud-native", "continuous-delivery", "build-automation"]
pricing: "Open Source"
pricingDetail: "Free and open-source (Apache 2.0). CD Foundation project. OpenShift Pipelines includes Tekton with Red Hat support."
website: "https://tekton.dev"
github: "https://github.com/tektoncd/pipeline"
date: "2026-04-03"
pros:
  - "Kubernetes-native CRDs make pipelines first-class cluster resources manageable with kubectl"
  - "Highly composable — reusable Tasks can be shared across teams via Tekton Hub"
  - "Tekton Chains provides built-in supply chain security with SLSA compliance"
  - "Vendor-neutral with backing from Google, Red Hat, IBM, and the CD Foundation"
cons:
  - "Requires a running Kubernetes cluster, making it heavyweight for simple CI/CD needs"
  - "Steeper learning curve than hosted CI services like GitHub Actions or GitLab CI"
  - "Dashboard and UI are basic compared to Jenkins or other mature CI/CD platforms"
---

## Tekton: Cloud-Native CI/CD Pipelines

Tekton is an open source framework for creating CI/CD systems on Kubernetes. It provides a set of Kubernetes Custom Resource Definitions (CRDs) that let you define and run pipelines natively on the cluster. Tekton is vendor-neutral, highly customizable, and a CNCF incubating project backed by Google, Red Hat, IBM, and others.

## Key Features

- **Kubernetes-native CRDs**: Pipelines, Tasks, and PipelineRuns are standard Kubernetes resources managed with `kubectl`
- **Reusable Tasks**: Build a library of parameterized, composable tasks that can be shared across pipelines and teams
- **Tekton Hub**: Community catalog of pre-built tasks for building, testing, scanning, and deploying applications
- **Parallel execution**: Run tasks concurrently within a pipeline to reduce build times
- **Results and workspaces**: Pass outputs between tasks and share persistent storage within a pipeline run
- **Triggers**: Automatically start pipelines from webhook events (GitHub, GitLab, Bitbucket push/PR events)
- **Tekton Chains**: Supply chain security — sign task results and pipeline runs for SLSA compliance
- **Dashboard**: Web-based UI for viewing and managing pipeline runs across namespaces

## Use Cases

- **Build pipelines**: Compile, test, and containerize applications using cluster-local resources
- **GitOps CI loops**: Trigger pipelines on Git events, build images, push to registry, then update manifests for ArgoCD or Flux
- **Multi-stage delivery**: Chain build, test, security scan, and deploy stages with conditional logic and approvals
- **Supply chain security**: Sign images and provenance attestations with Tekton Chains for SLSA Level 3 compliance
- **Platform CI templates**: Define standardized pipeline templates that development teams use as self-service building blocks

## Quick Start

Install Tekton Pipelines and create your first pipeline:

```bash
# Install Tekton Pipelines
kubectl apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

# Install Tekton Dashboard (optional)
kubectl apply -f https://storage.googleapis.com/tekton-releases/dashboard/latest/release.yaml

# Install Tekton CLI (tkn)
brew install tektoncd-cli
```

Define a Task that builds and pushes a Docker image:

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: build-and-push
spec:
  params:
    - name: IMAGE
      type: string
    - name: CONTEXT
      type: string
      default: "."
  workspaces:
    - name: source
  steps:
    - name: build
      image: gcr.io/kaniko-project/executor:latest
      command:
        - /kaniko/executor
      args:
        - --context=$(workspaces.source.path)/$(params.CONTEXT)
        - --destination=$(params.IMAGE)
```

Define and run a Pipeline:

```yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: build-deploy
spec:
  params:
    - name: repo-url
    - name: image-name
  workspaces:
    - name: shared-data
  tasks:
    - name: fetch-source
      taskRef:
        name: git-clone
      workspaces:
        - name: output
          workspace: shared-data
      params:
        - name: url
          value: $(params.repo-url)
    - name: build-push
      runAfter: ["fetch-source"]
      taskRef:
        name: build-and-push
      workspaces:
        - name: source
          workspace: shared-data
      params:
        - name: IMAGE
          value: $(params.image-name)
---
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: build-deploy-run-1
spec:
  pipelineRef:
    name: build-deploy
  params:
    - name: repo-url
      value: https://github.com/your-org/my-app
    - name: image-name
      value: registry.example.com/my-app:latest
  workspaces:
    - name: shared-data
      volumeClaimTemplate:
        spec:
          accessModes: [ReadWriteOnce]
          resources:
            requests:
              storage: 1Gi
```

## Comparison with Alternatives

| Feature | Tekton | GitHub Actions | Jenkins |
|---|---|---|---|
| Runs on | Kubernetes cluster | GitHub cloud | Self-hosted |
| Kubernetes-native | Yes | Via actions | Via plugins |
| Vendor lock-in | None | GitHub | None |
| Reusability | Tasks + Hub | Actions marketplace | Shared libraries |
| Learning curve | High | Low | Medium |
| Supply chain security | Chains (SLSA) | Sigstore actions | Limited |

**vs GitHub Actions**: GitHub Actions is easier to start with and has a massive actions marketplace, but runs on GitHub's infrastructure. Tekton runs inside your own cluster for full control, air-gapped support, and no egress costs for large builds.

**vs Jenkins**: Jenkins has a massive plugin ecosystem and years of community knowledge, but its architecture predates Kubernetes and can be complex to scale. Tekton is built for cloud-native from the ground up with better scalability and Kubernetes integration.

Tekton is the right choice for platform teams that need vendor-neutral, Kubernetes-native CI/CD pipelines with strong reusability and supply chain security requirements.
