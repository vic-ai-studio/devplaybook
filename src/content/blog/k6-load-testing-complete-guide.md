---
title: "Load Testing with k6: From Basics to CI Integration Guide"
description: "k6 load testing guide: write test scripts, VU ramping, thresholds, check assertions, metrics analysis, k6 Cloud, and GitHub Actions CI integration for performance regression detection."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["k6", "load testing", "performance testing", "API testing", "stress testing", "CI", "JavaScript"]
readingTime: "8 min read"
category: "testing"
---

Shipping fast APIs means nothing if they fall over under real load. Load testing tells you how your system behaves when 100, 1000, or 10,000 users hit it simultaneously — before your users find out the hard way. Most teams skip it because tools like JMeter feel heavyweight and hard to automate. k6 changes that equation.

k6 is a developer-first load testing tool written in Go, with test scripts written in JavaScript. It's fast, lightweight, and designed to run in CI pipelines. This guide covers everything from your first script to automated performance regression detection.

## What Makes k6 Different

**JavaScript scripting.** You write load tests in modern JavaScript — no XML config, no GUI. Tests are code, stored in version control alongside your application.

**Lightweight and fast.** k6 is written in Go and uses a custom JS runtime (not Node.js). A single k6 process can simulate thousands of virtual users without the memory overhead of tools like Locust or JMeter.

**Built for CI.** k6 exits with a non-zero code when thresholds fail, making it trivially easy to fail a CI pipeline on performance regression.

**Rich metrics out of the box.** HTTP response time percentiles (p50, p95, p99), error rates, requests per second — all captured automatically.

| Feature | k6 | JMeter | Locust | Artillery |
|---|---|---|---|---|
| Script language | JavaScript | XML/GUI | Python | YAML/JS |
| Memory efficiency | Excellent | Poor | Good | Good |
| CI integration | Native | Complex | Good | Good |
| Distributed testing | k6 Cloud | Complex | Yes | Yes |
| Metrics output | InfluxDB, Grafana, etc. | Many | Many | Many |
| Open source | Yes | Yes | Yes | Yes |

## Installation

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker (no install needed)
docker run --rm -i grafana/k6 run - <script.js
```

## Your First k6 Script

```js
// load-tests/smoke.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,        // 10 virtual users
  duration: '30s', // run for 30 seconds
};

export default function () {
  const res = http.get('https://api.myapp.com/health');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1); // think time between requests
}
```

Run it:

```bash
k6 run load-tests/smoke.js
```

Output:

```
✓ status is 200
✓ response time < 500ms

checks.........................: 100.00% ✓ 300  ✗ 0
http_req_duration..............: avg=87ms  min=45ms  med=82ms  max=312ms  p(90)=142ms p(95)=189ms
http_req_failed................: 0.00%   ✓ 0    ✗ 300
http_reqs......................: 300     9.98/s
```

## Virtual User Ramping Patterns

Static VU counts are useful for smoke tests, but real-world load follows patterns. k6 supports two executor types for ramping:

### ramping-vus — Gradual Scale-Up

```js
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // ramp up to 50 users over 2 minutes
    { duration: '5m', target: 50 },   // hold at 50 for 5 minutes
    { duration: '2m', target: 100 },  // scale up to 100
    { duration: '5m', target: 100 },  // hold at 100
    { duration: '2m', target: 0 },    // ramp down
  ],
};
```

### constant-arrival-rate — Fixed RPS

When you want to maintain a specific request rate regardless of response time:

```js
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-arrival-rate',
      rate: 100,           // 100 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50, // start with 50 VUs
      maxVUs: 200,         // scale up to 200 if needed
    },
  },
};
```

Use `ramping-vus` when you want to test "N concurrent users." Use `constant-arrival-rate` when you want to test "N requests per second" — the latter is more representative of real API load.

## Thresholds: Automated Pass/Fail

Thresholds define success criteria. When a threshold is breached, k6 exits with code 99 (failure).

```js
export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // 95th percentile response time must be below 500ms
    'http_req_duration': ['p(95)<500'],

    // 99th percentile must be below 1 second
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],

    // Error rate must be below 1%
    'http_req_failed': ['rate<0.01'],

    // Checks pass rate must be above 99%
    'checks': ['rate>0.99'],
  },
};
```

You can also define thresholds on custom metrics or by URL tag:

```js
// Tag requests and set per-endpoint thresholds
const res = http.get('https://api.myapp.com/users', {
  tags: { name: 'ListUsers' },
});

export const options = {
  thresholds: {
    'http_req_duration{name:ListUsers}': ['p(95)<200'],
  },
};
```

## Check Assertions

`check()` is k6's assertion function. Unlike thresholds (which are aggregated), checks run per-request and record pass/fail rates.

```js
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  // POST with JSON body
  const payload = JSON.stringify({
    username: 'testuser',
    password: 'testpass123',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const loginRes = http.post('https://api.myapp.com/auth/login', payload, params);

  const loginSuccess = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'has access token': (r) => JSON.parse(r.body).accessToken !== undefined,
  });

  if (loginSuccess) {
    const token = JSON.parse(loginRes.body).accessToken;

    const profileRes = http.get('https://api.myapp.com/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    check(profileRes, {
      'profile status 200': (r) => r.status === 200,
      'profile has email': (r) => JSON.parse(r.body).email !== undefined,
    });
  }
}
```

## HTTP Metrics Deep Dive

k6 captures detailed timing breakdowns for each request:

```
http_req_blocked        - time waiting for a free TCP connection
http_req_connecting     - TCP handshake time
http_req_tls_handshaking - TLS handshake time (HTTPS only)
http_req_sending        - time to send request body
http_req_waiting        - "time to first byte" (TTFB)
http_req_receiving      - time to download response body
http_req_duration       - total request time (sending + waiting + receiving)
```

For API performance analysis, `http_req_waiting` (TTFB) is the most important — it represents your server's processing time, excluding network overhead.

## k6 Scenarios for Complex Workflows

Real applications have different user types. k6 scenarios let you model them:

```js
export const options = {
  scenarios: {
    // Anonymous browse traffic
    browsing: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      exec: 'browsePage',
    },
    // Authenticated API calls
    api_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 30 },
        { duration: '3m', target: 30 },
        { duration: '1m', target: 0 },
      ],
      exec: 'callAuthenticatedApi',
    },
  },
};

export function browsePage() {
  http.get('https://myapp.com/');
  sleep(2);
}

export function callAuthenticatedApi() {
  // authenticated requests
  sleep(1);
}
```

## HTML Report with handleSummary

k6 can generate a custom summary at the end of a test run:

```js
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export function handleSummary(data) {
  return {
    'reports/load-test-summary.html': htmlReport(data),
    'reports/load-test-summary.json': JSON.stringify(data, null, 2),
  };
}
```

This generates a readable HTML report you can attach to CI artifacts.

## GitHub Actions Integration

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6AM

jobs:
  load-test:
    name: k6 Load Test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run k6 load test
        uses: grafana/k6-action@v0.3.1
        with:
          filename: load-tests/api-load.js
          flags: --out json=results.json
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          K6_CLOUD_TOKEN: ${{ secrets.K6_CLOUD_TOKEN }}  # optional

      - name: Upload results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: k6-results
          path: results.json
```

The `grafana/k6-action` will fail the workflow if any threshold is breached. No extra configuration needed — k6's exit code handles it.

**For environment-variable-based URLs:**

```js
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  http.get(`${BASE_URL}/api/health`);
}
```

## k6 Cloud for Distributed Testing

Local k6 can simulate thousands of VUs from a single machine, but for realistic geo-distributed load, k6 Cloud runs your tests from multiple AWS regions simultaneously.

```bash
# Run test on k6 Cloud
k6 cloud load-tests/api-load.js

# Or output results to k6 Cloud while running locally
k6 run --out cloud load-tests/api-load.js
```

k6 Cloud's free tier allows limited test runs per month — enough for monthly soak tests.

## Interpreting Results

After a test run, focus on these questions:

1. **Did all thresholds pass?** If not, which metric failed?
2. **At what VU count did response times degrade?** This is your current capacity ceiling.
3. **Did error rate stay near zero throughout?** A spike at high VU count indicates a bottleneck.
4. **What's the p95 vs p99 gap?** A large gap suggests occasional slow outliers (database lock contention, GC pauses, cold cache misses).

Example analysis:

```
At 50 VUs: p95=120ms, error_rate=0.0% ✓
At 100 VUs: p95=380ms, error_rate=0.0% — approaching threshold
At 150 VUs: p95=680ms, error_rate=2.1% ✗ threshold breached
```

Conclusion: the system handles 100 concurrent users comfortably. At 150 it degrades. Next step: profile the bottleneck (likely database connection pool size or a slow query).

## Conclusion

Load testing belongs in the development workflow, not just pre-launch panic. k6 makes this practical — tests are JavaScript files in your repo, thresholds fail CI automatically, and GitHub Actions runs them weekly with no manual effort.

Start with a simple smoke test (10 VUs, 30 seconds) to establish baselines. Then graduate to a ramp-up scenario to find your capacity ceiling. Once you have baselines, threshold-based CI catches performance regressions before they ship.
