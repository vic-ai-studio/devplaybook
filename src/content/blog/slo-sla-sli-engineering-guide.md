---
title: "SLO, SLA, and SLI: Engineering Reliability the Right Way"
description: "Master SLOs, SLAs, and SLIs for production reliability engineering. Learn error budget calculation, burn rate alerting, and how to set meaningful reliability targets your team can actually hit."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["slo", "sla", "sli", "reliability", "observability", "devops", "sre", "alerting"]
readingTime: "13 min read"
---

When your payment service goes down at 2 AM, nobody cares about your theoretical uptime. They care whether they can check out. SLOs, SLAs, and SLIs are the framework that turns vague reliability goals into measurable commitments — and more importantly, into engineering decisions you can act on.

This guide explains the three concepts from first principles, shows you how to calculate error budgets and burn rates, and walks through real-world alerting strategies used by teams that run services at scale.

---

## The Three Concepts

### SLI — Service Level Indicator

An SLI is a quantitative measure of some aspect of your service. It's a ratio of good events to total events over a time window.

```
SLI = (good events) / (total events)
```

Common SLIs:

- **Availability:** requests returning non-5xx / total requests
- **Latency:** requests completing in < 300ms / total requests
- **Error rate:** successful responses / total responses
- **Freshness:** cache hits with data < 1 hour old / total reads
- **Throughput:** processed messages / expected messages

The key design principle: **SLIs should measure what users actually care about**, not what's easy to instrument. A server with 100% uptime that returns garbage data has failed its users.

### SLO — Service Level Objective

An SLO is a target for your SLI over a time window:

```
SLO = SLI target over rolling window
```

Examples:
- 99.9% of requests return non-5xx over a 28-day rolling window
- 95% of checkout requests complete in < 500ms over a 28-day window
- 99.95% availability measured over each calendar quarter

SLOs are **internal targets**. They're the commitment your engineering team makes to keep a service healthy. The SLO gives you an error budget — a quantified allowance for failure.

### SLA — Service Level Agreement

An SLA is a contractual commitment between a service provider and its customers. It includes consequences for missing targets (refunds, credits, contract termination).

```
SLA ⊂ SLO  — the SLA target should be looser than your SLO
```

If your SLO is 99.9% availability, your SLA might commit to 99.5%. The gap gives you breathing room: you'll know internally when you're in trouble before you've breached a customer contract.

Never write an SLA more aggressive than your SLO. If you commit 99.95% availability to customers but only target 99.9% internally, you've guaranteed you'll breach the SLA whenever you hit your SLO.

---

## Error Budgets

The error budget is the amount of unreliability your SLO allows.

```
Error Budget = 1 - SLO target
```

| SLO | Error Budget | Downtime/28 days |
|-----|-------------|-----------------|
| 99% | 1.0% | 6h 43m |
| 99.5% | 0.5% | 3h 21m |
| 99.9% | 0.1% | 40m 19s |
| 99.95% | 0.05% | 20m 9s |
| 99.99% | 0.01% | 4m 1s |

The error budget is consumed by outages, bad deployments, dependency failures, and planned maintenance. When you're burning through budget faster than expected, you have a signal that reliability work should take priority over new features.

### Error Budget Policy

A formal error budget policy defines what happens when budget is consumed:

- **> 50% budget remaining:** Ship freely. Reliability is healthy.
- **25-50% remaining:** Slow down risky deployments. Add canary analysis.
- **10-25% remaining:** Freeze non-critical feature deployments. Focus on reliability.
- **< 10% remaining:** Reliability work only. Incident reviews, dependency improvements, testing.
- **0% (budget exhausted):** Full deployment freeze until budget renews.

This policy turns reliability from a vague aspiration into a concrete gate on engineering work.

---

## Calculating Error Budget Consumption

### Basic Calculation

For an availability SLO of 99.9% over 28 days:

```
Total events in window: 10,000,000 requests
Allowed failures: 10,000,000 × 0.001 = 10,000 requests
Actual failures: 8,500 requests
Budget consumed: 8,500 / 10,000 = 85%
Budget remaining: 15%
```

### Time-based Window

For rolling windows, you need to think in terms of the window duration:

```
Window: 28 days = 28 × 24 × 60 = 40,320 minutes
SLO: 99.9%
Allowed downtime: 40,320 × 0.001 = 40.32 minutes
```

If you had a 25-minute incident this month, you've consumed:
```
25 / 40.32 = 62% of your error budget
```

### Python Example

```python
from dataclasses import dataclass
from typing import Optional
import datetime

@dataclass
class ErrorBudgetStatus:
    slo_target: float           # e.g., 0.999
    window_days: int            # e.g., 28
    total_requests: int
    failed_requests: int

    @property
    def sli(self) -> float:
        if self.total_requests == 0:
            return 1.0
        return (self.total_requests - self.failed_requests) / self.total_requests

    @property
    def allowed_failures(self) -> int:
        error_budget_ratio = 1 - self.slo_target
        return int(self.total_requests * error_budget_ratio)

    @property
    def budget_consumed_pct(self) -> float:
        if self.allowed_failures == 0:
            return 100.0
        return min(100.0, (self.failed_requests / self.allowed_failures) * 100)

    @property
    def budget_remaining_pct(self) -> float:
        return max(0.0, 100.0 - self.budget_consumed_pct)

    @property
    def is_healthy(self) -> bool:
        return self.sli >= self.slo_target

    @property
    def allowed_downtime_minutes(self) -> float:
        """How many minutes of full outage this SLO allows per window."""
        return self.window_days * 24 * 60 * (1 - self.slo_target)

    def summary(self) -> str:
        return (
            f"SLI: {self.sli:.4%} | SLO: {self.slo_target:.3%} | "
            f"Budget: {self.budget_remaining_pct:.1f}% remaining | "
            f"{'✓ HEALTHY' if self.is_healthy else '✗ BREACHED'}"
        )


# Usage
status = ErrorBudgetStatus(
    slo_target=0.999,
    window_days=28,
    total_requests=5_000_000,
    failed_requests=3_200,
)

print(status.summary())
# SLI: 99.9360% | SLO: 99.900% | Budget: 36.0% remaining | ✓ HEALTHY
```

---

## Burn Rate Alerting

Monitoring whether you're meeting your SLO right now is too slow. By the time you've measured 28 days of data, your budget is already gone. Burn rate alerting detects when you're consuming budget faster than sustainable.

### The Concept

**Burn rate** is how fast you're consuming your error budget relative to sustainable pace:

```
Burn Rate = (actual error rate) / (allowed error rate from SLO)
```

A burn rate of 1 means you're consuming budget at exactly the rate your SLO allows — you'll exhaust it right at the end of the window. A burn rate of 10 means you're consuming 10x faster than sustainable — you'll exhaust your 28-day budget in 2.8 days.

### Multi-Window Multi-Burn-Rate Alerts

Google's SRE workbook recommends a tiered alerting strategy using multiple time windows:

| Alert | Short Window | Long Window | Burn Rate | Budget Consumed | Response |
|-------|-------------|-------------|-----------|-----------------|----------|
| Page immediately | 1h | 5min | 14.4x | 2% in 1h | Incident response |
| Page urgently | 6h | 30min | 6x | 5% in 6h | Investigate now |
| Ticket | 3 days | 6h | 1x | 10% in 3d | Fix soon |

The short window catches fast burns (sudden spike in errors). The long window catches slow burns (gradual degradation you might miss if only watching short windows).

### Prometheus Rules Example

```yaml
# slo-alerts.yaml
groups:
  - name: checkout-service-slo
    rules:
      # SLI calculation
      - record: job:http_requests:rate5m
        expr: rate(http_requests_total[5m])

      - record: job:http_errors:rate5m
        expr: rate(http_requests_total{status=~"5.."}[5m])

      - record: job:sli:availability5m
        expr: 1 - (job:http_errors:rate5m / job:http_requests:rate5m)

      # Error budget alerts
      - alert: SLOBurnRateCritical
        expr: |
          (
            (1 - job:sli:availability5m) / (1 - 0.999) > 14.4
            and
            (1 - rate(http_requests_total{status=~"5.."}[1h]) /
                 rate(http_requests_total[1h])) < 0.999
          )
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Checkout SLO burn rate critical"
          description: >
            Burning error budget at {{ $value | humanizePercentage }}x rate.
            At this rate, 28-day budget exhausts in {{ div 28 $value | humanizeDuration }}.

      - alert: SLOBurnRateHigh
        expr: |
          (
            (1 - job:sli:availability5m) / (1 - 0.999) > 6
            and
            (1 - rate(http_requests_total{status=~"5.."}[6h]) /
                 rate(http_requests_total[6h])) < 0.999
          )
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Checkout SLO burn rate elevated"
```

---

## Designing Good SLOs

### Start with User Journeys

Don't instrument everything and pick SLIs from what's easy to measure. Start from the user experience:

1. What do users need to be able to do? (browse, search, checkout, receive notifications)
2. What does success look like for each? (page loads, search returns results, payment completes)
3. What's the minimum acceptable bar? (not "best case", but "I'd be annoyed if worse than this")

For an e-commerce checkout:
- **Availability:** Can the user complete a purchase? → 99.9%
- **Latency:** Does the checkout page load quickly? → 95% of requests < 500ms
- **Correctness:** Does the right item get shipped? → 99.99% order accuracy

### Setting Achievable Targets

Start with data, not aspirations. Measure your current SLI over the past 4 weeks. Then:

```
Initial SLO = slightly below your current performance
```

If you're currently at 99.94% availability, set your first SLO at 99.9%. This gives you an error budget to work with while building the tooling to improve. Don't set an SLO you can't currently meet — it immediately makes the error budget meaningless.

After 2-3 quarters, review whether your SLO is serving its purpose:
- If you never consume budget, it's too loose.
- If you constantly breach it, it's too tight or you need reliability investment.

### Latency SLOs Need Percentiles

Don't use averages for latency SLOs. Averages hide the tail latency that actually affects users.

```
Latency SLO: 95th percentile < 300ms, 99th percentile < 1000ms
```

This means 95% of requests complete in under 300ms, and only 1 in 100 requests takes over a second. The long tail still has a bound.

```yaml
# Prometheus histogram quantile
- record: job:http_request_duration_p95
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

- record: job:http_request_duration_p99
  expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

---

## SLO Dashboards

A useful SLO dashboard shows:

1. **Current SLI** — real-time measurement
2. **SLO target line** — visual reference
3. **Error budget gauge** — % consumed this window
4. **Burn rate** — current consumption rate
5. **Budget forecast** — will we exhaust budget before window end?

### Grafana Panel: Error Budget Gauge

```json
{
  "type": "gauge",
  "title": "Error Budget Remaining",
  "targets": [
    {
      "expr": "100 * (1 - (sum(increase(http_requests_total{status=~'5..'}[28d])) / sum(increase(http_requests_total[28d]))) / (1 - 0.999))",
      "legendFormat": "Budget %"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "thresholds": {
        "steps": [
          { "color": "red", "value": 0 },
          { "color": "yellow", "value": 25 },
          { "color": "green", "value": 50 }
        ]
      },
      "min": 0,
      "max": 100,
      "unit": "percent"
    }
  }
}
```

---

## Common Mistakes

**Using uptime instead of user-facing SLIs.** A server can be up while returning errors. Measure what users experience, not what's convenient to collect.

**Setting 100% SLOs.** Perfect uptime is impossible and also undesirable — you need error budget to deploy software and make changes. 100% SLO = no error budget = all changes are frozen.

**Ignoring dependencies.** Your checkout service's availability is bounded by its dependencies. If your payment processor has 99.5% uptime, your checkout service cannot possibly exceed that. Measure and budget for dependency failures.

**Not defining the measurement window.** "99.9% availability" means nothing without a window. Is that per day? Per month? Rolling or calendar? The window dramatically affects the allowed downtime and error budget dynamics.

**Treating SLOs as launch-and-forget.** SLOs require regular review. Traffic patterns change, dependencies improve or degrade, and user expectations evolve. Review SLOs quarterly and adjust based on burn rate data.

---

## Reliability Maturity Ladder

| Level | Practices |
|-------|-----------|
| 1 — Basic | Uptime monitoring, on-call rotation |
| 2 — Instrumented | SLIs defined, dashboards, basic alerting |
| 3 — Budget-driven | SLOs set, error budgets calculated, burn rate alerts |
| 4 — Policy-driven | Error budget policy enforced, formal SLAs, toil tracking |
| 5 — Optimized | Chaos engineering, capacity-based SLOs, automated rollbacks on burn rate |

Most teams are at level 1-2. Getting to level 3 — with genuine burn rate alerting and error budget consumption driving deployment decisions — is where reliability engineering actually starts paying off.

---

## Key Takeaways

- **SLI** measures what's happening; **SLO** targets what should happen; **SLA** contracts what you'll guarantee to customers.
- Error budget = 1 - SLO. It's how much failure your SLO allows. Treat it as a resource to manage, not a threshold to avoid.
- Set SLOs from actual measured performance, not aspirations. Start slightly below where you are today.
- Multi-window burn rate alerting (1h + 5min, 6h + 30min) is dramatically more actionable than threshold-based alerts.
- Latency SLOs require percentiles (p95, p99) — never averages.
- Review SLOs quarterly. An SLO you never come close to breaching is too loose; one you constantly breach means reliability investment is overdue.
