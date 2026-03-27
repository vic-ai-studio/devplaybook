---
title: "SLO vs SLA vs SLI: Developer Guide to Reliability Engineering 2026"
description: "Understand the difference between SLI, SLO, and SLA in 2026. Learn how to set error budgets, define your first SLO, and use Prometheus, Grafana, and DataDog to track reliability."
author: "DevPlaybook Team"
date: "2026-03-27"
tags: ["sre", "reliability", "slo", "sla", "sli", "devops", "observability", "prometheus", "grafana"]
readingTime: "13 min read"
---

# SLO vs SLA vs SLI: Developer Guide to Reliability Engineering 2026

If you've ever been paged at 3 AM because a dashboard went red, you've experienced the practical reality of Site Reliability Engineering (SRE). The concepts of SLI, SLO, and SLA were popularized by Google in their [Site Reliability Engineering book](https://sre.google/books/) and have since become the standard vocabulary for reliability discussions across the industry.

In 2026, these terms appear in every engineering org's documentation — but they're often misunderstood or used interchangeably. This guide clarifies exactly what each means, how they relate to each other, and how to implement them in your own systems.

---

## A Brief Introduction to Site Reliability Engineering

SRE is the discipline that applies software engineering principles to infrastructure and operations problems. The core insight: reliability is a feature, and like all features, it requires measurement, target-setting, and deliberate engineering work.

Google invented SRE in 2003. The key innovation was replacing vague promises like "the service should be fast" with measurable objectives: "99.9% of requests must complete in under 200ms." This shift from subjective to objective changed how teams reason about operational excellence.

The three pillars of SRE reliability measurement are:

1. **SLI** — what you measure
2. **SLO** — what you target
3. **SLA** — what you promise (with consequences)

Let's break each one down.

---

## SLI: Service Level Indicator

An **SLI (Service Level Indicator)** is a quantitative measurement of some aspect of your service's behavior. It's the raw metric.

### What to Measure

Google's SRE book recommends focusing on four "golden signals":

- **Latency** — how long requests take (distinguish success vs. error latency)
- **Traffic** — how much demand your service is handling (requests/sec)
- **Errors** — the rate of failed requests
- **Saturation** — how "full" your service is (CPU, memory, queue depth)

For most web services, the most impactful SLIs are:

```
Availability SLI = successful_requests / total_requests × 100%

Latency SLI = requests_under_threshold / total_requests × 100%
```

### SLI Examples

| Service Type | SLI |
|-------------|-----|
| API endpoint | % of requests returning 2xx in < 200ms |
| Database | % of queries completing in < 50ms |
| Batch job | % of jobs completing within scheduled window |
| CDN | % of cache hits |
| Message queue | % of messages processed within 30s of publish |

### Common SLI Mistakes

**Don't measure the wrong thing.** A high success rate on a checkout API means nothing if users can't reach the page. Measure the user-facing experience, not internal health checks.

**Distinguish user-visible errors from infrastructure errors.** A 500 from your app is an error. A 429 (rate limiting) might be intentional behavior. A 404 on a missing resource is usually a client bug, not a service failure.

**Avoid averaging latency.** Mean latency hides tail latency problems. Always measure p50, p95, and p99. Users who hit the p99 path have a terrible experience — and they remember it.

---

## SLO: Service Level Objective

An **SLO (Service Level Objective)** is a target value for your SLI over a given time window. It's the internal goal your team commits to meeting.

```
SLO: 99.9% of API requests must return 2xx in under 200ms over any 30-day rolling window.
```

### Setting SLOs

The art of SLO-setting is finding the right balance between:
- **Too strict** → your team is always on alert, burn rate is high, innovation suffers
- **Too loose** → users are unhappy but the alerts never fire

A good starting point: look at your historical performance and set your SLO slightly below your best recent month. This gives you headroom to improve without immediately breaching your target.

**Time windows matter.** Most SLOs use a rolling 28-day or 30-day window. Some use quarterly windows for services with known seasonal patterns. Never use calendar year windows — a bad January ruins your whole metric.

### Error Budget

The **error budget** is the mathematical complement of your SLO:

```
Error Budget = 1 - SLO

Example: 99.9% SLO → 0.1% error budget → 43.8 minutes of downtime per 30 days
```

The error budget concept is transformational. It converts reliability from a constraint into a resource:

- If you have budget remaining → you can safely ship risky changes
- If you're burning budget fast → slow down deployments, focus on reliability
- If you've exhausted the budget → freeze changes until the window resets

This creates a shared language between product and engineering. Instead of "we can't ship this — ops might break," you say "we have 20 minutes of error budget left this month — let's delay this refactor until next window."

### Error Budget Policy

Document what happens when you exhaust the budget:

1. **Alert firing** → on-call responds, investigates, mitigates
2. **Budget 50% consumed** → discuss risk with team lead before merging major changes
3. **Budget 80% consumed** → halt all non-critical deploys
4. **Budget exhausted** → feature freeze, reliability sprint only

---

## SLA: Service Level Agreement

An **SLA (Service Level Agreement)** is a formal contract between a service provider and a customer. It defines what uptime or performance is guaranteed, and — critically — what happens if that guarantee isn't met.

### SLAs vs SLOs

This is where most developers get confused:

| | SLO | SLA |
|--|-----|-----|
| **Audience** | Internal team | External customers/users |
| **Enforcement** | Social contract | Legal/financial contract |
| **Consequence of breach** | Team discussion | Credits, refunds, termination |
| **Typical value** | Aggressive target | Conservative promise |

Your SLA should always be **less strict** than your SLO. If your SLO is 99.9% availability, your SLA might promise 99.5%. The gap between them is your safety margin — if you're slightly below your SLO, you haven't breached your customer commitments yet.

### SLA Consequences

Different SLAs have different remedies for breach:

- **Service credits** — most common; customer gets percentage of their monthly bill back
- **Refunds** — money returned for affected periods
- **Termination rights** — customer can exit contract without penalty
- **SLA penalties** — rare; provider pays damages beyond simple credits

A typical cloud SLA looks like:

```
99.99% monthly uptime → <$0 credit
99.95–99.99% → 10% credit
99.0–99.95% → 25% credit
<99.0% → 50% credit
```

---

## The Relationship: SLI → SLO → SLA

Think of these as nested layers:

```
┌─────────────────────────────┐
│            SLA              │  ← Promise to customers (conservative)
│  ┌───────────────────────┐  │
│  │         SLO           │  │  ← Internal target (realistic)
│  │  ┌─────────────────┐  │  │
│  │  │      SLI        │  │  │  ← What you actually measure
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

The SLI is the raw measurement. The SLO is your goal for that measurement. The SLA is your legally binding promise, derived from the SLO but with a safety margin.

### Practical Example

You operate a payment API:

**SLI**: % of payment requests returning 2xx in < 500ms
**SLO**: 99.95% of requests must meet the SLI over a 30-day rolling window
**SLA**: 99.9% monthly uptime guaranteed; breach triggers 20% service credit

If your SLO fires → your team investigates internally.
If your SLA breaches → you owe customers credits and it's a public incident.

---

## Real-World Uptime Numbers

Understanding what "uptime percentages" actually mean in practice:

| Uptime | Downtime/year | Downtime/month | Downtime/week |
|--------|--------------|----------------|---------------|
| 99% ("two nines") | 3.65 days | 7.2 hours | 1.68 hours |
| 99.9% ("three nines") | 8.77 hours | 43.8 minutes | 10.1 minutes |
| 99.95% | 4.38 hours | 21.9 minutes | 5.04 minutes |
| 99.99% ("four nines") | 52.6 minutes | 4.38 minutes | 1.01 minutes |
| 99.999% ("five nines") | 5.26 minutes | 26.3 seconds | 6.05 seconds |

Most enterprise SaaS targets 99.9%. High-stakes services (banking, healthcare) target 99.99%. "Five nines" is reserved for critical infrastructure like telecom and power grids — and costs exponentially more to achieve.

---

## Tools for SLO Tracking

### Prometheus + Grafana (Open Source)

The most common open-source stack for SLO tracking.

**Prometheus** scrapes metrics from your services. Define a recording rule to track your SLI:

```yaml
# prometheus/rules/slo.yaml
groups:
  - name: api_availability
    interval: 30s
    rules:
      - record: job:request_success_rate:rate5m
        expr: |
          sum(rate(http_requests_total{status=~"2.."}[5m])) by (job)
          /
          sum(rate(http_requests_total[5m])) by (job)
```

**Grafana** visualizes your SLO and error budget:

```
Error Budget Remaining (%) =
  (current_success_rate - slo_target) / (1 - slo_target) × 100
```

Use the [Grafana SLO plugin](https://grafana.com/grafana/plugins/grafana-slo-app/) for pre-built SLO dashboards.

### DataDog SLOs

DataDog has first-class SLO support built into the platform:

1. Navigate to **Service Management → SLOs**
2. Create a **Metric-based SLO** or **Monitor-based SLO**
3. Set your target (e.g., 99.9%) and time window (7, 30, 90 days)
4. DataDog automatically calculates error budget remaining and burn rate

DataDog also supports **SLO alerts** that fire before you breach your target — alerting when your burn rate suggests you'll exhaust the budget within 24 hours.

### New Relic

New Relic's **Service Level Management** feature lets you define SLIs directly from APM data:

```javascript
// Example: create SLI via New Relic API
const sli = {
  name: "API Availability",
  description: "Success rate for /api/checkout",
  events: {
    validEvents: {
      from: "Transaction",
      where: "appName = 'my-api'"
    },
    goodEvents: {
      from: "Transaction",
      where: "appName = 'my-api' AND httpResponseCode < 500"
    }
  }
};
```

### AWS CloudWatch Application Signals

For AWS-native stacks, CloudWatch Application Signals (GA in 2024) provides automatic SLO tracking without manual metric configuration. It instruments your application via the AWS Distro for OpenTelemetry (ADOT).

---

## How to Define Your First SLO: Step-by-Step

### Step 1: Identify your most critical user journey

Don't start with SLOs for everything. Pick the one flow where failure hurts users most. For an e-commerce site, that's checkout. For a SaaS tool, it's the core action (e.g., "creating a document").

### Step 2: Define the SLI

What measurement captures whether that journey is working? For most web services:

```
Availability: % of requests returning non-5xx
Latency: % of requests completing under threshold (e.g., 200ms p95)
```

### Step 3: Gather baseline data

Look at 30–90 days of historical data. What's your actual availability been? What's p95 latency today?

### Step 4: Set the SLO

Start conservatively — slightly below your best recent month. You can tighten it later. A 99.5% SLO you consistently meet is more useful than a 99.9% SLO you're always breaching.

### Step 5: Implement alerts

Alert on **burn rate**, not absolute SLI value. A 10-minute 50% error rate burns your monthly budget faster than a 1-week 0.5% error rate, even though the second sounds worse on paper.

```yaml
# Multiwindow, multi-burn-rate alert (Google SRE recommendation)
# Alert if burning budget 14x faster than normal over 1h
# AND 2x faster than normal over 6h
- alert: HighBurnRate
  expr: |
    (
      job:burnrate1h > (14 * (1 - 0.999))
      and
      job:burnrate6h > (2 * (1 - 0.999))
    )
```

### Step 6: Review and iterate

Hold a monthly SLO review. Look at:
- Did we meet the SLO?
- If we breached it, what was the root cause?
- Should we adjust the target, the measurement, or both?
- Are there unreliable dependencies dragging down our SLI?

---

## Common Mistakes to Avoid

### 1. Confusing SLO with SLA

SLOs are internal. SLAs are contractual. If you breach your SLO, your team has a conversation. If you breach your SLA, your customers get refunds and lawyers get involved.

### 2. Setting too many SLOs

More SLOs = more alerts = alert fatigue. Start with 2–3 critical SLOs per service. Add more as you build operational maturity.

### 3. Using mean (average) metrics

Mean latency hides outliers. If your p50 is 50ms but your p99 is 5 seconds, your mean might look fine while 1% of users have a terrible experience. Always track p95 and p99.

### 4. Measuring from the wrong point

Health check endpoints often don't represent real user traffic. Measure from your load balancer or API gateway, not from synthetic internal pings.

### 5. Ignoring dependency SLOs

Your SLO can only be as good as your weakest dependency. Map your critical dependencies and understand their SLOs. If a third-party payment provider has a 99.9% SLO and you depend on it, your checkout SLO can't exceed 99.9%.

### 6. Never adjusting the SLO

SLOs should evolve with your service. If you consistently achieve 99.97% against a 99.9% SLO, tighten it to 99.95% — this reflects reality and keeps the error budget meaningful.

---

## Conclusion

SLI, SLO, and SLA form a hierarchy:

- **SLI** tells you what's happening (measurement)
- **SLO** tells you what you're aiming for (internal target + error budget)
- **SLA** tells you what you've promised (external commitment with consequences)

The error budget concept is the key insight: reliability isn't just about avoiding downtime, it's about budgeting risk in a way that lets engineering teams make data-driven decisions about when to ship fast vs. when to slow down and stabilize.

Start small. Pick one critical user journey. Define a simple availability SLI. Set a conservative SLO. Build your dashboards. Then iterate — tighter SLOs, richer SLIs, multi-window burn rate alerts — as your team's maturity grows.

---

## Explore More DevPlaybook Tools

Reliability engineering requires the right tooling. Check out our curated developer tools:

- [Cron Expression Builder](/tools/cron-expression) — schedule your SLO report generation
- [JSON Formatter](/tools/json-formatter) — clean up Prometheus/Grafana alert JSON configs
- [Base64 Encoder](/tools/base64) — work with API authentication for monitoring tools
- [Timestamp Converter](/tools/timestamp-converter) — convert Unix timestamps in your metrics

Browse all 200+ tools at [DevPlaybook](/tools) to streamline your reliability workflow.
