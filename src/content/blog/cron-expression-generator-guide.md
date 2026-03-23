---
title: "Cron Expression Generator: Build and Understand Cron Schedules"
description: "Learn cron expression syntax, build schedules visually, and avoid common mistakes. Includes a cron expression generator tool and reference for every cron format."
date: "2026-03-24"
tags: ["cron", "cron-expression", "scheduling", "devops", "automation", "linux"]
readingTime: "8 min read"
---

# Cron Expression Generator: Build and Understand Cron Schedules

Cron expressions control when scheduled jobs run — from database backups to cloud functions to CI/CD pipelines. They're powerful but the syntax is notoriously easy to get wrong.

This guide covers the syntax, common schedules, tools to build them visually, and the variants used across different platforms.

---

## What Is a Cron Expression?

A cron expression is a string of 5 (or 6-7) fields that define a schedule:

```
┌─────────── minute (0-59)
│ ┌───────── hour (0-23)
│ │ ┌─────── day of month (1-31)
│ │ │ ┌───── month (1-12 or JAN-DEC)
│ │ │ │ ┌─── day of week (0-6 or SUN-SAT, where 0=Sunday)
│ │ │ │ │
* * * * *
```

---

## Cron Expression Generator Online

**[DevPlaybook Cron Generator](https://devplaybook.cc/cron-generator)** — click your schedule, get the expression. Shows a human-readable description and the next 5 run times.

No memorizing syntax. No getting the fields confused.

---

## Cron Syntax Reference

### Special Characters

| Character | Meaning | Example |
|-----------|---------|---------|
| `*` | Every value | `* * * * *` — every minute |
| `,` | List of values | `1,15,30 * * * *` — at minute 1, 15, and 30 |
| `-` | Range of values | `0 9-17 * * *` — every hour from 9am to 5pm |
| `/` | Step values | `*/15 * * * *` — every 15 minutes |
| `L` | Last (day-specific) | `0 0 L * *` — last day of each month |
| `?` | No specific value | Used in day-of-month or day-of-week when the other is set |
| `#` | Nth occurrence | `0 10 * * 2#1` — first Tuesday at 10am |

---

## Most Common Cron Schedules

### Every N Minutes

```bash
* * * * *       # Every minute
*/5 * * * *     # Every 5 minutes
*/10 * * * *    # Every 10 minutes
*/15 * * * *    # Every 15 minutes
*/30 * * * *    # Every 30 minutes
```

### Hourly

```bash
0 * * * *       # Every hour (at :00)
30 * * * *      # Every hour at :30
0 */2 * * *     # Every 2 hours
0 */6 * * *     # Every 6 hours
```

### Daily

```bash
0 0 * * *       # Every day at midnight
0 9 * * *       # Every day at 9 AM
0 18 * * *      # Every day at 6 PM
0 0,12 * * *    # Twice daily: midnight and noon
```

### Weekdays and Weekends

```bash
0 9 * * 1-5     # Weekdays at 9 AM (Monday-Friday)
0 9 * * MON-FRI # Same, using names
0 10 * * 0,6    # Weekends at 10 AM (Saturday-Sunday)
0 9 * * 1       # Every Monday at 9 AM
```

### Weekly

```bash
0 0 * * 0       # Every Sunday at midnight
0 9 * * 1       # Every Monday at 9 AM
0 0 * * 5       # Every Friday at midnight
```

### Monthly

```bash
0 0 1 * *       # First day of each month at midnight
0 0 15 * *      # 15th of each month at midnight
0 0 L * *       # Last day of each month (some platforms)
0 9 1,15 * *    # 1st and 15th of each month at 9 AM
```

### Yearly

```bash
0 0 1 1 *       # January 1st at midnight (Happy New Year!)
0 0 1 * *       # First of every month (12 times per year)
```

---

## Platform-Specific Variants

Cron expression formats vary across platforms:

### Standard Unix Cron (5 fields)

```
minute hour day-of-month month day-of-week
```

Used by: traditional crontab, most Linux systems.

### AWS EventBridge / CloudWatch Events (6 fields)

AWS uses a different format with year field and different special characters:

```
minute hour day-of-month month day-of-week year
```

**AWS-specific rules:**
- `?` is required in either day-of-month OR day-of-week (not both)
- Doesn't support `/` step syntax on day-of-week
- Sunday = 1 (not 0 like Unix cron)

```bash
# AWS: Every weekday at 9 AM EST
cron(0 14 ? * MON-FRI *)     # Note: UTC time, ? in day-of-month

# Every day at midnight UTC
cron(0 0 * * ? *)
```

### GitHub Actions (6 fields, UTC)

GitHub Actions uses standard 5-field cron but adds the `on.schedule` syntax. All times are UTC.

```yaml
on:
  schedule:
    - cron: '0 9 * * 1-5'    # Weekdays at 9 AM UTC
    - cron: '*/30 * * * *'   # Every 30 minutes
```

**Minimum interval:** GitHub Actions doesn't guarantee sub-5-minute accuracy and recommends no shorter than 5 minutes.

### Kubernetes CronJob

Uses standard 5-field cron format:

```yaml
apiVersion: batch/v1
kind: CronJob
spec:
  schedule: "*/10 * * * *"   # Every 10 minutes
```

Also supports `@hourly`, `@daily`, `@weekly`, `@monthly`, `@yearly`.

### Node.js (node-cron, node-schedule)

`node-cron` supports a 6-field format with an optional seconds field:

```javascript
import cron from 'node-cron';

// Every minute (5-field, standard)
cron.schedule('* * * * *', () => { /* ... */ });

// Every 30 seconds (6-field with seconds)
cron.schedule('*/30 * * * * *', () => { /* ... */ });
```

### Python APScheduler / python-crontab

Standard 5-field format:

```python
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = BlockingScheduler()
scheduler.add_job(my_function, CronTrigger.from_crontab('0 9 * * 1-5'))
scheduler.start()
```

---

## Predefined Shortcuts

Most cron implementations support these human-readable shortcuts:

| Shortcut | Equivalent | Meaning |
|----------|-----------|---------|
| `@yearly` / `@annually` | `0 0 1 1 *` | Once per year |
| `@monthly` | `0 0 1 * *` | Once per month |
| `@weekly` | `0 0 * * 0` | Once per week (Sunday) |
| `@daily` / `@midnight` | `0 0 * * *` | Once per day |
| `@hourly` | `0 * * * *` | Once per hour |
| `@reboot` | N/A | At system startup |

---

## Common Mistakes

### 1. UTC vs Local Time

Most cloud schedulers use UTC. If you want "9 AM local time", convert:

```bash
# 9 AM Eastern (UTC-5 in winter, UTC-4 in summer)
0 14 * * *   # Winter (UTC-5: 9 + 5 = 14)
0 13 * * *   # Summer (UTC-4: 9 + 4 = 13)
```

### 2. Day of Week Numbering

Different platforms use different numbering:
- Unix cron: 0 = Sunday (some also accept 7 = Sunday)
- AWS: 1 = Sunday, 7 = Saturday
- Use names (`MON`, `TUE`, etc.) when available to avoid confusion

### 3. `*` vs `?`

Some platforms (AWS, Quartz scheduler) require `?` when you specify one of day-of-month or day-of-week but not the other:

```bash
# AWS EventBridge: every weekday
0 9 ? * MON-FRI *    # ? in day-of-month because we specified day-of-week
```

### 4. Expecting Sub-Minute Precision

Standard cron has 1-minute resolution. For finer granularity, use application-level scheduling (setInterval, APScheduler, etc.).

### 5. Missing Time Zone Handling

Always document the timezone for any cron schedule:

```yaml
# Good
- cron: '0 9 * * 1-5'  # 9 AM UTC, weekdays

# Better (with timezone in description or config)
schedule:
  cron: '0 9 * * 1-5'
  timezone: 'America/New_York'  # where supported
```

---

## Debugging Cron Schedules

### Verify Next Run Times

```bash
# Install croniter (Python)
pip install croniter
python3 -c "
from croniter import croniter
from datetime import datetime
cron = croniter('*/15 * * * *', datetime.now())
for _ in range(5):
    print(cron.get_next(datetime))
"
```

### Use Online Tools

**[DevPlaybook Cron Generator](https://devplaybook.cc/cron-generator)** shows the next 5 run times for any expression — paste your cron expression and verify it matches your intention before deploying.

### Testing in Production

```bash
# Run a cron job immediately to test it
# AWS CLI
aws events put-rule --schedule-expression 'rate(1 minute)' --name test-rule

# GitHub Actions - push to trigger workflow
# Or: workflow_dispatch for manual testing
```

---

## Cron Alternatives

Cron works well for simple periodic jobs, but for complex scheduling needs:

- **AWS EventBridge** — rate expressions, one-time schedules, cross-account targeting
- **Temporal / Conductor** — workflow orchestration with retries, visibility, versioning
- **BullMQ / Agenda** — Node.js job queues with scheduling
- **Celery Beat** — Python periodic task scheduler
- **pg_cron** — cron directly in PostgreSQL (for DB maintenance tasks)

For anything where failure matters, consider a proper job queue with retry logic and dead-letter handling rather than raw cron.

---

## Quick Examples for Common Tasks

```bash
# Database backup: Daily at 2 AM
0 2 * * *

# Send weekly report: Monday at 8 AM
0 8 * * 1

# Clear temp files: Every Sunday at 3 AM
0 3 * * 0

# Health check ping: Every 5 minutes
*/5 * * * *

# Monthly billing run: 1st of month at midnight
0 0 1 * *

# Nightly data sync: Every day at 11 PM
0 23 * * *

# Business hours check (every hour, M-F 9am-5pm)
0 9-17 * * 1-5
```

Use **[DevPlaybook Cron Generator](https://devplaybook.cc/cron-generator)** to build these visually and verify the schedule before putting it in production.
