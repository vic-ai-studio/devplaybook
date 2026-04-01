---
title: "Kubernetes Cost Optimization: A Practical Guide for 2026"
description: "Reduce your Kubernetes costs by 40-60% with rightsizing, VPA/HPA, spot instances, namespace quotas, and cost monitoring tools like Kubecost. Real examples included."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["kubernetes", "cost-optimization", "k8s", "cloud-costs", "devops"]
readingTime: "12 min read"
---

Kubernetes is powerful—and expensive if you don't manage it carefully. The average engineering team running k8s on a cloud provider is wasting 30–50% of their compute budget on oversized pods, idle namespaces, and misconfigured autoscalers. In 2026, with cloud bills continuing to be a top engineering concern, getting Kubernetes cost optimization right is a core DevOps competency.

This guide walks through the most impactful techniques, with real configuration examples, to help you cut your k8s spend by 40–60% without sacrificing reliability.

## Why Kubernetes Clusters Get Expensive

Before optimizing, understand the cost drivers:

1. **Oversized resource requests**: Pods request 4 CPUs but use 0.2 on average
2. **No autoscaling**: Fixed node counts regardless of actual load
3. **Persistent volumes**: Orphaned PVCs accumulating storage costs
4. **Idle namespaces**: Dev/staging environments running 24/7
5. **Spot instance underuse**: Paying on-demand rates when workloads are fault-tolerant
6. **Missing limits**: Pods that can burst to consume entire nodes

## Step 1: Establish a Cost Baseline with Kubecost

You can't optimize what you can't measure. [Kubecost](/tools/kubecost) provides per-namespace, per-deployment cost visibility in real time.

### Install Kubecost

```bash
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm repo update

helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set kubecostToken="YOUR_TOKEN" \
  --set global.prometheus.enabled=true
```

### Key Metrics to Track

```bash
# Port-forward to access the Kubecost UI
kubectl port-forward -n kubecost deployment/kubecost-cost-analyzer 9090

# Or query the API directly
curl http://localhost:9090/model/allocation?window=7d&aggregate=namespace
```

Once you have Kubecost running, generate a baseline report by namespace. You'll typically find that 20% of namespaces account for 80% of costs—and many of those namespaces are dev or CI environments.

## Step 2: Rightsize Your Pod Resources

Resource requests are the single biggest lever for cost reduction. Kubernetes schedules pods based on *requests*, not actual usage. If your pod requests 2 CPU but uses 0.1, you're paying for 20x what you need.

### Finding Oversized Pods

```bash
# Check actual CPU/memory usage vs requests
kubectl top pods --all-namespaces --sort-by=cpu

# More detailed with requests comparison
kubectl get pods --all-namespaces -o json | jq '
  .items[] | {
    name: .metadata.name,
    namespace: .metadata.namespace,
    cpu_request: .spec.containers[].resources.requests.cpu,
    memory_request: .spec.containers[].resources.requests.memory
  }
'
```

### Setting Realistic Requests and Limits

The golden rule: **requests = P50 usage, limits = P95 usage**.

```yaml
# Before: oversized requests
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
          limits:
            cpu: "4"
            memory: "8Gi"

---
# After: rightsized based on actual metrics
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        resources:
          requests:
            cpu: "200m"
            memory: "512Mi"
          limits:
            cpu: "800m"
            memory: "1Gi"
```

This change alone can reduce your compute bill by 60% for CPU-light workloads.

## Step 3: Implement Vertical Pod Autoscaler (VPA)

VPA automatically adjusts resource requests based on historical usage. It's the most reliable way to keep rightsizing up to date as workloads change.

### Install VPA

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

### Configure VPA for Your Deployments

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    updateMode: "Auto"  # Or "Off" for recommendation-only mode
  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: "100m"
        memory: "128Mi"
      maxAllowed:
        cpu: "2"
        memory: "2Gi"
      controlledResources:
      - cpu
      - memory
```

**Start with `updateMode: "Off"`** to get recommendations without automatic changes. Review for a week before enabling `Auto`.

```bash
# Check VPA recommendations
kubectl describe vpa api-server-vpa -n production

# Output will show:
# Recommendation:
#   Container Recommendations:
#     Container Name: api
#       Lower Bound:  cpu: 50m, memory: 256Mi
#       Target:       cpu: 180m, memory: 512Mi
#       Upper Bound:  cpu: 400m, memory: 1Gi
```

## Step 4: Horizontal Pod Autoscaler (HPA) for Variable Load

HPA scales pod counts based on CPU, memory, or custom metrics. Combined with VPA (use VPA for sizing, HPA for count), this prevents over-provisioning for variable workloads.

### Basic CPU-Based HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
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
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60  # Remove at most 1 pod per minute
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60  # Can add up to 4 pods per minute
```

The `behavior` section is critical for cost control. Without it, HPA can aggressively scale down and cause availability issues, or scale up prematurely on short traffic spikes.

### Custom Metrics HPA (KEDA)

For queue-based workloads, [KEDA](/tools/keda) (Kubernetes Event-Driven Autoscaling) scales pods to zero during idle periods—a massive cost saver.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-scaledobject
  namespace: production
spec:
  scaleTargetRef:
    name: background-worker
  minReplicaCount: 0  # Scale to zero when queue is empty
  maxReplicaCount: 50
  triggers:
  - type: rabbitmq
    metadata:
      host: amqp://rabbitmq.default.svc.cluster.local
      queueName: task-queue
      queueLength: "5"  # One pod per 5 messages in queue
```

Scaling workers to zero during off-peak hours can save 60–80% on worker node costs.

## Step 5: Use Spot/Preemptible Instances for Non-Critical Workloads

Spot instances (AWS) or preemptible VMs (GCP) are 60–90% cheaper than on-demand. The tradeoff: they can be terminated with 2 minutes notice.

### Cluster Autoscaler with Mixed Instance Groups

```yaml
# AWS EKS node group configuration (eksctl)
managedNodeGroups:
- name: on-demand-core
  instanceType: m5.large
  minSize: 2
  maxSize: 5
  labels:
    node-type: on-demand

- name: spot-workers
  instanceTypes:
  - m5.large
  - m5.xlarge
  - m4.large
  - m4.xlarge
  spot: true
  minSize: 0
  maxSize: 50
  labels:
    node-type: spot
  taints:
  - key: spot
    value: "true"
    effect: NoSchedule
```

### Schedule Fault-Tolerant Workloads on Spot Nodes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
spec:
  template:
    spec:
      tolerations:
      - key: spot
        operator: Equal
        value: "true"
        effect: NoSchedule
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: node-type
                operator: In
                values:
                - spot
      containers:
      - name: processor
        # Ensure graceful shutdown on spot termination
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 25"]
        terminationGracePeriodSeconds: 30
```

Always ensure batch and stateless workloads handle termination gracefully. Use checkpointing for long-running jobs.

## Step 6: Namespace Resource Quotas and LimitRanges

Without quotas, a single misconfigured deployment can consume your entire cluster. Resource quotas enforce budget boundaries per namespace.

### Namespace Quota Configuration

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: development
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
    persistentvolumeclaims: "10"
    requests.storage: 100Gi

---
# Default limits for pods that don't specify them
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: development
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    type: Container
```

LimitRanges are especially important for dev namespaces where engineers may not set resource requests. Without a LimitRange, pods with no requests get scheduled with zero requests—meaning the scheduler thinks they're free.

## Step 7: Clean Up Idle Resources

One of the fastest wins is eliminating zombie resources.

### Find Orphaned PVCs

```bash
# Find PVCs not mounted by any pod
kubectl get pvc --all-namespaces -o json | jq '
  .items[] |
  select(.status.phase == "Bound") |
  select(.metadata | has("annotations") | not) |
  {namespace: .metadata.namespace, name: .metadata.name, size: .spec.resources.requests.storage}
'

# Find PVs that are Released (not bound)
kubectl get pv | grep Released
```

### Automate Dev Environment Shutdown

Use [Kube Janitor](/tools/kube-janitor) or a simple CronJob to spin down non-production namespaces after hours:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dev-namespace-scaler
  namespace: tools
spec:
  schedule: "0 20 * * 1-5"  # 8 PM on weekdays
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: namespace-scaler
          containers:
          - name: kubectl
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              for ns in dev staging preview; do
                kubectl scale deployment --all -n $ns --replicas=0
              done
          restartPolicy: OnFailure
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dev-namespace-starter
  namespace: tools
spec:
  schedule: "0 8 * * 1-5"  # 8 AM on weekdays
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: namespace-scaler
          containers:
          - name: kubectl
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              for ns in dev staging; do
                kubectl scale deployment --all -n $ns --replicas=1
              done
          restartPolicy: OnFailure
```

This pattern alone saves 12 hours of dev/staging costs every weekday.

## Step 8: Node Auto-Provisioning with Karpenter

[Karpenter](/tools/karpenter) is a next-generation cluster autoscaler that provisions exactly the right node type for each workload, rather than scaling pre-defined node groups. It consistently delivers 20–40% cost savings over the standard Cluster Autoscaler.

```yaml
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    metadata:
      labels:
        managed-by: karpenter
    spec:
      requirements:
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["spot", "on-demand"]
      - key: kubernetes.io/arch
        operator: In
        values: ["amd64", "arm64"]  # ARM nodes are 20% cheaper
      - key: node.kubernetes.io/instance-type
        operator: In
        values:
        - m5.large
        - m5.xlarge
        - m6g.large   # Graviton ARM instances
        - m6g.xlarge
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 30s  # Bin-pack and remove underutilized nodes quickly
  limits:
    cpu: "1000"
    memory: 2000Gi
```

Karpenter's consolidation feature continuously bin-packs workloads onto fewer nodes and terminates empty ones—something the standard autoscaler cannot do.

## Measuring Results: Cost Optimization Scorecard

After implementing these changes, track these KPIs weekly:

```bash
# CPU utilization ratio (target: >60%)
kubectl top nodes

# Average pod CPU request utilization
# (via Kubecost or Prometheus query)
# avg(rate(container_cpu_usage_seconds_total[5m])) by (pod) /
# avg(kube_pod_container_resource_requests{resource="cpu"}) by (pod)

# Spot instance percentage (target: >50% of non-prod)
kubectl get nodes -l node-type=spot --no-headers | wc -l

# Idle namespace count (target: 0 during off-hours)
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

## Real-World Results

A typical mid-size SaaS team running k8s on AWS/GCP can expect:

| Optimization | Typical Savings |
|---|---|
| Pod rightsizing | 25–40% |
| Spot instances for workers | 15–25% |
| KEDA scale-to-zero | 10–20% |
| Dev environment scheduling | 8–15% |
| Orphaned resource cleanup | 3–8% |
| Karpenter consolidation | 10–20% |
| **Total** | **40–60%** |

These savings compound. Smaller pods mean more fit per node, which means fewer nodes needed overall.

## Conclusion

Kubernetes cost optimization is not a one-time project—it's an ongoing practice. Start with Kubecost to establish visibility, then work through rightsizing and autoscaling. Add spot instances once your workloads handle interruptions gracefully, and automate dev environment scheduling to eliminate idle costs.

The tools exist to make this systematic. The teams that treat cloud costs as a first-class engineering metric consistently spend 40–60% less than those who don't.

For more DevOps tooling, explore the [Kubernetes tools collection](/tools/kubernetes) and [cost monitoring tools](/tools/cost-monitoring) on DevPlaybook.
