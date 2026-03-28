---
title: "Trigger.dev v3: Background Jobs and Task Queues with TypeScript in 2026"
description: "Build reliable background jobs, scheduled tasks, and long-running workflows with Trigger.dev v3. Covers tasks, triggers, retries, concurrency, fan-out patterns, and deployment — with real TypeScript code you can use today."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["trigger-dev", "background-jobs", "typescript", "queues", "workflows", "nodejs", "serverless", "task-automation"]
readingTime: "12 min read"
---

Background jobs are one of those things that seem simple until you're managing retries, handling dead-letter queues, debugging a job that silently failed three days ago, and wondering why your task ran twice. Trigger.dev v3 solves these problems with a developer-friendly API that makes background jobs feel like regular TypeScript — but with observability, retries, and distributed execution built in.

This guide covers Trigger.dev v3 in depth: defining tasks, triggering them, handling failures, fan-out patterns, cron schedules, and deploying to production.

---

## What Is Trigger.dev v3?

Trigger.dev v3 is a major rewrite of the platform. The key changes from v2:

- **No more Zod-based event schema** — tasks are plain TypeScript functions
- **Native TypeScript imports** — no background worker setup required
- **Improved retries** — exponential backoff with jitter, configurable per task
- **Worker processes** — tasks run in isolated Node.js processes, not serverless functions, so you can use any npm package
- **Dev mode** — tasks run locally in development without connecting to the cloud
- **Dashboard v3** — real-time run inspection with replay, logs, and traces

The fundamental model: you define tasks as TypeScript files, import and trigger them from your application, and Trigger.dev handles the execution, retries, concurrency, and observability.

---

## Installation and Setup

```bash
npm install @trigger.dev/sdk@latest
npx trigger.dev@latest init
```

The init command creates `trigger.config.ts` and a `src/trigger/` directory:

```typescript
// trigger.config.ts
import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project: 'proj_your_project_id',
  dirs: ['./src/trigger'],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
})
```

Add environment variables:

```bash
# .env
TRIGGER_SECRET_KEY=tr_dev_xxxxxxxxxxxxxxxx
```

---

## Defining Tasks

Tasks are TypeScript files in your `trigger/` directory:

```typescript
// src/trigger/send-email.ts
import { task } from '@trigger.dev/sdk/v3'
import { sendTransactionalEmail } from '../lib/email'

export const sendWelcomeEmail = task({
  id: 'send-welcome-email',
  maxDuration: 30, // seconds
  run: async (payload: { userId: string; email: string; name: string }) => {
    await sendTransactionalEmail({
      to: payload.email,
      template: 'welcome',
      variables: {
        name: payload.name,
        dashboardUrl: `https://app.example.com/dashboard`,
      },
    })

    return { sent: true, email: payload.email }
  },
})
```

The `id` must be unique across your project and is used in the dashboard. The `payload` parameter type defines what callers must pass. The return value is stored and visible in the dashboard.

---

## Triggering Tasks

Import the task and call `.trigger()` from anywhere in your application:

```typescript
// src/routes/signup/+page.server.ts (SvelteKit example)
import { sendWelcomeEmail } from '../../trigger/send-email'

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData()
    // ... create user in database

    // Trigger background job — returns immediately
    await sendWelcomeEmail.trigger({
      userId: user.id,
      email: user.email,
      name: user.name,
    })

    return { success: true }
  },
}
```

`.trigger()` enqueues the task and returns a `RunHandle` with the run ID. The signup handler returns in milliseconds — the email goes out in the background.

**Trigger and wait** (for when you need the result):

```typescript
const result = await sendWelcomeEmail.triggerAndWait({
  userId: user.id,
  email: user.email,
  name: user.name,
})

console.log(result.output) // { sent: true, email: '...' }
```

Use `triggerAndWait` sparingly — it blocks your server handler until the task completes. Better for internal workflows than request handlers.

---

## Retry Configuration

Configure retries per task:

```typescript
export const processPayment = task({
  id: 'process-payment',
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true, // add jitter
  },
  run: async (payload: { orderId: string; amount: number }) => {
    const result = await chargeCard(payload.orderId, payload.amount)

    if (result.status === 'declined') {
      // Don't retry declined cards — throw a non-retriable error
      throw new AbortTaskRunError(`Card declined for order ${payload.orderId}`)
    }

    if (result.status === 'network_error') {
      // This will retry with backoff
      throw new Error(`Payment gateway unavailable: ${result.message}`)
    }

    return { transactionId: result.id, charged: payload.amount }
  },
})
```

`AbortTaskRunError` marks the run as failed without retrying. Any other error triggers the retry policy. This distinction is critical — you don't want to retry a declined card.

---

## Idempotency Keys

When the same payload might be triggered multiple times (webhook retries, user double-clicks), use idempotency keys to prevent duplicate execution:

```typescript
await processPayment.trigger(
  { orderId: 'ord_123', amount: 4999 },
  {
    idempotencyKey: `payment-${orderId}`,
    idempotencyKeyTTL: '24h',
  }
)
```

If you call this twice with the same key within 24 hours, the second call returns the handle from the first run without creating a new one.

---

## Scheduled Tasks (Cron)

```typescript
// src/trigger/daily-digest.ts
import { schedules } from '@trigger.dev/sdk/v3'
import { db } from '../lib/db'
import { sendDigestEmail } from '../lib/email'

export const dailyDigest = schedules.task({
  id: 'daily-digest',
  cron: '0 8 * * *', // 8 AM UTC every day
  run: async (payload) => {
    // payload.timestamp is the scheduled execution time
    const since = new Date(payload.timestamp)
    since.setDate(since.getDate() - 1)

    const users = await db.user.findMany({
      where: { digestEnabled: true },
    })

    const results = await Promise.allSettled(
      users.map(user => sendDigestForUser(user, since))
    )

    const failures = results.filter(r => r.status === 'rejected')

    return {
      total: users.length,
      sent: results.length - failures.length,
      failed: failures.length,
    }
  },
})
```

You can also create dynamic schedules at runtime:

```typescript
// Create a schedule for a specific user
await schedules.create({
  task: 'daily-digest',
  cron: '0 9 * * *', // user's preferred time
  externalId: `user-${userId}`, // track which user this belongs to
  timezone: 'America/New_York',
})

// Deactivate when user unsubscribes
await schedules.deactivate(`user-${userId}`)
```

---

## Fan-Out: Processing Multiple Items

For processing a list of items in parallel, use `batchTrigger`:

```typescript
// src/trigger/process-images.ts
import { task } from '@trigger.dev/sdk/v3'
import { resizeImage, uploadToR2 } from '../lib/storage'

export const resizeImageVariant = task({
  id: 'resize-image-variant',
  run: async (payload: {
    imageId: string
    sourceUrl: string
    width: number
    height: number
    variant: string
  }) => {
    const buffer = await fetchImage(payload.sourceUrl)
    const resized = await resizeImage(buffer, payload.width, payload.height)
    const url = await uploadToR2(resized, `${payload.imageId}/${payload.variant}`)

    return { url, variant: payload.variant }
  },
})

export const processUploadedImage = task({
  id: 'process-uploaded-image',
  run: async (payload: { imageId: string; sourceUrl: string }) => {
    const variants = [
      { width: 1200, height: 630, variant: 'og' },
      { width: 800, height: 600, variant: 'large' },
      { width: 400, height: 300, variant: 'medium' },
      { width: 100, height: 100, variant: 'thumbnail' },
    ]

    // Fan out — process all variants in parallel
    const runs = await resizeImageVariant.batchTriggerAndWait(
      variants.map(v => ({
        payload: { imageId: payload.imageId, sourceUrl: payload.sourceUrl, ...v },
      }))
    )

    const results = runs.runs.map(r => r.output)

    // Save all variant URLs to database
    await db.image.update({
      where: { id: payload.imageId },
      data: {
        variants: Object.fromEntries(results.map(r => [r.variant, r.url])),
        processedAt: new Date(),
      },
    })

    return { processed: results.length }
  },
})
```

`batchTriggerAndWait` fans out to multiple parallel executions and waits for all of them. Each child task runs independently with its own retry policy.

---

## Sequential Chaining (Pipelines)

For multi-step workflows where each step depends on the previous:

```typescript
// src/trigger/onboard-user.ts
import { task } from '@trigger.dev/sdk/v3'

export const onboardUser = task({
  id: 'onboard-user',
  run: async (payload: { userId: string }) => {
    const { userId } = payload

    // Step 1: Provision resources
    const provision = await provisionUserResources.triggerAndWait({ userId })

    // Step 2: Send welcome email with provisioned details
    await sendWelcomeEmail.triggerAndWait({
      userId,
      workspaceUrl: provision.output.workspaceUrl,
    })

    // Step 3: Notify sales team
    await notifySalesTeam.trigger({
      userId,
      plan: 'free',
    })

    return { onboarded: true }
  },
})
```

Each `.triggerAndWait` call suspends the parent task until the child completes. The parent resumes with the child's output. If any step fails, the parent fails and retries from the beginning (or you can handle errors per step).

---

## Context and Logging

The `context` object provides runtime information:

```typescript
export const myTask = task({
  id: 'my-task',
  run: async (payload: { userId: string }, { ctx }) => {
    // ctx.run.id — the run ID (useful for idempotency)
    // ctx.attempt.number — current attempt (1-indexed)
    // ctx.task.id — task identifier

    if (ctx.attempt.number > 1) {
      console.log(`Retry attempt ${ctx.attempt.number} for run ${ctx.run.id}`)
    }

    // Use structured logging
    logger.info('Processing user', { userId: payload.userId, attempt: ctx.attempt.number })

    return { processed: true }
  },
})
```

All `console.log` output is captured and visible in the Trigger.dev dashboard, attached to the specific run. Use `logger` from `@trigger.dev/sdk/v3` for structured JSON logs.

---

## Long-Running Tasks

For tasks that need more than a few seconds — scraping, ML inference, report generation — increase `maxDuration`:

```typescript
export const generateReport = task({
  id: 'generate-report',
  maxDuration: 300, // 5 minutes
  machine: {
    preset: 'medium-1x', // more CPU/memory
  },
  run: async (payload: { reportId: string; dateRange: string }) => {
    // Stream progress updates to dashboard
    await logger.info('Starting data collection')

    const rawData = await collectData(payload.dateRange)

    await logger.info('Processing data', { rows: rawData.length })

    const processed = await processData(rawData)
    const pdf = await generatePdf(processed)
    const url = await uploadReport(pdf, payload.reportId)

    return { url, rows: rawData.length }
  },
})
```

Machine presets control CPU and memory allocation. Available presets (check current docs for latest):
- `micro` — minimal resources for simple tasks
- `small-1x` — default
- `medium-1x` — heavier processing
- `large-1x` — ML inference, large datasets

---

## Concurrency Control

Prevent overloading downstream services by limiting how many runs execute simultaneously:

```typescript
export const sendEmail = task({
  id: 'send-email',
  queue: {
    name: 'email-queue',
    concurrencyLimit: 10, // max 10 concurrent email sends
  },
  run: async (payload: { to: string; subject: string; html: string }) => {
    await emailProvider.send(payload)
    return { sent: true }
  },
})
```

Per-key concurrency for tenant isolation:

```typescript
export const importData = task({
  id: 'import-data',
  queue: {
    name: 'import-queue',
    concurrencyLimit: 3, // max 3 concurrent imports total
  },
  run: async (payload: { tenantId: string; fileUrl: string }, { ctx }) => {
    // ...
  },
})

// Trigger with per-tenant key
await importData.trigger(
  { tenantId: 'tenant_123', fileUrl: '...' },
  {
    queue: {
      name: `import-tenant_123`, // separate queue per tenant
      concurrencyLimit: 1, // 1 at a time per tenant
    },
  }
)
```

---

## Local Development

```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Run Trigger.dev worker locally
npx trigger.dev@latest dev
```

The dev command connects to the Trigger.dev cloud using your secret key, but routes task executions to your local process. You get the real dashboard experience with local code — breakpoints work, console.log is visible in both the terminal and dashboard.

---

## Deployment

Trigger.dev v3 uses a separate deploy step from your application:

```bash
# Deploy tasks to Trigger.dev cloud
npx trigger.dev@latest deploy
```

This bundles your task files and their dependencies and uploads them to Trigger.dev's infrastructure. Tasks run in isolated worker processes managed by Trigger.dev — you don't need to provision servers.

For CI/CD:

```yaml
# .github/workflows/deploy.yml
- name: Deploy Trigger.dev tasks
  run: npx trigger.dev@latest deploy --ci
  env:
    TRIGGER_ACCESS_TOKEN: ${{ secrets.TRIGGER_ACCESS_TOKEN }}
```

---

## When to Use Trigger.dev

Trigger.dev is a good fit when you need:

| Scenario | Why Trigger.dev |
|---|---|
| Email/notification sending | Retries without duplicate sends (idempotency keys) |
| Data processing pipelines | Fan-out, progress visibility, partial failure handling |
| Scheduled reports | Cron with timezone support and run history |
| Third-party API integration | Retry with backoff when external services are flaky |
| User-triggered background work | Fast response + reliable async execution |
| Multi-step onboarding flows | Sequential tasks with error recovery |

For simple fire-and-forget work that never fails, a basic queue (BullMQ, Upstash QStash) may be simpler. Trigger.dev earns its complexity budget when you need visibility into what's happening, control over retries, and the ability to replay failed runs from the dashboard without re-triggering from the frontend.

The v3 API is clean enough that the overhead of adopting it is low — your task files look like regular TypeScript, and the local dev experience with the dashboard makes it genuinely pleasant to work with.
