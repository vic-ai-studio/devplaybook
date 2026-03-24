---
title: "Regex Cheat Sheet with Examples: A Complete Developer Reference"
description: "The complete regex cheat sheet with real examples—metacharacters, quantifiers, anchors, groups, lookaheads, and common patterns for email, URL, phone, and date validation."
date: "2026-03-25"
author: "DevPlaybook Team"
tags: ["regex", "cheat-sheet", "reference", "developer-tools", "javascript", "python"]
readingTime: "11 min read"
---

Regular expressions are one of the most powerful and most misunderstood tools in a developer's toolkit. They look intimidating, they're hard to read after the fact, and the syntax varies subtly between languages. But mastering the core patterns unlocks a capability you'll use constantly—pattern matching, validation, extraction, and transformation across text.

This is the regex cheat sheet you'll actually bookmark: complete coverage of the syntax, real examples for each concept, and the common patterns you'll copy-paste into production code.

Test any pattern from this guide in the [DevPlaybook regex playground](/tools/regex-playground)—real-time highlighting, group visualization, and pattern explanation built in.

---

## Core Concepts

### What Regex Matches

A regular expression is a sequence of characters that defines a search pattern. When you apply a regex to a string, the engine scans the string looking for substrings that match the pattern.

Most characters in a regex match themselves literally. `cat` matches the sequence "cat" anywhere in the string. Special characters (metacharacters) have special meanings—they match classes of characters, positions, or control how patterns are applied.

---

## Metacharacters Reference

These characters have special meaning in regex. To match them literally, escape with backslash.

| Character | Meaning | Example | Matches |
|-----------|---------|---------|---------|
| `.` | Any character except newline | `c.t` | cat, cut, c3t |
| `*` | 0 or more of preceding | `ab*c` | ac, abc, abbc |
| `+` | 1 or more of preceding | `ab+c` | abc, abbc (not ac) |
| `?` | 0 or 1 of preceding | `colou?r` | color, colour |
| `{n}` | Exactly n occurrences | `a{3}` | aaa |
| `{n,}` | n or more occurrences | `a{2,}` | aa, aaa, aaaa |
| `{n,m}` | Between n and m occurrences | `a{2,4}` | aa, aaa, aaaa |
| `^` | Start of string (or line) | `^Hello` | String starting with "Hello" |
| `$` | End of string (or line) | `world$` | String ending with "world" |
| `\|` | Alternation (OR) | `cat\|dog` | cat or dog |
| `()` | Grouping and capture | `(ab)+` | ab, abab, ababab |
| `[]` | Character class | `[aeiou]` | Any vowel |
| `[^]` | Negated character class | `[^0-9]` | Any non-digit |
| `\` | Escape next character | `\.` | Literal period |

---

## Character Classes

Character classes let you match any character from a set.

### Built-in Shorthand Classes

| Pattern | Equivalent | Matches |
|---------|-----------|---------|
| `\d` | `[0-9]` | Any digit |
| `\D` | `[^0-9]` | Any non-digit |
| `\w` | `[a-zA-Z0-9_]` | Word character |
| `\W` | `[^a-zA-Z0-9_]` | Non-word character |
| `\s` | `[ \t\r\n\f]` | Whitespace |
| `\S` | `[^ \t\r\n\f]` | Non-whitespace |
| `\b` | *(zero-width)* | Word boundary |
| `\B` | *(zero-width)* | Non-word boundary |

### Custom Character Classes

```
[aeiou]          # matches a, e, i, o, or u
[a-z]            # matches any lowercase letter
[A-Z]            # matches any uppercase letter
[0-9]            # matches any digit (same as \d)
[a-zA-Z]         # matches any letter
[a-zA-Z0-9]      # matches any alphanumeric character
[^aeiou]         # matches anything EXCEPT a vowel
[a-z&&[^aeiou]]  # (Java) lowercase consonants — intersection
```

**Examples:**

```
Pattern: [A-Z][a-z]+
Input:   "Hello World"
Match:   "Hello", "World"

Pattern: [0-9]{3}-[0-9]{4}
Input:   "Call 555-1234 today"
Match:   "555-1234"
```

---

## Quantifiers

Quantifiers control how many times a pattern repeats.

### Greedy vs. Lazy

By default, quantifiers are **greedy**—they match as much as possible.

```
Pattern: <.+>
Input:   "<b>bold</b>"
Match:   "<b>bold</b>"  (greedy: matched everything between first < and last >)
```

Add `?` after a quantifier to make it **lazy**—match as little as possible.

```
Pattern: <.+?>
Input:   "<b>bold</b>"
Matches: "<b>", "</b>"  (lazy: stops at first >)
```

### Quantifier Reference

| Pattern | Name | Description |
|---------|------|-------------|
| `*` | Star | 0 or more (greedy) |
| `+` | Plus | 1 or more (greedy) |
| `?` | Question | 0 or 1 (optional) |
| `{n}` | Exact | Exactly n times |
| `{n,}` | At least | n or more times |
| `{n,m}` | Range | Between n and m times |
| `*?` | Lazy star | 0 or more (lazy) |
| `+?` | Lazy plus | 1 or more (lazy) |
| `??` | Lazy question | 0 or 1 (lazy) |

---

## Anchors

Anchors don't match characters—they match positions in the string.

```
^        # Start of string (or line in multiline mode)
$        # End of string (or before final newline)
\b       # Word boundary (between \w and \W)
\B       # Non-word boundary
\A       # Start of string (Python/Ruby, not affected by multiline)
\Z       # End of string (Python/Ruby)
```

**Examples:**

```
Pattern: ^\d{5}$
Purpose: Exactly 5 digits (US zip code, no extra characters)
Matches: "12345"
Rejects: " 12345", "123456", "1234a"

Pattern: \bcat\b
Purpose: Word "cat" not part of another word
Matches: "the cat sat" → "cat"
Rejects: "concatenate" (no match)

Pattern: ^
In multiline mode matches start of each line, not just string start
```

---

## Groups and Capturing

### Capturing Groups `()`

Parentheses create a group that captures the matched text. Groups are numbered from 1, left to right.

```
Pattern: (\d{4})-(\d{2})-(\d{2})
Input:   "2026-03-25"
Match:   "2026-03-25"
Group 1: "2026"
Group 2: "03"
Group 3: "25"
```

In JavaScript:

```javascript
const dateRegex = /(\d{4})-(\d{2})-(\d{2})/;
const match = "2026-03-25".match(dateRegex);
console.log(match[1]); // "2026"
console.log(match[2]); // "03"
console.log(match[3]); // "25"
```

### Named Capture Groups `(?<name>...)`

Named groups make your regex self-documenting.

```
Pattern: (?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})
Input:   "2026-03-25"

In JavaScript:
const match = "2026-03-25".match(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/);
console.log(match.groups.year);  // "2026"
console.log(match.groups.month); // "03"
```

### Non-Capturing Groups `(?:...)`

When you need to group for alternation or quantifiers but don't need to capture:

```
Pattern: (?:https?://)?(?:www\.)?example\.com
Purpose: Match example.com with optional protocol and www
Matches: "example.com", "www.example.com", "https://example.com"
```

### Backreferences `\1`, `\2` (or `\k<name>`)

Reference a previously captured group within the same pattern.

```
Pattern: (\w+)\s+\1
Purpose: Match duplicated words
Input:   "the the problem"
Match:   "the the"

Named: (?<word>\w+)\s+\k<word>
```

---

## Lookarounds

Lookarounds match a position relative to a pattern without including it in the match. They're zero-width—they don't consume characters.

### Lookahead `(?=...)`

Match if followed by pattern (positive lookahead):

```
Pattern: \d+(?= dollars)
Input:   "100 dollars and 200 euros"
Match:   "100" (only "100" is followed by " dollars")
```

### Negative Lookahead `(?!...)`

Match if NOT followed by pattern:

```
Pattern: \d+(?! dollars)
Input:   "100 dollars and 200 euros"
Match:   "200" (only "200" is not followed by " dollars")
```

### Lookbehind `(?<=...)`

Match if preceded by pattern (positive lookbehind):

```
Pattern: (?<=\$)\d+
Input:   "Price: $199 and €299"
Match:   "199" (only "199" is preceded by "$")
```

### Negative Lookbehind `(?<!...)`

Match if NOT preceded by pattern:

```
Pattern: (?<!\$)\d+
Input:   "Price: $199 and 299 euros"
Match:   "299" (only "299" is not preceded by "$")
```

---

## Flags

Flags modify regex behavior globally.

| Flag | Meaning | Example |
|------|---------|---------|
| `i` | Case-insensitive | `/hello/i` matches "Hello", "HELLO" |
| `g` | Global (find all matches) | `/\d+/g` finds all numbers |
| `m` | Multiline (^ and $ match line start/end) | `/^\d/m` |
| `s` | Dotall (. matches newlines too) | `/a.b/s` matches "a\nb" |
| `u` | Unicode (proper Unicode support) | Required for Unicode escapes |
| `y` | Sticky (match at lastIndex only) | For streaming/sequential matching |

---

## Common Patterns

These are production-tested patterns for common validation needs. Test them in the [regex playground](/tools/regex-playground) before use.

### Email Validation

```
Basic:   [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
Strict:  ^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$
```

Note: Email validation via regex is inherently imperfect. The full RFC 5321 specification allows patterns that break most regex. For production, use a library or verify via sending.

### URL Validation

```
Pattern: https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s]*
Simple:  ^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$
```

### IP Address (IPv4)

```
Pattern: ^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$
```

Breaking it down:
- `25[0-5]` matches 250-255
- `2[0-4]\d` matches 200-249
- `[01]?\d\d?` matches 0-199
- `\.` matches literal period
- `{3}` repeats the octet+period group 3 times
- Final group matches last octet (no trailing period)

### Phone Numbers

```
US format:    ^\+?1?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$
International: ^\+?[\d\s\-().]{10,20}$
```

### Date Formats

```
YYYY-MM-DD:  ^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$
MM/DD/YYYY:  ^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$
```

### Hex Color Code

```
Pattern: ^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$
Matches: #FF5733, #fff, FF5733, f0f
```

### Password Strength

```
At least 8 chars, one uppercase, one lowercase, one digit, one special char:
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$
```

Breaking down the lookaheads:
- `(?=.*[a-z])` — must contain a lowercase letter
- `(?=.*[A-Z])` — must contain an uppercase letter
- `(?=.*\d)` — must contain a digit
- `(?=.*[@$!%*?&])` — must contain a special character

### Credit Card Numbers

```
Visa:        ^4[0-9]{12}(?:[0-9]{3})?$
Mastercard:  ^5[1-5][0-9]{14}$
Amex:        ^3[47][0-9]{13}$
Generic:     ^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})$
```

### Username Validation

```
Alphanumeric + underscore, 3-16 chars:
^[a-zA-Z0-9_]{3,16}$

Alphanumeric + hyphen + underscore, no leading/trailing special chars:
^[a-zA-Z0-9](?:[a-zA-Z0-9_-]{1,14}[a-zA-Z0-9])?$
```

### HTML Tags

```
Match tag:        <[^>]+>
Match opening:    <[^/][^>]*>
Match closing:    </[^>]+>
Match with attrs: <(\w+)(?:\s+\w+="[^"]*")*\s*\/?>
```

Note: Don't use regex for comprehensive HTML parsing—use a proper HTML parser. These patterns work for simple use cases.

### SQL Injection Detection

```
Pattern: (\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)|('|--|\bOR\b|\bAND\b)(?=.*=)
```

Use this for detection/logging, not as a security barrier. Real SQL injection prevention requires parameterized queries.

### Extract JSON Values

```
String value:  "key"\s*:\s*"([^"]*)"
Number value:  "key"\s*:\s*(-?\d+(?:\.\d+)?)
Boolean value: "key"\s*:\s*(true|false|null)
```

### Version Numbers

```
Semantic versioning (semver): ^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?(?:\+[a-zA-Z0-9.]+)?$
```

---

## Language-Specific Notes

### JavaScript

```javascript
// Create regex
const pattern = /^\d{5}$/;
const pattern2 = new RegExp('^\\d{5}$', 'g');  // escape in string

// Test
pattern.test("12345");   // true
pattern.test("1234");    // false

// Match
"hello world".match(/\w+/g);  // ["hello", "world"]

// Replace
"foo bar".replace(/\b\w/g, c => c.toUpperCase());  // "Foo Bar"

// Split
"a,b,,c".split(/,+/);  // ["a", "b", "c"]
```

### Python

```python
import re

# Match at start
re.match(r'^\d+', '123abc')  # matches "123"

# Search anywhere
re.search(r'\d+', 'abc123def')  # matches "123"

# Find all
re.findall(r'\d+', 'a1b22c333')  # ['1', '22', '333']

# Replace
re.sub(r'\s+', ' ', 'too  many   spaces')  # 'too many spaces'

# Compile for reuse
pattern = re.compile(r'\b\w{4}\b')
pattern.findall('this is a test')  # ['this', 'test']
```

### Go

```go
import "regexp"

pattern := regexp.MustCompile(`^\d{5}$`)
pattern.MatchString("12345")  // true

// Find all matches
words := regexp.MustCompile(`\w+`).FindAllString("hello world", -1)
// ["hello", "world"]
```

---

## Debugging Tips

**Start simple, add complexity**: Begin with a literal match and add metacharacters one at a time. The [regex playground](/tools/regex-playground) shows you what each addition changes.

**Visualize groups**: When capture groups aren't returning what you expect, number them explicitly in your test and visualize which group captures what.

**Watch out for greedy matching**: If your match extends further than expected, switch to lazy quantifiers (`+?` instead of `+`).

**Anchor when validating**: For form validation, always use `^` and `$`. Without anchors, `/\d{5}/` matches "123456" (it finds "12345" or "23456" within it).

**Test edge cases**: Empty string, single character, special characters in input, Unicode. Regex behavior on edge cases is where bugs hide.

**Use the [AI regex explainer](/tools/ai-regex-explainer)**: For inherited patterns you don't understand, paste the regex and get a plain-English explanation of what each part does.

---

## Quick Reference Card

```
ANCHORS          QUANTIFIERS      CHARACTER CLASSES
^  start         *  0 or more     \d  digit [0-9]
$  end           +  1 or more     \D  non-digit
\b word bound    ?  0 or 1        \w  word char
\B non-boundary  {n} exactly n   \W  non-word
                 {n,} n or more   \s  whitespace
GROUPS           {n,m} n to m     \S  non-whitespace
()  capture      *? lazy          .   any char (not \n)
(?:) non-capture +? lazy
(?<n>) named     ?? lazy

LOOKAROUNDS
(?=...) positive lookahead
(?!...) negative lookahead
(?<=..) positive lookbehind
(?<!..) negative lookbehind

FLAGS
i  case insensitive
g  global (all matches)
m  multiline
s  dotall (. matches \n)
```

---

Test any pattern from this guide in the [DevPlaybook regex playground](/tools/regex-playground). Real-time highlighting, group capture visualization, and match explanation—all in the browser.
