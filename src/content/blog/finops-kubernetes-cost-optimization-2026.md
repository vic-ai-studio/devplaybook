---
title: "FinOps for Kubernetes: Cut Cloud Costs by 40% Without Slowing Engineering"
description: "Practical FinOps strategies for Kubernetes in 2026. Use Kubecost, KEDA, spot instances, and right-sizing to reduce cloud bills by 40% while maintaining performance."
date: "2026-04-01"
tags: [finops, kubernetes, cloud-cost, devops, aws]
readingTime: "12 min read"
---

The average Kubernetes deployment wastes 40–60% of its cloud spend. Not because engineers are careless, but because Kubernetes makes it easy to over-provision and hard to see where the money is actually going. FinOps for Kubernetes is the discipline that changes that — giving you the visibility, tooling, and governance to cut costs without creating a performance time bomb.

This guide is for platform engineers and DevOps leads who want concrete strategies, not slide deck theory. We'll cover the full stack: Kubecost dashboards, VPA right-sizing, KEDA event-driven scaling, spot instance strategies, and a 40% cost reduction checklist you can start using this week.

## Why Kubernetes Costs Spiral Out of Control

Before fixing the problem, understand why it happens.

**Over-provisioning by default.** Request limits in Kubernetes are set by humans making educated guesses. Developers set requests high to avoid OOMKills and throttling. Those high requests translate directly into node capacity reservations — you pay for requested CPU/memory, not what's actually used.

**No cost visibility.** Cloud bills show EC2 instances and EBS volumes. They don't show which Kubernetes namespace, deployment, or team is responsible for which cost. Without visibility, no one optimizes.

**Underutilized nodes.** The Kubernetes scheduler bins-packs pods onto nodes, but only as well as requests allow. Fragmentation means nodes at 40% actual CPU utilization but 90% requested — you can't schedule more pods, but you're not actually using what you have.

**Idle environments.** Dev and staging clusters often run 24/7 even though they're only needed during business hours. A staging environment that runs continuously costs 3x what it would with scheduled scale-down.

**Autoscaling misconfiguration.** HPA (Horizontal Pod Autoscaler) set to scale on CPU can be wildly inappropriate for workloads driven by queue depth or request latency. Wrong scaling metrics mean either over-scaling (cost) or under-scaling (performance).

## FinOps Principles Applied to Kubernetes

The [FinOps Foundation](https://www.finops.org) defines three phases: **Inform, Optimize, Operate**. Applied to Kubernetes:

| Phase | What It Means | Key Tools |
|-------|--------------|-----------|
| **Inform** | Make costs visible at team/service/namespace level | Kubecost, OpenCost, AWS Cost Explorer |
| **Optimize** | Right-size, autoscale, use cheaper compute | VPA, KEDA, Spot instances, Karpenter |
| **Operate** | Embed cost accountability in workflows | Budget alerts, cost per feature, chargeback |

The most important principle: **cost decisions are engineering decisions**. FinOps isn't a finance team audit. It's engineering teams seeing their costs in real time and having the tools to reduce them.

## Kubecost: Setup and Dashboard Walkthrough

[Kubecost](https://www.kubecost.com) is the de facto standard for Kubernetes cost visibility. The open-source version covers most use cases; Kubecost Enterprise adds multi-cluster and advanced chargeback.

### Installation

```bash
# Install via Helm
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm repo update

# Install Kubecost in its own namespace
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set kubecostToken="your-token-here" \
  --set global.prometheus.enabled=true \
  --set global.grafana.enabled=false  # use existing Grafana if you have one
```

```bash
# Access the dashboard
kubectl port-forward deployment/kubecost-cost-analyzer 9090 -n kubecost
# Open http://localhost:9090
```

### Key Dashboard Sections

**Cost Allocation** — breaks down spend by namespace, deployment, label, or team. This is where you find the "who is spending what" answer. Configure labels to map to teams:

```yaml
# In your deployment manifests, add standard labels
metadata:
  labels:
    app: payment-service
    team: payments          # Kubecost uses this for cost allocation
    environment: production
    cost-center: payments-prod
```

**Efficiency** — shows CPU and memory efficiency per workload. Efficiency = (actual usage / requested). Anything below 50% is a right-sizing opportunity.

**Savings Insights** — Kubecost automatically surfaces:
- Unused resources (pods with <10% CPU efficiency)
- Right-sizing recommendations (VPA suggestions)
- Abandoned workloads (services with zero traffic for 7+ days)

**Alerts** — set budget alerts per namespace or team:

```bash
# Example: alert when payments namespace exceeds $500/day
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecost-alerts
  namespace: kubecost
data:
  alerts.json: |
    {
      "alerts": [
        {
          "type": "budget",
          "threshold": 500,
          "window": "1d",
          "aggregation": "namespace",
          "filter": "namespace:payments",
          "recipients": ["platform-team@company.com"]
        }
      ]
    }
EOF
```

### Understanding the Efficiency Report

A typical Kubecost efficiency report might show:

| Namespace | CPU Request | CPU Used | Efficiency | Monthly Cost | Waste |
|-----------|------------|---------|-----------|--------------|-------|
| payments | 8 cores | 2.1 cores | 26% | $890 | $657 |
| auth | 4 cores | 3.2 cores | 80% | $445 | $89 |
| analytics | 16 cores | 3.4 cores | 21% | $1,780 | $1,407 |
| staging | 12 cores | 0.8 cores | 7% | $1,340 | $1,246 |

The analytics and staging namespaces are the obvious targets. Fix those two and you've cut costs significantly before touching anything else.

## Right-Sizing with VPA (Vertical Pod Autoscaler)

VPA automatically adjusts CPU and memory requests based on actual usage history. It's one of the most impactful cost levers available.

### Install VPA

```bash
# Clone the VPA repo and install
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

### Configure VPA for a Workload

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: payment-service-vpa
  namespace: payments
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  updatePolicy:
    updateMode: "Auto"   # Auto = apply recommendations automatically
                         # Off = recommendations only, no auto-apply
                         # Initial = only at pod creation
  resourcePolicy:
    containerPolicies:
      - containerName: payment-service
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 2000m
          memory: 2Gi
        controlledResources: ["cpu", "memory"]
```

### Check VPA Recommendations

```bash
kubectl get vpa payment-service-vpa -n payments -o yaml
```

Output will show current vs recommended:

```yaml
status:
  recommendation:
    containerRecommendations:
    - containerName: payment-service
      lowerBound:
        cpu: 150m
        memory: 256Mi
      target:              # This is what VPA recommends
        cpu: 300m
        memory: 512Mi
      upperBound:
        cpu: 800m
        memory: 1Gi
      uncappedTarget:
        cpu: 300m
        memory: 512Mi
```

If you had set `cpu: 2000m` in your original deployment and VPA recommends `300m`, you're over-provisioned by 6.7x. The cost savings on a single deployment can be substantial.

**Important caveat:** VPA in `Auto` mode evicts and restarts pods to apply new resource settings. For production workloads, use `Off` mode first to gather recommendations, then apply manually or during maintenance windows.

## KEDA: Event-Driven Scaling to Eliminate Idle Costs

KEDA (Kubernetes Event-Driven Autoscaler) scales deployments based on external metrics — queue depth, Kafka lag, HTTP request rate, database row count — not just CPU. This is crucial for workloads that have bursty or predictable traffic patterns.

### Why KEDA Beats Standard HPA for Cost

Standard HPA scales on CPU: if CPU > 70%, add pods. The problem: a queue-processing service might be sitting idle (low CPU) with 50,000 messages backed up. HPA won't scale it. KEDA will.

More importantly: KEDA can scale to **zero**. An HPA minimum is 1 pod. KEDA can truly turn off a workload when there's nothing to process, then spin up when messages arrive.

### Install KEDA

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm install keda kedacore/keda --namespace keda --create-namespace
```

### Scale to Zero on SQS Queue

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor-scaler
  namespace: orders
spec:
  scaleTargetRef:
    name: order-processor
  pollingInterval: 30       # Check every 30 seconds
  cooldownPeriod: 300       # Wait 5 min before scaling down
  minReplicaCount: 0        # Allow scale-to-zero
  maxReplicaCount: 20       # Cap at 20 pods
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789/order-queue
        queueLength: "5"    # Target: 5 messages per pod
        awsRegion: us-east-1
      authenticationRef:
        name: keda-aws-credentials
```

```yaml
# Credentials via TriggerAuthentication
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-aws-credentials
  namespace: orders
spec:
  podIdentity:
    provider: aws-eks  # Use IRSA (IAM Roles for Service Accounts)
```

### Scheduled Scale-Down for Non-Production

For dev/staging environments, KEDA's cron scaler is a simple win:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: staging-scheduled-scale
  namespace: staging
spec:
  scaleTargetRef:
    name: staging-api
  minReplicaCount: 0
  maxReplicaCount: 5
  triggers:
    - type: cron
      metadata:
        timezone: "Asia/Taipei"
        start: "0 8 * * 1-5"    # Scale up: 8am weekdays
        end: "0 20 * * 1-5"     # Scale down: 8pm weekdays
        desiredReplicas: "3"
    - type: cron
      metadata:
        timezone: "Asia/Taipei"
        start: "0 0 * * 6,0"    # Weekends: stay at zero
        end: "0 23 * * 6,0"
        desiredReplicas: "0"
```

A staging cluster that runs only during business hours (60 hours/week vs 168) reduces its compute cost by 64%.

## Spot and Preemptible Instances: The Biggest Single Lever

Spot instances (AWS) and preemptible instances (GCP) cost 60–90% less than on-demand. For stateless workloads, this is the highest-ROI optimization available.

### The Interruption Problem (and How to Solve It)

The catch: spot instances can be terminated with 2-minute notice when AWS needs capacity back. For many teams this feels too risky, but the risk is manageable.

**Karpenter** (AWS) is the modern solution. It provisions the right instance type at the right price, mixes spot and on-demand based on policies, and handles interruptions by automatically provisioning replacement capacity.

```yaml
# Karpenter NodePool: mix spot and on-demand
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: general-purpose
spec:
  template:
    metadata:
      labels:
        nodepool: general-purpose
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]   # Prefer spot, fallback to on-demand
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]         # Multiple instance families = more spot availability
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["2"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: general
  limits:
    cpu: 1000
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 30s
```

### Make Workloads Interruption-Tolerant

```yaml
# Deployment configured for spot resilience
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 6
  strategy:
    rollingUpdate:
      maxUnavailable: 2    # Allow up to 2 pods unavailable during interruption
      maxSurge: 2
  template:
    spec:
      terminationGracePeriodSeconds: 120  # 2 minutes to drain
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: api-service
      containers:
        - name: api-service
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 15"]  # Allow load balancer drain
```

**Workloads suitable for spot:** stateless microservices, batch processing, data pipelines, CI/CD runners, ML training jobs.

**Keep on on-demand:** stateful services, databases, anything that can't tolerate even a brief interruption, control-plane components.

## Namespace Cost Allocation and Chargeback

Visibility without accountability produces no change. Chargeback — allocating costs to the teams that create them — closes the loop.

### Label Standards for Cost Allocation

Establish and enforce labeling standards across all deployments:

```yaml
# Required labels (enforced via OPA/Gatekeeper)
metadata:
  labels:
    team: payments           # Which team owns this
    service: payment-api     # Service name
    environment: production  # prod/staging/dev
    cost-center: eng-payments # Finance cost center
```

```yaml
# OPA ConstraintTemplate to enforce cost labels
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requiredlabels
spec:
  crd:
    spec:
      names:
        kind: RequiredLabels
      validation:
        openAPIV3Schema:
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package requiredlabels
        violation[{"msg": msg}] {
          required := {"team", "service", "environment"}
          provided := {label | input.review.object.metadata.labels[label]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }
```

### Resource Quota Policies

Quotas prevent any single team from consuming unbounded resources:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: payments-team-quota
  namespace: payments
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    count/pods: "50"
    count/services: "10"
    count/persistentvolumeclaims: "10"
```

When teams hit their quota, they either optimize or make a conscious decision to request more. Both outcomes are better than unconstrained growth.

## Cost-Per-Feature Tracking

The most sophisticated FinOps practice: attributing infrastructure cost to product features. This lets product managers see the actual cost of features when making roadmap decisions.

The approach:
1. Each major feature or service gets a consistent label in Kubernetes
2. Kubecost's cost allocation API is queried weekly
3. Costs are reported alongside feature metrics in engineering reviews

```bash
# Query Kubecost API for cost by label
curl "http://localhost:9090/model/allocation?window=7d&aggregate=label:feature&accumulate=true" \
  | jq '.data[0] | to_entries | sort_by(-.value.totalCost) | .[:10]'
```

A product feature costing $4,000/month that generates $400/month in revenue is a different conversation than one costing $200/month. This visibility changes engineering priorities.

## Real Case Study: Before and After

A mid-size SaaS company (50 engineers, mixed microservices on EKS) applied these optimizations over a 90-day period.

### Starting State
- **Monthly cloud bill:** $48,000
- **Kubernetes portion:** $31,000
- **Average CPU efficiency:** 23%
- **Average memory efficiency:** 31%
- **Spot instance usage:** 0%
- **Scale-to-zero workloads:** 0

### Changes Made

| Optimization | Monthly Savings | Effort |
|-------------|----------------|--------|
| VPA right-sizing (top 10 services) | $6,200 | 3 days |
| Spot instances via Karpenter (stateless services) | $8,400 | 2 days |
| Staging/dev scale-to-zero with KEDA | $3,100 | 1 day |
| Deleted abandoned workloads (Kubecost audit) | $1,800 | 4 hours |
| Resource quotas preventing over-provisioning | $1,200 | 1 day |
| Reserved instances for baseline on-demand | $2,300 | 2 hours |
| **Total savings** | **$23,000** | ~2 weeks |

### After State
- **Monthly cloud bill:** $25,000 (down from $48,000)
- **Savings: 48%** (exceeded 40% target)
- **Average CPU efficiency:** 61%
- **Average memory efficiency:** 58%
- **Deployment performance:** No regression — DORA metrics unchanged

The key insight: none of these optimizations required application code changes. All savings came from infrastructure configuration and tooling.

## The 40% Cost Reduction Checklist

Work through this checklist in order. The earlier items have the highest ROI and lowest effort.

### Week 1: Visibility
- [ ] Install Kubecost or OpenCost in your cluster
- [ ] Add team/service/environment labels to all deployments
- [ ] Identify top 5 most expensive namespaces
- [ ] Identify workloads with <30% CPU efficiency
- [ ] List all dev/staging environments and their current schedule

### Week 2: Quick Wins
- [ ] Delete workloads with zero traffic for 30+ days (Kubecost "Abandoned Workloads" report)
- [ ] Scale staging/dev to zero outside business hours (KEDA cron scaler)
- [ ] Apply VPA in `Off` mode to top 10 services, review recommendations
- [ ] Move CI/CD runner nodes to spot instances

### Week 3-4: Right-Sizing
- [ ] Apply VPA recommendations to non-critical services (start with staging)
- [ ] Apply VPA `Auto` mode to production services after validating in staging
- [ ] Review and reduce resource limits that are set to 10x+ the request

### Month 2: Smarter Scaling
- [ ] Install Karpenter (replaces Cluster Autoscaler)
- [ ] Configure NodePool to use spot instances for stateless workloads
- [ ] Set up KEDA for queue-based workloads (SQS, Kafka, Redis)
- [ ] Add PodDisruptionBudgets to protect critical services from spot interruptions

### Month 3: Governance
- [ ] Implement ResourceQuotas per namespace/team
- [ ] Enforce labeling via OPA/Gatekeeper
- [ ] Set up budget alerts per team in Kubecost
- [ ] Purchase Reserved Instances for your stable baseline (60-70% of on-demand usage)
- [ ] Publish monthly cost allocation report to engineering leads

### Ongoing
- [ ] Weekly Kubecost efficiency review (15 minutes)
- [ ] New deployments require VPA or explicit resource justification
- [ ] Quarterly review of Reserved Instance coverage vs actual usage

## Common FinOps Mistakes to Avoid

**Setting CPU limits too high "just to be safe."** This is where waste originates. Encourage developers to treat resource requests as a budget, not a ceiling.

**Optimizing dev/staging last.** Non-production environments often represent 30-40% of Kubernetes spend and are the safest place to optimize aggressively.

**Spot instances for stateful workloads.** Databases, Kafka brokers, and anything with local state should stay on on-demand. The cost of a corruption event far exceeds the savings.

**Skipping PodDisruptionBudgets.** Before moving to spot, set PDBs for every service. Without them, a cluster scale-down can take out all instances of a service simultaneously.

**Right-sizing once and forgetting it.** Traffic patterns change. Services evolve. VPA recommendations drift. Re-run the Kubecost efficiency audit quarterly.

**Treating FinOps as a cost-cutting exercise.** The goal is efficiency, not restriction. A feature that costs $5,000/month and drives $500,000 in ARR should get more resources, not fewer. FinOps gives you the data to make that argument and to cut the $5,000/month feature that drives nothing.

## Conclusion

A 40% reduction in Kubernetes cloud costs isn't a theoretical benchmark — it's the typical result when teams apply visibility, right-sizing, event-driven scaling, and spot instances systematically. The tools exist, they're mature, and the effort is measured in days and weeks, not months.

The order matters: visibility first, then quick wins, then automation. Skip ahead to automation without visibility and you'll optimize the wrong things.

Start with Kubecost. Find your three most wasteful namespaces. Fix those. Then repeat.

---

*Further reading: [FinOps Foundation Kubernetes Working Group](https://www.finops.org/projects/kubernetes-cost-optimization/), [Karpenter documentation](https://karpenter.sh/), [KEDA documentation](https://keda.sh/)*
