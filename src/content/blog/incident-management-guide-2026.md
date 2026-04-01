---
title: "Modern Incident Management: PagerDuty, OpsGenie & SRE Practices"
description: "Build a robust incident management process: on-call rotations, PagerDuty vs OpsGenie comparison, SRE error budgets, runbooks, postmortems, and incident command structure."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["incident management", "on-call", "SRE", "reliability", "PagerDuty", "OpsGenie", "postmortem"]
readingTime: "9 min read"
---

Incidents are inevitable. Services fail, deployments go wrong, and dependencies break. What separates high-performing engineering organizations isn't the absence of incidents — it's how quickly they detect them, how effectively they respond, and how reliably they prevent recurrence.

This guide covers the full incident management lifecycle: alerting setup, on-call rotation design, incident command during an outage, and the postmortem process that drives improvement.

---

## The Cost of Poor Incident Management

The numbers are stark:

- Average cost of an IT downtime incident: **$5,600/minute** (Gartner)
- Mean Time To Detect (MTTD) for companies without structured processes: **6+ hours**
- Companies with mature incident management reduce MTTR by **70%** compared to ad-hoc response

Beyond cost, on-call fatigue from poorly tuned alerting is a leading cause of engineer burnout and attrition.

---

## Alerting Philosophy: The Signal-to-Noise Problem

The most common failure in incident management is **alert fatigue** — too many alerts, too many false positives, and engineers who learn to ignore pages.

**Rules for healthy alerting:**

1. **Alert on symptoms, not causes.** Alert when users are impacted (error rate > 1%, latency > 500ms) rather than when CPU is high. High CPU is a cause; slow responses are the symptom.

2. **Every alert must be actionable.** If an engineer gets paged and there's nothing they can do right now, that's not an alert — it's noise. Either fix the underlying issue or raise the threshold.

3. **Calibrate severity.** Not every issue warrants waking someone at 3am. Use severity levels:
   - **P1/SEV1**: User-facing production down. Immediate response.
   - **P2/SEV2**: Degraded service, partial outage. Response within 15 minutes.
   - **P3/SEV3**: Non-urgent issue, no immediate user impact. Business hours response.

4. **Alert on SLO burn rate.** Instead of alerting on fixed thresholds, alert when your error budget is burning too fast. A 2% error rate for 1 minute is different from 2% for 1 hour.

---

## SLIs, SLOs, and Error Budgets

The SRE framework from Google provides a mathematical basis for reliability decisions:

| Concept | Definition | Example |
|---|---|---|
| SLI (Service Level Indicator) | Measurable metric of service behavior | 99.2% of requests complete < 200ms |
| SLO (Service Level Objective) | Target threshold for an SLI | 99.5% of requests < 200ms over 30 days |
| Error Budget | 1 - SLO; allowed "badness" | 0.5% = 3.6 hours/month |

The error budget acts as an objective arbiter between reliability and velocity: if the budget is healthy, ship features. If it's depleted, freeze releases and focus on reliability work.

```
Error Budget Calculation:
SLO: 99.9% availability over 30 days
Error budget: 0.1% × (30 × 24 × 60) = 43.2 minutes/month

If current burn rate = 2× normal, budget depletes in:
43.2 / 2 = 21.6 minutes remaining
→ Alert: "Error budget will be exhausted in < 1 hour"
```

---

## PagerDuty vs OpsGenie: Feature Comparison

Both are mature, enterprise-grade platforms. The differences matter at scale:

| Feature | PagerDuty | OpsGenie |
|---|---|---|
| Pricing | From $21/user/month | From $9/user/month (Atlassian) |
| AI Ops | Advanced (AIOps, intelligent triage) | Basic |
| Atlassian integration | Good | Native (same company as Jira/Confluence) |
| Status page | Via StatusPage (separate product) | Built-in |
| Automation | Event Intelligence, Workflows | Flexible routing rules |
| Reporting | Comprehensive MTTD/MTTR dashboards | Good, less granular |
| Mobile app | Excellent | Good |

**Choose PagerDuty** if you need advanced AIOps correlation (grouping related alerts), sophisticated escalation trees, or are at enterprise scale (500+ engineers).

**Choose OpsGenie** if you're already in the Atlassian ecosystem (Jira, Confluence), need a built-in status page, or want lower per-user costs.

**Alternatives**: Grafana OnCall (open source, integrates with Grafana stack), Incident.io (incident management focus over alerting), VictorOps (now part of Splunk).

---

## On-Call Rotation Design

A well-designed on-call rotation prevents burnout and ensures effective response:

**Rotation principles:**
- **Follow-the-sun** for global teams: each time zone handles incidents during their business hours
- **Minimum rotation size**: at least 4 engineers to ensure one week on, three weeks off
- **Primary + secondary**: primary responds first; secondary escalates if primary is unreachable after 5 minutes
- **Never solo on-call**: the on-call engineer has a backup they can call for complex incidents

**Compensation**: On-call should be compensated, especially for nights and weekends. This respects engineers' time and ensures people take it seriously.

**Toil tracking**: Log every alert page. Classify each as actionable or noise. Review monthly to tune alerting. Target: < 5 pages per on-call shift from noise.

---

## Incident Command Structure

Large incidents without structure devolve into chaos. The Incident Command System (ICS), borrowed from emergency management, scales from 2 to 200 responders:

| Role | Responsibilities |
|---|---|
| **Incident Commander (IC)** | Owns the incident, delegates tasks, communicates status. Not debugging. |
| **Technical Lead** | Leads the debugging and remediation efforts |
| **Comms Lead** | External/internal communication, status page updates |
| **Scribe** | Documents timeline, decisions, and actions in real-time |

For most incidents, one engineer plays IC + Comms. For major outages, separate these roles.

**The IC Rule**: The Incident Commander does not touch production. Their job is to coordinate, track information, and ensure nothing falls through the cracks. If the IC is debugging, they're not commanding.

---

## Runbooks: Turning Tribal Knowledge into Action

A runbook is a documented procedure for a specific alert or incident type. Good runbooks:

1. **Link directly from the alert** — the PagerDuty/OpsGenie alert includes a URL to the runbook
2. **Describe the symptom** — "users are seeing 500 errors on checkout"
3. **List investigation steps** — "check error rate dashboard → check service logs → check database connections"
4. **Include remediation commands** — copy-pasteable, not described in words
5. **Describe escalation path** — who to contact and when

```markdown
## Payment Service: High Error Rate

**Alert**: payment-service error rate > 1% for > 5 minutes

### Investigation
1. Check [Payment Error Dashboard](https://grafana.example.com/d/payments)
2. Check recent deployments: `kubectl rollout history deploy/payment-service`
3. Check database connections: `kubectl exec -it <pod> -- psql -c "SELECT count(*) FROM pg_stat_activity"`

### Remediation
**If caused by recent deploy:**
kubectl rollout undo deploy/payment-service

**If database connection pool exhausted:**
kubectl rollout restart deploy/payment-service

### Escalation
- Database issues: page @db-oncall
- Payment provider issues: contact Stripe support, post in #payment-incidents
```

---

## The Postmortem Process

A postmortem (or incident review) is the most important practice in incident management. Done correctly, it prevents the same incident from recurring.

**Blameless postmortems**: The goal is to understand *what* failed and *why* the systems allowed it, not *who* made a mistake. Blame drives people to hide errors, not prevent them.

**Postmortem structure:**

```
## Incident Summary
- Date/time and duration
- Severity and customer impact
- Responders

## Timeline
[Detailed minute-by-minute timeline of detection, response, and resolution]

## Root Cause Analysis
- Immediate cause: what failed
- Contributing factors: what conditions made failure possible
- Detection gap: why it wasn't caught earlier

## 5 Whys Analysis
Why did the checkout fail?
→ Why was the database overloaded?
→ Why did the connection pool exhaust?
→ Why was there no circuit breaker?
→ Why wasn't this in the deployment checklist?
→ Why doesn't the checklist cover connection pooling?

## Action Items
| Item | Owner | Due |
|------|-------|-----|
| Add circuit breaker to payment service | @engineer | 2026-04-09 |
| Add DB connection monitoring alert | @sre | 2026-04-05 |
| Update deploy checklist | @tech-lead | 2026-04-03 |
```

**Follow-through**: The most common postmortem failure is unclosed action items. Use Jira or Linear to track postmortem tasks in your normal workflow, with owners and due dates.

---

## 2026 Tools and Trends

**AI-assisted incident response**: Tools like PagerDuty AIOps and Incident.io AI correlate alerts, suggest runbooks, and draft communication based on similar past incidents.

**Automated incident channels**: Slack/Teams bots that automatically create incident channels, invite responders, and post status updates.

**Continuous reliability testing**: Chaos engineering tools like Gremlin and LitmusChaos run controlled fault injection regularly, so incidents reveal unknown system properties in a controlled setting rather than in production.

**SLO-based deployment gating**: Automated deployment pipelines that check error budget burn rate before promoting to production — if the budget is depleted, the deploy is blocked until reliability is restored.

---

A mature incident management process is a competitive advantage. Teams that respond faster, communicate better, and learn from incidents ship faster and with higher reliability. The investment in process pays dividends every time something goes wrong — which it will.
