---
title: "Regex Cheat Sheet: The Only Regex Reference You'll Need in 2026"
description: "Complete regex cheat sheet with practical examples. Covers character classes, quantifiers, anchors, groups, lookaheads, and common patterns for JavaScript, Python, and Go."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["regex", "cheatsheet", "javascript", "python", "reference"]
readingTime: "3 min read"
---

# Regex Cheat Sheet: The Only Regex Reference You'll Need in 2026

## Character Classes

| Pattern | Matches |
|---------|---------|
| `.` | Any character except newline |
| `\d` | Any digit [0-9] |
| `\D` | Any non-digit |
| `\w` | Word character [a-zA-Z0-9_] |
| `\W` | Non-word character |
| `\s` | Whitespace (space, tab, newline) |
| `\S` | Non-whitespace |
| `[abc]` | Any of a, b, or c |
| `[^abc]` | Not a, b, or c |
| `[a-z]` | Any lowercase letter |

## Quantifiers

| Pattern | Meaning |
|---------|---------|
| `*` | 0 or more |
| `+` | 1 or more |
| `?` | 0 or 1 (optional) |
| `{n}` | Exactly n |
| `{n,}` | n or more |
| `{n,m}` | Between n and m |
| `*?` / `+?` | Lazy (minimum) match |

## Anchors

| Pattern | Meaning |
|---------|---------|
| `^` | Start of string (or line with `m` flag) |
| `$` | End of string (or line with `m` flag) |
| `\b` | Word boundary |
| `\B` | Non-word boundary |

## Common JavaScript Patterns

```javascript
// Email
/^[^\s@]+@[^\s@]+\.[^\s@]+$/

// URL
/https?:\/\/[^\s]+$/

// Phone (US)
/^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/

// IPv4
/^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/

// Date YYYY-MM-DD
/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/
```

## Lookahead and Lookbehind

```javascript
// Positive lookahead: X followed by Y
/(?=Y)X/

// Negative lookahead: X not followed by Y
/(?!Y)X/

// Positive lookbehind: X preceded by Y
/(?<=Y)X/

// Negative lookbehind: X not preceded by Y
/(?<!Y)X/

// Example: match "price" not preceded by "$"
/(?<!\$)\d+(\.\d{2})?/  // captures "49.99" but not "$49.99"
```

## Flags

| Flag | Meaning |
|------|---------|
| `g` | Global — find all matches |
| `i` | Case insensitive |
| `m` | Multiline — ^ and $ match line boundaries |
| `s` | Dotall — `.` matches newlines |
| `u` | Unicode |

## Python Example

```python
import re

# Find all emails
text = "Contact alice@example.com or bob@test.org"
emails = re.findall(r'[\w.+-]+@[\w.-]+', text)

# Validate and extract
pattern = r'^(\d{4})-(0[1-9]|1[0-2])-([0-9]{2})$'
match = re.match(pattern, "2026-03-24")
if match:
    year, month, day = match.groups()
```

## Common Mistakes

| Mistake | Correct Pattern |
|---------|----------------|
| Using `.+` when `.+?` is needed | `.+` is greedy — may over-match |
| Forgetting `^` and `$` anchors | Input might contain extra text around the match |
| Using `\d` in `[a-z]` ranges | `\d` is digits only, not the same as 0-9 in character classes |

## Testing Your Regex

Always test regex in isolation before using in production. Use a regex tester that shows:
- All matches highlighted
- Capture groups separated
- Step-by-step match explanation
