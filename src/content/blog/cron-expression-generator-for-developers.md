---
title: "Cron Expression Generator for Developers: Build Any Schedule in Seconds"
description: "Generate cron expressions visually with instant preview. Supports 5-field Linux cron, 6-field with seconds, AWS EventBridge, and GitHub Actions schedule syntax."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["cron", "cron-expression", "scheduling", "ci-cd", "devops", "automation", "aws"]
readingTime: "7 min read"
canonicalUrl: "https://devplaybook.cc/blog/cron-expression-generator-for-developers"
---

# Cron Expression Generator for Developers: Build Any Schedule in Seconds

Cron expressions are powerful and precise — and notoriously hard to write from memory. A cron expression generator lets you build any schedule visually, see it in plain English, and copy the exact string for your platform.

**[Generate a Cron Expression →](/tools/cron-generator)**

---

## Cron Expression Basics

A standard cron expression has 5 fields:

```
┌──────── minute (0-59)
│ ┌────── hour (0-23)
│ │ ┌──── day of month (1-31)
│ │ │ ┌── month (1-12 or JAN-DEC)
│ │ │ │ ┌ day of week (0-6 or SUN-SAT)
│ │ │ │ │
* * * * *
```

Some platforms add a 6th field for **seconds** (before minutes) or a 7th for **year**.

---

## The Most Common Cron Schedules

Copy-paste ready expressions for the schedules you actually use:

| Schedule | Cron Expression | Description |
|----------|-----------------|-------------|
| Every minute | `* * * * *` | Runs every 60 seconds |
| Every 5 minutes | `*/5 * * * *` | 00, 05, 10, 15... |
| Every 15 minutes | `*/15 * * * *` | 4× per hour |
| Every 30 minutes | `*/30 * * * *` | On the hour and half-hour |
| Every hour | `0 * * * *` | On the hour |
| Every 2 hours | `0 */2 * * *` | 00:00, 02:00, 04:00... |
| Daily at midnight | `0 0 * * *` | 00:00 every day |
| Daily at 9am | `0 9 * * *` | 09:00 every day |
| Daily at 6pm | `0 18 * * *` | 18:00 every day |
| Weekdays at 8am | `0 8 * * 1-5` | Mon–Fri at 08:00 |
| Weekends at noon | `0 12 * * 0,6` | Sat and Sun at 12:00 |
| Weekly (Mondays) | `0 9 * * 1` | Monday 09:00 |
| Monthly (1st) | `0 0 1 * *` | 1st of month, midnight |
| Monthly (last day) | `0 0 28-31 * *` | Close to end of month |
| Quarterly | `0 0 1 */3 *` | Jan, Apr, Jul, Oct 1st |
| Yearly | `0 0 1 1 *` | Jan 1st midnight |

---

## Special Characters Explained

| Character | Meaning | Example |
|-----------|---------|---------|
| `*` | Any value | `* * * * *` = every minute |
| `,` | List | `1,15,30` = at 1st, 15th, 30th minute |
| `-` | Range | `9-17` = hours 9 through 17 |
| `/` | Step | `*/5` = every 5 units |
| `?` | Any (day fields only) | Used in Quartz/Spring |
| `L` | Last (Quartz only) | `L` in day-of-month = last day |
| `W` | Weekday nearest (Quartz) | `15W` = nearest weekday to 15th |
| `#` | Nth weekday (Quartz) | `2#3` = 3rd Monday |

---

## Platform-Specific Cron Syntax

### Linux / Unix crontab

Standard 5-field. Run `crontab -e` to edit.

```bash
# Run backup every day at 2am
0 2 * * * /home/user/scripts/backup.sh

# Run health check every 5 minutes
*/5 * * * * curl -s https://myapp.com/health > /dev/null
```

### GitHub Actions

Uses 5-field cron in UTC. Defined in workflow YAML:

```yaml
on:
  schedule:
    - cron: '0 9 * * 1-5'    # Weekdays at 9am UTC
    - cron: '0 0 * * 0'      # Weekly on Sunday midnight
```

**Gotchas:**
- GitHub Actions runs in UTC
- Minimum interval: every 5 minutes
- Scheduled runs may be delayed up to 15 minutes during high load

### AWS EventBridge (CloudWatch Events)

Uses 6-field cron with year field and `?` for unused day fields:

```
cron(minutes hours day-of-month month day-of-week year)

cron(0 9 ? * MON-FRI *)    # Weekdays at 9am
cron(0 12 1 * ? *)          # Monthly on 1st at noon
cron(*/5 * ? * * *)         # Every 5 minutes
```

### Kubernetes CronJob

Standard 5-field in the job spec:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-sync
spec:
  schedule: "0 */6 * * *"   # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: sync
            image: my-sync-image
```

### Spring / Quartz (Java)

6-field with seconds first:

```
seconds minutes hours day-of-month month day-of-week [year]

0 0 9 * * MON-FRI           # Weekdays at 9am
0 */30 * * * *               # Every 30 seconds
0 0 0 1 * ?                  # Monthly, 1st at midnight
```

### Node.js (node-cron)

```javascript
import cron from 'node-cron';

// Every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Running task');
});

// Weekdays at 9am
cron.schedule('0 9 * * 1-5', () => {
  sendDailyReport();
});

// With seconds (6-field)
cron.schedule('*/10 * * * * *', () => {
  checkQueue();
});
```

### Python (APScheduler / python-crontab)

```python
from apscheduler.schedulers.blocking import BlockingScheduler

scheduler = BlockingScheduler()

@scheduler.scheduled_job('cron', hour=9, minute=0, day_of_week='mon-fri')
def weekday_report():
    send_report()

@scheduler.scheduled_job('cron', minute='*/5')
def health_check():
    check_health()

scheduler.start()
```

---

## Cron Validation Tips

### Does `*/5` mean "every 5 minutes" or "5 minutes after midnight"?

`*/5` means every 5 minutes — it divides the range by 5. It runs at 0, 5, 10, 15...

For "5 minutes after midnight": `5 0 * * *` (minute=5, hour=0).

### Month and day-of-week — AND or OR?

In standard cron: if both day-of-month and day-of-week are specified (not `*`), the job runs when **either** condition is true (OR logic).

```
0 0 1 * 1   → runs on 1st of month OR every Monday
```

Use a cron generator to visualize this before deploying.

### Timezone handling

Cron runs in the system timezone (or UTC for cloud services). For user-facing schedules, convert to UTC explicitly:

```
User wants 9am EST → 2pm UTC → cron: 0 14 * * *
User wants 9am PST → 5pm UTC → cron: 0 17 * * *
```

---

## Validate Your Cron Before Running

**[Validate Cron Expression →](/tools/cron-validator)**

Before setting up a real schedule:
1. Use the generator to build the expression
2. Use a validator to confirm it matches your intent
3. Check what time the next 5 runs will occur
4. Verify the timezone matches your environment

---

## Related Tools

- [Cron Generator](/tools/cron-generator) — build cron expressions visually
- [Cron Validator](/tools/cron-validator) — validate and preview next run times
- [API Rate Limit Calculator](/tools/api-rate-limit-calculator) — calculate safe polling frequencies

---

## Conclusion

Cron expressions are the backbone of scheduled automation. A cron expression generator removes the guesswork, shows you the next execution times, and validates the output before you deploy.

**[Open the Cron Expression Generator →](/tools/cron-generator)**
