---
title: "KEDA — Kubernetes Event-Driven Autoscaler"
description: "Kubernetes event-driven autoscaler that scales workloads based on external metrics from queues, databases, and cloud services"
category: "cloud-native"
tags: ["kubernetes", "devops", "autoscaling", "cloud", "event-driven", "cloud-native", "serverless", "k8s"]
pricing: "Open Source"
pricingDetail: "Free and open-source (Apache 2.0). CNCF graduated project — no licensing cost for self-hosted use."
website: "https://keda.sh"
github: "https://github.com/kedacore/keda"
date: "2026-04-03"
pros:
  - "Scale-to-zero capability eliminates idle resource costs for event-driven workloads"
  - "60+ built-in scalers covering major message queues, databases, and cloud services"
  - "Works alongside native Kubernetes HPA without replacing it"
  - "ScaledJob support enables autoscaling for batch and one-off workloads"
cons:
  - "Adds an additional layer of complexity on top of Kubernetes autoscaling primitives"
  - "Custom scaler development requires implementing a gRPC interface"
  - "Monitoring and debugging scaling decisions requires correlating KEDA metrics with HPA state"
---

## KEDA: Kubernetes Event-Driven Autoscaling

KEDA (Kubernetes Event-Driven Autoscaling) is a CNCF graduated project that enables fine-grained autoscaling for any container in Kubernetes based on the number of events waiting to be processed. It extends the Kubernetes Horizontal Pod Autoscaler (HPA) with the ability to scale on external event sources like message queues, databases, cloud metrics, and custom endpoints — including scaling down to zero.

## Key Features

- **Scale to zero**: Completely remove pods when there is no work to process, then scale up automatically when events arrive
- **Scale from zero**: Start pods on-demand when new events are detected, with no pre-warmed instances needed
- **External metrics**: 60+ built-in scalers for Kafka, RabbitMQ, Azure Service Bus, AWS SQS, NATS, Redis, PostgreSQL, Prometheus, and many more
- **Custom scalers**: Build your own scaler with a simple gRPC interface for any proprietary or exotic event source
- **HPA-compatible**: Works alongside existing Kubernetes HPA without replacing it
- **ScaledJob**: Scale Kubernetes Jobs (not just Deployments) based on queue depth for batch workloads
- **Cron scaler**: Schedule scaling based on time of day for predictable traffic patterns
- **HTTPS scaler**: Scale based on any external HTTP endpoint that returns a metric value

## Use Cases

- **Queue-based workers**: Scale consumer pods up and down based on the depth of a message queue (Kafka, SQS, RabbitMQ)
- **Event-driven microservices**: Automatically scale services handling webhooks, notifications, or stream processing
- **Cost optimization**: Scale background workers to zero during off-peak hours and bring them up on demand
- **Batch processing**: Use ScaledJob to spin up one pod per message and process jobs in parallel
- **Serverless-like workloads**: Achieve serverless-style scale-to-zero economics within your own Kubernetes cluster

## Quick Start

Install KEDA and create a scaler for an AWS SQS queue:

```bash
# Install KEDA via Helm
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm install keda kedacore/keda \
  --namespace keda \
  --create-namespace
```

Scale a deployment based on SQS queue depth:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-worker-scaler
  namespace: my-app
spec:
  scaleTargetRef:
    name: sqs-worker
  minReplicaCount: 0
  maxReplicaCount: 20
  pollingInterval: 15
  cooldownPeriod: 60
  triggers:
    - type: aws-sqs-queue
      authenticationRef:
        name: aws-credentials
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789/my-queue
        queueLength: "5"
        awsRegion: us-east-1
```

Scale a Kafka consumer based on consumer group lag:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
spec:
  scaleTargetRef:
    name: kafka-consumer
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-broker:9092
        consumerGroup: my-consumer-group
        topic: my-topic
        lagThreshold: "100"
        offsetResetPolicy: latest
```

Use a cron trigger for predictable scaling:

```yaml
triggers:
  - type: cron
    metadata:
      timezone: Asia/Taipei
      start: "0 8 * * 1-5"   # 8 AM weekdays
      end: "0 22 * * 1-5"    # 10 PM weekdays
      desiredReplicas: "10"
```

## Comparison with Alternatives

| Feature | KEDA | Native HPA | KEDA + HPA |
|---|---|---|---|
| CPU/Memory scaling | Via Prometheus | Yes | Yes |
| Queue-based scaling | Yes (60+ scalers) | No | Yes |
| Scale to zero | Yes | No (min 1) | Yes |
| External metrics | Yes | Limited | Yes |
| Setup complexity | Low | None | Low |

**vs Native HPA**: Kubernetes HPA scales based on CPU, memory, or custom metrics from the Metrics Server, but cannot natively scale on queue depth or external service metrics. KEDA adds these capabilities without replacing HPA — they complement each other.

**vs KEDA for all scaling vs CPU-based**: For latency-sensitive web services where CPU is a valid proxy for load, native HPA or KEDA's Prometheus scaler works well. For async workloads, KEDA's native queue scalers are the right tool.

KEDA is essential for any Kubernetes workload that processes events asynchronously — it prevents both under-provisioning during spikes and over-provisioning during quiet periods, directly impacting cloud costs.
