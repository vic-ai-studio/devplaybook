---
title: "Cron Expression Generator Online: Build Cron Schedules Visually Free"
description: "Generate cron expressions online for free. Build Linux cron schedules visually, validate cron syntax, and understand every field. Supports 5-field and 6-field cron formats."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["cron", "scheduler", "generator", "devops", "automation", "linux", "developer-tools"]
readingTime: "6 min read"
---

# Cron Expression Generator Online: Build Cron Schedules Visually Free

Cron expressions are powerful but notoriously hard to write from memory. A cron expression generator lets you click through the options visually — choose the interval, pick specific days or hours, add exceptions — and get the correct expression string without needing to memorize syntax or count fields.

---

## What Is a Cron Expression?

A cron expression is a string that defines when a scheduled task should run. It originated on Unix/Linux systems and is now used in cloud functions, CI/CD pipelines, job schedulers, Kubernetes, and application backends.

The classic 5-field cron format:

```
┌─────────── minute       (0-59)
│ ┌───────── hour         (0-23)
│ │ ┌─────── day of month (1-31)
│ │ │ ┌───── month        (1-12 or JAN-DEC)
│ │ │ │ ┌─── day of week  (0-6, Sun=0, or SUN-SAT)
│ │ │ │ │
* * * * *
```

**Examples:**

```
0 * * * *        Every hour at minute 0
0 9 * * 1-5      Every weekday at 9:00 AM
30 2 * * 0       Every Sunday at 2:30 AM
0 0 1 * *        First day of every month at midnight
*/15 * * * *     Every 15 minutes
0 0,12 * * *     Every day at midnight and noon
```

**Try it now:** [DevPlaybook Cron Expression Generator](https://devplaybook.cc/tools/cron-generator) — select your schedule visually and get the correct cron expression instantly.

---

## Why Use a Cron Generator?

### Avoid Syntax Errors
The most common cron mistake is getting the field order wrong. A generator handles the field mapping — you can't mix up minute and hour if you're clicking sliders.

### Handle Edge Cases
Complex expressions like "every 15 minutes on weekdays between 8 AM and 6 PM" are tricky to write manually but easy to build visually.

### Validate Existing Expressions
Paste an existing cron expression to verify what it actually runs and when the next execution will be.

### Understand Variations
Different systems use different cron formats (5-field, 6-field with seconds, Quartz scheduler format). A generator clarifies which fields apply to your environment.

---

## Cron Field Reference

### Special Characters

| Character | Meaning | Example |
|-----------|---------|---------|
| `*` | Every value | `*` in minute = every minute |
| `,` | List of values | `1,3,5` in hour = 1 AM, 3 AM, 5 AM |
| `-` | Range of values | `9-17` in hour = 9 AM to 5 PM |
| `/` | Step values | `*/15` = every 15 units; `0/30` = every 30 from 0 |
| `L` | Last | `L` in day of month = last day of month |
| `W` | Nearest weekday | `15W` = nearest weekday to the 15th |
| `#` | Nth occurrence | `2#3` = 3rd Tuesday |

### Month Names and Day Names

You can use names instead of numbers:

```
# Months
JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC

# Days of week
SUN MON TUE WED THU FRI SAT

# Examples
0 9 * JAN MON     Every Monday in January at 9 AM
0 0 1 * MON       1st of month OR every Monday (ambiguous — use one)
```

---

## Common Cron Schedule Examples

```bash
# System maintenance
0 2 * * *           Every day at 2 AM
0 2 * * 0           Every Sunday at 2 AM
0 2 1 * *           First day of month at 2 AM

# Development workflows
*/5 * * * *         Every 5 minutes (health checks, polling)
0 */2 * * *         Every 2 hours
0 9-17 * * 1-5      Every hour, 9 AM to 5 PM, weekdays only

# Reports and batch jobs
0 8 * * 1           Monday morning report (8 AM)
0 23 * * *          End-of-day processing (11 PM)
0 0 * * 1           Weekly job every Monday at midnight

# Deployments
0 4 * * 3           Wednesday 4 AM deployment window
0 22 * * 5          Friday 10 PM release train

# Database operations
30 1 * * *          1:30 AM daily backup
0 0 1,15 * *        1st and 15th of month database maintenance
```

---

## How to Use a Cron Expression Generator Online

1. **Open** [DevPlaybook Cron Expression Generator](https://devplaybook.cc/tools/cron-generator)
2. **Select your frequency** — minutely, hourly, daily, weekly, monthly, yearly, or custom
3. **Configure the options** — pick specific hours, days, months as needed
4. **Copy the generated expression** — it updates in real time
5. **Verify the next run times** — the tool shows the next 5 executions

---

## Cron in Different Environments

### Linux Crontab (5-field)

```bash
# Edit crontab
crontab -e

# Format: minute hour day month weekday command
0 2 * * * /home/user/backup.sh
*/15 * * * * /usr/bin/python3 /home/user/poll.py

# View current crontab
crontab -l
```

### AWS CloudWatch Events / EventBridge (Cron with year)

AWS uses a 6-field format with a **year** field at the end and no seconds:

```
# AWS Cron Format: minute hour day month weekday year
cron(0 20 * * ? *)        Every day at 8 PM UTC
cron(0 10 ? * MON-FRI *)  Every weekday at 10 AM UTC
cron(0 0 1 1 ? *)         January 1st at midnight UTC
```

Note: AWS requires either `?` in day-of-month OR day-of-week, not both specified.

### GitHub Actions

```yaml
on:
  schedule:
    - cron: '0 2 * * *'     # Every day at 2 AM UTC
    - cron: '0 8 * * 1-5'   # Weekdays at 8 AM UTC
```

### Node.js (node-cron)

```javascript
import cron from 'node-cron';

// Every minute
cron.schedule('* * * * *', () => {
  console.log('Running every minute');
});

// Every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  await runDailyBackup();
});
```

### Python (APScheduler / Celery Beat)

```python
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler.add_job(my_job, 'cron', hour=2, minute=0)  # 2:00 AM daily
scheduler.add_job(my_job, 'cron', day_of_week='mon-fri', hour=9)  # Weekdays 9 AM
scheduler.start()
```

### Kubernetes CronJobs

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-cleanup
spec:
  schedule: "0 2 * * *"   # Every day at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: busybox
            command: ["sh", "-c", "echo Cleanup done"]
```

---

## Common Cron Pitfalls

### Timezone Confusion

Cron expressions run in the server's system timezone by default. If your server is in UTC but your business logic expects local time, add 8 hours (or however many) to your cron times.

**Fix:** Set the timezone explicitly in your environment or use a scheduler that supports timezone-aware scheduling.

### Day of Month vs Day of Week

Using both `day-of-month` and `day-of-week` with non-`*` values means "OR" in most systems — the job runs if either condition is true, not both.

```
0 0 15 * 1     Runs on the 15th OR every Monday (not both)
```

### Cron Resolution

Standard cron has minute resolution. If you need sub-minute scheduling (every 30 seconds), cron isn't the right tool — use a job queue (Bull, Celery) or a timer-based solution.

---

## Frequently Asked Questions

### How do I run a job every 30 seconds with cron?

You can't — standard cron only resolves to the minute level. Run the job every minute and add a `sleep 30` inside your script to run the second execution, or use a job queue library.

### What's the cron expression for "every day at midnight"?

`0 0 * * *` — minute 0, hour 0, every day, every month, every day of week.

### How do I run a cron job only on business days?

```
0 9 * * 1-5    Every weekday (Mon=1, Fri=5) at 9 AM
```

This doesn't account for holidays — that logic belongs in your application.

### Why isn't my cron job running?

Common reasons: wrong timezone (expected local time, cron is UTC), cron syntax error, the cron daemon isn't running (`systemctl status cron`), or the script lacks execute permissions. Check `/var/log/syslog` or `journalctl -u cron` for cron execution logs.

### What's the maximum cron precision in GitHub Actions?

GitHub Actions cron has approximately 5-minute delay from the scheduled time, not exact to the minute. For precision timing in CI/CD, use a dedicated scheduler or trigger webhooks from an external service.

---

## Related Tools

- [Timestamp Converter](https://devplaybook.cc/tools/unix-timestamp) — convert timestamps to understand when your cron jobs ran
- [JSON Formatter](https://devplaybook.cc/tools/json-formatter) — format cron job output stored as JSON
- [UUID Generator](https://devplaybook.cc/tools/uuid-generator) — generate unique job IDs for cron-initiated tasks
