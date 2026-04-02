---
title: "Helm Charts & Tools in 2026: The Complete Developer Guide"
description: "A comprehensive guide to Helm 3 charts, essential Helm plugins, chart repositories, and best practices for managing Kubernetes applications in 2026."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Helm", "Kubernetes", "K8s", "Helm Charts", "Kubernetes tooling", "DevOps", "GitOps"]
readingTime: "12 min read"
category: "devops"
---

Helm has become the de facto package manager for Kubernetes. Whether you are deploying a single microservice or managing a hundred-chart repository across multiple environments, Helm streamlines the entire lifecycle — from templating and versioning to rollbacks and distribution. In 2026, the Helm ecosystem is richer than ever, with a mature Helm 3 at its core, a growing library of community charts, and powerful plugins that fill gaps in the default experience.

This guide covers everything you need to be effective with Helm in a modern Kubernetes workflow: chart anatomy, writing production-grade charts, essential tools and plugins, repository management, GitOps integration, and security hardening.

## What Is Helm and Why It Matters in 2026

Kubernetes manifests are verbose and repetitive. A typical microservice deployment involves ConfigMaps, Secrets, Services, Ingresses, HorizontalPodAutoscalers, and more — multiplied across dev, staging, and production environments. Helm solves this by introducing a templating layer backed by a packaging format called a chart.

A Helm chart is a collection of YAML templates plus a values file that parameterizes them. Helm's Go-based templating engine renders the final Kubernetes manifests at install time. Because charts are versioned and installable as a single unit, Helm brings the "apt" or "brew" experience to Kubernetes.

The benefits are tangible:

- **Reproducibility** — Same chart, same version, same output across every environment.
- **Parameterized configuration** — Environment-specific values via  or .
- **Lifecycle management** — Upgrade, rollback, and uninstall with atomic semantics.
- **Reusability** — Share charts via repositories or Git registries.
- **Rollback support** — One command to revert to any previous release revision.

## Helm 3 Architecture: Key Differences from Helm 2

If you are still on Helm 2, upgrade immediately. Helm 3 removed the server-side Tiller component entirely, which was a security nightmare — anyone with access to Tiller could deploy anywhere in the cluster. Helm 3 uses a client-only architecture with cluster-side information stored in ConfigMaps and Secrets in the namespace being managed.

Key architectural changes:

- **No Tiller** — Helm 3 performs all operations client-side. Cluster access is via the same kubeconfig you already use.
- **Three-way strategic merge patch** — Helm 3 intelligently merges changes made by both you and other tooling, reducing conflicts on upgrade.
- **Multiple cluster support** — The same Helm client can manage releases in any cluster its kubeconfig can reach.
- **Release names are scoped to namespaces** — You can have a release named "redis" in both the "cache" namespace and the "data" namespace.

## Chart Directory Structure

A Helm chart lives in a directory that follows this canonical structure:

```
mychart/
  Chart.yaml          # Chart metadata (name, version, dependencies)
  values.yaml         # Default configuration values
  charts/             # Local dependency charts (rarely used now)
  templates/          # Kubernetes manifest templates
  templates/NOTES.txt # Optional human-readable install notes
  .helmignore         # Files to exclude from the chart package
```

The most critical file is . It declares the chart's identity and dependencies:

```yaml
apiVersion: v2
name: my-frontend
description: Frontend service chart for the e-commerce platform
type: application
version: 1.3.0
appVersion: "2.1.0"
keywords:
  - frontend
  - react
  - nginx
dependencies:
  - name: postgresql
    version: "12.5.0"
    repository: "https://charts.bitnami.com"
```

The  field distinguishes v1 charts (deprecated, Helm 2 era) from v2 charts (current). Use v2 for any new chart you create.

## Writing Production-Grade Templates

Helm templates live in . Every file is processed by Go's  engine before being submitted to Kubernetes. A minimal template looks like:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config
  namespace: {{ .Release.Namespace }}
data:
  {{ .Values.app.name | default "myapp" }}: |
    {{ .Values.app.config | default "default config" }}
```

The built-in objects available in every template are:

-  — Name, Namespace, Revision, Service, IsUpgrade, IsRollback
-  — User-supplied values merged over defaults
-  — Metadata from Chart.yaml (name, version, etc.)
-  — Access to chart files from  directory
-  — Information about the Kubernetes cluster (APIVersions, KubeVersion)
-  — Current template context

### Conditionals and Control Flow

Helm's templating supports the full range of Go template functions plus Sprig's library extension:

```yaml
{{- if .Values.replicaCount gt 1 }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ .Chart.Name }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ .Chart.Name }}
  minReplicas: {{ .Values.replicaCount }}
  maxReplicas: {{ .Values.replicaCount | default 3 | add 2 }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
{{- end }}
```

Note the  syntax — the dash followed by a space trims preceding whitespace, which is essential for clean YAML indentation in the rendered output.

### Named Templates (Partial Includes)

For reusable snippet logic — label generators, common annotations, sidecar injectors — define named templates in :

```yaml
# templates/_helpers.tpl
{{/*
Expand the name of the chart.
*/}}
{{- define "mychart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "mychart.labels" -}}
app.kubernetes.io/name: {{ include "mychart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
```

Reference them in your templates with `{{ include "mychart.labels" . }}`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "mychart.name" . }}
  labels:
    {{ include "mychart.labels" . | indent 4 }}
```

## values.yaml: Structuring Configuration

The  file is the backbone of a chart's configurability. Structure it logically, group related values, and provide sensible defaults:

```yaml
# Default configuration for my-frontend
replicaCount: 2

image:
  repository: ghcr.io/myorg/frontend
  pullPolicy: IfNotPresent
  tag: ""

service:
  type: ClusterIP
  port: 8080

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: frontend.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 500m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

nodeSelector: {}

tolerations: []

affinity: {}
```

### Environment-Specific Values

Override defaults by providing additional values files:

```bash
helm install myfrontend ./charts/my-frontend -f values.prod.yaml
helm upgrade myfrontend ./charts/my-frontend -f values.staging.yaml -f values.override.yaml
```

Helm merges values in order: chart defaults → parent values file → child values file →  flags (highest precedence).

A common pattern is environment-specific subdirectories:

```
my-frontend/
  values.yaml           # Base defaults
  values.staging.yaml   # Staging overrides
  values.prod.yaml      # Production overrides
```

## Essential Helm Plugins

Helm's plugin architecture extends the CLI without forking the codebase. Install plugins with:

```bash
helm plugin install https://github.com/chartmuseum/helm-push
helm plugin install https://github.com/helm/helm-secrets
helm plugin install https://github.com/helm-unittest/helm-unittest
```

### helm-secrets

Manage sensitive configuration — API keys, database passwords, TLS certificates — directly in your values files, encrypted at rest with SOPS (and backends like GCS, AWS KMS, or Vault):

```bash
helm secrets upgrade myrelease ./charts/myapp -f secrets.prod.yaml
```

The plugin decrypts on the fly before passing values to Helm. Your Git repository stores only encrypted blobs, which is critical for GitOps workflows.

### helm-unittest

Unit-test your chart templates in YAML without deploying to a real cluster:

```bash
helm unittest mychart
```

Tests are defined in  and use a familiar assert-style syntax:

```yaml
suite: MyChart Test Suite
templates:
  - deployment.yaml
tests:
  - it: should render a deployment with 2 replicas
    asserts:
      - equal:
          path: spec.replicas
          value: 2
```

### helm-diff

Preview what an upgrade would change before executing it — invaluable for CI/CD safety:

```bash
helm diff upgrade myrelease ./charts/myapp -f values.prod.yaml
```

### helm-push

Push charts to private registries like ChartMuseum or Harbor with a single command:

```bash
helm push mychart-1.0.0.tgz chartmuseum://myrepo/mychart
```

## Chart Repositories

A chart repository is a simple HTTP server that serves an  and a collection of packaged charts ( files). The official Artifact Hub (artifacthub.io) indexes thousands of community charts.

### Setting Up a Simple Chart Repository

```bash
# Package your chart
helm package ./charts/mychart

# Create or update the index
helm repo index mycharts/ --url https://charts.example.com/mycharts

# Serve locally for testing
python3 -m http.server 8080 --directory mycharts
```

### Using OCI Registries

Helm 3 supports OCI registries (the same Docker distribution spec) for chart storage. This is the recommended approach for enterprise workflows:

```bash
export HELM_EXPERIMENTAL_OCI=1
helm chart save ./charts/mychart ghcr.io/myorg/mychart:1.0.0
helm chart push ghcr.io/myorg/mychart:1.0.0
helm chart pull ghcr.io/myorg/mychart:1.0.0
helm chart export ghcr.io/myorg/mychart:1.0.0 ./imported/
```

OCI registry support makes it possible to store charts in the same container registry as your application images, using the same authentication credentials.

## GitOps with Helm and ArgoCD

In a GitOps workflow, your Git repository is the single source of truth. ArgoCD (or Flux) continuously reconciles the cluster state with the desired state declared in Git.

Helm integrates cleanly with ArgoCD. You can register a Helm chart as an Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myfrontend-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.bitnami.com
    chart: nginx
    targetRevision: "18.0.0"
    helm:
      valueFiles:
        - values.prod.yaml
      parameters:
        - name: service.type
          value: ClusterIP
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

For custom charts in Git, reference the repository URL pointing to your Git repo. ArgoCD renders the Helm templates server-side, so no local Helm installation is needed on the cluster.

## Linting and Validation

Before publishing or deploying any chart, always run lint:

```bash
helm lint ./charts/mychart
helm template myrelease ./charts/mychart --debug --dry-run
```

 renders the charts locally and outputs the Kubernetes manifests, which is perfect for CI/CD pipelines that cannot access the target cluster at plan time. Combine with  or  for schema validation:

```bash
helm template myrelease ./charts/mychart | kubeconform --strict -
```

## Library Charts for Shared Logic

A powerful but underused feature is the library chart — a chart of type  that defines reusable template snippets without deploying any Kubernetes resources. Other charts can declare it as a dependency and include its named templates:

```yaml
# Chart.yaml of the consuming chart
dependencies:
  - name: common
    version: "1.2.0"
    repository: "https://charts.example.com"
    condition: common.enabled
```

This lets you centralize label generation, pod annotations, security contexts, and other boilerplate in one place, updating all dependent charts by bumping a single version number.

## Security Best Practices

1. **Never store plaintext secrets in values files** — Use SOPS + helm-secrets or external secret operators.
2. **Pin chart versions** — In production, always specify  not just . Unpinned aliases can silently pull new versions.
3. **Validate with helm template + kubeval** — Never deploy an unvalidated chart.
4. **Use a policy engine** — Tools like Datree or Styra DAS enforce Helm-specific policies in CI.
5. **Review rendered manifests before install** —  is your window into what actually gets deployed.

## Versioning and Changelog

Maintain a  within the chart directory. Helm does not enforce this, but it is essential for downstream users:

```markdown
## 1.3.0
- Add HPA support with configurable average CPU utilization
- Update default image tag to AppVersion
- Fix tolerations template syntax

## 1.2.0
- Add ingressClassName support
- Deprecate旧的  approach
```

## Closing Thoughts

Helm in 2026 is mature, powerful, and deeply integrated into the Kubernetes ecosystem. Whether you are a platform engineer maintaining a shared chart repository or a developer templating your first service, the patterns in this guide — structured values files, named templates, unit tests, linting, and GitOps integration — will help you build charts that are reliable, auditable, and maintainable at scale. Invest in chart quality upfront; it pays dividends every time someone runs .
