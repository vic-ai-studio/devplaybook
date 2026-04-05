---
title: "Artillery — Cloud-Native Load Testing for Modern Apps"
description: "Artillery is a YAML-first load testing tool for APIs, WebSockets, and browsers — distributed cloud tests with actionable metrics and automation."
category: "Performance Testing"
pricing: "Open Source"
pricingDetail: "Open source CLI is free; Artillery Cloud starts at free tier, then paid plans"
website: "https://www.artillery.io"
github: "https://github.com/artilleryio/artillery"
tags: ["performance-testing", "load-testing", "yaml", "javascript", "open-source", "cloud", "websocket"]
pros:
  - "YAML-first test definitions — readable, version-controllable, CI-friendly"
  - "Supports HTTP, WebSocket, Socket.io, gRPC, and Playwright (browser)"
  - "Built-in scenarios: ramp-up, spike, soak testing"
  - "Artillery Cloud: serverless distributed load generation without managing infra"
  - "Rich plugin ecosystem (Expect, Metrics-by-endpoint, etc.)"
  - "Good documentation and active community"
cons:
  - "YAML syntax can get verbose for complex flows"
  - "Cloud features require a paid plan for serious scale"
  - "Less performant than k6 for very high VU counts (Node.js based)"
  - "Custom logic requires JavaScript functions in separate files"
date: "2026-03-24"
---

## What is Artillery?

Artillery is an open-source load testing platform that tests HTTP APIs, WebSocket servers, gRPC services, and browser flows. Its YAML-based test format makes it approachable for DevOps and QA engineers while still supporting full JavaScript for complex scenarios.

## Quick Start

```bash
npm install -g artillery

artillery run test.yml
```

```yaml
# test.yml
config:
  target: "https://api.example.com"
  phases:
    - duration: 60
      arrivalRate: 10    # 10 new users/second
    - duration: 120
      arrivalRate: 50    # ramp to 50/second

scenarios:
  - flow:
      - get:
          url: "/users"
          expect:
            - statusCode: 200
```

## Key Features

- **Phases**: ramp-up, sustained load, spike, and soak patterns built in
- **Expect plugin**: Assertion-based load tests that fail on errors
- **Playwright integration**: Load test actual browser interactions
- **Artillery Cloud**: Run distributed tests without managing EC2 instances

## Best For

- Teams that prefer YAML over code for test configuration
- API load testing with complex multi-step scenarios (auth → fetch → mutate)
- WebSocket and real-time app testing
- DevOps teams integrating load tests into CI/CD pipelines

## Use Cases

**API contract load testing**: Use Artillery's `expect` plugin to assert status codes, response shapes, and latency thresholds during load runs. A test that fails assertions under load is more useful than one that just counts errors — Artillery makes this first-class.

**Real-time app testing**: Artillery natively supports WebSocket and Socket.io, making it one of the few tools that can properly stress-test chat apps, live dashboards, or collaborative editors with concurrent connections.

**CI/CD performance gates**: Artillery's YAML format is version-control-friendly and integrates cleanly with GitHub Actions. Teams commit test scenarios alongside their code and run them on every PR to catch regressions before merge.

**Spike and soak testing**: Built-in phase definitions make it easy to simulate sudden traffic spikes (10x normal load for 30 seconds) or overnight soak tests (sustained moderate load for 8 hours) without writing custom ramp logic.

## Advanced: Custom JavaScript Processors

When YAML isn't enough, Artillery lets you hook in JavaScript functions for dynamic data, custom auth flows, or response parsing:

```javascript
// processor.js
module.exports = { generatePayload };

function generatePayload(userContext, events, done) {
  userContext.vars.orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  userContext.vars.amount = Math.floor(Math.random() * 1000) + 1;
  return done();
}
```

```yaml
config:
  processor: "./processor.js"
scenarios:
  - flow:
      - function: "generatePayload"
      - post:
          url: "/orders"
          json:
            orderId: "{{ orderId }}"
            amount: "{{ amount }}"
```

## Concrete Use Case: Load Testing a Checkout API Before Black Friday

An e-commerce platform needed to validate that their new checkout microservice could handle Black Friday traffic — historically 15x their normal throughput. The service handled a multi-step flow: cart validation, inventory reservation, payment processing via Stripe, and order confirmation. The team needed to find the exact breaking point and verify their Kubernetes HPA auto-scaling thresholds before the event, not during it.

The team wrote an Artillery test scenario that modeled the real checkout funnel. A JavaScript processor generated realistic cart payloads with 1-8 items, valid test Stripe tokens, and randomized shipping addresses. The YAML config defined three phases: a 5-minute warm-up at 20 requests/second to fill caches and connection pools, a 10-minute ramp from 20 to 300 requests/second simulating the traffic surge as the sale goes live, and a 15-minute sustained phase at 300 requests/second to verify stability under peak load. The `expect` plugin asserted that every response returned a 200 or 201 status, the `latency.p99` stayed under 2 seconds, and the response body contained a valid `orderId`. They ran this against their staging environment, which mirrored production's Kubernetes configuration.

The first run revealed that the service hit a PostgreSQL connection pool ceiling at 180 requests/second — p99 latency spiked to 8 seconds and error rates jumped to 12%. The team increased the pool size from 20 to 50 connections, added a Redis cache layer for inventory checks, and adjusted the HPA to scale at 60% CPU instead of 80%. The second Artillery run showed clean results up to 350 requests/second with p99 under 800ms. They committed the test scenario to the repo and added it as a GitHub Actions workflow that runs on every release candidate tag against staging. On Black Friday, the checkout service handled 280 requests/second at peak with zero downtime — the exact scenario Artillery had validated two weeks prior.

## When to Use Artillery

**Use Artillery when:**
- You need to load test HTTP APIs, WebSocket servers, or gRPC services with realistic multi-step scenarios that model actual user flows
- Your team prefers YAML-based test definitions that are easy to read, review in pull requests, and version-control alongside application code
- You want built-in support for phased load patterns (ramp-up, spike, soak) without writing custom scripting logic
- You need to integrate load tests into CI/CD pipelines as automated performance gates that block deployments when latency thresholds are exceeded
- You are testing real-time applications (WebSocket, Socket.io) and need a tool with native protocol support rather than HTTP-only testing

**When NOT to use Artillery:**
- You need to generate extremely high virtual user counts (50,000+) from a single machine — k6 (written in Go) is more resource-efficient for very high concurrency
- You need a full browser-based performance testing suite as your primary use case — while Artillery supports Playwright, dedicated tools like Lighthouse CI or WebPageTest are better for web vitals
- Your team prefers writing tests in a general-purpose programming language (Go, Python, Java) rather than YAML with JavaScript hooks — consider k6, Locust, or Gatling instead
