---
title: "Cron Expression Generator: Schedule Jobs with Cron Syntax"
description: "Generate and validate cron expressions online for free. Learn cron syntax, common scheduling patterns, and how to schedule jobs in Linux, Docker, and cloud platforms."
date: "2026-03-24"
tags: ["cron", "cron-generator", "scheduling", "developer-tools", "devops"]
readingTime: "10 min read"
---

Cron is one of the most enduring pieces of Unix infrastructure. First appearing in Unix Version 7 in 1979, cron (short for "chronos", the Greek word for time) has been scheduling background jobs for over four decades. Today, cron expressions power everything from Linux system tasks to Kubernetes CronJobs, GitHub Actions schedules, AWS EventBridge rules, and cloud function triggers.

The syntax is compact and expressive, but it's also cryptic enough that even experienced developers reach for a reference every time they need to write one. This guide covers cron syntax from the ground up, explains common scheduling patterns, and shows you how to use a cron expression generator to build and validate expressions without memorizing the spec.

## What Is Cron?

Cron is a time-based job scheduler. You define a schedule as a cron expression (a string of five or six fields), associate it with a command, and cron runs that command automatically at every matching time.

The most common use cases:

- **System maintenance** — clean up temp files, rotate logs, run backups
- **Scheduled reports** — generate and email daily/weekly reports
- **Data pipelines** — pull data from APIs, sync databases, run ETL jobs
- **Health checks** — ping services and alert if they don't respond
- **Cache warming** — pre-populate caches before peak traffic hours
- **Certificate renewal** — Let's Encrypt certbot runs as a cron job
- **CI/CD triggers** — nightly builds, scheduled test runs

## Cron Expression Syntax

A standard cron expression has five fields:

```
┌───────────── minute (0–59)
│ ┌───────────── hour (0–23)
│ │ ┌───────────── day of month (1–31)
│ │ │ ┌───────────── month (1–12 or JAN–DEC)
│ │ │ │ ┌───────────── day of week (0–7, where 0 and 7 are Sunday, or SUN–SAT)
│ │ │ │ │
* * * * *  command
```

Many modern systems (Quartz scheduler, AWS, some Linux cron variants) add a sixth field for seconds:

```
┌─────────────── second (0–59)
│ ┌───────────── minute (0–59)
│ │ ┌───────────── hour (0–23)
│ │ │ ┌───────────── day of month (1–31)
│ │ │ │ ┌───────────── month (1–12)
│ │ │ │ │ ┌───────────── day of week (0–7)
│ │ │ │ │ │
* * * * * *  command
```

### Special Characters

| Character | Meaning | Example |
|-----------|---------|---------|
| `*` | Every value | `* * * * *` — every minute |
| `,` | List of values | `1,15,30` — at minutes 1, 15, and 30 |
| `-` | Range | `9-17` — hours 9 through 17 |
| `/` | Step/interval | `*/15` — every 15 units |
| `L` | Last (some implementations) | `L` in day-of-month = last day of month |
| `W` | Nearest weekday (Quartz) | `15W` = nearest weekday to the 15th |
| `#` | Nth weekday (Quartz) | `2#3` = third Tuesday |
| `?` | No specific value (Quartz) | Used when specifying day-of-month OR day-of-week |

### Step Values

The `/` operator creates repeating intervals:

```
*/5  — every 5 units (0, 5, 10, 15, ...)
0/5  — same thing (explicit start at 0)
1/5  — 1, 6, 11, 16, ... (start at 1)
10/5 — 10, 15, 20, ... (start at 10)
```

You can combine `/` with ranges:

```
0-30/5  — every 5 minutes within the first 30 minutes of the hour
```

## Common Cron Expression Patterns

### Basic Schedules

```bash
# Every minute
* * * * *

# Every hour (at :00)
0 * * * *

# Every day at midnight
0 0 * * *

# Every day at noon
0 12 * * *

# Every day at 2:30 AM
30 2 * * *

# Every Sunday at midnight
0 0 * * 0

# Every Monday at 9 AM
0 9 * * 1

# First day of every month at midnight
0 0 1 * *

# Last day of every month (non-standard, depends on implementation)
0 0 28-31 * * test $(date -d tomorrow +%d) -eq 1 && command
```

### Interval Schedules

```bash
# Every 5 minutes
*/5 * * * *

# Every 15 minutes
*/15 * * * *

# Every 30 minutes
*/30 * * * *

# Every 2 hours
0 */2 * * *

# Every 6 hours (at midnight, 6 AM, noon, 6 PM)
0 0,6,12,18 * * *
# or equivalently:
0 */6 * * *

# Every 12 hours (midnight and noon)
0 0,12 * * *
```

### Day-Specific Schedules

```bash
# Weekdays only at 9 AM
0 9 * * 1-5

# Weekdays only at 9 AM and 5 PM
0 9,17 * * 1-5

# Weekends only at noon
0 12 * * 0,6

# Monday, Wednesday, Friday at 8 AM
0 8 * * 1,3,5

# Every Tuesday and Thursday at 3 PM
0 15 * * 2,4
```

### Monthly Schedules

```bash
# First of every month at midnight
0 0 1 * *

# 15th of every month at noon
0 12 15 * *

# First Monday of every month (requires day-of-week with specific month day)
0 9 1-7 * 1

# Every quarter (January, April, July, October)
0 0 1 1,4,7,10 *

# First of January (yearly)
0 0 1 1 *
```

### Business-Oriented Schedules

```bash
# Business hours check every 5 minutes, weekdays 8 AM–6 PM
*/5 8-18 * * 1-5

# Daily report at end of business day (5 PM weekdays)
0 17 * * 1-5

# Weekly digest every Monday morning at 7 AM
0 7 * * 1

# Monthly invoice on the 1st at 8 AM
0 8 1 * *

# Quarterly summary on the 1st of each quarter at midnight
0 0 1 1,4,7,10 *
```

## Cron on Different Platforms

### Linux (crontab)

Edit your crontab with `crontab -e`. Each line follows the standard 5-field format:

```bash
# Run a backup script daily at 2 AM
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# Clean temp files every Sunday at 3 AM
0 3 * * 0 find /tmp -mtime +7 -delete

# Check disk usage every hour and alert if >90%
0 * * * * /usr/local/bin/check_disk.sh
```

Key tips for Linux cron:
- Always use absolute paths in cron commands — cron runs with a minimal environment
- Redirect output to a log file or `/dev/null` to avoid email accumulation
- Test your command manually before scheduling it
- Use `MAILTO=""` to suppress emails if you're logging to files

```bash
# Useful crontab header
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""

# Your jobs below
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

### System Cron (`/etc/cron.d/`)

For system-level jobs, drop a file in `/etc/cron.d/` with a username field:

```bash
# /etc/cron.d/my-service
0 2 * * * root /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

### Docker / Kubernetes CronJob

Kubernetes CronJobs use standard 5-field cron syntax:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-report
spec:
  schedule: "0 9 * * 1-5"   # Weekdays at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: reporter
            image: my-reporter:latest
          restartPolicy: OnFailure
```

Key Kubernetes considerations:
- Times are in UTC
- Use `concurrencyPolicy: Forbid` to prevent overlapping job runs
- Set `successfulJobsHistoryLimit` and `failedJobsHistoryLimit` to avoid accumulating completed pods

### GitHub Actions

```yaml
on:
  schedule:
    - cron: '0 9 * * 1-5'  # Weekdays at 9 AM UTC
    - cron: '0 0 * * 0'    # Every Sunday at midnight UTC
```

Note: GitHub Actions schedules are in UTC. There's a known delay during high-load periods — the job may run several minutes after the scheduled time.

### AWS EventBridge (CloudWatch Events)

AWS supports two formats — cron and rate expressions:

```
# Cron format (AWS uses 6 fields with year)
cron(0 9 * * ? *)    # Every day at 9 AM UTC
cron(0 9 ? * MON-FRI *)  # Weekdays at 9 AM UTC

# Rate format (simpler for intervals)
rate(5 minutes)
rate(1 hour)
rate(7 days)
```

AWS-specific quirks:
- The day-of-week and day-of-month fields can't both be specified — use `?` for one of them
- Year field is required (use `*` for any year)
- Uses `MON-FRI` style names for days

### Heroku Scheduler

Heroku's scheduler supports only three frequency options (not full cron syntax): every 10 minutes, hourly, or daily. For more complex schedules, you need a third-party add-on.

## Common Cron Mistakes

### Off-by-One on Day of Week

Different implementations number days of the week differently. Linux cron: Sunday = 0 or 7, Monday = 1. Quartz: Sunday = 1, Saturday = 7. Always verify using a cron validator before deploying.

### UTC vs Local Time Confusion

Most cron environments run in UTC. If you want a job at "9 AM local time" and your server is in UTC+8, you need to schedule it at `0 1 * * *` (1 AM UTC). Forgetting this leads to jobs running at wrong hours, especially around daylight saving time transitions.

### Missing Absolute Paths

```bash
# WRONG — cron has minimal PATH, 'node' may not be found
0 2 * * * node /app/scripts/report.js

# CORRECT — use absolute path
0 2 * * * /usr/local/bin/node /app/scripts/report.js

# Also correct — set PATH in crontab header
PATH=/usr/local/bin:/usr/bin:/bin
0 2 * * * node /app/scripts/report.js
```

### Concurrent Job Accumulation

If your job takes longer than its schedule interval, you'll get multiple instances running simultaneously, potentially causing race conditions, resource exhaustion, or data corruption.

Solutions:
- Use a lock file: `flock -n /tmp/myjob.lock /usr/local/bin/myjob.sh`
- Use `chronic` from `moreutils` to suppress output unless there's an error
- For Kubernetes, set `concurrencyPolicy: Forbid`

### Swallowed Errors

```bash
# WRONG — errors are silently discarded
0 2 * * * /usr/local/bin/backup.sh > /dev/null 2>&1

# BETTER — log both stdout and stderr
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# BEST — use chronic to only email/log on error
0 2 * * * chronic /usr/local/bin/backup.sh
```

### Day-of-Month AND Day-of-Week

When both fields are specified (not `*`), cron runs the job when either condition is true — not both:

```bash
# WRONG if you want "first Monday of the month"
# This runs on the 1st of every month AND every Monday
0 9 1 * 1

# CORRECT approach — check in the script itself
0 9 1-7 * 1  # Run on Mon within first 7 days, then check in script
```

## Cron Expression Validation

Before deploying a cron expression, validate it to confirm it behaves as expected. The key questions:

1. When will it first run?
2. What are the next 5-10 execution times?
3. Does it run at the right frequency?
4. Does it handle month-end edge cases correctly?

Validating manually is error-prone. Use a generator/validator to see the next N execution times and confirm they match your intent.

## FAQ

**Q: What's the difference between `*/5` and `0/5`?**

In standard cron, they're equivalent — both mean "every 5 units starting from 0." In some implementations, `0/5` is more explicit about the starting point, while `*/5` means "every 5th value of the full range." For practical purposes, they produce identical results for the minute and hour fields.

**Q: How do I run a job every 30 seconds?**

Standard cron doesn't support sub-minute scheduling. The workaround is two cron jobs with a 30-second sleep in the second:

```bash
* * * * * /usr/local/bin/myjob.sh
* * * * * sleep 30 && /usr/local/bin/myjob.sh
```

For true sub-minute scheduling, consider systemd timers, a task queue (Celery, Sidekiq), or a purpose-built scheduler.

**Q: How do I schedule a job for the last day of the month?**

Standard cron can't directly express "last day of month" in a portable way. The most common solution:

```bash
# Run on 28th-31st and check if tomorrow is the 1st
0 23 28-31 * * [ "$(date -d tomorrow +\%d)" = "01" ] && /usr/local/bin/end_of_month.sh
```

Quartz cron supports the `L` character for this: `0 23 L * ?`

**Q: Are cron expressions the same everywhere?**

No — this is a constant source of confusion. The standard 5-field cron syntax is widely supported, but extensions vary:
- Quartz (Java): 6 fields with seconds, plus `L`, `W`, `#`, `?`
- AWS EventBridge: 6 fields with year, different day-of-week handling
- Jenkins: supports `H` for "hash" to distribute jobs
- Some systems: `@reboot`, `@daily`, `@weekly` shortcuts

Always check the docs for the specific platform you're using.

**Q: What does `@reboot` mean?**

`@reboot` is a cron shorthand that runs a command once when the cron daemon starts (typically at system boot). Other shorthands: `@hourly`, `@daily`, `@weekly`, `@monthly`, `@yearly`.

---

## Build Your Cron Expression in Seconds

Staring at five blank fields trying to remember whether day-of-week goes in the 5th or 6th position? Stop guessing. The **[DevPlaybook Cron Expression Generator](https://devplaybook.cc/tools/cron-generator)** lets you build cron expressions interactively and see the next 10 execution times instantly — so you can confirm your schedule is exactly right before deploying.

Select your frequency, adjust the fields, and the expression updates in real time. No memorization required, no risk of deploying a job that runs every minute when you meant every hour.

**[Open Cron Expression Generator →](https://devplaybook.cc/tools/cron-generator)**

Whether you're scheduling a Kubernetes CronJob, a GitHub Actions workflow, a Linux crontab entry, or an AWS EventBridge rule, get the expression right the first time.
