---
title: "JavaScript Temporal API 2026: Modern Date and Time Handling"
description: "Complete guide to the JavaScript Temporal API replacing the broken Date object. Time zones, calendar support, durations, and practical examples for modern date/time handling."
date: "2026-03-28"
tags: [javascript, temporal-api, date-time, web-development, ecmascript]
readingTime: "10 min read"
---

JavaScript's `Date` object has been a persistent source of bugs, confusion, and workarounds since the language's earliest days. In 2026, the Temporal API — a TC39 proposal that reached Stage 4 finalization — is shipping natively across major environments, providing a comprehensive, immutable, and timezone-aware date/time system. This guide covers everything you need to know to adopt Temporal in production code today.

## Why the JavaScript Date Object Is Broken

Before diving into Temporal, it helps to understand exactly why `Date` fails developers repeatedly.

### Mutability Causes Silent Bugs

The `Date` object is mutable. Any function that receives a `Date` can modify it without warning:

```js
const start = new Date("2026-01-15");
function addDays(date, n) {
  date.setDate(date.getDate() + n); // mutates the original
  return date;
}

const end = addDays(start, 30);
console.log(start.toISOString()); // "2026-02-14T00:00:00.000Z" — start was destroyed
console.log(end.toISOString());   // "2026-02-14T00:00:00.000Z"
```

This pattern forces developers to clone dates defensively, adding ceremony without clarity.

### Months Are Zero-Indexed

`Date` uses 0-indexed months, a design decision that causes off-by-one errors constantly:

```js
const date = new Date(2026, 2, 15); // March 15, not February
// Month 0 = January, 11 = December
// Every single month operation needs a mental -1 or +1 adjustment
```

### No Time Zone Support

`Date` stores a Unix timestamp internally and exposes local time through the host system's settings. There is no way to represent a date in a specific named time zone:

```js
// You cannot do this with Date:
// "What time is it right now in Tokyo?"
// "Schedule this event at 9am in New York"

// You end up writing fragile offset math:
const utcMs = Date.UTC(2026, 2, 28, 14, 0, 0);
const tokyoOffset = 9 * 60 * 60 * 1000;
const tokyoTime = new Date(utcMs + tokyoOffset);
// This breaks during daylight saving transitions
```

### Parsing Is Inconsistent

Date string parsing behavior is implementation-defined for non-ISO formats:

```js
new Date("2026-03-28")       // UTC midnight in Chrome, but local midnight elsewhere
new Date("03/28/2026")       // may return Invalid Date in some environments
new Date("March 28, 2026")   // works in most browsers but not guaranteed
```

### toString Is Noisy

Getting a simple formatted output requires workarounds or a full library like `date-fns` or `moment.js`. The native output is verbose and locale-dependent.

## Temporal Proposal Status in 2026

The Temporal proposal was introduced to TC39 in 2017. After years of design, polishing, and testing, it reached Stage 4 in late 2025. As of 2026:

- **V8 (Chrome/Node.js)**: Native support in Chrome 130+ and Node.js 22+
- **SpiderMonkey (Firefox)**: Native support in Firefox 128+
- **JavaScriptCore (Safari)**: Native support in Safari 18+
- **Deno**: Native support from v2.0+
- **Polyfill**: `@js-temporal/polyfill` covers older environments fully

You can check availability and use the polyfill as a zero-config drop-in for environments that do not yet have native support.

```bash
npm install @js-temporal/polyfill
```

```js
// Polyfill usage (tree-shakeable)
import { Temporal } from "@js-temporal/polyfill";
```

In native environments, `Temporal` is available globally without any import.

## Core Temporal Objects Overview

Temporal introduces a family of distinct types, each representing a different concept. Understanding the taxonomy is the key to using the API effectively.

| Type | Description | Example |
|---|---|---|
| `Temporal.Now` | Current moment utilities | `Temporal.Now.instant()` |
| `Temporal.Instant` | Exact moment in time (no timezone) | `2026-03-28T10:00:00Z` |
| `Temporal.PlainDate` | Calendar date without time | `2026-03-28` |
| `Temporal.PlainTime` | Wall-clock time without date | `14:30:00` |
| `Temporal.PlainDateTime` | Date + time without timezone | `2026-03-28T14:30:00` |
| `Temporal.ZonedDateTime` | Date + time + timezone (most complete) | `2026-03-28T14:30:00+09:00[Asia/Tokyo]` |
| `Temporal.Duration` | Span of time | `P1Y2M3DT4H` |
| `Temporal.TimeZone` | Named timezone | `America/New_York` |
| `Temporal.Calendar` | Calendar system | `gregory`, `japanese`, `islamic` |

All Temporal objects are **immutable**. Operations return new instances.

## Temporal.Now: Getting the Current Moment

```js
// Current instant (exact point in time, no timezone)
const now = Temporal.Now.instant();
console.log(now.toString()); // "2026-03-28T10:23:45.123456789Z"

// Current date in the system timezone
const today = Temporal.Now.plainDateISO();
console.log(today.toString()); // "2026-03-28"

// Current date-time in a specific timezone
const tokyoNow = Temporal.Now.zonedDateTimeISO("Asia/Tokyo");
console.log(tokyoNow.toString());
// "2026-03-28T19:23:45.123456789+09:00[Asia/Tokyo]"

// Current time only
const currentTime = Temporal.Now.plainTimeISO();
console.log(currentTime.toString()); // "10:23:45.123456789"
```

## PlainDate: Working with Calendar Dates

`PlainDate` represents a date on the calendar without any time or timezone information. Use it for birthdays, deadlines, and any scenario where the date concept itself matters, not a specific moment.

```js
// Create a PlainDate
const birthday = Temporal.PlainDate.from("1990-07-15");
const release = new Temporal.PlainDate(2026, 3, 28); // year, month (1-indexed!), day

// Access components — all 1-indexed
console.log(release.year);      // 2026
console.log(release.month);     // 3
console.log(release.monthCode); // "M03"
console.log(release.day);       // 28
console.log(release.dayOfWeek); // 6 (Saturday, 1=Monday)
console.log(release.daysInMonth); // 31

// Arithmetic — returns new PlainDate
const nextWeek = release.add({ weeks: 1 });
console.log(nextWeek.toString()); // "2026-04-04"

const lastMonth = release.subtract({ months: 1 });
console.log(lastMonth.toString()); // "2026-02-28"

// Comparison
const d1 = Temporal.PlainDate.from("2026-01-01");
const d2 = Temporal.PlainDate.from("2026-06-01");
console.log(Temporal.PlainDate.compare(d1, d2)); // -1 (d1 is earlier)
console.log(d1.equals(d2)); // false
```

## PlainTime: Working with Times of Day

```js
// Create a PlainTime
const openTime = Temporal.PlainTime.from("09:00:00");
const closeTime = new Temporal.PlainTime(17, 30); // 17:30

// Components
console.log(openTime.hour);   // 9
console.log(openTime.minute); // 0
console.log(openTime.second); // 0

// Arithmetic
const lunchBreak = openTime.add({ hours: 3, minutes: 30 });
console.log(lunchBreak.toString()); // "12:30:00"

// Round to nearest 15 minutes
const rounded = closeTime.round({ smallestUnit: "minute", roundingIncrement: 15 });
console.log(rounded.toString()); // "17:30:00"
```

## ZonedDateTime: The Complete Date-Time Type

`ZonedDateTime` is the most powerful Temporal type. It represents an exact moment in time anchored to a specific geographic timezone, handling DST transitions automatically.

```js
// Create a ZonedDateTime
const meeting = Temporal.ZonedDateTime.from(
  "2026-03-28T14:00:00[America/New_York]"
);

console.log(meeting.timeZoneId);    // "America/New_York"
console.log(meeting.offset);        // "-04:00" (EDT in effect)
console.log(meeting.epochSeconds);  // Unix timestamp

// Convert to another timezone
const meetingTokyo = meeting.withTimeZone("Asia/Tokyo");
console.log(meetingTokyo.toString());
// "2026-03-29T03:00:00+09:00[Asia/Tokyo]"

// Add duration — DST-aware
const summerStart = Temporal.ZonedDateTime.from(
  "2026-03-08T01:00:00[America/New_York]" // day before DST
);
const afterDST = summerStart.add({ hours: 24 });
// Correctly accounts for the 23-hour day when clocks spring forward
console.log(afterDST.toString());
// "2026-03-09T01:00:00-04:00[America/New_York]" (EDT, not EST)

// Creating from components
const event = Temporal.ZonedDateTime.from({
  year: 2026,
  month: 6,
  day: 15,
  hour: 10,
  minute: 0,
  timeZone: "Europe/London",
});
```

## Time Zone Conversions

One of Temporal's biggest wins is first-class time zone support:

```js
// Convert user's local time to UTC for storage
const userInput = "2026-04-15T09:00:00";
const userTimezone = "America/Los_Angeles";

const localDT = Temporal.ZonedDateTime.from(`${userInput}[${userTimezone}]`);
const asInstant = localDT.toInstant();
console.log(asInstant.toString()); // "2026-04-15T16:00:00Z" (UTC)

// Show the same instant across multiple timezones
const timezones = ["America/New_York", "Europe/Berlin", "Asia/Singapore"];
timezones.forEach(tz => {
  const zdt = asInstant.toZonedDateTimeISO(tz);
  console.log(`${tz}: ${zdt.toLocaleString()}`);
});

// Get UTC offset for a timezone at a specific moment
const instant = Temporal.Now.instant();
const tz = Temporal.TimeZone.from("Australia/Sydney");
const offset = tz.getOffsetStringFor(instant);
console.log(`Sydney offset: ${offset}`); // "+11:00" (AEDT)
```

## Duration: Representing Spans of Time

`Duration` represents a length of time, not a point. It can be calendar-aware or purely time-based.

```js
// Create durations
const sprint = Temporal.Duration.from({ weeks: 2 });
const meeting = new Temporal.Duration(0, 0, 0, 0, 1, 30); // 1 hour 30 minutes
const parsed = Temporal.Duration.from("P1Y2M3DT4H30M");

// Arithmetic with dates
const projectStart = Temporal.PlainDate.from("2026-01-05");
const projectEnd = projectStart.add({ months: 3, weeks: 2 });
console.log(projectEnd.toString()); // "2026-04-19"

// Calculate duration between dates
const d1 = Temporal.PlainDate.from("2026-01-01");
const d2 = Temporal.PlainDate.from("2026-03-28");
const diff = d1.until(d2, { largestUnit: "month" });
console.log(diff.toString()); // "P2M27D"
console.log(`${diff.months} months and ${diff.days} days`);

// Duration between instants (absolute time)
const start = Temporal.Instant.from("2026-03-28T08:00:00Z");
const end = Temporal.Instant.from("2026-03-28T17:30:00Z");
const workday = start.until(end);
console.log(workday.total({ unit: "hour" })); // 9.5

// Negate and abs
const negative = Temporal.Duration.from({ days: -5 });
console.log(negative.negated().days); // 5
console.log(negative.abs().days);     // 5
```

## Calendar System Support

Temporal supports multiple calendar systems beyond the Gregorian default:

```js
// Japanese Imperial calendar
const japaneseDate = Temporal.PlainDate.from({
  year: 6,
  month: 3,
  day: 28,
  calendar: "japanese",
  era: "reiwa",
});
console.log(japaneseDate.toString()); // "2024-03-28[u-ca=japanese]"

// Islamic calendar
const islamicDate = Temporal.PlainDate.from({
  year: 1447,
  month: 9,
  day: 1,
  calendar: "islamic",
});

// Convert between calendars
const gregorianEquivalent = islamicDate.withCalendar("gregory");
console.log(gregorianEquivalent.toString());

// Hebrew calendar
const hebrewDate = Temporal.PlainDate.from({
  year: 5786,
  month: 1,
  day: 1,
  calendar: "hebrew",
});

// Display with locale-aware formatting
console.log(
  japaneseDate.toLocaleString("ja-JP", { calendar: "japanese", era: "long" })
);
```

## Migration Guide: Date to Temporal

Here are side-by-side comparisons for the most common operations.

### Getting the Current Date

```js
// Old: Date
const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1; // +1 for sanity
const day = now.getDate();

// New: Temporal
const today = Temporal.Now.plainDateISO();
const { year, month, day } = today;
```

### Parsing a Date String

```js
// Old: Date (inconsistent across environments)
const d = new Date("2026-03-28"); // May be UTC or local depending on browser

// New: Temporal (explicit, predictable)
const plainDate = Temporal.PlainDate.from("2026-03-28");
const withZone = Temporal.ZonedDateTime.from("2026-03-28T00:00:00[America/Chicago]");
```

### Adding Days

```js
// Old: Date (mutation, verbose)
const date = new Date("2026-03-01");
const copy = new Date(date.getTime());
copy.setDate(copy.getDate() + 30);

// New: Temporal (immutable, chainable)
const result = Temporal.PlainDate.from("2026-03-01").add({ days: 30 });
```

### Comparing Two Dates

```js
// Old: Date
const a = new Date("2026-01-01");
const b = new Date("2026-06-15");
const isAfter = b > a; // relies on implicit valueOf

// New: Temporal
const a = Temporal.PlainDate.from("2026-01-01");
const b = Temporal.PlainDate.from("2026-06-15");
const isAfter = Temporal.PlainDate.compare(b, a) > 0; // explicit
const isSame = a.equals(b); // false
```

### Formatting for Display

```js
// Old: Date (fragile, locale-dependent)
const d = new Date("2026-03-28");
const formatted = d.toLocaleDateString("en-US", {
  year: "numeric", month: "long", day: "numeric"
});

// New: Temporal (same Intl integration, more predictable)
const d = Temporal.PlainDate.from("2026-03-28");
const formatted = d.toLocaleString("en-US", {
  year: "numeric", month: "long", day: "numeric"
});
// "March 28, 2026"
```

### Storing and Retrieving from a Database

```js
// Old: Date
// Store as ISO string, retrieve, parse, fight with timezones
const stored = new Date().toISOString(); // "2026-03-28T14:00:00.000Z"
const retrieved = new Date(stored);

// New: Temporal
// Store Instant as ISO string for UTC-normalized storage
const stored = Temporal.Now.instant().toString(); // "2026-03-28T14:00:00.123456789Z"
const retrieved = Temporal.Instant.from(stored);

// Reconstruct with user's timezone for display
const userTZ = "Europe/Paris";
const displayDT = retrieved.toZonedDateTimeISO(userTZ);
```

## Practical Use Cases

### Scheduling System with DST Safety

```js
function scheduleWeeklyMeeting(startZDT, weeks = 4) {
  return Array.from({ length: weeks }, (_, i) =>
    startZDT.add({ weeks: i })
  );
}

const firstMeeting = Temporal.ZonedDateTime.from(
  "2026-03-01T10:00:00[America/New_York]"
);

const schedule = scheduleWeeklyMeeting(firstMeeting);
schedule.forEach(meeting => {
  console.log(meeting.toString());
  // Automatically adjusts for DST — each is 10:00 local time
});
```

### User-Facing Relative Dates

```js
function formatRelativeDate(target, referenceDate = Temporal.Now.plainDateISO()) {
  const diff = referenceDate.until(target, { largestUnit: "day" });
  const days = diff.total({ unit: "day" });

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0 && days <= 7) return `In ${days} days`;
  if (days < 0 && days >= -7) return `${Math.abs(days)} days ago`;

  return target.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const deadline = Temporal.PlainDate.from("2026-04-01");
console.log(formatRelativeDate(deadline)); // "In 4 days"
```

### API Timestamp Handling

```js
// Receiving a timestamp from an API
function parseApiTimestamp(isoString) {
  return Temporal.Instant.from(isoString);
}

// Displaying to user in their timezone
function displayTimestamp(instant, userTimezone) {
  return instant
    .toZonedDateTimeISO(userTimezone)
    .toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
}

// Sending back to API (always UTC)
function serializeForApi(zdt) {
  return zdt.toInstant().toString();
}

const apiTs = parseApiTimestamp("2026-03-28T18:00:00Z");
console.log(displayTimestamp(apiTs, "Asia/Tokyo")); // "Mar 29, 2026, 3:00 AM"
console.log(displayTimestamp(apiTs, "America/Chicago")); // "Mar 28, 2026, 1:00 PM"
```

### Age Calculation

```js
function calculateAge(birthdate) {
  const birth = Temporal.PlainDate.from(birthdate);
  const today = Temporal.Now.plainDateISO();
  const diff = birth.until(today, { largestUnit: "year" });
  return diff.years;
}

console.log(calculateAge("1990-07-15")); // 35
```

## Browser and Node.js Support

As of early 2026, the support matrix is:

- **Chrome 130+**: Native `Temporal` global available
- **Firefox 128+**: Native support enabled by default
- **Safari 18+**: Full native support
- **Node.js 22+**: Available without flags
- **Node.js 18/20**: Use the `@js-temporal/polyfill` package
- **Deno 2.0+**: Native support

For projects targeting older environments, the official polyfill is a reliable drop-in:

```bash
npm install @js-temporal/polyfill
```

```js
// Conditional import pattern for progressive enhancement
let Temporal;
if (globalThis.Temporal) {
  Temporal = globalThis.Temporal;
} else {
  ({ Temporal } = await import("@js-temporal/polyfill"));
}
```

Bundler-friendly tree-shaking works out of the box — you only pay for the types you import.

## Key Things to Remember

- **Prefer `ZonedDateTime` for user-facing events** where timezone context matters
- **Use `Instant` for storage and APIs** — it is always unambiguous UTC
- **Use `PlainDate` for calendar-only concepts** like birthdays and holidays
- **All objects are immutable** — arithmetic always returns a new instance
- **Months are 1-indexed** throughout Temporal (January = 1)
- **`largestUnit` controls the shape of Duration output** — always set it explicitly when diffing
- **DST transitions are handled correctly** by `ZonedDateTime` but not by `PlainDateTime`

## Summary

The Temporal API solves every significant problem with JavaScript's `Date` object. It provides immutable types, 1-indexed months, named time zone support, DST-aware arithmetic, multiple calendar systems, and a clean composable API. With native support landing across all major runtimes in 2025-2026, there is no longer a strong reason to reach for `moment.js`, `date-fns`, or `luxon` for new projects. Start with the polyfill for any environments you still need to support, and migrate core date logic to Temporal incrementally — the `Date`-to-Temporal migration guide above covers the most common patterns you will encounter.
