---
title: "Helm Chart Best Practices for Production Kubernetes"
description: "Master Helm chart best practices for production—chart structure, values management, hooks, testing with helm test, and the most common patterns and anti-patterns."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["devops", "kubernetes", "helm", "platform-engineering"]
readingTime: "10 min read"
category: "DevOps"
---

Helm is the de-facto package manager for Kubernetes, but "it works" and "it's production-ready" are two very different standards. Charts that work on a developer's laptop frequently fail under the pressures of multi-environment deployments, version upgrades, and team collaboration.

This guide covers the practices that separate Helm charts worth running in production from ones that cause 3 AM incidents.

## Chart Structure Fundamentals

A well-structured Helm chart is predictable and navigable. The standard layout:

```
my-chart/
├── Chart.yaml          # Chart metadata and dependencies
├── values.yaml         # Default values (developer-facing documentation)
├── values.schema.json  # JSON schema for values validation
├── charts/             # Dependency charts (vendored)
├── templates/
│   ├── _helpers.tpl    # Named templates and helpers
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── serviceaccount.yaml
│   ├── hpa.yaml
│   ├── networkpolicy.yaml
│   ├── NOTES.txt       # Post-install instructions
│   └── tests/
│       └── test-connection.yaml
└── .helmignore
```

### Chart.yaml — Do This Right

```yaml
apiVersion: v2
name: my-api
description: "REST API service for the payments domain"
type: application
version: 1.4.2          # Chart version — bump on any template change
appVersion: "2.1.0"     # Application version — tracks image tag
keywords:
  - api
  - payments
maintainers:
  - name: payments-team
    email: payments@company.com
dependencies:
  - name: postgresql
    version: "~14.0"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
```

The distinction between `version` and `appVersion` matters. Chart version tracks template changes. `appVersion` tracks what software the chart deploys. They should move independently.

---

## Values Management

Your `values.yaml` is the primary interface between your chart and its users. Treat it as public API.

### Structure Values for Clarity

```yaml
# values.yaml — organized, documented, with sensible defaults

# -- Number of replicas. Ignored when autoscaling.enabled=true
replicaCount: 2

image:
  # -- Container image repository
  repository: registry.company.com/payments/my-api
  # -- Image pull policy
  pullPolicy: IfNotPresent
  # -- Overrides the image tag. Defaults to .Chart.AppVersion
  tag: ""

# -- Annotations to add to the pod
podAnnotations: {}

# -- Security context for the pod
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 2000
  seccompProfile:
    type: RuntimeDefault

# -- Security context for containers
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

ingress:
  enabled: false
  className: "nginx"
  annotations: {}
  hosts:
    - host: my-api.example.com
      paths:
        - path: /
          pathType: Prefix
  tls: []

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

# -- Environment-specific configuration
config:
  logLevel: "info"
  databaseUrl: ""   # Required — must be overridden

# -- External secret references
externalSecrets:
  enabled: true
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
```

### Add a JSON Schema for Validation

Values schema validation catches misconfigurations before they reach the cluster:

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image"],
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "image": {
      "type": "object",
      "required": ["repository"],
      "properties": {
        "repository": {
          "type": "string",
          "pattern": "^registry\\.company\\.com/"
        },
        "pullPolicy": {
          "type": "string",
          "enum": ["Always", "IfNotPresent", "Never"]
        }
      }
    },
    "resources": {
      "type": "object",
      "required": ["limits", "requests"]
    }
  }
}
```

When a user runs `helm install` with invalid values, they get a clear error instead of a broken deployment.

---

## Template Best Practices

### Use `_helpers.tpl` Consistently

Define your naming conventions once and reuse them everywhere:

```go
{{/*
Expand the name of the chart.
*/}}
{{- define "my-api.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "my-api.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels for all resources.
*/}}
{{- define "my-api.labels" -}}
helm.sh/chart: {{ include "my-api.chart" . }}
{{ include "my-api.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels (stable — used in matchLabels).
*/}}
{{- define "my-api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

### Never Hardcode Namespace

Always use `{{ .Release.Namespace }}` in resource metadata. Hardcoded namespaces break multi-environment deployments.

### Handle Optional Sections Cleanly

```yaml
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "my-api.fullname" . }}
  labels:
    {{- include "my-api.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  ...
{{- end }}
```

---

## Hooks for Lifecycle Management

Helm hooks let you run jobs at specific points in the release lifecycle:

```yaml
# Pre-upgrade database migration job
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "my-api.fullname" . }}-migrate
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"           # Lower weight runs first
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      serviceAccountName: {{ include "my-api.serviceAccountName" . }}
      containers:
      - name: migrate
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        command: ["./migrate", "--up"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: {{ include "my-api.fullname" . }}-secrets
              key: databaseUrl
```

**Available hooks:**
- `pre-install`, `post-install`
- `pre-upgrade`, `post-upgrade`
- `pre-rollback`, `post-rollback`
- `pre-delete`, `post-delete`
- `test` (for helm test)

---

## Testing with helm test

`helm test` runs test pods against a deployed release. Every chart should have tests:

```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "my-api.fullname" . }}-test-connection"
  labels:
    {{- include "my-api.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": test
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  restartPolicy: Never
  containers:
  - name: test-health
    image: curlimages/curl:latest
    command:
    - /bin/sh
    - -c
    - |
      curl -sf http://{{ include "my-api.fullname" . }}:{{ .Values.service.port }}/health || exit 1
      echo "Health check passed"
  - name: test-readiness
    image: curlimages/curl:latest
    command:
    - /bin/sh
    - -c
    - |
      curl -sf http://{{ include "my-api.fullname" . }}:{{ .Values.service.port }}/ready || exit 1
      echo "Readiness check passed"
```

Run tests after deployment:

```bash
helm install my-api ./my-chart -f values-staging.yaml
helm test my-api --logs
```

---

## Multi-Environment Values Strategy

Structure your values files to minimize duplication:

```
values/
├── values.yaml          # Base defaults (committed)
├── values-staging.yaml  # Staging overrides (committed)
├── values-production.yaml # Production overrides (committed)
└── values-secrets.yaml  # Secrets (never committed, from CI/CD)
```

Override files should only contain differences:

```yaml
# values-production.yaml
replicaCount: 5

autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 50

resources:
  limits:
    cpu: "2"
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 512Mi

ingress:
  enabled: true
  hosts:
    - host: api.company.com
```

Deploy with layered values:

```bash
helm upgrade --install my-api ./my-chart \
  -f values/values.yaml \
  -f values/values-production.yaml \
  -f values/values-secrets.yaml \
  --set image.tag=$CI_COMMIT_SHA \
  --namespace production \
  --atomic \              # Roll back automatically on failure
  --timeout 5m \
  --wait                  # Wait for all pods to be ready
```

---

## Common Anti-Patterns to Avoid

**1. Hardcoded image tags**
Never use `latest` or hardcode a version in `values.yaml`. Always set `image.tag` at deploy time from CI/CD.

**2. Missing resource limits**
Every container should have `resources.requests` and `resources.limits`. Without them, a noisy pod can evict your entire namespace.

**3. No liveness or readiness probes**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

**4. Single replica in production**
Default `replicaCount: 1` is fine for development. Production values should always override to 2+ with a PodDisruptionBudget:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "my-api.fullname" . }}-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      {{- include "my-api.selectorLabels" . | nindent 6 }}
```

**5. No chart linting in CI**

```bash
# Lint before every merge
helm lint ./my-chart -f values/values.yaml

# Dry-run to catch template errors
helm upgrade --install my-api ./my-chart \
  -f values/values.yaml \
  --dry-run \
  --debug
```

---

## Conclusion

Helm charts are infrastructure code. They deserve the same review standards, testing discipline, and documentation rigor as your application code. The practices in this guide—schema validation, layered values, helm tests, hooks for migrations, and PodDisruptionBudgets—are what separate a "works on my machine" chart from one your team can rely on at 2 AM during a production incident.

Start by auditing your existing charts against this checklist. Most improvement comes from small, consistent changes: adding probes, adding resource limits, splitting values by environment. Each one reduces risk and increases confidence in your deployments.
