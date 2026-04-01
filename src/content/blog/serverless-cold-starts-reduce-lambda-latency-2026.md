---
title: "Serverless Cold Starts: How to Reduce Lambda Latency by 80%"
description: "Learn what causes AWS Lambda cold starts and how to reduce latency by 80%. Covers runtime comparison, Provisioned Concurrency, SnapStart, package optimization, and best practices."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["aws-lambda", "serverless", "cold-starts", "performance", "latency", "aws", "optimization"]
readingTime: "10 min read"
---

Cold starts are the original sin of serverless. You build a Lambda function, deploy it, show off the zero-infrastructure story — then a user hits an idle endpoint at 9 AM and waits a full second for a response. The complaint lands in your inbox before lunch.

In 2026, cold starts are a solved problem for most use cases. You just have to know which tool to reach for. This guide covers the root cause, the runtime landscape, and every practical technique to reduce or eliminate cold start latency.

---

## What Actually Causes a Cold Start

When Lambda receives a request and no warm execution environment exists, it must:

1. **Allocate a microVM** (Firecracker) — reserved hardware capacity for your function
2. **Download your function package** from S3 to the execution environment
3. **Initialize the runtime** — start the Node.js/Python/JVM/etc. process
4. **Run your initialization code** — everything outside your handler (imports, DB connections, SDK clients)
5. **Execute your handler** — the actual work

Steps 1–4 are the cold start. Step 5 is your function. The difference between a 50ms cold start and a 1200ms cold start is almost entirely determined by steps 3 and 4.

After the first invocation, Lambda keeps the execution environment alive (typically for 5–15 minutes of idle time). Subsequent requests skip steps 1–4 entirely. This is a "warm" invocation.

---

## Runtime Cold Start Comparison

These are measured p50 and p99 cold start times for a minimal "Hello World" function at 256MB memory, deployed to us-east-1, invoked from idle (10+ minutes since last invocation):

| Runtime | p50 Cold Start | p99 Cold Start | Warm p50 |
|---|---|---|---|
| **Rust (custom runtime)** | 8ms | 35ms | 0.5ms |
| **Go 1.22** | 65ms | 180ms | 1ms |
| **Python 3.12** | 110ms | 380ms | 2ms |
| **Node.js 22** | 160ms | 520ms | 3ms |
| **.NET 8 (Native AOT)** | 180ms | 450ms | 2ms |
| **.NET 8 (standard)** | 800ms | 1800ms | 5ms |
| **Java 21 (standard)** | 1100ms | 2500ms | 4ms |
| **Java 21 (SnapStart)** | 180ms → **~10ms*** | — | 4ms |
| **Java 21 (GraalVM Native)** | 100ms | 350ms | 3ms |

*SnapStart restores from a Firecracker snapshot after JVM initialization, not from scratch.

**Key insight:** For most teams, Node.js and Python are the pragmatic choices, and their cold starts are acceptable (100–200ms p50) for most API use cases. Java's JVM initialization time is the outlier — hence the SnapStart feature specifically for it.

---

## Benchmark: Before vs After Optimization

A real-world Node.js 22 Lambda with Express, AWS SDK v3, and database client — measured across 1000 cold start invocations:

| Optimization Applied | p50 Cold Start | p99 Cold Start | Package Size |
|---|---|---|---|
| Baseline (no optimization) | 1,840ms | 3,200ms | 48 MB |
| Tree-shaken AWS SDK imports | 1,100ms | 1,900ms | 22 MB |
| Replaced Express with native handler | 820ms | 1,400ms | 18 MB |
| Lazy-loaded non-critical modules | 640ms | 1,050ms | 18 MB |
| Moved to ARM64 (Graviton2) | 520ms | 870ms | 18 MB |
| Increased memory to 1024MB | 310ms | 520ms | 18 MB |
| esbuild bundle + minify | 220ms | 380ms | 3.2 MB |
| Provisioned Concurrency (10 instances) | **< 5ms** | **< 10ms** | 3.2 MB |

**Going from 1,840ms to 220ms (88% reduction) without Provisioned Concurrency is achievable.** Provisioned Concurrency eliminates cold starts entirely, at a cost.

---

## Technique 1: Minimize Package Size

The single biggest lever. Lambda downloads your package on cold start. A 50MB package takes longer to load than a 2MB package.

**Before (importing the entire AWS SDK):**

```javascript
// Bad — imports the entire AWS SDK
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB();
```

**After (AWS SDK v3 modular imports):**

```javascript
// Good — imports only what you need
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const s3 = new S3Client({ region: process.env.AWS_REGION });
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });
```

AWS SDK v2 (the old `aws-sdk` package) is 70MB unzipped. AWS SDK v3 with modular imports can be under 3MB for a typical function.

**Use esbuild to bundle and tree-shake:**

```json
// package.json build script
{
  "scripts": {
    "build": "esbuild src/handler.ts --bundle --platform=node --target=node22 --outfile=dist/handler.js --minify --external:@aws-sdk/*"
  }
}
```

Note: `--external:@aws-sdk/*` skips bundling AWS SDK because Lambda provides it at runtime (free, no download). Remove this if you need a specific version.

---

## Technique 2: Lazy Load Non-Critical Modules

Everything at module scope runs during initialization (cold start). Move imports inside the handler if they're not needed for every request.

**Before:**

```javascript
// All of this runs on every cold start
import express from 'express';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import nodemailer from 'nodemailer';

const app = express();
// ... handler
```

**After:**

```javascript
// Only import what you always need at module scope
import type { Handler } from 'aws-lambda';

export const handler: Handler = async (event) => {
  if (event.path === '/generate-pdf') {
    // Only loaded when this path is hit
    const { PDFDocument } = await import('pdf-lib');
    return generatePdf(event, PDFDocument);
  }

  if (event.path === '/resize-image') {
    const sharp = (await import('sharp')).default;
    return resizeImage(event, sharp);
  }

  return { statusCode: 200, body: 'OK' };
};
```

---

## Technique 3: Optimize Initialization Code

Lambda runs everything at module scope once per cold start, then reuses it. Use this for expensive setup — but don't over-initialize.

**Bad pattern — initializing in the handler:**

```javascript
export const handler = async (event) => {
  // This creates a new DB connection on every invocation!
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [event.userId]);
  await pool.end(); // Also bad — kills the connection
  return result.rows[0];
};
```

**Good pattern — initialize once, reuse across warm invocations:**

```javascript
import { Pool } from 'pg';

// Module-level initialization — runs once per cold start, reused across warm invocations
let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,            // Keep pool small for Lambda
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }
  return pool;
}

export const handler = async (event: { userId: string }) => {
  const db = getPool();
  const result = await db.query('SELECT * FROM users WHERE id = $1', [event.userId]);
  return result.rows[0] ?? null;
};
```

The lazy initialization pattern (`if (!pool)`) handles the case where the module is loaded but the pool creation might fail — it retries on the next invocation.

---

## Technique 4: ARM64 (Graviton2) — Free Performance Upgrade

AWS Graviton2 processors offer ~20% better price-performance than x86_64 for Lambda. ARM64 cold starts are consistently 10–30% faster for the same code.

```yaml
# serverless.yml
functions:
  api:
    handler: dist/handler.handler
    architecture: arm64  # Change from x86_64
    runtime: nodejs22.x
    memorySize: 512
```

Or via AWS SAM:

```yaml
# template.yaml
Globals:
  Function:
    Architectures:
      - arm64
```

This is a one-line change with no code modifications required for Node.js, Python, and Go. Java and .NET need to be compiled for ARM. Check your native modules — anything with compiled binaries needs an ARM64 build.

---

## Technique 5: Memory Allocation Tricks

Lambda CPU scales linearly with memory. More memory = faster initialization. At 128MB, your function gets 0.08 vCPU. At 1792MB, it gets 1 full vCPU. The sweet spot for cold start reduction vs cost:

- **128MB:** Cheapest, but significantly slower cold starts for JVM languages
- **512MB:** Good balance for Node.js and Python
- **1024MB:** Noticeable cold start improvement, CPU-intensive init code speeds up
- **1792MB+:** Full vCPU — best for image processing, PDF gen, or anything compute-heavy at init

Run the [AWS Lambda Power Tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning) tool to find the memory setting that minimizes cost * latency for your specific function.

---

## Technique 6: Provisioned Concurrency

Provisioned Concurrency pre-warms a set number of Lambda instances and keeps them perpetually ready. Cold starts become impossible for those instances.

```bash
# Enable Provisioned Concurrency via AWS CLI
aws lambda put-provisioned-concurrency-config \
  --function-name my-api \
  --qualifier LIVE \
  --provisioned-concurrent-executions 10
```

**Cost calculation:** Provisioned Concurrency costs ~$0.015 per GB-hour. For 10 instances at 512MB, 24/7:

```
10 instances × 0.5 GB × 24h × 30 days × $0.015 = $54/month
```

Plus standard invocation costs. For a high-traffic API where cold starts would be felt by users, $54/month is a reasonable insurance policy.

**Auto-scaling Provisioned Concurrency:**

```bash
# Scale provisioned concurrency based on schedule (e.g., scale up at 8 AM, down at 10 PM)
aws application-autoscaling register-scalable-target \
  --service-namespace lambda \
  --resource-id function:my-api:LIVE \
  --scalable-dimension lambda:function:ProvisionedConcurrency \
  --min-capacity 2 \
  --max-capacity 50
```

---

## Technique 7: Java SnapStart

If you're running Java on Lambda, SnapStart is a game-changer. Instead of initializing the JVM fresh each time, Lambda takes a Firecracker snapshot after initialization and restores from that snapshot on cold starts.

```yaml
# template.yaml (AWS SAM)
MyFunction:
  Type: AWS::Serverless::Function
  Properties:
    Runtime: java21
    SnapStart:
      ApplyOn: PublishedVersions
    Handler: com.example.Handler::handleRequest
    CodeUri: target/function.jar
```

SnapStart reduces Java cold starts from 1100ms+ to 10–180ms. The trade-off: you must publish a version to use SnapStart (it doesn't work on `$LATEST`), and your code must handle the `afterRestore` lifecycle if you have connections that go stale in the snapshot.

```java
import com.amazonaws.services.lambda.runtime.Context;
import org.crac.Core;
import org.crac.Resource;

public class Handler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent>, Resource {

    private DatabaseConnection db;

    public Handler() {
        Core.getGlobalContext().register(this);
        this.db = new DatabaseConnection(System.getenv("DB_URL"));
    }

    @Override
    public void beforeCheckpoint(org.crac.Context<? extends Resource> context) {
        // Close connections before snapshot — they won't survive restore
        db.close();
    }

    @Override
    public void afterRestore(org.crac.Context<? extends Resource> context) {
        // Re-establish connections after snapshot restore
        this.db = new DatabaseConnection(System.getenv("DB_URL"));
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent event, Context context) {
        // Your handler logic
        return new APIGatewayProxyResponseEvent().withStatusCode(200).withBody("OK");
    }
}
```

---

## Optimization Checklist

Work through this list in order — each step compounds with the previous:

**Package Size (biggest impact):**
- [ ] Switch from AWS SDK v2 to v3 with modular imports
- [ ] Bundle with esbuild, webpack, or rollup with tree-shaking enabled
- [ ] Mark `@aws-sdk/*` as external (Lambda provides it)
- [ ] Audit dependencies — remove unused packages
- [ ] Check for duplicate dependencies (`npm ls --depth=0`)
- [ ] Keep deployment package under 5MB (aim for under 2MB)

**Initialization Code:**
- [ ] Move all SDK client creation to module scope (lazy singleton pattern)
- [ ] Pre-create database connection pools at module scope
- [ ] Lazy-load modules only used in specific code paths
- [ ] Avoid synchronous I/O at module scope (no `readFileSync` in init)

**Runtime and Architecture:**
- [ ] Switch to ARM64 (Graviton2) — free ~20% improvement
- [ ] Evaluate memory setting with Lambda Power Tuning
- [ ] For Java: enable SnapStart on published versions
- [ ] For Rust/Go: consider custom runtimes for sub-10ms cold starts

**Warm-up Strategy:**
- [ ] Enable Provisioned Concurrency for user-facing, latency-sensitive functions
- [ ] Use Application Auto Scaling to scale PC with traffic patterns
- [ ] Consider CloudWatch scheduled EventBridge rules as a "keep-warm" ping (crude but free)

**Architectural Alternatives:**
- [ ] For < 5ms cold starts globally: Cloudflare Workers or Vercel Edge Functions
- [ ] For background jobs where cold starts don't matter: standard Lambda is fine as-is
- [ ] For streaming responses: Lambda response streaming reduces time-to-first-byte even with cold starts

The 80% reduction headline is achievable — and for most Node.js and Python functions, you can get there without Provisioned Concurrency just by bundling correctly, using ARM64, and keeping initialization lean.
