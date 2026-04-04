---
title: "Cron Expression Generator for Developers: Complete Guide to Scheduling in 2026"
description: "Generate cron expressions visually with instant preview. Complete guide to 5-field Linux cron, 6-field with seconds, GitHub Actions, AWS EventBridge, Kubernetes, and common scheduling pitfalls."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["cron", "cron-expression", "scheduling", "ci-cd", "devops", "automation", "aws"]
readingTime: "12 min read"
canonicalUrl: "https://devplaybook.cc/blog/cron-expression-generator-for-developers"
---

# Cron Expression Generator for Developers: Complete Guide to Scheduling in 2026

Cron expressions power more infrastructure than most developers realize. Every nightly backup, every scheduled database cleanup, every daily email digest, every GitHub Actions nightly test suite — cron expressions sit underneath all of it.

They're also the kind of syntax that looks simple, hides subtle rules, and silently does the wrong thing if you misread the documentation. This guide covers everything: the syntax, platform differences, the tricky behaviors that catch developers off guard, and production-ready patterns for every platform you're likely to use.

**[Generate a Cron Expression →](/tools/cron-generator)**

---

## What is a Cron Expression?

A cron expression is a compact string that defines when a scheduled task runs. The name comes from the Unix `cron` daemon, which has scheduled jobs on Unix systems since 1975.

A standard 5-field cron expression:

```
┌──────── minute (0-59)
│ ┌────── hour (0-23)
│ │ ┌──── day of month (1-31)
│ │ │ ┌── month (1-12 or JAN-DEC)
│ │ │ │ ┌ day of week (0-7 or SUN-SAT, both 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

Some platforms add a **6th field for seconds** (prepended before minutes) or a **7th field for year** (appended after day-of-week).

---

## The Most Common Cron Schedules

Copy-paste ready expressions for the schedules you actually need:

### Time-Based Schedules

| Schedule | Cron Expression | Notes |
|----------|-----------------|-------|
| Every minute | `* * * * *` | Rarely needed in production |
| Every 5 minutes | `*/5 * * * *` | 00, 05, 10, 15... |
| Every 15 minutes | `*/15 * * * *` | 4× per hour |
| Every 30 minutes | `*/30 * * * *` | On the hour and half-hour |
| Every hour (on the hour) | `0 * * * *` | 00:00, 01:00, 02:00... |
| Every 2 hours | `0 */2 * * *` | 00:00, 02:00, 04:00... |
| Every 6 hours | `0 */6 * * *` | Midnight, 6am, noon, 6pm |

### Daily Schedules

| Schedule | Cron Expression | Notes |
|----------|-----------------|-------|
| Daily at midnight | `0 0 * * *` | UTC unless timezone specified |
| Daily at 9am | `0 9 * * *` | Adjust for UTC offset |
| Daily at 6pm | `0 18 * * *` | |
| Twice daily (8am + 8pm) | `0 8,20 * * *` | Comma = list |
| Every 4 hours starting at 2am | `0 2,6,10,14,18,22 * * *` | |

### Weekly Schedules

| Schedule | Cron Expression | Notes |
|----------|-----------------|-------|
| Every Monday at 9am | `0 9 * * 1` | 0=Sun, 1=Mon...6=Sat |
| Every weekday at 8am | `0 8 * * 1-5` | Hyphen = range |
| Weekends only at noon | `0 12 * * 0,6` | Comma = list |
| Every Sunday at midnight | `0 0 * * 0` | |
| Monday, Wednesday, Friday | `0 9 * * 1,3,5` | |

### Monthly Schedules

| Schedule | Cron Expression | Notes |
|----------|-----------------|-------|
| 1st of month at midnight | `0 0 1 * *` | |
| 15th of month at noon | `0 12 15 * *` | |
| Last day of month (approx) | `0 0 28-31 * *` | Runs on 28-31 if they exist |
| Quarterly (Jan, Apr, Jul, Oct) | `0 0 1 */3 *` | Every 3rd month |
| Every 6 months | `0 0 1 */6 *` | Jan 1 and Jul 1 |
| Yearly | `0 0 1 1 *` | January 1st midnight |

---

## Special Characters Reference

| Character | Meaning | Example | Result |
|-----------|---------|---------|--------|
| `*` | Any value | `* * * * *` | Every minute |
| `,` | List of values | `1,15,30` in minute | At 1st, 15th, 30th minute |
| `-` | Range | `9-17` in hour | Hours 9 through 17 |
| `/` | Step | `*/5` in minute | Every 5 minutes |
| `?` | Any (day fields) | Used in Quartz/Spring/AWS | Placeholder when day-of-month OR day-of-week is specified |
| `L` | Last | `L` in day-of-month | Last day of month (Quartz only) |
| `W` | Nearest weekday | `15W` | Nearest weekday to 15th (Quartz only) |
| `#` | Nth weekday | `2#3` | 3rd Monday (Quartz only) |

---

## Platform-Specific Cron Syntax

### Linux / Unix crontab

Standard 5-field. Edit with `crontab -e`.

```bash
# Format: minute hour day month weekday command
# Run backup daily at 2am
0 2 * * * /home/user/scripts/backup.sh >> /var/log/backup.log 2>&1

# Health check every 5 minutes (logs success only)
*/5 * * * * curl -s https://myapp.com/health | grep -q '"ok"' && echo "OK" || echo "FAIL" | mail -s "Health Check Failed" ops@example.com

# Weekly cleanup on Sunday at 3am
0 3 * * 0 find /tmp -mtime +7 -delete

# List your crontabs
crontab -l

# Edit
crontab -e

# Remove all (careful!)
crontab -r
```

**Gotchas:**
- The command runs with a minimal environment — `PATH` is not your login shell's PATH. Use absolute paths for commands: `/usr/bin/python3`, not `python3`
- Redirect both stdout and stderr: `command >> log.txt 2>&1`
- Test commands manually before adding to crontab

---

### GitHub Actions

Uses 5-field cron in UTC. Defined in workflow YAML under the `schedule` trigger.

```yaml
name: Nightly Tests

on:
  schedule:
    - cron: '0 2 * * *'       # Daily at 2am UTC
    - cron: '0 9 * * 1-5'     # Weekdays at 9am UTC

  workflow_dispatch:           # Also allow manual trigger

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
```

**GitHub Actions cron gotchas:**
- All cron times are **UTC** — adjust for your timezone
- Minimum interval: **every 5 minutes** (`*/5 * * * *`)
- **Scheduled runs may be delayed** up to 15 minutes during periods of high load
- Workflows **do not run** on forked repositories by default
- If a repository has no activity for 60 days, scheduled workflows are **automatically disabled**
- Use `workflow_dispatch` alongside `schedule` so you can trigger the job manually

---

### AWS EventBridge (formerly CloudWatch Events)

Uses 6-field cron with year field and requires `?` as placeholder for unused day fields:

```
cron(minutes hours day-of-month month day-of-week year)
```

```bash
# Weekdays at 9am UTC
cron(0 9 ? * MON-FRI *)

# Monthly on 1st at midnight UTC
cron(0 0 1 * ? *)

# Every 5 minutes
cron(*/5 * ? * * *)

# Every Sunday at 3am UTC
cron(0 3 ? * SUN *)

# Last day of month at midnight
cron(0 0 L * ? *)
```

**AWS EventBridge gotchas:**
- `?` is **required** in either day-of-month or day-of-week (but not both can be specified)
- Month names: `JAN-DEC`; Day names: `SUN-MON`; both uppercase
- All times are UTC
- Minimum interval: **1 minute** (not `*/1` — use `rate(1 minute)` instead for sub-5-minute schedules)
- EventBridge also supports `rate(5 minutes)` syntax as an alternative to cron

---

### Kubernetes CronJob

Standard 5-field cron in the job spec:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-sync
spec:
  schedule: "0 */6 * * *"        # Every 6 hours
  timeZone: "America/New_York"   # Kubernetes 1.27+ supports timeZone
  concurrencyPolicy: Forbid      # Don't run if previous job still running
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  startingDeadlineSeconds: 300   # Miss window if not started within 5 min
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: sync
            image: my-sync-image:latest
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
```

**Kubernetes CronJob gotchas:**
- `concurrencyPolicy: Forbid` is often what you want — prevents overlapping runs
- Without `timeZone`, runs in UTC. `timeZone` support requires Kubernetes 1.27+
- `startingDeadlineSeconds` prevents "catch-up" runs after the cluster is unavailable
- Check job history: `kubectl get jobs | grep data-sync`

---

### Node.js (node-cron)

```javascript
import cron from 'node-cron';

// Validate before scheduling
if (!cron.validate('*/5 * * * *')) {
  throw new Error('Invalid cron expression');
}

// Schedule with timezone support
const task = cron.schedule(
  '0 9 * * 1-5',
  () => {
    console.log('Running weekday morning task');
    sendDailyReport();
  },
  {
    timezone: 'America/New_York'  // IANA timezone name
  }
);

// Stop the task
task.stop();

// Start again
task.start();

// With seconds (6-field — add 6th field at the start)
cron.schedule('*/10 * * * * *', checkQueue);  // Every 10 seconds
```

---

### Python (APScheduler)

```python
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

scheduler = BlockingScheduler()

# Simple cron trigger
@scheduler.scheduled_job(
    CronTrigger(day_of_week='mon-fri', hour=9, minute=0, timezone='US/Eastern')
)
def weekday_report():
    print("Sending daily report...")
    send_report()

# Every 5 minutes
@scheduler.scheduled_job(CronTrigger(minute='*/5'))
def health_check():
    check_health()

# Using cron string directly (APScheduler 3.9+)
from apscheduler.triggers.cron import CronTrigger
trigger = CronTrigger.from_crontab('0 9 * * 1-5', timezone='US/Eastern')
scheduler.add_job(weekday_report, trigger)

try:
    scheduler.start()
except (KeyboardInterrupt, SystemExit):
    pass
```

---

## The Tricky Cron Behaviors That Catch Developers Off Guard

### `*/5` vs `5` — Step vs Fixed Value

```
*/5 in the minute field = every 5 minutes: 0, 5, 10, 15, 20...
5 in the minute field   = only at minute 5: 00:05, 01:05, 02:05...
```

### Day-of-Month AND Day-of-Week: OR Logic (Not AND)

This surprises nearly every developer the first time:

```
# You might expect: 1st of month only if it's a Monday
0 0 1 * 1

# What actually happens: runs on 1st of EVERY month
#                        AND on every Monday
```

If both day-of-month and day-of-week are non-wildcard, standard cron treats them as OR. To run on "first Monday of the month", you need to implement that logic in your script, or use a platform-specific extension like Quartz's `L#` notation.

### Month Numbering Starts at 1, Day-of-Week at 0 (or 1)

- `month`: 1 = January, 12 = December (unlike JavaScript's `Date.getMonth()` which starts at 0)
- `day-of-week`: 0 = Sunday AND 7 = Sunday (both are valid), 1 = Monday, 6 = Saturday

### Timezone Pitfalls

Most cron environments run in UTC by default. If you write `0 9 * * *` meaning "9am New York time", it will run at 9am UTC — which is 4am or 5am New York time depending on daylight saving.

```
# Your intent: 9am US/Eastern
0 9 * * *    # ❌ This is 9am UTC = 4-5am Eastern

# Fix 1: Convert to UTC manually
0 14 * * *   # ✅ 2pm UTC = 9am US/Eastern (EST offset = UTC-5)

# Fix 2: Use platform timezone support
# Linux crontab — set CRON_TZ variable
CRON_TZ=America/New_York
0 9 * * * command

# node-cron
cron.schedule('0 9 * * *', fn, { timezone: 'America/New_York' });
```

---

## Debugging Cron Issues

### Check When a Cron Will Next Run

```bash
# Using node - install cronparser
node -e "
const parser = require('cron-parser');
const interval = parser.parseExpression('0 9 * * 1-5', { tz: 'America/New_York' });
console.log('Next 5 runs:');
for (let i = 0; i < 5; i++) {
  console.log(interval.next().toString());
}
"
```

### Cron Not Running? Check These

1. **Permission issue**: Is the script executable? `chmod +x /path/to/script.sh`
2. **PATH problem**: Does the command use the full path? `/usr/bin/python3` not `python3`
3. **Environment variables**: Cron runs with a minimal environment. Source your profile or set variables explicitly
4. **Log output**: Add `>> /var/log/myjob.log 2>&1` to capture all output
5. **Lock files**: Is the previous run still going? Add a lock: `flock -n /tmp/myjob.lock command`
6. **Timezone**: Is the cron daemon running in UTC when you expected local time?

```bash
# Check cron logs
sudo tail -f /var/log/syslog | grep CRON     # Ubuntu/Debian
sudo tail -f /var/log/cron                    # RHEL/CentOS

# Test if cron daemon is running
systemctl status cron
systemctl status crond
```

### Add a Wrapper for Reliable Cron Jobs

```bash
#!/bin/bash
# /scripts/run-with-lock.sh

LOCK_FILE="/tmp/$(basename "$0").lock"
LOG_FILE="/var/log/$(basename "$0").log"

exec 200>$LOCK_FILE
flock -n 200 || { echo "Already running, exiting" >> "$LOG_FILE"; exit 1; }

echo "[$(date)] Starting" >> "$LOG_FILE"
"$@" >> "$LOG_FILE" 2>&1
EXIT_CODE=$?
echo "[$(date)] Finished with exit code $EXIT_CODE" >> "$LOG_FILE"
exit $EXIT_CODE
```

---

## Related Tools

- [Cron Generator](/tools/cron-generator) — build cron expressions visually with next-run preview
- [Cron Validator](/tools/cron-validator) — validate expressions and see next 10 run times
- [Timestamp Converter](/tools/timestamp-converter) — convert between UTC and local time

---

## Summary

Cron expressions are a small syntax with surprising depth. The key things to get right:

1. **Know your platform**: 5-field vs 6-field, `?` requirement in AWS, `L`/`W`/`#` in Quartz
2. **Timezone matters**: default is almost always UTC; convert explicitly or use platform timezone support
3. **Day-of-month OR day-of-week**: specifying both means either, not both
4. **Capture logs**: always redirect stdout and stderr so failed jobs leave evidence
5. **Test before deploying**: use a cron expression validator to confirm next run times before pushing to production

**[Open the Cron Expression Generator →](/tools/cron-generator)**
