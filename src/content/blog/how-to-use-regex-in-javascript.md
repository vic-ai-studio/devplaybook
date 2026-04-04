---
title: "How to Use Regex in JavaScript: Complete Guide with Examples"
description: "Learn how to use regex in JavaScript with practical examples. Covers RegExp syntax, methods, flags, groups, lookaheads, named captures, performance tips, and real-world patterns for validation and parsing."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["javascript", "regex", "regexp", "string-manipulation", "web-development"]
readingTime: "12 min read"
---

# How to Use Regex in JavaScript: Complete Guide with Examples

Regular expressions (regex) are one of the most powerful — and most misunderstood — tools in JavaScript. Developers who get comfortable with regex write dramatically cleaner code: a single expression replaces dozens of lines of string manipulation, and form validation that took loops and conditions collapses to one readable test.

This guide covers everything from creating your first regex to advanced techniques like lookaheads, named groups, performance traps, and the real-world patterns you'll actually use.

---

## Creating a Regex in JavaScript

Two ways to create a regex:

```javascript
// Literal syntax — preferred for static patterns (compiled once)
const pattern = /hello/;

// Constructor syntax — for dynamic patterns built at runtime
const word = 'hello';
const dynamic = new RegExp(word);                 // /hello/
const withFlags = new RegExp(word, 'gi');          // /hello/gi

// Escaping special characters in dynamic patterns
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const userSearch = 'hello.world';
const safe = new RegExp(escapeRegex(userSearch));  // /hello\.world/
```

**When to use the constructor:** When the pattern includes variables, is built from user input, or changes at runtime. Always escape user input before using it in a RegExp constructor — failing to do so is a security vulnerability (ReDoS).

---

## Regex Flags

Flags change matching behavior:

```javascript
const str = 'Hello hello HELLO';

// i — case-insensitive matching
/hello/i.test(str);              // true
str.match(/hello/i);             // ['Hello']

// g — global: find ALL matches
str.match(/hello/gi);            // ['Hello', 'hello', 'HELLO']

// m — multiline: ^ and $ match line boundaries, not just string boundaries
'line1\nline2\nline3'.match(/^\w+/gm);  // ['line1', 'line2', 'line3']

// s — dotall: . matches newlines too
/start.end/s.test('start\nend');        // true (without s: false)

// u — unicode: enables full Unicode matching
/\p{Emoji}/u.test('🎉');               // true (ES2018+)

// d — indices: match.indices contains start/end positions of groups (ES2022+)
const m = 'foo bar'.match(/(?<word>\w+)/d);
// m.indices.groups.word = [0, 3]
```

You can combine flags: `/pattern/gim`

---

## Core Regex Methods

### `test()` — Boolean match

```javascript
const emailRegex = /^[\w.-]+@[\w.-]+\.\w{2,}$/;

emailRegex.test('user@example.com');     // true
emailRegex.test('not-an-email');         // false

// ⚠️ Gotcha: stateful regex with /g flag
const re = /\d/g;
re.test('abc1');  // true (lastIndex is now 4)
re.test('abc1');  // false! (search starts from lastIndex 4, finds nothing)
re.lastIndex = 0; // reset manually, or avoid /g with test()
```

### `match()` — Extract matches

```javascript
const text = 'Prices: $10, $25.50, $100';

// Without /g: returns first match + groups + index
const first = text.match(/\$[\d.]+/);
// ['$10', index: 8, input: '...']

// With /g: returns all matches as array (no groups)
const all = text.match(/\$[\d.]+/g);
// ['$10', '$25.50', '$100']
```

### `matchAll()` — All matches with groups (ES2020+)

```javascript
const html = '<a href="/about">About</a><a href="/blog">Blog</a>';
const linkRegex = /<a href="([^"]+)">([^<]+)<\/a>/g;

for (const match of html.matchAll(linkRegex)) {
  console.log(`URL: ${match[1]}, Text: ${match[2]}`);
}
// URL: /about, Text: About
// URL: /blog, Text: Blog

// Collect into array
const links = [...html.matchAll(linkRegex)].map(m => ({ url: m[1], text: m[2] }));
```

### `replace()` — Substitute matches

```javascript
// Replace all dashes with underscores
'kebab-case-string'.replace(/-/g, '_');
// 'kebab_case_string'

// Use captured groups in replacement: $1, $2, etc.
'John Smith'.replace(/(\w+)\s(\w+)/, '$2, $1');
// 'Smith, John'

// Use named groups in replacement: $<name>
'2026-03-24'.replace(
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/,
  '$<month>/$<day>/$<year>'
);
// '03/24/2026'

// Function as replacement — full control
'hello world'.replace(/\b\w/g, char => char.toUpperCase());
// 'Hello World'
```

### `replaceAll()` — Replace all without /g (ES2021+)

```javascript
'a.b.c'.replaceAll('.', '/');  // 'a/b/c'
// Equivalent to: 'a.b.c'.replace(/\./g, '/')
```

### `split()` — Divide by pattern

```javascript
// Split on commas, semicolons, or whitespace
'one, two; three  four'.split(/[,;\s]+/);
// ['one', 'two', 'three', 'four']

// Keep delimiters using a capture group
'hello world'.split(/(\s+)/);
// ['hello', ' ', 'world']
```

---

## Character Classes and Quantifiers

### Built-in Shorthand Classes

| Shorthand | Equivalent | Meaning |
|-----------|------------|---------|
| `\d` | `[0-9]` | Digit |
| `\D` | `[^0-9]` | Non-digit |
| `\w` | `[a-zA-Z0-9_]` | Word character |
| `\W` | `[^a-zA-Z0-9_]` | Non-word character |
| `\s` | `[ \t\n\r\f\v]` | Whitespace |
| `\S` | `[^ \t\n\r\f\v]` | Non-whitespace |
| `.` | `[^\n]` | Any char except newline |

### Quantifiers

| Quantifier | Meaning | Example |
|------------|---------|---------|
| `{n}` | Exactly n | `\d{4}` matches 4 digits |
| `{n,m}` | n to m | `\d{2,4}` matches 2-4 digits |
| `{n,}` | n or more | `\d{2,}` matches 2+ digits |
| `*` | 0 or more | `\w*` matches any word |
| `+` | 1 or more | `\w+` matches non-empty word |
| `?` | 0 or 1 | `colou?r` matches color or colour |

### Greedy vs Lazy

By default, quantifiers are **greedy** — they match as much as possible. Add `?` to make them **lazy** (match as little as possible):

```javascript
const html = '<b>bold</b> and <i>italic</i>';

// Greedy — matches from first < to last >
html.match(/<.+>/);    // '<b>bold</b> and <i>italic</i>'

// Lazy — matches the shortest possible segment
html.match(/<.+?>/);   // '<b>'
html.match(/<.+?>/g);  // ['<b>', '</b>', '<i>', '</i>']
```

---

## Capture Groups

### Numbered Groups

```javascript
const dateStr = '2026-03-24';
const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
// match[0] = '2026-03-24' (full match)
// match[1] = '2026', match[2] = '03', match[3] = '24'
```

### Named Capture Groups (ES2018+)

Named groups make regex readable and maintainable:

```javascript
const regex = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const { groups: { year, month, day } } = '2026-03-24'.match(regex);
// year = '2026', month = '03', day = '24'

// Using named groups in replace
const formatted = '2026-03-24'.replace(regex, '$<day>/$<month>/$<year>');
// '24/03/2026'
```

### Non-Capturing Groups

Use `(?:...)` when you need grouping logic but don't want a capture index:

```javascript
// Match 'color' or 'colour' — the 'u?' group isn't captured
/colo(?:u?)r/.test('colour');  // true
/colo(?:u?)r/.test('color');   // true

// Alternation without capturing
/(?:cat|dog|bird) food/.test('cat food');  // true
```

---

## Lookaheads and Lookbehinds

Lookaround assertions match based on context without consuming the context:

```javascript
// Positive lookahead (?=...) — followed by
'font-size: 16px'.match(/\d+(?=px)/);        // ['16']
'font-size: 16em'.match(/\d+(?=px)/);        // null

// Negative lookahead (?!...) — not followed by
'100% width'.match(/\d+(?!px|em|%)/g);       // null (all have units)
'100 items'.match(/\d+(?!\w)/g);             // ['100']

// Positive lookbehind (?<=...) — preceded by
'$50 price, €30 price'.match(/(?<=\$)\d+/);  // ['50']

// Negative lookbehind (?<!...) — not preceded by
'$50 but not €30'.match(/(?<!\$)\d+/g);      // ['30']
```

**Practical use case — password validation without global state:**

```javascript
function validatePassword(pwd) {
  const checks = {
    hasUppercase: /(?=.*[A-Z])/.test(pwd),
    hasLowercase: /(?=.*[a-z])/.test(pwd),
    hasDigit:     /(?=.*\d)/.test(pwd),
    hasSpecial:   /(?=.*[!@#$%^&*])/.test(pwd),
    isLong:       pwd.length >= 8
  };
  return {
    valid: Object.values(checks).every(Boolean),
    checks
  };
}

validatePassword('Secur3!x');
// { valid: true, checks: { hasUppercase: true, ... } }
```

---

## Practical Patterns for Real Projects

### Email Validation

```javascript
// RFC-compliant enough for UI validation (not 100% RFC 5321)
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
emailRegex.test('user@example.com');    // true
emailRegex.test('user@sub.domain.io'); // true
emailRegex.test('missing-at-sign');    // false
```

### URL Parsing

```javascript
const urlRegex = /^(?<protocol>https?):\/\/(?<host>[^\/\s]+)(?<path>\/[^\s?]*)?(?<query>\?[^\s]*)?$/;
const { groups } = 'https://devplaybook.cc/blog?page=2'.match(urlRegex) ?? {};
// groups.protocol = 'https', groups.host = 'devplaybook.cc'
// groups.path = '/blog', groups.query = '?page=2'
```

### Slug Generation

```javascript
function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD')                    // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')     // remove combining diacriticals
    .replace(/[^a-z0-9\s-]/g, '')       // remove non-alphanumeric
    .replace(/\s+/g, '-')               // spaces to hyphens
    .replace(/-+/g, '-')                // collapse multiple hyphens
    .replace(/^-|-$/g, '');             // trim leading/trailing hyphens
}

toSlug('Hello World! Régex Guide');     // 'hello-world-regex-guide'
toSlug('  Multiple   Spaces  ');       // 'multiple-spaces'
```

### Credit Card Number Formatting

```javascript
function formatCardNumber(input) {
  return input
    .replace(/\D/g, '')                 // remove non-digits
    .replace(/(\d{4})(?=\d)/g, '$1 '); // add space every 4 digits
}

formatCardNumber('4111111111111111');   // '4111 1111 1111 1111'
formatCardNumber('4111-1111-1111-1111'); // '4111 1111 1111 1111'
```

### Extract All URLs from HTML/Text

```javascript
function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^[\]`]+/g;
  return text.match(urlRegex) ?? [];
}

extractUrls('Visit https://example.com or https://devplaybook.cc/blog for more');
// ['https://example.com', 'https://devplaybook.cc/blog']
```

### Highlight Search Terms

```javascript
function highlight(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

highlight('JavaScript regex tutorial', 'regex');
// 'JavaScript <mark>regex</mark> tutorial'
```

---

## Performance Traps to Avoid

### Catastrophic Backtracking

Nested quantifiers on overlapping patterns can cause exponential backtracking — a regex that hangs your application on crafted input:

```javascript
// ❌ Vulnerable to catastrophic backtracking
const dangerous = /(a+)+b/;
dangerous.test('aaaaaaaaaaaaaaaaac');  // hangs for seconds or more

// ✅ Fixed — possessive quantifiers (not in JS) or rewritten logic
const safe = /a+b/;  // simplified if groups aren't needed
```

**Rule:** Avoid nested quantifiers on overlapping character classes. `(a+)+` and `(a*)*` are the classic antipatterns.

### Recompiling Regex in Loops

```javascript
// ❌ Slow — creates a new RegExp object on every iteration
users.filter(user => new RegExp(searchTerm, 'i').test(user.name));

// ✅ Fast — compile once, reuse
const searchRegex = new RegExp(escapeRegex(searchTerm), 'i');
users.filter(user => searchRegex.test(user.name));
```

### Stateful Global Regex with `test()`

```javascript
// ❌ Subtle bug — /g flag makes RegExp stateful
const re = /\d/g;
re.test('abc1');  // true — lastIndex moves to 4
re.test('abc1');  // false — starts searching from index 4, finds nothing

// ✅ Solutions
const re2 = /\d/;          // remove /g flag if you don't need all matches
re.lastIndex = 0;           // reset manually between tests
/\d/.test('abc1');          // create fresh literal each time (compiled once per source)
```

---

## Quick Reference Cheat Sheet

| Task | Pattern |
|------|---------|
| Email | `/^[\w.+-]+@[\w-]+\.\w{2,}$/` |
| US Phone | `/^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/` |
| URL | `/^https?:\/\/[\w.-]+(\/[\w./?=%&-]*)?$/` |
| Date ISO | `/^\d{4}-\d{2}-\d{2}$/` |
| Hex color | `/^#([0-9a-f]{3}){1,2}$/i` |
| IPv4 | `/^(\d{1,3}\.){3}\d{1,3}$/` |
| Slug | `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` |
| Username | `/^[a-zA-Z0-9_]{3,20}$/` |
| Credit card | `/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/` |
| Whitespace trim | `/^\s+|\s+$/g` (replace with `''`) |

---

## Testing and Debugging Tools

- [Regex Tester on DevPlaybook](/tools/regex-tester) — real-time matching with group breakdown
- [regex101.com](https://regex101.com) — full debugger with step-by-step match explanation and performance analysis

---

## Summary

Regex mastery in JavaScript comes down to:

1. **Right method for the job**: `test()` for boolean check, `match()` for extraction, `matchAll()` for all matches with groups, `replace()` for transformation
2. **Flags change everything**: `g` for all matches, `i` for case-insensitive, `m` for multiline, `s` for dotall
3. **Named groups** make complex regex readable: `(?<year>\d{4})`
4. **Lookaheads/lookbehinds** for context-dependent matching without consuming context
5. **Escape user input** before using it in `new RegExp()` — always
6. **Avoid nested quantifiers** on overlapping patterns — catastrophic backtracking is a real vulnerability

Start with simple patterns and add complexity as you understand the behavior. The payoff is that a well-crafted regex replaces 20 lines of imperative string manipulation with one readable expression.
