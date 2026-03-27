---
title: "OpenTelemetry JavaScript Complete Guide 2026: Browser, Node.js & Grafana Cloud"
description: "Master OpenTelemetry for JavaScript in 2026. Learn manual instrumentation, browser tracing, frontend web vitals, Node.js SDK setup, and exporting to Grafana Cloud and OTLP backends with practical code examples."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["opentelemetry", "javascript", "browser", "nodejs", "grafana", "observability", "frontend", "tracing"]
readingTime: "17 min read"
---

Most observability guides focus on the backend. But modern JavaScript applications span both sides of the network — a slow API call might be a Node.js bottleneck or a browser rendering issue. OpenTelemetry for JavaScript covers both, with a unified SDK that instruments your frontend, your backend, and everything in between.

This guide covers manual and automatic instrumentation using the OpenTelemetry JavaScript SDK, browser-side tracing with Web Vitals, and exporting data to Grafana Cloud — with real, working code examples throughout.

---

## Why OpenTelemetry for JavaScript?

Traditional monitoring splits frontend and backend into separate tools: Sentry for browser errors, Datadog for backend traces, custom dashboards for everything else. The result is a disconnected picture where correlating a slow page load with a slow database query requires manual detective work.

OpenTelemetry solves this by providing:

- **A single SDK** for browser and Node.js environments
- **Trace context propagation** — a browser span links directly to its backend server span
- **Vendor-neutral** — switch from Jaeger to Grafana Cloud to Honeycomb without changing instrumentation code
- **Semantic conventions** — standardized attribute names so dashboards work across teams

---

## The OpenTelemetry JavaScript Ecosystem

The OTel JS project is split into focused packages:

```
@opentelemetry/api              — Public API (interfaces, context propagation)
@opentelemetry/sdk-node         — Node.js SDK (configures everything for server-side)
@opentelemetry/sdk-trace-web    — Browser trace SDK
@opentelemetry/sdk-trace-base   — Core tracer, shared by web and Node
@opentelemetry/exporter-otlp-*  — OTLP exporters (HTTP, gRPC, Proto)
@opentelemetry/auto-instrumentations-node — Auto-instrument common Node.js libraries
@opentelemetry/instrumentation-*  — Individual library instrumentations
@opentelemetry/context-zone     — Browser context propagation across async boundaries
```

---

## Node.js: Complete Setup

### Installation

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-otlp-http \
  @opentelemetry/exporter-otlp-proto
```

### Instrumentation File

Create `instrumentation.ts` — this **must** be loaded before any application code:

```typescript
// instrumentation.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "my-api",
  [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version ?? "0.0.1",
  "deployment.environment": process.env.NODE_ENV ?? "development",
});

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
    ?? "http://localhost:4318/v1/traces",
  headers: {
    "Authorization": `Bearer ${process.env.OTEL_AUTH_TOKEN ?? ""}`,
  },
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
    ?? "http://localhost:4318/v1/metrics",
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10_000, // Export every 10 seconds
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": {
        responseHook: (span, { response }) => {
          if (response.statusCode) {
            span.setAttribute("http.response.status_code", response.statusCode);
          }
        },
      },
      "@opentelemetry/instrumentation-express": {
        enabled: true,
      },
      "@opentelemetry/instrumentation-pg": {
        enhancedDatabaseReporting: true, // Capture SQL queries
      },
    }),
  ],
});

sdk.start();
console.log("OpenTelemetry SDK initialized");

// Graceful shutdown
process.on("SIGTERM", () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

### Entry Point

```typescript
// main.ts — import instrumentation FIRST
import "./instrumentation";

import express from "express";
import { trace, context, SpanStatusCode } from "@opentelemetry/api";

const app = express();
app.use(express.json());

const tracer = trace.getTracer("my-api", "1.0.0");

app.get("/users/:id", async (req, res) => {
  // Create a manual span for business logic
  return tracer.startActiveSpan("user.fetch", async (span) => {
    try {
      span.setAttributes({
        "user.id": req.params.id,
        "request.source": req.headers["x-source"] ?? "unknown",
      });

      const user = await fetchUserFromDb(req.params.id);

      if (!user) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "User not found" });
        res.status(404).json({ error: "Not found" });
        return;
      }

      span.setAttributes({ "user.found": true });
      res.json(user);
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      res.status(500).json({ error: "Internal error" });
    } finally {
      span.end();
    }
  });
});

app.listen(3000);
```

Run with `--require` to ensure instrumentation loads first:

```bash
node --require ./instrumentation.js dist/main.js
# Or in package.json:
# "start": "node --require ./dist/instrumentation.js dist/main.js"
```

---

## Manual Instrumentation Deep Dive

Auto-instrumentation captures HTTP and database calls, but business logic requires manual spans.

### Creating Nested Spans

```typescript
import { trace, SpanStatusCode, SpanKind } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service", "1.0.0");

async function processOrder(orderId: string): Promise<void> {
  return tracer.startActiveSpan("order.process", async (orderSpan) => {
    orderSpan.setAttributes({
      "order.id": orderId,
      "order.processor": "v2",
    });

    try {
      // Nested span for validation
      await tracer.startActiveSpan("order.validate", async (validateSpan) => {
        const isValid = await validateOrder(orderId);
        validateSpan.setAttribute("order.valid", isValid);
        validateSpan.end();

        if (!isValid) throw new Error(`Order ${orderId} failed validation`);
      });

      // Nested span for payment
      await tracer.startActiveSpan("order.payment", { kind: SpanKind.CLIENT }, async (paySpan) => {
        const result = await chargePayment(orderId);
        paySpan.setAttribute("payment.transaction_id", result.transactionId);
        paySpan.setAttribute("payment.amount", result.amount);
        paySpan.end();
      });

      // Nested span for fulfillment
      await tracer.startActiveSpan("order.fulfill", async (fulfillSpan) => {
        await scheduleShipping(orderId);
        fulfillSpan.setAttribute("shipping.scheduled", true);
        fulfillSpan.end();
      });

      orderSpan.setStatus({ code: SpanStatusCode.OK });
    } catch (err) {
      orderSpan.recordException(err as Error);
      orderSpan.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      throw err;
    } finally {
      orderSpan.end();
    }
  });
}
```

### Adding Events to Spans

Events are timestamped log entries attached to a span — great for capturing state transitions:

```typescript
tracer.startActiveSpan("data.pipeline", (span) => {
  span.addEvent("pipeline.started", { "input.records": 1000 });

  for (let i = 0; i < steps.length; i++) {
    processStep(steps[i]);
    span.addEvent("step.completed", {
      "step.index": i,
      "step.name": steps[i].name,
      "records.processed": steps[i].count,
    });
  }

  span.addEvent("pipeline.finished", { "output.records": 987 });
  span.end();
});
```

### Propagating Context Across Services

When calling downstream services, inject the trace context into headers:

```typescript
import { context, propagation, trace } from "@opentelemetry/api";

async function callDownstreamService(url: string, data: unknown): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Inject current trace context into HTTP headers
  // (W3C TraceContext format: traceparent, tracestate)
  propagation.inject(context.active(), headers);

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
}
```

The receiving service automatically picks up the trace context if it also uses OTel.

---

## Custom Metrics

### Counter, Histogram, and Gauge

```typescript
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("api-metrics", "1.0.0");

// Counter — monotonically increasing value
const requestCounter = meter.createCounter("http.requests.total", {
  description: "Total number of HTTP requests",
  unit: "requests",
});

// Histogram — distribution of values (latency, sizes)
const requestDuration = meter.createHistogram("http.request.duration", {
  description: "HTTP request duration in milliseconds",
  unit: "ms",
  advice: {
    explicitBucketBoundaries: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  },
});

// UpDownCounter — can go up or down (active connections)
const activeConnections = meter.createUpDownCounter("http.active_connections", {
  description: "Number of active HTTP connections",
});

// Observable gauge — reports current value via callback
const memoryGauge = meter.createObservableGauge("process.memory.heap_used", {
  description: "Node.js heap memory usage",
  unit: "bytes",
});

memoryGauge.addCallback((result) => {
  const { heapUsed } = process.memoryUsage();
  result.observe(heapUsed, { "runtime": "nodejs" });
});

// Use in middleware
function metricsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const startTime = Date.now();
  activeConnections.add(1);

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const attributes = {
      "http.method": req.method,
      "http.route": req.route?.path ?? req.path,
      "http.status_code": res.statusCode,
    };

    requestCounter.add(1, attributes);
    requestDuration.record(duration, attributes);
    activeConnections.add(-1);
  });

  next();
}
```

---

## Browser Tracing

Instrumenting the browser gives you visibility into page loads, user interactions, and the correlation between frontend events and backend spans.

### Installation

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-trace-web \
  @opentelemetry/context-zone \
  @opentelemetry/instrumentation-fetch \
  @opentelemetry/instrumentation-document-load \
  @opentelemetry/exporter-otlp-http
```

### Browser SDK Setup

```typescript
// otel-browser.ts — load this early in your app
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { Resource } from "@opentelemetry/resources";

const provider = new WebTracerProvider({
  resource: new Resource({
    "service.name": "my-frontend",
    "service.version": import.meta.env.VITE_APP_VERSION ?? "0.0.1",
    "deployment.environment": import.meta.env.MODE,
  }),
});

// Export to your OTel collector (via a backend proxy — never expose auth tokens in browser)
const exporter = new OTLPTraceExporter({
  url: "/api/telemetry/traces", // Proxy endpoint on your backend
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  maxQueueSize: 100,
  scheduledDelayMillis: 5000,
}));

provider.register({
  contextManager: new ZoneContextManager(), // Handles async context in browser
});

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation({
      // Adds Web Vitals as span attributes
      applyCustomAttributesOnSpan: {
        documentLoad: (span) => {
          span.setAttribute("browser.user_agent", navigator.userAgent);
          span.setAttribute("page.url", location.href);
        },
      },
    }),
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [
        /https:\/\/api\.myapp\.com\/.*/, // Inject trace headers on API calls
      ],
      applyCustomAttributesOnSpan: (span, request) => {
        span.setAttribute("http.request.url", (request as Request).url);
      },
    }),
  ],
});

export const browserTracer = provider.getTracer("my-frontend", "1.0.0");
```

### Tracing User Interactions

```typescript
// useCheckout.ts — React hook with OTel tracing
import { browserTracer } from "./otel-browser";
import { SpanStatusCode } from "@opentelemetry/api";

export function useCheckout() {
  const startCheckout = async (cart: CartItem[]) => {
    return browserTracer.startActiveSpan("checkout.flow", async (span) => {
      span.setAttributes({
        "cart.item_count": cart.length,
        "cart.total": cart.reduce((sum, item) => sum + item.price, 0),
      });

      try {
        // Step 1: Validate
        await browserTracer.startActiveSpan("checkout.validate_cart", async (validateSpan) => {
          const errors = validateCart(cart);
          validateSpan.setAttribute("validation.errors", errors.length);
          validateSpan.end();
          if (errors.length > 0) throw new Error(errors.join(", "));
        });

        // Step 2: Submit order (fetch instrumentation auto-traces this HTTP call)
        const response = await fetch("/api/orders", {
          method: "POST",
          body: JSON.stringify({ cart }),
          headers: { "Content-Type": "application/json" },
          // trace headers are automatically injected by FetchInstrumentation
        });

        const order = await response.json();
        span.setAttribute("order.id", order.id);
        span.setStatus({ code: SpanStatusCode.OK });

        return order;
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw err;
      } finally {
        span.end();
      }
    });
  };

  return { startCheckout };
}
```

### Web Vitals as Spans

```typescript
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";
import { browserTracer } from "./otel-browser";
import { SpanStatusCode } from "@opentelemetry/api";

function recordWebVital(name: string, value: number, rating: string): void {
  const span = browserTracer.startSpan(`web_vital.${name.toLowerCase()}`, {
    startTime: performance.now(),
  });

  span.setAttributes({
    "web_vital.name": name,
    "web_vital.value": value,
    "web_vital.rating": rating, // "good" | "needs-improvement" | "poor"
    "page.url": location.href,
    "page.referrer": document.referrer,
  });

  if (rating === "poor") {
    span.setStatus({ code: SpanStatusCode.ERROR, message: `Poor ${name}: ${value}ms` });
  }

  span.end();
}

// Register all Core Web Vitals
onCLS((metric) => recordWebVital("CLS", metric.value, metric.rating));
onINP((metric) => recordWebVital("INP", metric.value, metric.rating));
onLCP((metric) => recordWebVital("LCP", metric.value, metric.rating));
onFCP((metric) => recordWebVital("FCP", metric.value, metric.rating));
onTTFB((metric) => recordWebVital("TTFB", metric.value, metric.rating));
```

---

## Exporting to Grafana Cloud

Grafana Cloud provides a managed OTel backend with Tempo (traces), Mimir (metrics), and Loki (logs).

### Step 1: Get Your Grafana Cloud Credentials

1. Sign in to [grafana.com](https://grafana.com)
2. Navigate to **My Account → Grafana Cloud → Your Stack**
3. In the **OpenTelemetry** section, find:
   - OTLP endpoint URL (e.g., `https://otlp-gateway-prod-us-east-0.grafana.net/otlp`)
   - Instance ID
   - API Token (generate one with `MetricsPublisher` + `TracesPublisher` scopes)

### Step 2: Configure the Exporter

```typescript
// instrumentation.ts — Grafana Cloud config
import { OTLPTraceExporter } from "@opentelemetry/exporter-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-otlp-http";

const GRAFANA_ENDPOINT = process.env.GRAFANA_OTLP_ENDPOINT!;
const GRAFANA_INSTANCE_ID = process.env.GRAFANA_INSTANCE_ID!;
const GRAFANA_API_TOKEN = process.env.GRAFANA_API_TOKEN!;

// Basic auth: instanceId:apiToken (base64 encoded)
const authHeader = `Basic ${Buffer.from(`${GRAFANA_INSTANCE_ID}:${GRAFANA_API_TOKEN}`).toString("base64")}`;

const traceExporter = new OTLPTraceExporter({
  url: `${GRAFANA_ENDPOINT}/v1/traces`,
  headers: { Authorization: authHeader },
});

const metricExporter = new OTLPMetricExporter({
  url: `${GRAFANA_ENDPOINT}/v1/metrics`,
  headers: { Authorization: authHeader },
});
```

### Step 3: Environment Variables

```bash
# .env
GRAFANA_OTLP_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
GRAFANA_INSTANCE_ID=123456
GRAFANA_API_TOKEN=glc_your_token_here
OTEL_SERVICE_NAME=my-api
```

### Step 4: Verify in Grafana

After deploying, open Grafana Cloud and navigate to:
- **Explore → Tempo** to view traces
- **Explore → Mimir** to view metrics (query: `http_requests_total`)
- **Dashboards → New** to build from your data

---

## Structured Logging with OTel

OTel Logs connect your log statements to active traces:

```typescript
import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { trace } from "@opentelemetry/api";

const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(
    new OTLPLogExporter({ url: `${GRAFANA_ENDPOINT}/v1/logs` })
  )
);

const otelLogger = loggerProvider.getLogger("my-api");

function log(severity: SeverityNumber, message: string, attributes?: Record<string, unknown>) {
  const activeSpan = trace.getActiveSpan();
  const spanContext = activeSpan?.spanContext();

  otelLogger.emit({
    severityNumber: severity,
    severityText: SeverityNumber[severity],
    body: message,
    attributes: {
      ...attributes,
      "trace.id": spanContext?.traceId,
      "span.id": spanContext?.spanId,
    },
  });
}

// Usage
log(SeverityNumber.INFO, "Order processed", { "order.id": "abc123" });
log(SeverityNumber.ERROR, "Payment failed", { "error.code": "INSUFFICIENT_FUNDS" });
```

---

## Backend Proxy for Browser Telemetry

Never expose auth tokens in frontend code. Use a backend proxy:

```typescript
// api/telemetry.ts — Express route
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/traces", async (req, res) => {
  const response = await fetch(`${process.env.GRAFANA_OTLP_ENDPOINT}/v1/traces`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-protobuf",
      Authorization: `Basic ${Buffer.from(
        `${process.env.GRAFANA_INSTANCE_ID}:${process.env.GRAFANA_API_TOKEN}`
      ).toString("base64")}`,
    },
    body: req.body,
  });

  res.status(response.status).end();
});

export default router;
```

The browser sends traces to `/api/telemetry/traces` — your server forwards them to Grafana with the auth token.

---

## Complete Dashboard Setup

Once data flows to Grafana, build a service dashboard:

**Key panels to add:**

| Panel | Query | Visualization |
|-------|-------|---------------|
| Request rate | `rate(http_requests_total[5m])` | Time series |
| Error rate | `rate(http_requests_total{status_code=~"5.."}[5m])` | Time series |
| P95 latency | `histogram_quantile(0.95, rate(http_request_duration_bucket[5m]))` | Stat |
| Active connections | `http_active_connections` | Gauge |
| Trace explorer | Use Tempo datasource | Table |

---

## Production Checklist

Before going live, verify:

- [ ] `BatchSpanProcessor` used (not `SimpleSpanProcessor`) in production
- [ ] Sampling configured (not 100% in high-traffic apps)
- [ ] Auth tokens in environment variables, not code
- [ ] Browser telemetry proxied through backend
- [ ] `SIGTERM` handler shuts down SDK gracefully
- [ ] Service name and version set in resource
- [ ] Sensitive data (passwords, tokens) not captured in span attributes
- [ ] Error spans use `span.recordException()` + `SpanStatusCode.ERROR`

### Sampling for High-Traffic Apps

```typescript
import { TraceIdRatioBasedSampler, ParentBasedSampler } from "@opentelemetry/sdk-trace-base";

const sdk = new NodeSDK({
  // Sample 10% of traces, but always sample if parent span says to
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.1),
  }),
  // ...
});
```

---

## Summary

OpenTelemetry for JavaScript gives you full-stack observability from browser click to database query:

| Layer | What OTel captures | Where to view |
|-------|---------------------|---------------|
| Browser | Page loads, Web Vitals, user interactions, fetch calls | Grafana Tempo / Jaeger |
| HTTP | Inbound + outbound requests, headers, status codes | Grafana Tempo |
| Business logic | Custom spans, events, attributes | Grafana Tempo |
| Database | SQL queries, connection pool metrics | Grafana Tempo |
| Metrics | Counters, histograms, gauges | Grafana Mimir / Prometheus |
| Logs | Structured logs correlated to traces | Grafana Loki |

The key advantage over traditional monitoring: every browser Web Vital trace links to its backend span, which links to its database query. One timeline, full picture.

**Target keywords:** opentelemetry javascript, otel nodejs instrumentation, opentelemetry node.js tracing, opentelemetry browser tracing, grafana cloud opentelemetry
