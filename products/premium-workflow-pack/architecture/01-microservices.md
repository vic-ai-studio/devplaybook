# Microservices Architecture Design Guide

## Overview

This guide covers proven patterns for designing a production-grade microservices system. Use it as a reference when breaking down a monolith or starting a greenfield microservices project.

---

## Service Decomposition Principles

### 1. Decompose by Business Capability

Each service owns a single business domain:

```
┌─────────────────────────────────────────────────────────┐
│                      API Gateway                        │
│          (auth, rate limiting, routing, logging)        │
└──────┬──────────┬──────────┬──────────┬─────────────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐
  │  User  │ │  Order │ │Product │ │Payment │
  │Service │ │Service │ │Service │ │Service │
  └────────┘ └────────┘ └────────┘ └────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐
  │UserDB  │ │OrderDB │ │ProdDB  │ │PayDB   │
  └────────┘ └────────┘ └────────┘ └────────┘
```

**Rule:** One service, one database. Never share a database between services.

### 2. Bounded Context (DDD)

Identify bounded contexts before defining service boundaries:
- Each service has its own **ubiquitous language**
- A "Customer" in Order Service ≠ "User" in Auth Service
- Map context boundaries on a whiteboard before writing code

---

## Communication Patterns

### Synchronous (REST/gRPC)

Use for: real-time queries, user-facing reads.

```
Client ──→ Service A ──→ Service B (waits for response)
```

**Risks:** Cascading failures, tight coupling. Always set timeouts + circuit breakers.

**Circuit Breaker Pattern:**
```javascript
// Using opossum (Node.js)
const CircuitBreaker = require('opossum');
const breaker = new CircuitBreaker(callPaymentService, {
  timeout: 3000,        // Fail after 3s
  errorThresholdPercentage: 50,  // Open at 50% errors
  resetTimeout: 30000   // Try again after 30s
});
```

### Asynchronous (Event-Driven)

Use for: cross-service workflows, eventual consistency.

```
Service A ──→ Message Queue ──→ Service B (processes later)
                             └→ Service C (parallel)
```

**Technology choices:**
| Queue | Best for |
|-------|----------|
| Redis Streams | Simple, low-latency, same infra |
| RabbitMQ | Complex routing, fanout patterns |
| Kafka | High-throughput, event sourcing, replay |
| AWS SQS/SNS | Serverless, managed infra |

---

## Service Template Structure

```
my-service/
├── src/
│   ├── api/          # HTTP handlers (thin layer)
│   ├── domain/       # Business logic (pure functions)
│   ├── infra/        # DB, cache, message queue adapters
│   └── events/       # Emitted/consumed events
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/
    └── ci.yml
```

---

## Resilience Checklist

- [ ] **Health endpoints:** `/health` (liveness) + `/ready` (readiness)
- [ ] **Timeouts:** Set on all outbound HTTP calls (default: 5s)
- [ ] **Retries:** Max 3 retries with exponential backoff
- [ ] **Circuit breakers:** Prevent cascade failures
- [ ] **Bulkhead:** Separate thread pools for critical paths
- [ ] **Graceful shutdown:** Handle SIGTERM, drain connections

---

## Observability Stack

```
Services → OpenTelemetry SDK → Collector → Jaeger (traces)
                                        → Prometheus (metrics)
                                        → Loki (logs)
                                        → Grafana (dashboards)
```

Every service must emit:
1. **Trace ID** — propagated via headers (`traceparent`)
2. **Structured logs** — JSON with `level`, `message`, `traceId`, `service`
3. **RED metrics** — Rate, Errors, Duration per endpoint

---

## Deployment Topology

**Kubernetes namespace per environment:**
```
production/
  user-service:   3 replicas, HPA (CPU >70%)
  order-service:  3 replicas, HPA (CPU >70%)

staging/
  all-services:   1 replica

feature-<name>/   # Short-lived feature branches
  changed-services only
```

**Resource limits template:**
```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```
