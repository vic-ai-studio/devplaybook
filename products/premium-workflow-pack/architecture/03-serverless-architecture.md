# Serverless Architecture Design Guide

## Core Concepts

Serverless means: no server management, pay-per-invocation, auto-scaling to zero.

**Best fit:** Event-driven workloads, variable traffic, APIs with bursty patterns, scheduled jobs, background processing.

**Poor fit:** Long-running processes (>15 min), WebSocket servers, latency-critical paths (cold starts), stateful workloads.

---

## Function Design Principles

### Single Responsibility
Each function does one thing:
```
✅ processOrderPayment(orderId)
✅ sendOrderConfirmationEmail(orderId)
❌ processOrderAndSendEmailAndUpdateInventory(orderId)
```

### Stateless by Design
```javascript
// ❌ Wrong: in-memory state survives between invocations (sometimes)
let requestCount = 0;
export const handler = async (event) => {
  requestCount++;  // Unreliable — different instances, different counts
};

// ✅ Right: use external state
export const handler = async (event) => {
  await redis.incr('request-count');
};
```

### Keep Handlers Thin
```javascript
// handler.js — just wire-up
import { processOrder } from './domain/order.js';

export const handler = async (event) => {
  const order = parseEvent(event);
  const result = await processOrder(order);
  return formatResponse(result);
};

// domain/order.js — pure business logic, testable anywhere
export async function processOrder(order) { ... }
```

---

## Cold Start Mitigation

| Technique | Impact | Cost |
|-----------|--------|------|
| Provisioned Concurrency (AWS) | Eliminates cold starts | ~$0.015/GB-hr |
| Keep-warm ping (every 5 min) | Reduces cold starts | Minimal |
| Reduce bundle size | Faster cold starts | Dev effort |
| Use runtime init caching | DB pool survives restarts | Code change |
| Move to edge runtime | Near-zero cold starts | Runtime limits |

**Bundle size checklist:**
```bash
# Analyze bundle
npx esbuild src/handler.ts --bundle --platform=node \
  --analyze --outfile=/dev/null 2>&1

# Target: < 5MB for fast cold starts
# Optimal: < 1MB
```

---

## Database Access Pattern

Never open a new DB connection per invocation:

```javascript
// ❌ Opens new connection every cold start
export const handler = async () => {
  const db = new PrismaClient();  // BAD
  await db.user.findMany();
};

// ✅ Reuse connection across warm invocations
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();  // Module-level, reused

export const handler = async () => {
  await db.user.findMany();
};
```

**For high concurrency:** Use PgBouncer, RDS Proxy, or a serverless-native DB (PlanetScale, Neon, Turso).

---

## Architecture Patterns

### API + Background Job
```
Request → API Gateway → Lambda (sync, <5s)
                     → SQS Queue → Lambda Worker (async, up to 15min)
```

### Fan-Out / Fan-In
```
Trigger → Lambda A → SNS Topic → Lambda B (email)
                              → Lambda C (push notification)
                              → Lambda D (update DB)
```

### Event Sourcing with Stream Processing
```
User Action → Kinesis Stream → Lambda (per batch)
                             → DynamoDB (materialized view)
                             → S3 (raw event archive)
```

---

## IaC Template (AWS CDK)

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

export class ApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fn = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: 'production',
        DB_URL: process.env.DB_URL!,
      },
      // CUSTOMIZE: Enable for latency-critical endpoints
      // reservedConcurrentExecutions: 10,
    });

    new apigw.LambdaRestApi(this, 'Api', {
      handler: fn,
      deployOptions: {
        stageName: 'v1',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
      },
    });
  }
}
```

---

## Observability Checklist

- [ ] Structured logs (JSON) with `requestId`, `functionName`, `duration`
- [ ] X-Ray tracing enabled (or OpenTelemetry)
- [ ] Cold start tracking: log `INIT_TYPE` env variable
- [ ] Error alerts on Lambda error rate > 1%
- [ ] Duration P99 alarm (set at 80% of timeout)
- [ ] Dead Letter Queue on all async invocations
- [ ] Reserved concurrency on critical functions
