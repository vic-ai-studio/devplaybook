---
title: "Regex Cheat Sheet: Complete Guide for Developers"
description: "The complete regex cheat sheet for developers in 2026. Master syntax, quantifiers, groups, lookaheads, and 30+ ready-to-use patterns for validation, parsing, and text transformation."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["regex", "javascript", "python", "cheatsheet", "web-development", "validation", "2026"]
readingTime: "14 min read"
---

Regular expressions are one of the highest-leverage skills a developer can own. A well-written regex can replace 50 lines of string-parsing logic. A poorly understood one can silently corrupt data or miss edge cases for years.

This guide is designed to be the last regex reference you'll need to bookmark. It covers core syntax, every major construct with practical examples, and a library of copy-paste patterns for the most common developer use cases. Use the [DevPlaybook Regex Tester](/tools/regex-tester) to run any pattern as you read.

---

## Core Syntax Reference

### Literal Characters and Escaping

Most characters match themselves. The following characters have special meaning and must be escaped with `\` when you want the literal character:

```
. * + ? ^ $ { } [ ] | ( ) \
```

```regex
# Match a literal period
\.

# Match a literal dollar sign
\$

# Match a literal parenthesis
\(
```

### The Dot

`.` matches any single character except a newline (by default).

```regex
c.t   # matches: cat, cot, cut, c3t, c@t
      # does NOT match: ct, cart
```

In dotall/single-line mode (`s` flag), `.` also matches newlines.

---

## Character Classes

| Syntax | Meaning |
|--------|---------|
| `[abc]` | a, b, or c |
| `[^abc]` | Any character except a, b, or c |
| `[a-z]` | Lowercase letter |
| `[A-Z]` | Uppercase letter |
| `[0-9]` | Any digit |
| `[a-zA-Z0-9]` | Alphanumeric |
| `[a-z0-9_-]` | Slug-safe characters |

### Shorthand Character Classes

| Class | Matches | Inverse |
|-------|---------|---------|
| `\d` | `[0-9]` digit | `\D` non-digit |
| `\w` | `[a-zA-Z0-9_]` word char | `\W` non-word |
| `\s` | `[ \t\n\r\f\v]` whitespace | `\S` non-whitespace |
| `\b` | Word boundary | `\B` non-boundary |

---

## Quantifiers

Quantifiers control how many times a pattern repeats.

| Syntax | Meaning |
|--------|---------|
| `*` | 0 or more (greedy) |
| `+` | 1 or more (greedy) |
| `?` | 0 or 1 (optional) |
| `{n}` | Exactly n times |
| `{n,}` | n or more times |
| `{n,m}` | Between n and m times |
| `*?` | 0 or more (lazy) |
| `+?` | 1 or more (lazy) |
| `??` | 0 or 1 (lazy) |

### Greedy vs. Lazy

By default, quantifiers are **greedy**—they match as much as possible.

```
Input:   <div>hello</div><div>world</div>
Greedy:  <div>.*</div>    → matches entire string
Lazy:    <div>.*?</div>   → matches <div>hello</div> only
```

Always prefer lazy quantifiers when extracting content between delimiters.

---

## Anchors

Anchors match positions, not characters.

| Anchor | Position |
|--------|----------|
| `^` | Start of string (or line with `m` flag) |
| `$` | End of string (or line with `m` flag) |
| `\b` | Word boundary |
| `\B` | Non-word boundary |
| `\A` | Start of string (Python, no multiline) |
| `\Z` | End of string (Python, no multiline) |

```regex
^\d{3}-\d{4}$   # Matches "555-1234" as entire string
\bcat\b          # Matches "cat" but not "catch" or "tomcat"
```

---

## Groups and Capturing

### Capturing Groups

Parentheses create a capturing group. The matched content is saved and can be referenced.

```regex
(\d{4})-(\d{2})-(\d{2})
# Group 1: year, Group 2: month, Group 3: day
```

In JavaScript:
```javascript
const match = '2026-03-21'.match(/(\d{4})-(\d{2})-(\d{2})/);
// match[1] = '2026', match[2] = '03', match[3] = '21'
```

### Non-Capturing Groups

`(?:...)` groups without saving.

```regex
(?:https?|ftp)://   # Group "https" or "http" or "ftp" without capturing
```

Use non-capturing groups when you need grouping for alternation or quantifiers but don't need the captured value.

### Named Capturing Groups

```regex
(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})
```

In JavaScript:
```javascript
const { year, month, day } = '2026-03-21'.match(
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/
).groups;
```

In Python:
```python
import re
m = re.match(r'(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})', '2026-03-21')
print(m.group('year'))  # '2026'
```

---

## Lookahead and Lookbehind

Lookarounds match positions without consuming characters.

| Syntax | Type | Meaning |
|--------|------|---------|
| `(?=...)` | Positive lookahead | Followed by |
| `(?!...)` | Negative lookahead | Not followed by |
| `(?<=...)` | Positive lookbehind | Preceded by |
| `(?<!...)` | Negative lookbehind | Not preceded by |

```regex
# Match price numbers (only the digits, not the $)
(?<=\$)\d+(\.\d{2})?

# Match "foo" not followed by "bar"
foo(?!bar)

# Match word not starting with uppercase
(?<![A-Z])\b\w+

# Match version numbers like "v2.1" but not "2.1"
(?<=v)\d+\.\d+
```

---

## Alternation

`|` matches either the left or right expression.

```regex
(cat|dog|fish)     # matches "cat", "dog", or "fish"
(jpg|jpeg|png|gif|webp)  # image extensions
```

Alternation is left-to-right: the regex engine tries the first option first and stops at the first match.

---

## Flags / Modifiers

| Flag | Meaning | JS | Python |
|------|---------|-----|--------|
| `i` | Case-insensitive | `/pattern/i` | `re.IGNORECASE` |
| `g` | Global (find all) | `/pattern/g` | `findall()` |
| `m` | Multiline (`^`/`$` per line) | `/pattern/m` | `re.MULTILINE` |
| `s` | Dotall (`.` matches `\n`) | `/pattern/s` | `re.DOTALL` |
| `x` | Verbose (ignore whitespace/comments) | n/a | `re.VERBOSE` |

---

## Backreferences

`\1`, `\2` etc. reference previously captured groups within the same pattern.

```regex
# Match repeated words like "the the"
\b(\w+)\s+\1\b

# Match opening and closing HTML tags
<(\w+)>.*?</\1>
```

---

## Ready-to-Use Patterns

Test any of these patterns with the [DevPlaybook Regex Tester](/tools/regex-tester).

### Email Address (RFC 5321 practical version)

```regex
^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$
```

Note: true RFC 5321 email validation is complex. This pattern handles 99% of real-world emails without being unreasonably strict.

### URL (http/https)

```regex
https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/=]*)
```

### IP Address (IPv4)

```regex
^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$
```

### IPv6 Address

```regex
^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$
```

### Phone Number (US)

```regex
^(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$
```

Matches: `(555) 123-4567`, `555-123-4567`, `+1 555.123.4567`

### Date (YYYY-MM-DD)

```regex
^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$
```

### Time (HH:MM or HH:MM:SS)

```regex
^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$
```

### UUID (v1-v5)

```regex
^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

### Semantic Version

```regex
^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$
```

Matches: `1.0.0`, `2.3.4-beta.1`, `3.0.0+build.123`

### Hex Color

```regex
^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$
```

### CSS Color (hex + named)

```regex
^(#[0-9A-Fa-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|[a-z]+)$
```

### Slug

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Matches: `my-blog-post`, `version-2-0`, `hello`

### Username (3-20 chars, alphanumeric + underscore)

```regex
^[a-zA-Z0-9_]{3,20}$
```

### Strong Password

```regex
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$
```

Requires: lowercase, uppercase, digit, special character, minimum 8 chars.

### Credit Card Number

```regex
^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})$
```

### JWT Token

```regex
^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$
```

### Base64 String

```regex
^[A-Za-z0-9+/]*={0,2}$
```

### HTML Tag

```regex
<\/?[a-z][a-z0-9]*(?:\s[^>]*)?>
```

### Markdown Link

```regex
\[([^\[\]]*)\]\(([^()]*)\)
```

Group 1: link text, Group 2: URL

### Git Commit Hash (short or long)

```regex
^[0-9a-f]{7,40}$
```

### Cron Expression (5-part)

```regex
^(\*|([0-9]|[1-5][0-9])|\*\/[0-9]+)\s+(\*|([0-9]|1[0-9]|2[0-3])|\*\/[0-9]+)\s+(\*|([1-9]|[12][0-9]|3[01])|\*\/[0-9]+)\s+(\*|([1-9]|1[0-2])|\*\/[0-9]+)\s+(\*|[0-6]|\*\/[0-9]+)$
```

---

## Language-Specific Tips

### JavaScript

```javascript
// Test if a string matches
const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

// Find all matches
const matches = text.matchAll(/(\w+)@(\w+)\.(\w+)/g);
for (const match of matches) {
  console.log(match[1]); // username
}

// Replace with function
const result = text.replace(/(\d+)/g, (match, num) => `[${parseInt(num) * 2}]`);

// Named groups
const { year, month } = date.match(/(?<year>\d{4})-(?<month>\d{2})/)?.groups ?? {};
```

### Python

```python
import re

# Compile for reuse (performance win)
EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')

# Check match
if EMAIL_RE.match(user_input):
    ...

# Find all matches
matches = re.findall(r'\d{3}-\d{4}', text)

# Named groups
m = re.search(r'(?P<year>\d{4})-(?P<month>\d{2})', date_str)
year = m.group('year') if m else None

# Substitute with function
result = re.sub(r'\d+', lambda m: str(int(m.group()) * 2), text)

# Verbose mode for complex patterns
pattern = re.compile(r'''
    ^
    (?P<protocol>https?|ftp)  # Protocol
    ://
    (?P<domain>[^/]+)         # Domain
    (?P<path>/.*)?            # Optional path
    $
''', re.VERBOSE)
```

---

## Common Mistakes to Avoid

### 1. Catastrophic Backtracking

Patterns like `(a+)+b` on a string like `aaaaaaaaac` will cause exponential backtracking—the regex engine tries every combination. Your application can hang.

**Fix:** Rewrite to be atomic or use possessive quantifiers if your engine supports them. Use atomic groups `(?>...)` where available.

### 2. Anchoring Only One End

```regex
# Bug: matches "abc123" anywhere in string
\d{5}

# Fix: anchor both ends
^\d{5}$

# Or use word boundaries if appropriate
\b\d{5}\b
```

### 3. Character Class Inside vs. Outside

```regex
# Wrong: matches "a", "b", or "c" followed by "+" literally
[abc+]   # the + inside [] is literal

# Correct: "a", "b", or "c" one-or-more times
[abc]+
```

### 4. Greedy Matching HTML

```regex
# Wrong: matches from first <div> to last </div>
<div>.*</div>

# Correct: lazy match
<div>.*?</div>

# Better: use an HTML parser for complex cases
```

### 5. Forgetting to Escape

```regex
# Wrong: matches any 3 chars, any digit, any 4 chars
.com.\d.html

# Correct
\.com\.\d\.html
```

---

## Testing Your Regex

The [DevPlaybook Regex Tester](/tools/regex-tester) lets you:

- Test patterns against multiple test strings simultaneously
- See match highlighting with group captures
- Switch between regex flags interactively
- Share patterns via URL

For complex patterns, always test against both **valid** cases that should match and **invalid** cases that should not. Edge cases that commonly break validation regex:

- Empty strings
- Unicode characters (é, ü, 中文)
- Very long strings (performance)
- Strings with only special characters
- Newlines and whitespace-only strings

---

## Conclusion

Regular expressions are a dense but bounded skill set. Once you internalize anchors, character classes, quantifiers, and groups, the patterns above become readable rather than arcane.

The most reliable workflow: write a pattern incrementally, testing each component as you go. Start with the most specific part of your target string, add anchors last, and always test edge cases that should *not* match.

Keep this cheat sheet handy, and reach for the [Regex Tester](/tools/regex-tester) whenever you need to validate a pattern in real time.

---

*Need to validate UUIDs with regex? Check out the [UUID Generator](/tools/uuid-generator) to understand UUID formats. Working with URL encoding? The [URL Encoder/Decoder](/tools/url-encoder) handles percent-encoding for you.*
