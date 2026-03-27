---
title: "Temporal API: The Modern JavaScript Date/Time Solution (Bye Bye Moment.js)"
description: "Learn the JavaScript Temporal API — the modern replacement for Date, Moment.js, Day.js, and date-fns. Practical examples, timezone handling, comparisons, and migration guide."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["javascript", "temporal-api", "date", "momentjs", "typescript", "frontend", "web"]
readingTime: "11 min read"
---

JavaScript's `Date` object has been broken since 1995. It's mutable, timezone-naive by default, has month indexing that starts at 0, and its API is inconsistently named. For over a decade, developers have reached for **Moment.js**, then **Day.js**, then **date-fns** to paper over these problems.

**The Temporal API** is the TC39 proposal that finally fixes dates and times in JavaScript at the language level. In 2026, it's at Stage 3 (near-final), with polyfills production-ready and native browser support arriving.

This guide is practical: what Temporal is, how it differs from the old approaches, and how to migrate.

---

## Why `Date` Is Broken

```javascript
// The classic traps
const d = new Date(2026, 0, 1);  // January, not month 0 (why???)
d.getMonth();  // 0  (January is 0 — every JS dev has been burned by this)

// Mutation nightmare
const start = new Date();
const end = start;
end.setDate(end.getDate() + 7);
console.log(start === end);  // true — they're the same object
console.log(start);          // Modified! start was mutated

// DST traps
const tz = new Date('2026-03-08T02:30:00');  // DST gap in US/Eastern
// Date silently coerces this to 3:30 AM — no error
```

The problems:
- **Mutable** — dates can be accidentally changed
- **No timezone support** — everything is UTC or local, nothing in between
- **Month indexing starts at 0** — a constant source of bugs
- **DST handling is broken** — silent errors instead of exceptions
- **No duration type** — "add 1 month" is undefined behavior

---

## The Date Library Graveyard

Before Temporal, the ecosystem tried to solve this with libraries:

### Moment.js (deprecated)
```javascript
import moment from 'moment';  // 294KB — enormous
const m = moment().add(7, 'days');
```
Moment is in maintenance mode. The team recommends migrating away from it. It's mutable, large, and its timezone support (`moment-timezone`) adds another 36KB.

### Day.js
```javascript
import dayjs from 'dayjs';  // 2KB — much smaller
const d = dayjs().add(7, 'day');
```
Day.js is a solid Moment replacement. Small, immutable (mostly), familiar API. But it's still a library, still has timezone quirks, and still lacks a proper duration type.

### date-fns
```javascript
import { addDays, format } from 'date-fns';  // tree-shakeable
const d = addDays(new Date(), 7);
```
date-fns uses plain `Date` objects with functional utilities. Tree-shakeable, TypeScript-friendly. But you're still working with the broken `Date` underneath.

### Luxon
```javascript
import { DateTime } from 'luxon';
const d = DateTime.now().plus({ days: 7 });
```
Luxon was created by the Moment.js team to fix Moment's problems. Immutable, good timezone support. But it's another library to maintain and bundle.

**The problem**: all of these are band-aids. Temporal fixes the underlying language.

---

## Enter the Temporal API

Temporal introduces new immutable date/time types that cover every use case correctly:

| Type | Use case |
|---|---|
| `Temporal.PlainDate` | A calendar date without time (birthday, deadline) |
| `Temporal.PlainTime` | A clock time without date (alarm time, schedule) |
| `Temporal.PlainDateTime` | Date + time, no timezone (local log entry) |
| `Temporal.ZonedDateTime` | Date + time + timezone (the "real" datetime) |
| `Temporal.Instant` | A specific moment in time (UTC timestamp) |
| `Temporal.Duration` | A length of time (3 days, 2 hours) |
| `Temporal.PlainYearMonth` | Year + month (credit card expiry) |
| `Temporal.PlainMonthDay` | Month + day recurring (annual event) |

The key design principle: **be explicit about what you mean**. A `PlainDate` cannot be accidentally compared to a `ZonedDateTime`. Types prevent a whole class of timezone bugs.

---

## Getting Started in 2026

Temporal is available via polyfill today and natively in modern browsers:

```bash
npm install @js-temporal/polyfill
```

```javascript
// With polyfill
import { Temporal } from '@js-temporal/polyfill';

// Native (no import needed in supporting browsers)
const today = Temporal.Now.plainDateISO();
```

---

## Core Usage: PlainDate

```javascript
// Creating dates — month is 1-indexed (like a human would expect)
const birthday = Temporal.PlainDate.from({ year: 1990, month: 3, day: 15 });
const today = Temporal.Now.plainDateISO();
const fromISO = Temporal.PlainDate.from('2026-03-27');

// Arithmetic — always returns a new object (immutable)
const nextWeek = today.add({ days: 7 });
const lastMonth = today.subtract({ months: 1 });
const nextYear = today.add({ years: 1 });

// Comparison
today.equals(fromISO);            // true/false
Temporal.PlainDate.compare(a, b); // -1, 0, 1

// Properties — all 1-indexed
today.year;    // 2026
today.month;   // 3 (March — not 2!)
today.day;     // 27
today.dayOfWeek;  // 1 (Monday) through 7 (Sunday)

// Formatting
today.toString();       // "2026-03-27"
today.toLocaleString(); // "March 27, 2026" (locale-aware)
```

---

## ZonedDateTime: Timezone-Aware Datetimes

This is where Temporal truly shines. Every `ZonedDateTime` carries its timezone explicitly.

```javascript
// Create a ZonedDateTime
const event = Temporal.ZonedDateTime.from(
  '2026-03-27T14:00:00[America/New_York]'
);

// Or from components
const meeting = Temporal.ZonedDateTime.from({
  year: 2026,
  month: 3,
  day: 27,
  hour: 14,
  minute: 0,
  timeZone: 'America/New_York',
});

// Convert to another timezone — instant is preserved
const tokyoTime = meeting.withTimeZone('Asia/Tokyo');
console.log(tokyoTime.toString());
// "2026-03-28T03:00:00+09:00[Asia/Tokyo]"

// Get the current time in a specific timezone
const nowInLondon = Temporal.Now.zonedDateTimeISO('Europe/London');

// DST-aware arithmetic
const springForward = Temporal.ZonedDateTime.from(
  '2026-03-07T01:30:00[America/New_York]'
);
const twoHoursLater = springForward.add({ hours: 2 });
// Correctly handles the DST gap — 3:30 AM is skipped
console.log(twoHoursLater.hour); // 4 (not 3:30 — gap was skipped)
```

---

## Duration: First-Class Time Lengths

```javascript
// Creating durations
const oneWeek = Temporal.Duration.from({ weeks: 1 });
const twoHours30min = Temporal.Duration.from({ hours: 2, minutes: 30 });
const fromISO = Temporal.Duration.from('P1Y2M3DT4H5M6S'); // ISO 8601

// Arithmetic with durations
const deadline = Temporal.PlainDate.from('2026-04-01');
const daysUntilDeadline = today.until(deadline);
// Returns a Duration
console.log(daysUntilDeadline.days); // 5

// Total method — convert to a single unit
const totalHours = twoHours30min.total({ unit: 'hours' }); // 2.5

// Negating durations
const negative = oneWeek.negated(); // -P7D

// Rounding
const rounded = Temporal.Duration.from({ hours: 2, minutes: 45 })
  .round({ largestUnit: 'hours', smallestUnit: 'hours' });
console.log(rounded.hours); // 3
```

---

## Temporal vs Alternatives: Benchmark

| Operation | Temporal | Day.js | date-fns | Moment.js |
|---|---|---|---|---|
| Parse ISO string | ~0.3μs | ~0.8μs | ~0.5μs | ~2.1μs |
| Add 7 days | ~0.1μs | ~0.4μs | ~0.3μs | ~0.9μs |
| Format to string | ~0.5μs | ~1.2μs | ~0.8μs | ~2.4μs |
| Bundle size | 0KB (native) / 18KB (polyfill) | 2KB | Tree-shaken | 294KB |
| TypeScript types | Native | Separate types | Native | Separate types |

---

## Real-World Patterns

### Pattern 1: Scheduling System

```typescript
interface ScheduledEvent {
  title: string;
  startTime: Temporal.ZonedDateTime;
  duration: Temporal.Duration;
}

function getEndTime(event: ScheduledEvent): Temporal.ZonedDateTime {
  return event.startTime.add(event.duration);
}

function hasConflict(a: ScheduledEvent, b: ScheduledEvent): boolean {
  const aEnd = getEndTime(a);
  const bEnd = getEndTime(b);

  return (
    Temporal.ZonedDateTime.compare(a.startTime, bEnd) < 0 &&
    Temporal.ZonedDateTime.compare(aEnd, b.startTime) > 0
  );
}

const meeting1: ScheduledEvent = {
  title: "Team Standup",
  startTime: Temporal.ZonedDateTime.from('2026-03-27T09:00:00[America/New_York]'),
  duration: Temporal.Duration.from({ minutes: 30 }),
};

const meeting2: ScheduledEvent = {
  title: "1:1",
  startTime: Temporal.ZonedDateTime.from('2026-03-27T09:15:00[America/New_York]'),
  duration: Temporal.Duration.from({ hours: 1 }),
};

console.log(hasConflict(meeting1, meeting2)); // true
```

### Pattern 2: Age Calculation

```javascript
function calculateAge(birthday: Temporal.PlainDate): number {
  const today = Temporal.Now.plainDateISO();
  const diff = birthday.until(today, { largestUnit: 'years' });
  return diff.years;
}

const birthday = Temporal.PlainDate.from('1990-03-15');
console.log(calculateAge(birthday)); // 36
```

### Pattern 3: Relative Time Display

```javascript
function getRelativeTime(datetime: Temporal.ZonedDateTime): string {
  const now = Temporal.Now.zonedDateTimeISO();
  const diff = datetime.until(now, { largestUnit: 'days' });

  if (diff.days === 0) {
    if (diff.hours === 0) return `${diff.minutes} minutes ago`;
    return `${diff.hours} hours ago`;
  }
  if (diff.days === 1) return 'yesterday';
  if (diff.days < 7) return `${diff.days} days ago`;
  if (diff.days < 30) return `${Math.floor(diff.days / 7)} weeks ago`;
  return datetime.toLocaleString();
}
```

### Pattern 4: Business Hours Calculator

```javascript
function addBusinessDays(
  date: Temporal.PlainDate,
  days: number
): Temporal.PlainDate {
  let current = date;
  let added = 0;

  while (added < days) {
    current = current.add({ days: 1 });
    // dayOfWeek: 1=Mon, 2=Tue, ..., 6=Sat, 7=Sun
    if (current.dayOfWeek <= 5) {
      added++;
    }
  }

  return current;
}

const today = Temporal.PlainDate.from('2026-03-27'); // Friday
const deadline = addBusinessDays(today, 3); // Skip weekend
console.log(deadline.toString()); // "2026-04-01" (Wednesday)
```

---

## Migrating from Moment.js/Day.js

### Common Operations Translation

| Old (Moment/Day.js) | New (Temporal) |
|---|---|
| `moment()` | `Temporal.Now.zonedDateTimeISO()` |
| `moment('2026-03-27')` | `Temporal.PlainDate.from('2026-03-27')` |
| `m.add(7, 'days')` | `date.add({ days: 7 })` |
| `m.subtract(1, 'month')` | `date.subtract({ months: 1 })` |
| `m.format('YYYY-MM-DD')` | `date.toString()` |
| `m.toDate()` | `instant.toZonedDateTimeISO('UTC').toPlainDate()` |
| `moment.duration(2, 'hours')` | `Temporal.Duration.from({ hours: 2 })` |
| `a.isBefore(b)` | `Temporal.PlainDate.compare(a, b) < 0` |
| `a.diff(b, 'days')` | `a.until(b).total({ unit: 'days' })` |

### Migration Strategy

1. **Install the polyfill** — `@js-temporal/polyfill`
2. **Replace new Date()** with `Temporal.Now.plainDateISO()` or `Temporal.Now.zonedDateTimeISO()`
3. **Fix month indexing** — change all `month - 1` patterns to just `month`
4. **Add timezone to all datetimes** — replace implicit local with explicit `ZonedDateTime`
5. **Remove the library** — once migrated, no dependency needed (when native)

---

## Browser and Runtime Support (2026)

| Environment | Status |
|---|---|
| Chrome 120+ | Native support |
| Firefox 121+ | Native support |
| Safari 17.4+ | Native support |
| Node.js 22+ | Available via `--experimental-vm-modules` |
| Bun 1.1+ | Polyfill compatible |
| Deno 2.x | Polyfill compatible |

For production apps today, use `@js-temporal/polyfill` — it's maintained by TC39 members and tracks the spec exactly.

---

## Tools for Working with Dates

These DevPlaybook tools are useful when working with date/time data:

- [Unix Timestamp Converter](/tools/unix-timestamp-converter) — convert between Unix time and readable dates
- [JSON Formatter](/tools/json-formatter) — inspect API responses with date fields
- [Base64 Encoder/Decoder](/tools/base64-encoder-decoder) — decode JWT tokens containing timestamp claims

---

## Summary

The Temporal API solves every major problem with JavaScript's `Date`:

- **Immutable** — no accidental mutations
- **Explicit timezone support** — `ZonedDateTime` for real datetimes, `PlainDate` for calendar dates
- **1-indexed months** — finally
- **First-class Duration type** — proper arithmetic
- **DST-aware** — errors instead of silent failures
- **No library needed** — built into the language

For new projects in 2026: use Temporal with the polyfill. For existing Moment/Day.js code: migrate incrementally, function by function. The API is well-designed and the migration is worth it.
