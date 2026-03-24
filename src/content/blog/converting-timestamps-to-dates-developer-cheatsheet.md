---
title: "Converting Timestamps to Dates: A Developer Cheatsheet"
description: "Master Unix timestamp conversion. Learn how to convert timestamps to human-readable dates in JavaScript, Python, Go, and more — with a practical developer cheatsheet."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["timestamps", "unix-timestamp", "developer-tools", "datetime", "cheatsheet"]
readingTime: "10 min read"
---

Unix timestamps appear everywhere in software: database records, API responses, log files, JWT tokens, webhooks, and file systems. They're precise, timezone-agnostic, and easy to compare. They're also completely unreadable to humans.

This guide covers everything a developer needs to know about timestamp conversion: what Unix timestamps are, how to convert them in any language, timezone handling, common pitfalls, and quick reference for the most common operations.

---

## What Is a Unix Timestamp?

A Unix timestamp (also called Epoch time or POSIX time) is the number of seconds that have elapsed since the Unix Epoch: **January 1, 1970, 00:00:00 UTC**.

Examples:
- `0` → 1970-01-01 00:00:00 UTC
- `1000000000` → 2001-09-09 01:46:40 UTC
- `1711324800` → 2024-03-25 00:00:00 UTC

Unix timestamps:
- Are always in UTC (no timezone confusion)
- Are easy to store (a single integer)
- Are easy to compare (larger = later)
- Don't care about calendar conventions (leap years, DST)

Use the [Unix Timestamp Converter](/tools/unix-timestamp) on DevPlaybook to convert any timestamp to a human-readable date — and back.

---

## Milliseconds vs. Seconds: The Critical Distinction

Modern systems often use **millisecond** precision rather than second precision:

- **Seconds**: `1711324800` (10 digits)
- **Milliseconds**: `1711324800000` (13 digits)
- **Microseconds**: `1711324800000000` (16 digits)
- **Nanoseconds**: `1711324800000000000` (19 digits)

**How to tell which you have:**
- 10 digits → seconds (current epoch is around 1.7 billion)
- 13 digits → milliseconds
- 16 digits → microseconds
- 19 digits → nanoseconds

A common bug: treating a millisecond timestamp as seconds, which gives a date far in the future (year 55,000+).

```javascript
// Bug: millisecond timestamp treated as seconds
new Date(1711324800000 * 1000) // Wrong! Year 55,000+

// Correct
new Date(1711324800000) // JavaScript uses milliseconds
new Date(1711324800 * 1000) // Convert seconds to milliseconds
```

---

## Quick Reference: Timestamp Conversion by Language

### JavaScript

```javascript
// Current timestamp
const nowSeconds = Math.floor(Date.now() / 1000);
const nowMs = Date.now();

// Seconds timestamp → Date object
const date = new Date(1711324800 * 1000);

// Milliseconds timestamp → Date object
const date = new Date(1711324800000);

// Date → formatted string
const date = new Date(1711324800 * 1000);
date.toISOString();           // "2024-03-25T00:00:00.000Z"
date.toLocaleDateString();    // "3/25/2024" (locale-dependent)
date.toLocaleString('en-US', { timeZone: 'America/New_York' });

// Date → timestamp
const ts = Math.floor(date.getTime() / 1000); // seconds
const tsMs = date.getTime();                   // milliseconds

// Specific date → timestamp
const date = new Date('2024-03-25T00:00:00Z');
const ts = Math.floor(date.getTime() / 1000);
```

**Format with Intl.DateTimeFormat:**
```javascript
const formatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC'
});
formatter.format(new Date(1711324800 * 1000));
// "March 25, 2024 at 12:00 AM"
```

### Python

```python
from datetime import datetime, timezone, timedelta

# Current timestamp
now_ts = datetime.now(timezone.utc).timestamp()  # float, seconds
import time
now_ts_int = int(time.time())  # integer seconds

# Seconds → datetime (UTC)
dt = datetime.fromtimestamp(1711324800, tz=timezone.utc)

# Milliseconds → datetime
dt = datetime.fromtimestamp(1711324800000 / 1000, tz=timezone.utc)

# datetime → timestamp (seconds)
ts = int(dt.timestamp())

# Format
dt.strftime('%Y-%m-%d %H:%M:%S %Z')     # "2024-03-25 00:00:00 UTC"
dt.isoformat()                           # "2024-03-25T00:00:00+00:00"

# Specific datetime → timestamp
dt = datetime(2024, 3, 25, 0, 0, 0, tzinfo=timezone.utc)
ts = int(dt.timestamp())  # 1711324800

# Timezone conversion
from zoneinfo import ZoneInfo  # Python 3.9+
ny_tz = ZoneInfo('America/New_York')
dt_ny = dt.astimezone(ny_tz)
print(dt_ny.strftime('%Y-%m-%d %H:%M:%S %Z'))  # "2024-03-24 20:00:00 EDT"
```

**Using dateutil (for parsing):**
```python
from dateutil import parser

dt = parser.parse("2024-03-25T00:00:00Z")
ts = int(dt.timestamp())
```

### Go

```go
import "time"

// Current timestamp
nowTs := time.Now().Unix()       // seconds
nowTsMs := time.Now().UnixMilli() // milliseconds

// Seconds → Time
t := time.Unix(1711324800, 0)
t.UTC() // ensure UTC

// Milliseconds → Time
t := time.UnixMilli(1711324800000)

// Time → timestamp
ts := t.Unix()        // seconds
tsMs := t.UnixMilli() // milliseconds

// Format
t.Format(time.RFC3339)              // "2024-03-25T00:00:00Z"
t.Format("2006-01-02 15:04:05")    // "2024-03-25 00:00:00"
t.In(time.UTC).Format(time.RFC3339) // force UTC

// Parse specific date
t, err := time.Parse(time.RFC3339, "2024-03-25T00:00:00Z")
ts := t.Unix()

// Timezone
loc, _ := time.LoadLocation("America/New_York")
t.In(loc).Format("2006-01-02 15:04:05 MST")
```

**Note:** Go's reference time is `Mon Jan 2 15:04:05 MST 2006` — this specific date is used as a template.

### Rust

```rust
use std::time::{SystemTime, UNIX_EPOCH};

// Current timestamp
let ts = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_secs();

// With chrono crate
use chrono::{DateTime, Utc, TimeZone};

let dt: DateTime<Utc> = Utc.timestamp_opt(1711324800, 0).unwrap();
let formatted = dt.format("%Y-%m-%d %H:%M:%S").to_string();
let ts = dt.timestamp();
```

### SQL

```sql
-- PostgreSQL
-- Timestamp → human date
SELECT to_timestamp(1711324800);
-- "2024-03-25 00:00:00+00"

-- Current timestamp (seconds)
SELECT EXTRACT(EPOCH FROM NOW())::INTEGER;

-- Specific date → timestamp
SELECT EXTRACT(EPOCH FROM '2024-03-25 00:00:00 UTC'::TIMESTAMP WITH TIME ZONE)::INTEGER;

-- MySQL
SELECT FROM_UNIXTIME(1711324800);
-- "2024-03-25 00:00:00"

SELECT UNIX_TIMESTAMP('2024-03-25 00:00:00');
-- 1711324800

-- SQLite
SELECT datetime(1711324800, 'unixepoch');
-- "2024-03-25 00:00:00"
```

### Bash/Shell

```bash
# Current timestamp
date +%s

# Seconds → human date
date -d @1711324800          # Linux
date -r 1711324800           # macOS

# Specific date → timestamp
date -d "2024-03-25 00:00:00 UTC" +%s  # Linux
date -j -f "%Y-%m-%d %H:%M:%S" "2024-03-25 00:00:00" +%s  # macOS
```

---

## Timezone Handling

Timezone handling is where most timestamp bugs hide. The golden rule:

> **Store timestamps in UTC. Convert to local time only for display.**

### Common Timezone Mistakes

**Mistake 1: Creating a datetime without a timezone**

```python
# Wrong — timezone-naive datetime
dt = datetime(2024, 3, 25, 0, 0, 0)
dt.timestamp()  # Depends on system timezone!

# Correct — always specify UTC
dt = datetime(2024, 3, 25, 0, 0, 0, tzinfo=timezone.utc)
dt.timestamp()  # Always correct
```

**Mistake 2: Using local time in JavaScript**

```javascript
// Wrong — interprets as local time
new Date('2024-03-25').getTime() / 1000
// Result varies by system timezone

// Correct — explicit UTC
new Date('2024-03-25T00:00:00Z').getTime() / 1000
// Always 1711324800
```

**Mistake 3: Ignoring Daylight Saving Time**

DST causes clocks to shift, which means some "times" don't exist (spring forward) or occur twice (fall back). UTC never has DST.

```python
# A time that may not exist in some timezones
from zoneinfo import ZoneInfo
la_tz = ZoneInfo('America/Los_Angeles')

# 2024-03-10 02:30:00 doesn't exist in LA (clocks jump from 2:00 to 3:00)
dt = datetime(2024, 3, 10, 2, 30, 0, tzinfo=la_tz)
# Python handles this, but behavior may not be what you expect
```

**Best practice:** Always work with UTC internally. Convert to local timezone at the presentation layer.

---

## JWT Token Timestamps

JWT tokens use Unix timestamps for `iat` (issued at), `exp` (expiration), and `nbf` (not before):

```json
{
  "sub": "user-123",
  "iat": 1711324800,
  "exp": 1711328400,
  "nbf": 1711324800
}
```

Convert these to readable dates to debug auth issues:

```javascript
const iat = new Date(1711324800 * 1000).toISOString();
// "2024-03-25T00:00:00.000Z"

const exp = new Date(1711328400 * 1000).toISOString();
// "2024-03-25T01:00:00.000Z" — token expires after 1 hour
```

Use the [JWT Decoder](/tools/jwt-decoder) to automatically decode JWT timestamps in a readable format.

---

## Log File Timestamps

Log files often include timestamps in various formats. Here's a quick reference for parsing common ones:

**ISO 8601** (most common in modern systems):
```
2024-03-25T00:00:00.000Z
2024-03-25T00:00:00+05:30
```

**Unix timestamp** (common in structured logging):
```
1711324800
1711324800.123
```

**Custom formats** (legacy systems):
```
25/Mar/2024:00:00:00 +0000  (nginx/Apache)
Mar 25 00:00:00              (syslog)
2024-03-25 00:00:00.000     (many databases)
```

Parse these with care — always determine the timezone before converting.

---

## Timestamp Arithmetic

Calculating time differences and offsets is a frequent need:

```javascript
// JavaScript: time difference
const start = 1711324800;
const end = 1711411200;
const diffSeconds = end - start;       // 86400
const diffHours = diffSeconds / 3600;  // 24
const diffDays = diffSeconds / 86400;  // 1

// Add 7 days to a timestamp
const oneWeekLater = 1711324800 + (7 * 24 * 60 * 60);

// Check if timestamp is in the past
const isExpired = timestamp < Math.floor(Date.now() / 1000);
```

```python
# Python: time difference
from datetime import datetime, timedelta, timezone

dt = datetime.fromtimestamp(1711324800, tz=timezone.utc)
dt_plus_7_days = dt + timedelta(days=7)
ts_plus_7_days = int(dt_plus_7_days.timestamp())

# Duration in human-readable form
duration = timedelta(seconds=86400)
print(str(duration))  # "1 day, 0:00:00"
```

---

## Epoch Time Reference Table

| Timestamp | Date (UTC) |
|-----------|-----------|
| `0` | 1970-01-01 00:00:00 |
| `315532800` | 1980-01-01 00:00:00 |
| `631152000` | 1990-01-01 00:00:00 |
| `946684800` | 2000-01-01 00:00:00 |
| `1000000000` | 2001-09-09 01:46:40 |
| `1262304000` | 2010-01-01 00:00:00 |
| `1500000000` | 2017-07-14 02:40:00 |
| `1609459200` | 2021-01-01 00:00:00 |
| `1700000000` | 2023-11-14 22:13:20 |
| `2000000000` | 2033-05-18 03:33:20 |
| `2147483647` | 2038-01-19 03:14:07 (32-bit max) |
| `4102444800` | 2100-01-01 00:00:00 |

**The Year 2038 Problem**: 32-bit signed integers can only hold timestamps up to 2,147,483,647 (January 19, 2038). Systems that store timestamps in 32-bit integers will overflow. Modern systems use 64-bit integers, which won't overflow for billions of years.

---

## Tools for Timestamp Conversion

| Task | Tool |
|------|------|
| Convert Unix timestamp to date | [Unix Timestamp Converter](/tools/unix-timestamp) |
| Convert between timezones | [Timezone Converter](/tools/timezone-converter) |
| Decode JWT timestamps | [JWT Decoder](/tools/jwt-decoder) |
| Generate Unix timestamp for a date | [Unix Timestamp Converter](/tools/unix-timestamp) |

---

## Quick Cheatsheet

```
Current timestamp (seconds):
  JS:     Math.floor(Date.now() / 1000)
  Python: int(time.time())
  Go:     time.Now().Unix()
  Bash:   date +%s

Timestamp → Date:
  JS:     new Date(ts * 1000).toISOString()
  Python: datetime.fromtimestamp(ts, tz=timezone.utc)
  Go:     time.Unix(ts, 0).UTC()
  SQL:    to_timestamp(ts)  (PostgreSQL)

Date → Timestamp:
  JS:     Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000)
  Python: int(datetime(2024,1,1, tzinfo=timezone.utc).timestamp())
  Go:     time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC).Unix()
  SQL:    EXTRACT(EPOCH FROM '2024-01-01 UTC'::TIMESTAMPTZ)::INT

Milliseconds (JS):
  Date.now()
  new Date(ts_ms).toISOString()
  date.getTime()
```

---

## Summary

Unix timestamps are the universal currency of time in software. Key takeaways:

- Count seconds (or milliseconds) since 1970-01-01 UTC
- Check digit count to distinguish seconds (10), milliseconds (13), microseconds (16)
- Always store and work in UTC — convert to local time only for display
- Use the [Unix Timestamp Converter](/tools/unix-timestamp) for quick conversions
- Watch out for the year 2038 problem in legacy systems using 32-bit integers

Timestamp handling is deceptively simple on the surface and consistently tricky in practice. When in doubt: use UTC, use 64-bit integers, and convert at the display layer.
