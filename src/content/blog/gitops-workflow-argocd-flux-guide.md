---
title: "GitOps Workflow Guide: ArgoCD vs Flux for Kubernetes"
description: "GitOps workflow guide: reconciliation loop, ArgoCD vs Flux comparison, app-of-apps pattern, Helm/Kustomize with GitOps, secrets management, and progressive delivery with Argo Rollouts."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["GitOps", "ArgoCD", "Flux", "Kubernetes", "Helm", "continuous delivery", "Kustomize"]
readingTime: "11 min read"
category: "devops"
---

GitOps inverts the traditional CI/CD model. Instead of a pipeline pushing changes to your cluster, the cluster continuously pulls its desired state from Git. Any divergence between what Git says should exist and what actually exists in the cluster triggers an automatic reconciliation. The result is an audit log built into your version control system and a cluster that self-heals toward its declared state.

## The GitOps Reconciliation Loop

The core GitOps pattern is simple:

1. Developer opens a pull request changing a Kubernetes manifest or Helm values file
2. PR is reviewed and merged to the main branch
3. The GitOps controller running in the cluster detects the change
4. The controller applies the new state to the cluster
5. If anything in the cluster drifts from Git (manual `kubectl apply`, config mutation), the controller reverts it

This loop means Git is always the source of truth. You can recreate your entire cluster from scratch by pointing a fresh cluster at your Git repository.

## ArgoCD vs Flux: Core Differences

Both tools implement GitOps for Kubernetes, but they have different philosophies and strengths.

**ArgoCD** is opinionated with a strong UI focus. It represents each application as an `Application` CRD and provides a rich web dashboard showing sync status, resource trees, and diff views. It has a built-in notion of "apps" with health checks per resource type.

**Flux** is composable and CLI-first. It is built as a set of focused controllers (`source-controller`, `kustomize-controller`, `helm-controller`, `notification-controller`) that you combine as needed. This makes it more flexible but requires more explicit configuration.

| Feature | ArgoCD | Flux v2 |
|---|---|---|
| UI | Rich built-in UI | External Weave GitOps UI |
| Multi-tenancy | App Projects with RBAC | Multi-tenancy via namespaces |
| Helm support | Native, no extra config | HelmRelease CRD |
| Kustomize support | Native | Native |
| OCI registries | Yes (v2.8+) | Yes |
| Progressive delivery | Argo Rollouts (separate) | Flagger (separate) |
| Bootstrapping | `argocd` CLI | `flux bootstrap` |
| Community | Very large | Large |

For teams that want visibility and a GUI, ArgoCD is typically the better choice. For teams that prefer full Kubernetes-native configuration with no external UI, Flux integrates more naturally.

## Setting Up ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods to be ready
kubectl wait --for=condition=available --timeout=300s \
  deployment/argocd-server -n argocd

# Get initial admin password
argocd admin initial-password -n argocd

# Port-forward for initial setup
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Define your first application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-api
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests
    targetRevision: main
    path: apps/my-api/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true      # Delete resources removed from Git
      selfHeal: true   # Revert manual changes
    syncOptions:
    - CreateNamespace=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

`automated.prune: true` is powerful but requires care — it will delete Kubernetes resources that are no longer in Git. Enable it only after you are confident your Git repository is the complete source of truth.

## The App-of-Apps Pattern

Managing dozens of `Application` CRDs individually does not scale. The app-of-apps pattern uses a single ArgoCD Application that itself manages other Applications:

```
git-repo/
  apps/
    root-app.yaml          # The "app of apps" — points to the apps/ folder
    my-api.yaml
    postgres.yaml
    monitoring.yaml
    ingress-nginx.yaml
```

```yaml
# apps/root-app.yaml — the root application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests
    targetRevision: main
    path: apps           # ArgoCD watches this directory
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd    # Child apps are created in argocd namespace
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

With this pattern, adding a new application is as simple as adding a new YAML file to the `apps/` directory and merging to main. ArgoCD picks it up automatically.

## Helm and Kustomize with GitOps

**Helm with ArgoCD:**

```yaml
source:
  repoURL: https://charts.bitnami.com/bitnami
  chart: postgresql
  targetRevision: "13.4.3"
  helm:
    values: |
      auth:
        database: myapp
        username: myuser
      primary:
        persistence:
          size: 50Gi
      metrics:
        enabled: true
```

**Kustomize overlays for environment promotion:**

```
k8s/
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  overlays/
    staging/
      kustomization.yaml   # patches image tag, replicas=1
    production/
      kustomization.yaml   # patches image tag, replicas=3, resource limits
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
patches:
- patch: |-
    - op: replace
      path: /spec/replicas
      value: 3
  target:
    kind: Deployment
    name: my-api
images:
- name: my-api
  newTag: "v2.1.4"
```

Promoting from staging to production becomes a pull request that changes `newTag` in `overlays/production/kustomization.yaml`.

## Secrets Management in GitOps

Storing secrets in Git is never acceptable. The two most common patterns are:

**Sealed Secrets** (offline encryption, secrets live in Git as encrypted blobs):

```bash
# Encrypt a secret for storage in Git
kubectl create secret generic db-credentials \
  --from-literal=password=supersecret \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-db-credentials.yaml

# Commit sealed-db-credentials.yaml to Git
# The Sealed Secrets controller decrypts it in the cluster
```

**External Secrets Operator** (secrets sourced from AWS Secrets Manager, Vault, etc.):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef:
      key: production/db/credentials
      property: password
```

External Secrets Operator is the recommended approach for production because secrets rotate automatically and the source of truth for secret values is your secrets manager, not Git.

## Progressive Delivery with Argo Rollouts

Argo Rollouts extends ArgoCD with canary and blue-green deployment strategies:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-api
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10   # Send 10% of traffic to new version
      - pause: {}        # Wait for manual promotion or analysis
      - setWeight: 30
      - pause: {duration: 5m}
      - setWeight: 60
      - pause: {duration: 5m}
      - setWeight: 100
      canaryService: my-api-canary
      stableService: my-api-stable
      analysis:
        templates:
        - templateName: success-rate
        startingStep: 2
        args:
        - name: service-name
          value: my-api-canary
```

Combined with an `AnalysisTemplate` querying Prometheus, Argo Rollouts will automatically abort a canary deployment if error rates exceed your threshold — no human intervention required.

## Flux Bootstrap Example

For teams preferring Flux, bootstrapping against a GitHub repository:

```bash
flux bootstrap github \
  --owner=my-org \
  --repository=k8s-manifests \
  --branch=main \
  --path=clusters/production \
  --personal=false \
  --token-auth
```

This commits the Flux system manifests to your repository and configures the cluster to watch itself. From that point, all changes go through Git.

GitOps requires discipline — you must resist the temptation to `kubectl apply` directly. The payoff is a cluster whose complete history is in Git, where rollback is a `git revert`, and where disaster recovery means pointing a new cluster at the same repository.
