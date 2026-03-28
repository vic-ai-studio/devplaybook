---
title: "Temporal Workflow Engine 2026: The Complete Guide to Durable Execution"
description: "Master Temporal workflow engine in 2026. Learn durable execution, activities vs workflows, TypeScript SDK examples, comparison with AWS Step Functions and Airflow, and when to choose Temporal Cloud vs self-hosted."
date: "2026-03-28"
readingTime: "10 min read"
tags: [temporal, workflow, distributed-systems, microservices]
---

# Temporal Workflow Engine 2026: The Complete Guide to Durable Execution

Building reliable distributed systems is hard. Network partitions happen. Servers crash mid-execution. Processes get killed. For years, developers dealt with this through brittle retry logic, message queues, and complex state machines spread across multiple services.

Temporal changes this model entirely. It lets you write workflows as ordinary code — functions that run for minutes, hours, or years — with automatic durability, retries, and fault tolerance built in. In 2026, Temporal has become the standard for orchestrating long-running business logic across distributed systems.

This guide covers everything you need to know: what Temporal is, how durable execution works, the TypeScript SDK, comparisons with alternatives, and deployment options.

## What Is Temporal?

Temporal is an open-source workflow orchestration platform that provides **durable execution** for application code. It was created by former Uber engineers who built the internal workflow system (Cadence) that powers Uber's core business operations.

At its core, Temporal solves a fundamental problem: **how do you make code that spans multiple steps, services, and time periods reliable without writing complex retry and recovery logic?**

The answer: by persisting the entire execution history of your workflow in a database. If your workflow server crashes, Temporal replays the history to restore the exact state at the point of failure — and continues from there.

### Key Concepts

**Workflows** are durable functions that orchestrate your business logic. They execute deterministically and can run for days, months, or years. Temporal guarantees they complete even if infrastructure fails.

**Activities** are the actual units of work — API calls, database operations, email sends, anything with side effects. Activities can be retried independently without rerunning the entire workflow.

**Workers** are the processes that execute your workflow and activity code. They poll Temporal's task queues for work.

**The Temporal Server** stores workflow history and coordinates task dispatching. It's the durable backbone of the system.

## Durable Execution: How It Actually Works

The magic of Temporal is **event sourcing at the execution level**. Every action in a workflow — starting an activity, receiving a signal, sleeping — is recorded as an event in an append-only history.

```typescript
import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './activities';

const { sendEmail, chargeCard, shipOrder } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
  },
});

export async function orderFulfillmentWorkflow(orderId: string): Promise<void> {
  // Step 1: Charge the card
  await chargeCard(orderId);

  // Step 2: Send confirmation email
  await sendEmail(orderId, 'order-confirmed');

  // Step 3: Wait 2 hours for warehouse processing
  await sleep('2 hours');

  // Step 4: Ship the order
  await shipOrder(orderId);

  // Step 5: Send shipping notification
  await sendEmail(orderId, 'order-shipped');
}
```

If the worker crashes between `chargeCard` and `sendEmail`, Temporal replays the workflow from the beginning — but because `chargeCard` already completed successfully, its result is returned from history without re-executing the activity. Execution continues exactly where it left off.

This is durable execution: **your code behaves as if it ran uninterrupted, even across failures, restarts, and deployments.**

### Determinism Requirement

Because Temporal replays workflow history, workflow code must be **deterministic** — the same inputs must always produce the same outputs. This means:

- No `Date.now()` or `Math.random()` — use `workflow.currentDate()` instead
- No direct network calls — wrap them in activities
- No non-deterministic iteration of collections

Activities have no such restrictions — they're the place for all side effects and non-deterministic operations.

## Workflows vs Activities: When to Use Each

| Aspect | Workflow | Activity |
|--------|----------|---------|
| Side effects | No (must be deterministic) | Yes |
| External API calls | No | Yes |
| Database operations | No | Yes |
| Duration | Hours, days, years | Seconds to minutes |
| Retries | Orchestrated | Automatic with backoff |
| State | Persisted across failures | Stateless per invocation |

### Activities in TypeScript

```typescript
// activities.ts
import { Context } from '@temporalio/activity';

export async function chargeCard(orderId: string): Promise<string> {
  // Activities can call external APIs, databases, etc.
  const order = await db.orders.findById(orderId);
  const result = await stripeClient.charges.create({
    amount: order.totalCents,
    currency: 'usd',
    customer: order.customerId,
  });

  // Heartbeat for long-running activities
  Context.current().heartbeat({ chargeId: result.id });

  return result.id;
}

export async function shipOrder(orderId: string): Promise<void> {
  const order = await db.orders.findById(orderId);
  await warehouseApi.createShipment({
    orderId,
    items: order.items,
    address: order.shippingAddress,
  });
}
```

### Child Workflows

Large workflows can be broken into child workflows for better modularity:

```typescript
import { executeChild } from '@temporalio/workflow';

export async function orderBatchWorkflow(orderIds: string[]): Promise<void> {
  // Process up to 10 orders concurrently
  const chunks = chunkArray(orderIds, 10);

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(orderId =>
        executeChild('orderFulfillmentWorkflow', {
          args: [orderId],
          workflowId: `order-${orderId}`,
        })
      )
    );
  }
}
```

## Signals and Queries

Temporal workflows can receive external input without polling:

### Signals (Write)

```typescript
import { defineSignal, setHandler } from '@temporalio/workflow';

export const approvalSignal = defineSignal<[{ approved: boolean }]>('approval');

export async function approvalWorkflow(requestId: string): Promise<boolean> {
  let approved = false;

  setHandler(approvalSignal, ({ approved: a }) => {
    approved = a;
  });

  // Wait up to 7 days for human approval
  await condition(() => approved !== false, '7 days');

  return approved;
}
```

Send a signal from anywhere:
```typescript
await client.workflow.getHandle(`approval-${requestId}`).signal(approvalSignal, { approved: true });
```

### Queries (Read)

```typescript
import { defineQuery, setHandler } from '@temporalio/workflow';

export const statusQuery = defineQuery<string>('getStatus');

export async function longRunningWorkflow(): Promise<void> {
  let currentStatus = 'initializing';

  setHandler(statusQuery, () => currentStatus);

  currentStatus = 'processing';
  await processData();

  currentStatus = 'complete';
}
```

## TypeScript SDK: Complete Setup

```bash
npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
```

### Worker Setup

```typescript
// worker.ts
import { Worker } from '@temporalio/worker';
import * as activities from './activities';

async function main() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: 'order-processing',
    // Scale workers based on load
    maxConcurrentActivityTaskExecutions: 100,
    maxConcurrentWorkflowTaskExecutions: 40,
  });

  await worker.run();
}

main().catch(console.error);
```

### Client Usage

```typescript
// client.ts
import { Client } from '@temporalio/client';
import { orderFulfillmentWorkflow } from './workflows';

const client = new Client({
  address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
});

// Start a workflow
const handle = await client.workflow.start(orderFulfillmentWorkflow, {
  args: ['order-abc123'],
  taskQueue: 'order-processing',
  workflowId: `order-abc123`,
});

// Wait for result
const result = await handle.result();
console.log('Workflow completed:', result);

// Get workflow status
const description = await handle.describe();
console.log('Status:', description.status.name);
```

## Comparison: Temporal vs Alternatives

### Temporal vs AWS Step Functions

| Feature | Temporal | AWS Step Functions |
|---------|----------|--------------------|
| Code model | Write code normally | Define JSON state machines |
| Language support | Go, Java, TypeScript, Python, PHP, .NET | None (JSON DSL) |
| Local dev | Yes (local server) | Requires AWS/LocalStack |
| Debugging | Full code debugger | CloudWatch logs |
| Pricing | Infrastructure costs | $0.025 per state transition |
| Vendor lock-in | None (open source) | High (AWS-specific) |
| Long-running | Yes (unlimited) | 1 year max |
| Versioning | Built-in | Manual |

**Use Step Functions when:** You're fully committed to AWS and need native integration with 200+ AWS services without writing orchestration code.

**Use Temporal when:** You want portable, debuggable code that runs anywhere with complex business logic spanning days or weeks.

### Temporal vs Apache Airflow

| Feature | Temporal | Apache Airflow |
|---------|----------|----------------|
| Primary use case | Business logic orchestration | Data pipeline scheduling |
| Trigger model | Event-driven or scheduled | Scheduled (DAGs) |
| Language | Any supported SDK | Python |
| Dynamic workflows | Yes (runtime) | Limited (DAG must be static) |
| Real-time | Yes | No |
| Operator ecosystem | Custom activities | 1000+ operators |

**Use Airflow when:** You're building ETL/ELT pipelines with scheduled batch processing and need a rich ecosystem of data connectors.

**Use Temporal when:** You need event-driven, real-time workflow orchestration with dynamic business logic.

### Temporal vs Netflix Conductor

| Feature | Temporal | Conductor |
|---------|----------|-----------|
| SDK quality | Excellent | Good |
| Type safety | Full TypeScript/Go support | Limited |
| Cloud offering | Temporal Cloud | Orkes Cloud |
| Community | Large, growing | Smaller |
| Documentation | Excellent | Adequate |

## Real-World Use Cases

### Payment Processing with Sagas

The saga pattern handles distributed transactions across multiple services:

```typescript
export async function paymentSagaWorkflow(payment: PaymentRequest): Promise<void> {
  const compensations: (() => Promise<void>)[] = [];

  try {
    // Reserve funds
    const reservationId = await reserveFunds(payment);
    compensations.push(() => releaseFunds(reservationId));

    // Verify compliance
    await runComplianceCheck(payment);

    // Process with payment provider
    const chargeId = await processCharge(payment);
    compensations.push(() => refundCharge(chargeId));

    // Update ledger
    await updateLedger(payment, chargeId);

    // Notify user
    await sendSuccessNotification(payment.userId);

  } catch (error) {
    // Compensate in reverse order
    for (const compensate of compensations.reverse()) {
      await compensate();
    }
    await sendFailureNotification(payment.userId, error.message);
    throw error;
  }
}
```

### Data Pipeline with Human Review

```typescript
export async function dataIngestionWorkflow(datasetId: string): Promise<void> {
  // Automated processing
  await downloadDataset(datasetId);
  const report = await validateData(datasetId);

  if (report.issuesFound > 0) {
    // Pause and wait for human review (up to 48 hours)
    await requestHumanReview(datasetId, report);

    let approved = false;
    setHandler(approvalSignal, ({ approved: a }) => { approved = a; });
    await condition(() => approved, '48 hours');

    if (!approved) {
      await archiveRejectedDataset(datasetId);
      return;
    }
  }

  await transformData(datasetId);
  await loadToWarehouse(datasetId);
  await triggerDownstreamPipelines(datasetId);
}
```

### User Onboarding Flow

```typescript
export async function userOnboardingWorkflow(userId: string): Promise<void> {
  await sendWelcomeEmail(userId);

  // Wait 1 day, then check if user completed setup
  await sleep('1 day');
  const setupComplete = await checkSetupStatus(userId);

  if (!setupComplete) {
    await sendReminderEmail(userId, 'setup-reminder');

    // Wait 3 more days
    await sleep('3 days');
    const stillIncomplete = !(await checkSetupStatus(userId));

    if (stillIncomplete) {
      await sendReminderEmail(userId, 'final-reminder');
      await createSupportTicket(userId, 'onboarding-stuck');
    }
  }

  // 30-day check-in
  await sleep('30 days');
  await sendMonthlyCheckin(userId);
}
```

## Self-Hosted vs Temporal Cloud

### Self-Hosted

**Pros:**
- Full control over infrastructure
- No per-workflow pricing
- Data sovereignty
- Can run on any cloud or on-premises

**Cons:**
- Operational overhead (Cassandra/PostgreSQL, Elasticsearch)
- Requires Temporal expertise to tune and maintain
- High availability setup is complex

**Infrastructure requirements:**
```yaml
# docker-compose.yml (development)
services:
  temporal:
    image: temporalio/auto-setup:1.24
    ports:
      - 7233:7233
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgresql

  temporal-ui:
    image: temporalio/ui:2.26
    ports:
      - 8080:8080
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
```

### Temporal Cloud

**Pros:**
- Zero operational burden
- Automatic scaling and HA
- Built-in observability
- SLA-backed reliability (99.99%)

**Cons:**
- Cost scales with usage (namespace actions)
- Less control over data location
- Vendor dependency

**Pricing model:** ~$25/million workflow actions + storage costs. Most production workloads run $200-$2,000/month.

**Recommendation:** Start with self-hosted via Docker for development. Use Temporal Cloud for production unless you have a large DevOps team or strict data locality requirements.

## Production Considerations

### Workflow Versioning

When you deploy new code, existing workflows must continue running with old logic:

```typescript
import { patched } from '@temporalio/workflow';

export async function orderWorkflow(orderId: string): Promise<void> {
  await chargeCard(orderId);

  // New feature: fraud check (added in v2)
  if (patched('add-fraud-check')) {
    await runFraudCheck(orderId);
  }

  await shipOrder(orderId);
}
```

### Activity Idempotency

Always design activities to be safely retried:

```typescript
export async function sendEmail(userId: string, template: string): Promise<void> {
  // Check if already sent using idempotency key
  const key = `email:${userId}:${template}`;
  const alreadySent = await redis.get(key);
  if (alreadySent) return;

  await emailClient.send({ userId, template });
  await redis.setex(key, 86400, '1'); // TTL: 24 hours
}
```

### Observability

Temporal provides built-in metrics via Prometheus:
- `temporal_workflow_completed_count` — workflow completion rate
- `temporal_activity_execution_latency` — activity performance
- `temporal_task_queue_poll_succeed_request` — worker health

## Getting Started in 5 Minutes

```bash
# Start local Temporal server
brew install temporal
temporal server start-dev

# Create new TypeScript project
npm create temporal@latest my-workflow-app
cd my-workflow-app
npm install

# Run the sample workflow
npm run start.worker &
npm run client
```

Visit `http://localhost:8233` for the Temporal Web UI to see your workflow execution history.

## Conclusion

Temporal has emerged as the definitive solution for durable workflow orchestration in distributed systems. Its code-first approach, language-native SDKs, and powerful guarantees make it the right choice for payment processing, data pipelines, user onboarding flows, and any long-running business process.

Key takeaways:
- **Durable execution** means your code survives crashes, restarts, and deployments automatically
- **Workflows orchestrate, activities execute** — keep side effects in activities
- **Use Temporal Cloud** for production unless you have specific requirements for self-hosted
- **Temporal outperforms Step Functions** for complex, long-running business logic written by developers

Start with the TypeScript SDK and the local development server. Once you experience never writing retry logic or recovery code again, you won't go back to the old way.
