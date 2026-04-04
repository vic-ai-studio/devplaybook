---
title: "Artillery — Cloud-Native Load Testing for Modern Apps"
description: "Artillery is an open-source load testing platform for APIs, microservices, and web apps. Write tests in YAML or JavaScript, run on cloud infrastructure, and get actionable performance reports."
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
