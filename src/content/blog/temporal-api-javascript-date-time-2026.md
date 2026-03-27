---
title: "Temporal API: JavaScript's New Date/Time Standard 2026"
description: "A complete guide to the JavaScript Temporal API in 2026 — covering Temporal.Now, Temporal.PlainDate, timezone handling, calendar support, and migration from moment.js, date-fns, and the legacy Date object."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["javascript", "temporal", "date", "typescript", "web-standards", "ecmascript"]
readingTime: "13 min read"
draft: false
---

JavaScript's `Date` object is one of the most widely criticized APIs in the language. It was built in 10 days in 1995, modeled after Java's broken date API (which Java itself later deprecated), and has remained essentially unchanged for 30 years. Time zones work inconsistently. Months are zero-indexed. Arithmetic requires manual millisecond math. Mutability causes subtle bugs.

In 2026, the **Temporal API** is the answer to all of this. It reached Stage 4 in the TC39 process and is now natively available in all major browsers and runtimes. This guide covers everything you need to migrate confidently.

---

## Why Date Was Always Broken

Before learning Temporal, it helps to understand exactly what is wrong with the legacy API:

```javascript
// Month is 0-indexed (January = 0, December = 11)
const date = new Date(2026, 0, 15); // January 15, not month 0

// Mutable by default - bugs waiting to happen
function addDays(date, n) {
  date.setDate(date.getDate() + n); // MUTATES the input
  return date;
}

// Timezone confusion
const d = new Date('2026-03-27');
d.getDate(); // Could be 26 or 27 depending on local timezone

// No timezone-aware comparison
const utcDate = new Date('2026-03-27T00:00:00Z');
const localDate = new Date('2026-03-27T00:00:00');
// Different timestamps if not in UTC timezone
```

Every JavaScript developer has been burned by at least one of these. The ecosystem responded with libraries like moment.js, date-fns, luxon, and day.js — each solving the same problems in slightly different ways, adding bundle weight to every application.

Temporal solves these at the language level.

---

## The Temporal API at a Glance

Temporal introduces a family of immutable date/time types, each with a clear purpose:

| Type | What it represents |
|------|-------------------|
| `Temporal.Instant` | A single point in time (like a Unix timestamp) |
| `Temporal.ZonedDateTime` | A moment in a specific timezone |
| `Temporal.PlainDateTime` | A calendar date + clock time, no timezone |
| `Temporal.PlainDate` | A calendar date only (no time) |
| `Temporal.PlainTime` | A clock time only (no date) |
| `Temporal.PlainYearMonth` | A year + month (for billing cycles, etc.) |
| `Temporal.PlainMonthDay` | A month + day (for recurring events) |
| `Temporal.Duration` | A length of time |
| `Temporal.Now` | Factory for current time values |
| `Temporal.Calendar` | Calendar system (ISO 8601, Gregorian, Hebrew, etc.) |
| `Temporal.TimeZone` | Timezone operations |

The key insight: **different use cases need different types**. "What date is my birthday?" (PlainDate) is fundamentally different from "exactly when did this event occur?" (Instant) which is different from "what time is it in Tokyo right now?" (ZonedDateTime).

---

## Getting the Current Time: Temporal.Now

```typescript
// Current instant (like Date.now() but returns Temporal.Instant)
const now: Temporal.Instant = Temporal.Now.instant();
console.log(now.toString()); // "2026-03-27T14:23:41.123456789Z"

// Current time in a specific timezone
const tokyoNow: Temporal.ZonedDateTime = Temporal.Now.zonedDateTimeISO('Asia/Tokyo');
console.log(tokyoNow.toString());
// "2026-03-27T23:23:41.123456789+09:00[Asia/Tokyo]"

// Current date only (no time) in local timezone
const today: Temporal.PlainDate = Temporal.Now.plainDateISO();
console.log(today.toString()); // "2026-03-27"

// Current time only
const timeNow: Temporal.PlainTime = Temporal.Now.plainTimeISO();
console.log(timeNow.toString()); // "14:23:41.123456789"
```

`Temporal.Now` is not a value — it is a namespace of factory methods. This makes the intent explicit.

---

## Working with Temporal.PlainDate

`PlainDate` represents a calendar date without any time or timezone concept. Perfect for birthdays, deadlines, and any "date as a label" use case.

```typescript
// Creating dates
const birthday = Temporal.PlainDate.from('1990-06-15');
const launch = new Temporal.PlainDate(2026, 3, 27); // year, month (1-12), day

// Note: months are 1-indexed in Temporal (unlike Date)
console.log(launch.month); // 3 (March)
console.log(launch.day);   // 27

// Arithmetic - always returns a new object (immutable)
const tomorrow = launch.add({ days: 1 });
const nextWeek = launch.add({ weeks: 1 });
const nextYear = launch.add({ years: 1 });

console.log(tomorrow.toString());  // "2026-03-28"
console.log(nextWeek.toString());  // "2026-04-03"
console.log(nextYear.toString());  // "2027-03-27"

// Subtraction
const yesterday = launch.subtract({ days: 1 });

// Comparison
const date1 = Temporal.PlainDate.from('2026-01-01');
const date2 = Temporal.PlainDate.from('2026-06-15');

Temporal.PlainDate.compare(date1, date2); // -1 (date1 is before date2)
date1.equals(date2);                       // false

// Days between two dates
const duration = date1.until(date2);
console.log(duration.days); // 165
```

---

## Working with Temporal.ZonedDateTime

`ZonedDateTime` is the most powerful type — it represents a real moment in time anchored to a specific timezone. Use it when timezone awareness matters (scheduling, logging, calendar apps).

```typescript
// Creating a ZonedDateTime
const meeting = Temporal.ZonedDateTime.from(
  '2026-03-27T14:00:00[America/New_York]'
);

// Converting to another timezone
const tokyoMeeting = meeting.withTimeZone('Asia/Tokyo');
console.log(tokyoMeeting.toString());
// "2026-03-28T03:00:00+09:00[Asia/Tokyo]"

// What time is a Tokyo 9am meeting in New York?
const tokyoEvent = Temporal.ZonedDateTime.from(
  '2026-03-27T09:00:00[Asia/Tokyo]'
);
const nyTime = tokyoEvent.withTimeZone('America/New_York');
console.log(nyTime.hour); // 20 (8pm the previous day)

// Daylight saving time is handled automatically
const beforeDST = Temporal.ZonedDateTime.from(
  '2026-03-07T12:00:00[America/New_York]'
);
const afterDST = Temporal.ZonedDateTime.from(
  '2026-03-09T12:00:00[America/New_York]'
);

const diff = beforeDST.until(afterDST);
console.log(diff.hours); // 47 (not 48 - DST skips an hour)
```

This DST handling is where `Date` fails silently. Adding 86400000ms (one day in milliseconds) to a Date object does **not** account for DST transitions.

---

## Working with Temporal.Instant

`Instant` is a raw point in time — no calendar, no timezone. It is the temporal equivalent of a Unix timestamp, but with nanosecond precision.

```typescript
// From ISO string
const event = Temporal.Instant.from('2026-03-27T14:00:00Z');

// From epoch (milliseconds, like Date.now())
const fromMs = Temporal.Instant.fromEpochMilliseconds(Date.now());

// To epoch values
console.log(event.epochSeconds);      // Unix timestamp
console.log(event.epochMilliseconds); // Same as Date.getTime()
console.log(event.epochNanoseconds);  // BigInt - nanosecond precision

// Duration between instants
const t1 = Temporal.Instant.from('2026-01-01T00:00:00Z');
const t2 = Temporal.Instant.from('2026-06-01T00:00:00Z');
const dur = t1.until(t2);
console.log(dur.hours); // 3624
```

---

## Durations with Temporal.Duration

```typescript
// Creating durations
const oneWeek = Temporal.Duration.from({ weeks: 1 });
const sprint = Temporal.Duration.from({ days: 14 });
const meeting = Temporal.Duration.from({ hours: 1, minutes: 30 });
const iso = Temporal.Duration.from('PT1H30M'); // ISO 8601 duration string

// Arithmetic
const twoWeeks = oneWeek.add(oneWeek);
const halfSprint = sprint.divide(2);

// Round
const rounded = meeting.round({ smallestUnit: 'hour' });

// Compare durations
Temporal.Duration.compare(oneWeek, sprint); // -1 (1 week < 2 weeks)
```

---

## Calendar Support

One underrated Temporal feature: built-in support for non-Gregorian calendars.

```typescript
// Hebrew calendar
const hebrewDate = Temporal.PlainDate.from({
  year: 5786,
  month: 1,
  day: 1,
  calendar: 'hebrew'
});

// Japanese era calendar
const japaneseDate = Temporal.PlainDate.from({
  era: 'reiwa',
  eraYear: 8,
  month: 3,
  day: 27,
  calendar: 'japanese'
});

// Convert to ISO (Gregorian)
const isoDate = japaneseDate.withCalendar('iso8601');
console.log(isoDate.toString()); // "2026-03-27"
```

This is critical for applications targeting international markets — previously requiring heavy library support.

---

## Comparison with Date API

| Behavior | Date | Temporal |
|----------|------|----------|
| Month indexing | 0-11 | 1-12 |
| Mutability | Mutable | Immutable |
| Timezone handling | Implicit/confusing | Explicit types |
| DST handling | None | Automatic |
| Nanosecond precision | No | Yes |
| Calendar support | No | Yes |
| Duration arithmetic | Manual ms math | Duration type |
| Parsing | Locale-dependent | ISO 8601 strict |

---

## Migrating from moment.js

Moment.js is in maintenance mode and should not be used in new projects.

```javascript
// moment.js
const formatted = moment().format('YYYY-MM-DD');
const nextWeek = moment().add(7, 'days');
const diff = moment('2026-06-01').diff(moment(), 'days');
const isAfterCheck = moment('2026-06-01').isAfter(moment());

// Temporal equivalent
const formatted = Temporal.Now.plainDateISO().toString();
const nextWeek = Temporal.Now.plainDateISO().add({ days: 7 });
const diff = Temporal.PlainDate.from('2026-06-01').since(Temporal.Now.plainDateISO()).days;
const isAfterCheck = Temporal.PlainDate.compare(
  Temporal.PlainDate.from('2026-06-01'),
  Temporal.Now.plainDateISO()
) > 0;
```

---

## Migrating from date-fns

```javascript
// date-fns
import { addDays, format, differenceInDays } from 'date-fns';

const result = addDays(new Date(), 7);
const formatted = format(new Date(), 'yyyy-MM-dd');
const days = differenceInDays(new Date('2026-06-01'), new Date());

// Temporal equivalent
const result = Temporal.Now.plainDateISO().add({ days: 7 });
const formatted = Temporal.Now.plainDateISO().toString();
const days = Temporal.PlainDate.from('2026-06-01')
  .since(Temporal.Now.plainDateISO()).days;
```

---

## Using Temporal with TypeScript

```typescript
import { Temporal } from '@js-temporal/polyfill';

function daysBetween(
  start: Temporal.PlainDate,
  end: Temporal.PlainDate
): number {
  return start.until(end).days;
}

function scheduleEvent(
  time: Temporal.ZonedDateTime,
  duration: Temporal.Duration
): Temporal.ZonedDateTime {
  return time.add(duration);
}

// Explicit conversion between types
const now: Temporal.ZonedDateTime = Temporal.Now.zonedDateTimeISO();
const plain: Temporal.PlainDate = now.toPlainDate();
```

The type system prevents the class of bugs where you forget whether a value is UTC or local — the type carries that information.

---

## Browser and Runtime Support in 2026

| Environment | Status |
|-------------|--------|
| Chrome 127+ | Native |
| Firefox 130+ | Native |
| Safari 18+ | Native |
| Node.js 23+ | Native |
| Deno 2.x | Native |
| Bun 1.x | Native |
| Older environments | Use @js-temporal/polyfill |

For production apps targeting older browsers, the official polyfill from `@js-temporal/polyfill` passes all spec tests and is a drop-in replacement.

---

## Common Pitfalls

**Do not mix Temporal and Date:**

```typescript
// BAD: implicit conversion is lossy
const legacyDate = new Date(temporalInstant.epochMilliseconds);

// GOOD: explicit conversion
const instant = Temporal.Instant.fromEpochMilliseconds(legacyDate.getTime());
const zonedDT = instant.toZonedDateTimeISO('UTC');
```

**PlainDate vs ZonedDateTime for scheduling:**

```typescript
// BAD: scheduling a meeting without timezone
const meeting = Temporal.PlainDate.from('2026-04-01');
// "April 1st" but which timezone? Ambiguous for real scheduling.

// GOOD: be explicit about timezone
const meeting = Temporal.ZonedDateTime.from(
  '2026-04-01T14:00:00[America/New_York]'
);
```

---

## Quick Reference

```typescript
// Now
Temporal.Now.instant()              // Point in time
Temporal.Now.zonedDateTimeISO()     // Now in local timezone
Temporal.Now.plainDateISO()         // Today date
Temporal.Now.plainTimeISO()         // Current time

// Parse
Temporal.PlainDate.from('2026-03-27')
Temporal.ZonedDateTime.from('2026-03-27T14:00:00[America/New_York]')
Temporal.Instant.from('2026-03-27T14:00:00Z')
Temporal.Duration.from('P1Y2M3DT4H5M6S')

// Arithmetic
date.add({ days: 7, months: 1 })
date.subtract({ weeks: 2 })
date.until(otherDate)    // Returns Duration
date.since(otherDate)    // Returns Duration

// Compare
Temporal.PlainDate.compare(d1, d2)  // -1, 0, 1
d1.equals(d2)                        // boolean

// Convert
zdt.toPlainDate()
zdt.toInstant()
instant.toZonedDateTimeISO('UTC')
```

---

## Conclusion

The Temporal API is one of the most impactful additions to JavaScript in a decade. It does not just fix `Date` — it provides a complete, thoughtfully designed system for every temporal use case you will encounter in real applications.

In 2026, there is no reason to use `Date`, moment.js, or date-fns in new code. Temporal handles everything they did, with better types, immutability, timezone correctness, and nanosecond precision — all built into the language.

Start with `Temporal.PlainDate` for pure date work, `Temporal.ZonedDateTime` for anything involving timezones, and `Temporal.Instant` when you need a raw timestamp. The types guide you toward correct code.

---

*Examples are compatible with the TC39 Temporal Proposal specification. Use `@js-temporal/polyfill` for environments without native support.*
