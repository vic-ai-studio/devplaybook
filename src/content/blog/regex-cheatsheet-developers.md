---
title: "Regex Cheatsheet for Developers: Common Patterns with Examples"
description: "Complete regex cheatsheet for developers covering syntax, character classes, quantifiers, groups, lookaheads, and 20+ ready-to-use patterns for email, URL, date, and more."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["regex", "javascript", "python", "cheatsheet", "web-development", "validation"]
readingTime: "12 min read"
---

Regular expressions are one of those skills that pays dividends for years. Once you internalize the syntax, you can validate form inputs, parse log files, transform data, and search code — all with a few characters.

This cheatsheet covers the essential regex syntax, the most useful patterns, and practical examples you can use directly. Test all patterns in your browser with the [Regex Tester](/tools/regex-tester) — paste a pattern, test it against real input, and see matches highlighted live.

## Core Syntax Reference

### Character Matching

| Pattern | Matches |
|---------|---------|
| `.` | Any character except newline |
| `\d` | Digit (`0-9`) |
| `\D` | Non-digit |
| `\w` | Word character (`[a-zA-Z0-9_]`) |
| `\W` | Non-word character |
| `\s` | Whitespace (space, tab, newline) |
| `\S` | Non-whitespace |
| `\b` | Word boundary |
| `\B` | Non-word boundary |
| `^` | Start of string (or line with `m` flag) |
| `$` | End of string (or line with `m` flag) |
| `\n` | Newline |
| `\t` | Tab |

### Character Classes

```regex
[abc]       # Match a, b, or c
[^abc]      # Match anything except a, b, c
[a-z]       # Lowercase letters
[A-Z]       # Uppercase letters
[0-9]       # Digits (same as \d)
[a-zA-Z]    # All letters
[a-zA-Z0-9] # Alphanumeric (same as \w without _)
```

### Quantifiers

| Pattern | Meaning |
|---------|---------|
| `*` | 0 or more (greedy) |
| `+` | 1 or more (greedy) |
| `?` | 0 or 1 (optional) |
| `{n}` | Exactly n times |
| `{n,}` | n or more times |
| `{n,m}` | Between n and m times |
| `*?` | 0 or more (lazy/non-greedy) |
| `+?` | 1 or more (lazy/non-greedy) |

**Greedy vs Lazy:**

```regex
# Input: "<b>bold</b> and <i>italic</i>"

<.+>   # Greedy: matches "<b>bold</b> and <i>italic</i>" (entire string)
<.+?>  # Lazy: matches "<b>", "</b>", "<i>", "</i>" separately
```

### Groups and Alternation

```regex
(abc)       # Capturing group — stores match in $1, \1
(?:abc)     # Non-capturing group — groups without storing
(?P<name>abc) # Named group (Python) — access as match.group('name')
(?<name>abc)  # Named group (JS/PCRE)
a|b         # Alternation: match a or b
```

### Lookahead and Lookbehind

```regex
foo(?=bar)  # Positive lookahead: "foo" followed by "bar"
foo(?!bar)  # Negative lookahead: "foo" NOT followed by "bar"
(?<=foo)bar # Positive lookbehind: "bar" preceded by "foo"
(?<!foo)bar # Negative lookbehind: "bar" NOT preceded by "foo"
```

```javascript
// Lookahead example: price values without the $ sign
const prices = "$10.99, $5.00, free";
const amounts = prices.match(/(?<=\$)\d+\.\d{2}/g);
console.log(amounts); // ['10.99', '5.00']
```

### Flags

| Flag | Effect |
|------|--------|
| `i` | Case-insensitive |
| `g` | Global (find all matches, not just first) |
| `m` | Multiline (`^` and `$` match line start/end) |
| `s` | Dotall (`.` matches newlines too) |
| `u` | Unicode support |
| `x` | Extended (allow whitespace and comments — Python/Perl) |

## Regex in JavaScript

```javascript
// Test if a pattern matches
const pattern = /^\d{5}(-\d{4})?$/;
pattern.test('12345');       // true
pattern.test('12345-6789');  // true
pattern.test('1234');        // false

// Find first match
const match = 'Hello World 2024'.match(/\d+/);
console.log(match[0]);  // '2024'
console.log(match.index);  // 12

// Find all matches (global flag)
const all = 'abc 123 def 456'.match(/\d+/g);
console.log(all);  // ['123', '456']

// Capture groups
const date = '2024-03-15'.match(/(\d{4})-(\d{2})-(\d{2})/);
console.log(date[1], date[2], date[3]);  // '2024' '03' '15'

// Named groups
const { groups } = '2024-03-15'.match(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/);
console.log(groups.year, groups.month, groups.day);  // '2024' '03' '15'

// Replace
const clean = 'Hello   World'.replace(/\s+/g, ' ');
console.log(clean);  // 'Hello World'

// Replace with function
const result = 'foo_bar_baz'.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
console.log(result);  // 'fooBarBaz'

// Split
const parts = 'one, two,three ,four'.split(/\s*,\s*/);
console.log(parts);  // ['one', 'two', 'three', 'four']
```

## Regex in Python

```python
import re

# Compile for reuse (faster when using same pattern multiple times)
pattern = re.compile(r'^\d{5}(-\d{4})?$')

# Test match
print(bool(pattern.match('12345')))      # True
print(bool(pattern.match('12345-6789'))) # True
print(bool(pattern.match('1234')))       # False

# Find first match
m = re.search(r'\d+', 'Hello 2024 World')
print(m.group())   # '2024'
print(m.start())   # 6

# Find all matches
all_numbers = re.findall(r'\d+', 'abc 123 def 456')
print(all_numbers)  # ['123', '456']

# Capture groups
m = re.match(r'(\d{4})-(\d{2})-(\d{2})', '2024-03-15')
print(m.groups())  # ('2024', '03', '15')

# Named groups
m = re.match(r'(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})', '2024-03-15')
print(m.group('year'), m.group('month'), m.group('day'))  # 2024 03 15

# Replace
clean = re.sub(r'\s+', ' ', 'Hello   World')
print(clean)  # 'Hello World'

# Replace with function
def to_camel(m):
    return m.group(1).upper()
result = re.sub(r'_([a-z])', to_camel, 'foo_bar_baz')
print(result)  # 'fooBarBaz'

# Split
parts = re.split(r'\s*,\s*', 'one, two,three ,four')
print(parts)  # ['one', 'two', 'three', 'four']

# Flags
pattern = re.compile(r'hello', re.IGNORECASE | re.MULTILINE)
```

## 20 Ready-to-Use Patterns

### Email Validation

```regex
^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$
```

```javascript
const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
emailRegex.test('user@example.com');  // true
emailRegex.test('user@.com');         // false
```

### URL

```regex
https?:\/\/[^\s/$.?#].[^\s]*
```

### IPv4 Address

```regex
^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$
```

### Dates (YYYY-MM-DD)

```regex
^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$
```

### US Phone Number

```regex
^(\+1)?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$
```

### Credit Card Number

```regex
^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$
```

### Strong Password

```regex
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$
```

### Username (letters, digits, underscore, hyphen, 3-20 chars)

```regex
^[a-zA-Z0-9_\-]{3,20}$
```

### Hex Color Code

```regex
^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$
```

### ZIP Code (US)

```regex
^\d{5}(-\d{4})?$
```

### HTML Tag (opening)

```regex
<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>
```

### JSON String (basic)

```regex
"(\\.|[^"\\])*"
```

### Semver Version

```regex
^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$
```

### Git Commit Hash (short or full)

```regex
\b[0-9a-f]{7,40}\b
```

### JWT Token

```regex
^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$
```

### Markdown Link

```regex
\[([^\]]+)\]\(([^)]+)\)
```

### Log Timestamp (ISO 8601)

```regex
\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})
```

### Slug (URL-friendly string)

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

### Extract Domain from URL

```javascript
const domainRegex = /^(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/;
const match = 'https://www.example.com/path'.match(domainRegex);
console.log(match[1]); // 'example.com'
```

### Find All TODO Comments

```regex
\/\/\s*TODO:?\s*(.+)$
```

## Common Mistakes

**Forgetting to escape special characters:**
```regex
# Wrong: . matches any character
price\.99   # This matches "price.99", "priceX99", etc.

# Right: escape the dot
price\.99   # Only matches "price.99"
```

**Greedy matching when you want lazy:**
```regex
# Input: <span>text</span>
<.+>   # Greedy: matches the whole string
<.+?>  # Lazy: matches "<span>" and "</span>" separately
```

**Anchoring issues:**
```regex
# Without anchors: matches anywhere in string
\d+   # Matches "1" in "abc123def"

# With anchors: must match full string
^\d+$  # Only matches strings that are entirely digits
```

**Catastrophic backtracking:**
```regex
# Dangerous pattern on long strings with no match:
(a+)+b   # Exponential time complexity

# Safe alternative using possessive/atomic (where supported):
(?>a+)+b
# Or rewrite to avoid nested quantifiers
```

Test all these patterns and build new ones with the [Regex Tester](/tools/regex-tester) — it highlights matches, shows capture groups, and explains what each part of your expression does.
