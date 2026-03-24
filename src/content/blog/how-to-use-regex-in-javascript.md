---
title: "How to Use Regex in JavaScript: Complete Guide with Examples"
description: "Learn how to use regex in JavaScript with practical examples. Covers RegExp syntax, methods, flags, groups, lookaheads, and real-world patterns for validation and parsing."
date: "2026-03-24"
tags: ["javascript", "regex", "regexp", "string-manipulation", "web-development"]
readingTime: "9 min read"
---

# How to Use Regex in JavaScript: Complete Guide with Examples

Regular expressions (regex) are one of the most powerful — and misunderstood — tools in JavaScript. Once you get comfortable with them, you'll use them everywhere: form validation, URL parsing, log processing, and text transformation.

This guide covers everything you need, from creating your first regex to advanced techniques like lookaheads and named groups.

## Creating a Regex in JavaScript

JavaScript gives you two ways to create a regex:

```javascript
// Literal syntax (preferred for static patterns)
const pattern = /hello/;

// Constructor syntax (needed for dynamic patterns)
const word = 'hello';
const dynamic = new RegExp(word);
const dynamicWithFlags = new RegExp(word, 'gi');
```

Use the constructor syntax when your pattern needs to be built at runtime.

## Essential Regex Flags

Flags modify how matching works:

```javascript
const str = 'Hello hello HELLO';

// Case-insensitive
/hello/i.test(str);         // true

// Global — find ALL matches (not just first)
str.match(/hello/gi);       // ['Hello', 'hello', 'HELLO']

// Multiline — ^ and $ match line boundaries
'line1\nline2'.match(/^\w+/gm); // ['line1', 'line2']

// Dotall — . matches newlines too
/start.end/s.test('start\nend'); // true
```

## Core Regex Methods

### `test()` — Boolean check

```javascript
const emailRegex = /^[\w.-]+@[\w.-]+\.\w{2,}$/;

emailRegex.test('user@example.com');  // true
emailRegex.test('not-an-email');      // false
```

### `match()` — Extract matches

```javascript
const text = 'Prices: $10, $25.50, $100';
const prices = text.match(/\$[\d.]+/g);
// ['$10', '$25.50', '$100']
```

### `replace()` — Substitute matches

```javascript
// Replace all dashes with underscores
'kebab-case-string'.replace(/-/g, '_');
// 'kebab_case_string'

// Use $1, $2 to reference capture groups
'John Smith'.replace(/(\w+)\s(\w+)/, '$2, $1');
// 'Smith, John'
```

### `split()` — Divide by pattern

```javascript
// Split on commas, semicolons, or spaces
'one, two; three four'.split(/[,;\s]+/);
// ['one', 'two', 'three', 'four']
```

## Character Classes and Quantifiers

| Pattern | Meaning |
|---------|---------|
| `\d` | Digit (0–9) |
| `\w` | Word char (a-z, A-Z, 0-9, _) |
| `\s` | Whitespace |
| `.` | Any char except newline |
| `[abc]` | Character set |
| `[^abc]` | Negated set |
| `{2,4}` | 2 to 4 repetitions |
| `+` | 1 or more |
| `*` | 0 or more |
| `?` | 0 or 1 (also makes quantifiers lazy) |

```javascript
// Match a US phone number
/^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test('(555) 123-4567'); // true

// Match 2–4 lowercase letters
/^[a-z]{2,4}$/.test('hello'); // false (too long)
/^[a-z]{2,4}$/.test('hi');    // true
```

## Capture Groups

Parentheses create capture groups you can extract:

```javascript
const dateStr = '2026-03-24';
const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
// match[1] = '2026', match[2] = '03', match[3] = '24'
```

### Named Capture Groups (ES2018+)

Use `(?<name>...)` for readable extractions:

```javascript
const regex = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const { year, month, day } = '2026-03-24'.match(regex).groups;
// year = '2026', month = '03', day = '24'
```

### Non-Capturing Groups

Use `(?:...)` when you need grouping without capture:

```javascript
// Match 'color' or 'colour' without capturing the 'u?'
/colo(?:u?)r/.test('colour'); // true
/colo(?:u?)r/.test('color');  // true
```

## Lookaheads and Lookbehinds

These match based on context without including the context in the match:

```javascript
// Positive lookahead: digits followed by 'px'
'font-size: 16px'.match(/\d+(?=px)/);  // ['16']

// Negative lookahead: digits NOT followed by 'px'
'width: 100%; height: 16px'.match(/\d+(?!px)/g);  // ['100']

// Positive lookbehind: digits preceded by '$'
'$50 or €30'.match(/(?<=\$)\d+/);  // ['50']

// Negative lookbehind
'$50 or £30'.match(/(?<!\$)\d+/g);  // ['30']
```

## Practical Patterns You'll Actually Use

### Email validation

```javascript
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
```

### URL parsing

```javascript
const urlRegex = /^(https?):\/\/([^\/\s]+)(\/[^\s]*)?$/;
const [, protocol, host, path] = 'https://devplaybook.cc/blog'.match(urlRegex);
```

### Slug generation

```javascript
function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
toSlug('Hello World! Regex Guide'); // 'hello-world-regex-guide'
```

### Password strength check

```javascript
function checkPassword(pwd) {
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasLowercase = /[a-z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[!@#$%^&*]/.test(pwd);
  const isLong = pwd.length >= 8;
  return hasUppercase && hasLowercase && hasDigit && hasSpecial && isLong;
}
```

### Extract hashtags from text

```javascript
const tweet = 'Loving #JavaScript and #regex today!';
const tags = tweet.match(/#\w+/g);
// ['#JavaScript', '#regex']
```

## Common Pitfalls

**Forgetting the `g` flag** — without it, `match()` returns only the first result and `replace()` only replaces the first occurrence.

**Catastrophic backtracking** — nested quantifiers like `(a+)+` can hang on long non-matching strings. Keep patterns specific.

**Escaping special characters** — if you're building regex from user input, escape it:

```javascript
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const userInput = 'hello.world';
const safe = new RegExp(escapeRegex(userInput));
```

## Test Your Regex

Use these tools to build and debug patterns interactively:

- [Regex Tester on DevPlaybook](/tools/regex-tester) — real-time matching with explanations
- [regex101.com](https://regex101.com) — full debugger with step-by-step matching

## Summary

| Task | Pattern |
|------|---------|
| Email | `/^[\w.+-]+@[\w-]+\.\w{2,}$/` |
| US Phone | `/^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/` |
| URL | `/^https?:\/\/[\w.-]+(\/[\w./?=%&-]*)?$/` |
| Date (ISO) | `/^\d{4}-\d{2}-\d{2}$/` |
| Hex color | `/^#([0-9a-f]{3}){1,2}$/i` |

Regex gets easier with practice. Start with simple patterns and layer in flags, groups, and lookaheads as needed. The payoff is huge — a single well-crafted expression can replace dozens of lines of string manipulation.
