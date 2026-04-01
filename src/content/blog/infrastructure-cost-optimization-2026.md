---
title: "Cloud Infrastructure Cost Optimization: Save 40% with These Techniques"
description: "Practical cloud cost optimization strategies: right-sizing instances, reserved vs spot instances, Kubernetes cost management, serverless cost patterns, and FinOps tooling to reduce AWS and GCP billing by 30-50%."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["cloud cost", "AWS cost", "GCP billing", "infrastructure optimization", "FinOps", "Kubernetes cost", "cost management"]
readingTime: "10 min read"
---

Cloud bills are the fastest-growing operational expense for most engineering organizations. According to Flexera's 2025 State of the Cloud report, companies waste an average of **32% of their cloud spend** — and that number grows as organizations scale. The good news: most waste is addressable with known techniques and minimal engineering effort.

This guide covers the highest-ROI cost optimization strategies across compute, storage, Kubernetes, and serverless, plus the tooling to find and monitor waste automatically.

---

## Understanding Your Cloud Bill: The First Step

Before optimizing, you need visibility. The most common mistake is trying to optimize without data.

**Start with cost allocation tags:**

```bash
# AWS: tag all resources at creation
aws ec2 create-tags --resources i-1234567890abcdef0 \
  --tags Key=Environment,Value=production \
         Key=Team,Value=backend \
         Key=Service,Value=payment-api \
         Key=CostCenter,Value=engineering
```

Without tags, you can't attribute costs to teams or services. Enforce tagging policies through AWS Config or GCP Organization Policies — resources without required tags should be flagged immediately.

**Enable Cost Anomaly Detection** (AWS): automatically alerts when costs spike unexpectedly, often detecting forgotten dev environments or runaway Lambda invocations within hours.

---

## Right-Sizing Compute: The Highest-ROI Optimization

Most cloud instances run at 10–30% CPU utilization. Right-sizing means matching instance size to actual workload requirements.

### AWS EC2 Right-Sizing

```bash
# View Compute Optimizer recommendations
aws compute-optimizer get-ec2-instance-recommendations \
  --filters name=Finding,values=NotOptimized

# Common findings:
# - Instance using 8% CPU avg → downsize from m5.2xlarge to m5.large (75% cost reduction)
# - Memory underutilized → switch from r5 (memory-optimized) to m5 (general purpose)
```

**Action**: Review AWS Compute Optimizer monthly. Apply recommendations to non-critical instances first to validate stability, then roll out to production.

### Kubernetes Resource Requests and Limits

Over-provisioned resource requests on Kubernetes pods waste allocated (and billed) capacity:

```yaml
# ❌ Wasteful: requesting 4 CPU for a service using 0.2 CPU avg
resources:
  requests:
    cpu: "4"
    memory: "8Gi"

# ✅ Right-sized: requests match P95 actual usage + 30% headroom
resources:
  requests:
    cpu: "250m"
    memory: "512Mi"
  limits:
    cpu: "1"
    memory: "1Gi"
```

Tools: **Vertical Pod Autoscaler (VPA)** in recommendation mode shows optimal requests for each workload. **Goldilocks** (Fairwinds) provides a dashboard of VPA recommendations across all namespaces.

---

## Reserved Instances and Savings Plans

On-demand pricing has a 40–75% premium over committed pricing. If you have predictable baseline workloads (and you do), this is free money.

| Commitment Type | Savings vs On-Demand | Flexibility |
|---|---|---|
| On-Demand | baseline | Full flexibility |
| 1-year Compute Savings Plan | ~40% | Any EC2 instance type |
| 3-year Reserved Instance | ~60–72% | Specific family/region |
| Spot Instances | ~70–90% | Can be interrupted |

**Strategy:**
- Cover your **baseline workload** (minimum capacity always running) with 1-year Savings Plans
- Run **batch/CI/CD workloads** on Spot (interruptible jobs)
- Run **stateless web tier** auto-scaling group with mixed on-demand + spot

```bash
# AWS: Create a Compute Savings Plan (1-year, no upfront)
aws savingsplans create-savings-plan \
  --savings-plan-type COMPUTE \
  --term-duration-in-years 1 \
  --payment-option NO_UPFRONT \
  --commitment 100.00  # $100/hour commitment
```

---

## Spot Instances: 70–90% Savings for Fault-Tolerant Workloads

Spot instances are excess EC2 capacity at steep discounts, with 2-minute interruption notice. They're ideal for:

- CI/CD build agents
- Data processing and ETL jobs
- Machine learning training
- Stateless auto-scaling groups

**AWS Spot Fleet with diversification:**

```json
{
  "SpotFleetRequestConfig": {
    "TargetCapacity": 20,
    "AllocationStrategy": "diversified",
    "LaunchSpecifications": [
      {"InstanceType": "m5.xlarge", "SpotPrice": "0.20"},
      {"InstanceType": "m5a.xlarge", "SpotPrice": "0.18"},
      {"InstanceType": "m4.xlarge", "SpotPrice": "0.19"}
    ]
  }
}
```

Diversifying across multiple instance types and availability zones reduces interruption risk from ~5% to ~1%.

**Kubernetes Spot node groups** (EKS):

```yaml
# karpenter NodePool targeting spot instances
apiVersion: karpenter.sh/v1beta1
kind: NodePool
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
        - key: node.kubernetes.io/instance-type
          operator: In
          values: ["m5.xlarge", "m5a.xlarge", "m4.xlarge"]
  disruption:
    consolidationPolicy: WhenUnderutilized
```

---

## Storage Cost Optimization

Storage costs are often overlooked but compound quickly:

### S3 Storage Classes

| Class | Cost ($/GB/month) | Use For |
|---|---|---|
| Standard | $0.023 | Frequently accessed |
| Standard-IA | $0.0125 | Infrequently accessed |
| Glacier Instant | $0.004 | Archives, accessed rarely |
| Glacier Deep Archive | $0.00099 | Long-term backups |

**S3 Lifecycle Policies** automatically transition objects:

```json
{
  "Rules": [{
    "Status": "Enabled",
    "Transitions": [
      {"Days": 30, "StorageClass": "STANDARD_IA"},
      {"Days": 90, "StorageClass": "GLACIER_IR"},
      {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}
    ],
    "NoncurrentVersionTransitions": [
      {"NoncurrentDays": 30, "StorageClass": "GLACIER_IR"}
    ],
    "NoncurrentVersionExpiration": {"NoncurrentDays": 365}
  }]
}
```

### Database Storage

- **Delete unattached EBS volumes** — volumes orphaned when instances are terminated
- **Reduce RDS storage auto-scaling growth** — storage grows automatically but never shrinks
- **Review RDS Multi-AZ** — if read replicas are being used for HA, Multi-AZ may be redundant
- **Aurora Serverless v2** — scales to zero for dev/staging databases

---

## Kubernetes Cost Allocation with Kubecost

Kubernetes cost is opaque by default — the cluster bill is a single line item. **Kubecost** provides namespace-, workload-, and label-level cost allocation:

```bash
# Install Kubecost
helm install kubecost cost-analyzer/cost-analyzer \
  --namespace kubecost --create-namespace \
  --set kubecostToken="your-token"
```

Kubecost reveals:
- Cost per namespace, deployment, and label
- Idle capacity (unused reserved resources)
- Cost efficiency score per workload
- Projected monthly spend

Alternative: **OpenCost** (CNCF incubating, open source, less features than Kubecost commercial).

---

## Serverless Cost Optimization

Lambda costs scale with invocations × duration × memory. Common waste patterns:

**Over-allocating memory:**
```bash
# Lambda charges for memory × duration
# 512MB × 1000ms = same cost as 1024MB × 500ms (if runtime is memory-bound)
# Use AWS Lambda Power Tuning to find the optimal memory setting
npx lumigo-cli@latest analyze-lambda-cost --function-name my-function
```

**Cold start mitigation vs provisioned concurrency:**
Provisioned concurrency eliminates cold starts but costs ~$0.015/GB-hour regardless of invocations. Only enable it if cold starts are actually causing user-facing latency issues — otherwise it's unnecessary spend.

**Reducing Lambda invocation duration:**
- Move CPU-intensive work to container-based compute (Lambda has limited CPU)
- Cache external API calls with ElastiCache or DynamoDB DAX
- Use Lambda response streaming to start sending data before processing completes

---

## FinOps Tooling Stack

| Tool | Purpose | Cost |
|---|---|---|
| AWS Cost Explorer | Native AWS cost analysis + reservations | Free |
| AWS Compute Optimizer | Right-sizing recommendations | Free |
| CloudHealth (VMware) | Multi-cloud governance + optimization | Paid |
| Kubecost | Kubernetes cost allocation | Free tier + paid |
| Infracost | Terraform cost estimation in CI/CD | Free + paid |
| CAST AI | Automated K8s cost optimization | Paid (% of savings) |

**Infracost CI/CD integration** — show cost impact on every Terraform PR:

```yaml
# .github/workflows/infracost.yml
- name: Run Infracost
  uses: infracost/actions/setup@v2
  with:
    api-key: ${{ secrets.INFRACOST_API_KEY }}
- run: |
    infracost diff --path . \
      --format json \
      --out-file /tmp/infracost.json
    infracost comment github --path /tmp/infracost.json \
      --repo $GITHUB_REPOSITORY \
      --github-token ${{ secrets.GITHUB_TOKEN }} \
      --pull-request ${{ github.event.pull_request.number }} \
      --behavior update
```

---

## Quick Wins Checklist

Run through this list monthly:

- [ ] **Delete unattached EBS volumes** (`aws ec2 describe-volumes --filters Name=status,Values=available`)
- [ ] **Release unattached Elastic IPs** (each unused EIP costs ~$3.60/month)
- [ ] **Stop dev/staging environments on nights/weekends** (auto-stop Lambda + EventBridge = 60% savings)
- [ ] **Delete old EBS snapshots** older than 90 days (automated with DLM lifecycle policies)
- [ ] **Review NAT Gateway costs** — NAT Gateway charges per GB transferred; consider VPC endpoints for S3/DynamoDB
- [ ] **Audit unused CloudWatch Log Groups** — check retention policies (default = never expire)
- [ ] **Review Data Transfer charges** — inter-AZ traffic is the most common surprise cost at scale

---

Cloud cost optimization isn't a one-time project — it's an ongoing practice. The teams that maintain healthy cloud bills treat cost as an engineering metric alongside latency and error rate, with dashboards, alerts, and regular review cycles. The techniques above, applied consistently, routinely reduce bills by 30–50% without any reduction in reliability or performance.
