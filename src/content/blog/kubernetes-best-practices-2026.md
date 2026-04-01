---
title: "Kubernetes Production Best Practices 2026"
description: "Kubernetes production best practices: resource limits, liveness/readiness probes, Pod Disruption Budgets, NetworkPolicy, RBAC, horizontal pod autoscaling, and multi-zone deployments."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Kubernetes", "K8s", "production", "best practices", "DevOps", "containers"]
readingTime: "10 min read"
category: "devops"
---

Running Kubernetes in production is a different beast from running it in a demo environment. Clusters that work fine on a laptop can fail catastrophically under real traffic, node failures, or rolling updates gone wrong. This guide covers the battle-tested practices that keep production clusters stable, secure, and scalable in 2026.

## 1. Always Set Resource Requests and Limits

Without resource constraints, a single noisy pod can starve everything else on the node. Resource `requests` tell the scheduler where to place the pod; `limits` cap what it can actually consume.

```yaml
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "1000m"
    memory: "512Mi"
```

A common mistake is setting `limits` without `requests` — Kubernetes then copies the limit value as the request, which leads to over-provisioning. Start with a request that reflects your p50 usage, and set the limit at roughly 2–4x the request.

Use a `LimitRange` object to enforce defaults cluster-wide so workloads without explicit resources still get sensible constraints:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "256Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    type: Container
```

## 2. Configure Liveness and Readiness Probes Carefully

Probes are your primary mechanism for health signalling. A misconfigured probe is worse than no probe — it can trigger cascading restarts during legitimate startup or high-load moments.

```yaml
livenessProbe:
  httpGet:
    path: /healthz
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
  failureThreshold: 2
```

Key distinctions:
- **Liveness**: Is this pod broken beyond repair? Failure triggers a restart.
- **Readiness**: Is this pod ready to receive traffic? Failure removes it from the Service endpoints.
- **Startup** (Kubernetes 1.18+): Gives slow-starting containers extra time before liveness kicks in.

Use a dedicated `/healthz` endpoint that checks your application's internal state — not just HTTP 200. A pod that is up but cannot connect to its database should fail readiness.

## 3. Use Pod Disruption Budgets

Rolling updates, node drains, and cluster upgrades can all evict pods simultaneously. A `PodDisruptionBudget` (PDB) guarantees a minimum number of healthy replicas during voluntary disruptions.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-server
```

For a deployment with 3 replicas, this ensures at least 2 are always available, meaning only 1 can be disrupted at a time. Alternatively use `maxUnavailable: 1` for the same effect expressed differently.

Always pair PDBs with deployments that have 2+ replicas. A PDB with `minAvailable: 1` on a single-replica deployment will block all node drains.

## 4. Enforce Network Policies

By default, Kubernetes allows all pod-to-pod communication. In production, apply the principle of least privilege with `NetworkPolicy`.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

Start with a default-deny policy per namespace, then explicitly allow only required traffic. This limits blast radius if any service is compromised.

## 5. Implement RBAC with Least Privilege

Role-Based Access Control should be granular. Avoid `cluster-admin` for workloads and humans alike.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: deployment-reader
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployment-reader-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: monitoring-agent
  namespace: production
roleRef:
  kind: Role
  name: deployment-reader
  apiGroup: rbac.authorization.k8s.io
```

For CI/CD pipelines, create a dedicated `ServiceAccount` per namespace with only the verbs that pipeline actually needs (`create`, `update`, `patch` on `deployments`). Never give a pipeline account `delete` on namespaces.

## 6. Configure Horizontal Pod Autoscaling

HPA scales your deployment based on real metrics. CPU utilization is the classic trigger, but in 2026 you should also consider custom metrics via the Metrics API.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

The `behavior` block is critical in production. Without a stabilization window, HPA can scale down aggressively after a traffic spike ends, then have to scale back up immediately when the next spike arrives. Set a 5-minute cooldown for scale-down events.

## 7. Deploy Across Multiple Zones

A single-zone cluster is a single point of failure. Use `topologySpreadConstraints` to distribute pods across availability zones:

```yaml
spec:
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: api-server
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: api-server
```

This spreads pods both across zones and across nodes within each zone, eliminating single-node concentration risks.

## 8. Additional Production Hardening

**Set `priorityClassName`** to ensure critical system pods are not evicted before your application during resource pressure.

**Use `podAntiAffinity`** to prevent all replicas from landing on the same node:

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values: ["api-server"]
      topologyKey: kubernetes.io/hostname
```

**Disable automounting service account tokens** unless your pod actually needs Kubernetes API access:

```yaml
spec:
  automountServiceAccountToken: false
```

**Run containers as non-root**:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
```

## Summary Checklist

| Practice | Why It Matters |
|---|---|
| Resource requests + limits | Prevents noisy-neighbor issues |
| Liveness + readiness probes | Accurate health signalling |
| PodDisruptionBudgets | Safe rolling updates and drains |
| NetworkPolicy | Limits lateral movement |
| RBAC least privilege | Reduces blast radius of compromise |
| HPA with stabilization | Cost-efficient scaling without thrash |
| Multi-zone spread | Survives zone-level failures |
| Non-root containers | Defense-in-depth security |

These practices compound. A cluster with all of them enabled can sustain node failures, traffic spikes, and rollout errors without downtime. Start implementing them one namespace at a time, measuring before and after with your observability stack.
