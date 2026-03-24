---
title: "Unix Timestamp Converter — Convert Timestamps to Human-Readable Dates"
description: "Unix timestamp converter — convert Unix timestamps to readable dates and vice versa instantly. Learn how Unix time works, common pitfalls, and how to handle timestamps in JavaScript, Python, and SQL."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["unix-timestamp", "datetime", "developer-tools", "online-tools", "javascript"]
readingTime: "7 min read"
faq:
  - question: "What is the Unix epoch?"
    answer: "The Unix epoch is January 1, 1970, at 00:00:00 UTC. All Unix timestamps count seconds (or milliseconds) from this moment."
  - question: "What is the Year 2038 problem?"
    answer: "32-bit systems store Unix timestamps as signed 32-bit integers. On January 19, 2038, at 03:14:07 UTC, the value overflows. Modern 64-bit systems do not have this issue."
  - question: "How do I get the current Unix timestamp in JavaScript?"
    answer: "Use Date.now() for milliseconds, or Math.floor(Date.now() / 1000) for seconds. Alternatively, +new Date() also returns milliseconds."
---

# Unix Timestamp Converter

A **Unix timestamp converter** turns a raw number like `1743811200` into a readable date like `2026-03-24 00:00:00 UTC` — or converts a date back into a timestamp for use in code, SQL queries, or API calls.

This guide explains how Unix time works, the common mistakes that cause off-by-one bugs and timezone confusion, and how to work with timestamps correctly in JavaScript, Python, and SQL.

---

## What Is a Unix Timestamp?

A Unix timestamp is the number of **seconds** elapsed since the Unix epoch: January 1, 1970, at 00:00:00 UTC.

```
Epoch:  1970-01-01 00:00:00 UTC  →  timestamp 0
Now:    2026-03-24 00:00:00 UTC  →  timestamp 1742774400 (approx)
```

The key properties:
- **Timezone-free** — a timestamp represents one absolute moment in time, regardless of timezone
- **Sortable** — comparing timestamps numerically gives chronological order
- **Universal** — every programming language and database understands Unix timestamps

### Seconds vs Milliseconds

JavaScript uses **milliseconds** by default. Most Unix tools use **seconds**. This is the source of endless bugs:

```javascript
Date.now()              // 1742774400000 (milliseconds — 13 digits)
Math.floor(Date.now() / 1000) // 1742774400 (seconds — 10 digits)
```

A quick way to tell: if the number is 13 digits, it is milliseconds. If it is 10 digits, it is seconds.

---

## Converting Timestamps in JavaScript

### Timestamp to Date

```javascript
// From Unix seconds
const timestamp = 1742774400;
const date = new Date(timestamp * 1000); // multiply by 1000 for milliseconds
console.log(date.toISOString());         // "2026-03-24T00:00:00.000Z"
console.log(date.toLocaleString());      // local timezone format

// Format as readable date
const options = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
};
console.log(new Intl.DateTimeFormat('en-US', options).format(date));
// "March 24, 2026 at 12:00 AM"
```

### Date to Timestamp

```javascript
// Current time in seconds
const nowSeconds = Math.floor(Date.now() / 1000);

// Specific date to timestamp
const specificDate = new Date('2026-03-24T00:00:00Z');
const timestamp = Math.floor(specificDate.getTime() / 1000);
console.log(timestamp); // 1742774400

// Set time in future (e.g., 7 days from now)
const sevenDaysFromNow = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
```

### Relative Time Display

```javascript
function timeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;

  const intervals = [
    { label: 'year',   seconds: 31536000 },
    { label: 'month',  seconds: 2592000 },
    { label: 'week',   seconds: 604800 },
    { label: 'day',    seconds: 86400 },
    { label: 'hour',   seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

timeAgo(1742774400); // "2 hours ago" (depends on current time)
```

---

## Converting Timestamps in Python

```python
import datetime
import time

# Current timestamp
now_seconds = int(time.time())
print(now_seconds)  # e.g., 1742774400

# Timestamp to datetime (UTC)
dt = datetime.datetime.fromtimestamp(1742774400, tz=datetime.timezone.utc)
print(dt.isoformat())  # "2026-03-24T00:00:00+00:00"
print(dt.strftime('%Y-%m-%d %H:%M:%S UTC'))  # "2026-03-24 00:00:00 UTC"

# Datetime to timestamp
target = datetime.datetime(2026, 3, 24, tzinfo=datetime.timezone.utc)
timestamp = int(target.timestamp())
print(timestamp)  # 1742774400

# Parse ISO 8601 string to timestamp
iso_string = "2026-03-24T12:30:00Z"
dt_parsed = datetime.datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
print(int(dt_parsed.timestamp()))
```

---

## Timestamps in SQL

```sql
-- PostgreSQL: current timestamp
SELECT EXTRACT(EPOCH FROM NOW())::INTEGER;  -- Unix seconds
SELECT NOW();                               -- timestamptz

-- Convert Unix seconds to timestamp
SELECT TO_TIMESTAMP(1742774400) AT TIME ZONE 'UTC';

-- Filter records by Unix timestamp stored as integer
SELECT * FROM events
WHERE created_at > EXTRACT(EPOCH FROM NOW()) - 86400;  -- last 24 hours

-- MySQL: current Unix timestamp
SELECT UNIX_TIMESTAMP();

-- MySQL: convert to datetime
SELECT FROM_UNIXTIME(1742774400);
SELECT FROM_UNIXTIME(1742774400, '%Y-%m-%d %H:%i:%s');

-- SQLite (stores as integer)
SELECT datetime(1742774400, 'unixepoch');
SELECT datetime(1742774400, 'unixepoch', 'localtime');
```

---

## Common Timestamp Bugs and How to Avoid Them

### Bug 1: Milliseconds vs Seconds Mismatch

```javascript
// WRONG: passing seconds to Date constructor (should be ms)
const date = new Date(1742774400);   // Year 1970 + 20 days
// CORRECT:
const date = new Date(1742774400 * 1000); // 2026-03-24
```

Always normalize: if you receive an unknown timestamp, check the number of digits:

```javascript
function toMilliseconds(ts) {
  // 10-digit = seconds, 13-digit = milliseconds
  return String(ts).length <= 10 ? ts * 1000 : ts;
}
```

### Bug 2: Timezone Confusion

`new Date(timestamp).toLocaleDateString()` converts to the browser's local timezone. Two users in different timezones see different dates for the same timestamp.

Always be explicit:

```javascript
// Always specify timezone
new Date(timestamp * 1000).toLocaleString('en-US', { timeZone: 'UTC' });

// ISO string is always UTC
new Date(timestamp * 1000).toISOString(); // "2026-03-24T00:00:00.000Z"
```

### Bug 3: DST Off-by-One-Hour

When converting dates to timestamps manually (instead of using `Date` or `datetime`), Daylight Saving Time transitions can shift times by an hour. Always use timezone-aware libraries rather than doing manual offset arithmetic.

---

## Timestamp Formats Reference

| Format | Example | Notes |
|--------|---------|-------|
| Unix seconds | `1742774400` | Standard across most APIs |
| Unix milliseconds | `1742774400000` | JavaScript default |
| ISO 8601 | `2026-03-24T00:00:00Z` | Best for storage and display |
| RFC 2822 | `Mon, 24 Mar 2026 00:00:00 +0000` | Email/HTTP headers |
| HTTP Date | `Mon, 24 Mar 2026 00:00:00 GMT` | `Date:` and `Last-Modified:` headers |

---

## Free Online Timestamp Converters

**[DevPlaybook Unix Timestamp Converter](https://devplaybook.cc/tools/unix-timestamp)** — Convert timestamps to dates and dates to timestamps in multiple timezones. Includes relative time display and format options.

For related time-format debugging, see also: [Converting Timestamps to Dates: Developer Cheatsheet](/blog/converting-timestamps-to-dates-developer-cheatsheet).

---

## Summary

Unix timestamps are simple in principle but cause bugs when you mix up seconds vs milliseconds, or ignore timezone conversions. Key rules:

- JavaScript uses **milliseconds** — multiply by 1000 or divide by 1000 when converting
- Always use **UTC** for storage; convert to local time only for display
- Use `toISOString()` for a portable, unambiguous date string
- Check the digit count to tell seconds from milliseconds (10 vs 13)

Use the **[DevPlaybook Unix Timestamp Converter](https://devplaybook.cc/tools/unix-timestamp)** for instant, multi-timezone conversions.

---

## Automate Your Dev Workflow

The **[Developer Productivity Bundle](https://vicnail.gumroad.com/l/dev-productivity-bundle?utm_source=devplaybook&utm_medium=blog&utm_campaign=timestamp-article)** includes shell productivity functions for date/time operations, plus 51 VSCode snippets covering common JavaScript patterns. $29, one-time.
