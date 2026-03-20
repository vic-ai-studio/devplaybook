---
title: "Regex Cheat Sheet for Developers: Master Regular Expressions"
description: "The ultimate regex cheat sheet for developers. Learn regular expression syntax, patterns, and practical examples to master text matching, validation, and extraction."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["regex", "regular-expressions", "programming", "cheat-sheet", "patterns"]
readingTime: "12 min read"
---

Regular expressions — often shortened to **regex** or **regexp** — are one of those tools that separate developers who _handle_ text from developers who _master_ it. Whether you're validating user input, scraping structured data, parsing log files, or writing a find-and-replace in your editor, a solid grasp of regex pays dividends every single day.

This **regex cheat sheet** is designed to serve two purposes at once: a quick-reference guide you can scan in 30 seconds when you forget a specific syntax, and a structured tutorial that teaches you the reasoning behind each concept. Bookmark it, come back often, and when you're ready to experiment, use the [Regex Tester](/tools/regex-tester) to test your patterns live without leaving your browser.

---

## Basic Characters and Literals

At the most fundamental level, a regular expression is just a string of characters that describes a search pattern. Literal characters match themselves exactly.

```
hello        → matches the exact string "hello"
Hello        → matches "Hello" (case-sensitive by default)
42           → matches the digits "42"
```

But some characters carry special meaning. These are called **metacharacters**, and they need to be escaped with a backslash `\` when you want to match them literally.

### Metacharacters to Escape

```
\.   → literal dot
\*   → literal asterisk
\+   → literal plus
\?   → literal question mark
\(   → literal open parenthesis
\)   → literal close parenthesis
\[   → literal open bracket
\{   → literal open brace
\^   → literal caret
\$   → literal dollar sign
\|   → literal pipe
\\   → literal backslash
```

### The Dot Wildcard

The dot `.` is perhaps the most commonly used metacharacter. It matches **any single character** except a newline (in most engines).

```
c.t      → matches "cat", "cut", "c3t", "c!t" — but not "ct" or "coat"
.at      → matches "bat", "cat", "hat", "rat", "#at"
```

**Practical use case:** Matching unknown characters in a pattern where you know the surrounding structure but not every character — for example, parsing log lines where a status code position is fixed.

---

## Quantifiers: Control How Much You Match

Quantifiers tell the regex engine how many times a token should be matched. They always apply to the immediately preceding element.

### Core Quantifiers

```
*      → 0 or more times
+      → 1 or more times
?      → 0 or 1 time (makes the preceding element optional)
{n}    → exactly n times
{n,}   → n or more times
{n,m}  → between n and m times (inclusive)
```

### Examples in Context

```
colou?r       → matches "color" and "colour" (u is optional)
\d+           → matches "1", "42", "8675309" (one or more digits)
\d{3}-\d{4}  → matches "555-1234" (phone number segment)
a{2,4}        → matches "aa", "aaa", "aaaa" — not "a" or "aaaaa"
.*            → matches anything (including empty string)
.+            → matches anything with at least one character
```

### Greedy vs. Lazy

By default, quantifiers are **greedy** — they match as much as possible. Adding a `?` after any quantifier makes it **lazy** — it matches as little as possible.

```
# Input: "<b>bold</b> and <i>italic</i>"

<.*>      → greedy: matches "<b>bold</b> and <i>italic</i>" (entire string)
<.*?>     → lazy:   matches "<b>", then "</b>", then "<i>", then "</i>"
```

This distinction matters enormously when parsing HTML, JSON, or any format with repeating delimiters. When in doubt, test both behaviors in the [Regex Playground](/tools/regex-playground) before committing to a pattern.

---

## Anchors: Pin Your Pattern to a Position

Anchors don't match characters — they match **positions** within the string. They're critical for ensuring your pattern doesn't match inside a longer word or at an unexpected location.

```
^      → start of string (or start of line in multiline mode)
$      → end of string (or end of line in multiline mode)
\b     → word boundary (transition between \w and \W)
\B     → NOT a word boundary
\A     → absolute start of string (Python, Java, .NET)
\Z     → absolute end of string (Python, Java, .NET)
```

### Anchor Examples

```
^hello         → matches "hello world" but NOT "say hello"
world$         → matches "hello world" but NOT "worldwide"
^hello world$  → matches the exact string "hello world" only
\bcat\b        → matches "cat" in "the cat sat" but NOT in "concatenate"
\Bcat\B        → matches "cat" in "concatenate" but NOT "the cat"
```

**Practical use case:** Form validation. To ensure a username field contains only allowed characters and nothing else:

```
^[a-zA-Z0-9_]{3,20}$
```

This anchors the pattern to the full input, rejecting anything with extra characters before or after.

---

## Character Classes: Match From a Set

A character class, written inside square brackets `[...]`, matches **one character** from the defined set.

### Basic Character Classes

```
[aeiou]       → matches any single vowel
[a-z]         → matches any lowercase letter
[A-Z]         → matches any uppercase letter
[0-9]         → matches any digit
[a-zA-Z0-9]   → matches any alphanumeric character
[^aeiou]      → matches any character that is NOT a vowel (negated class)
[a-z0-9_\-]   → matches lowercase letters, digits, underscore, or hyphen
```

### Shorthand Character Classes

These are so common that regex engines provide shorthand aliases:

```
\d    → [0-9]            — any digit
\D    → [^0-9]           — any non-digit
\w    → [a-zA-Z0-9_]     — any word character
\W    → [^\w]            — any non-word character
\s    → [ \t\r\n\f\v]    — any whitespace character
\S    → [^\s]            — any non-whitespace character
```

### Combining Classes in Patterns

```
\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}
→ rough match for an IPv4 address like "192.168.1.1"

[A-Z][a-z]+
→ matches a capitalized word like "Hello" or "World"

[\w\.\-]+@[\w\.\-]+\.\w{2,}
→ simplified email pattern
```

---

## Groups and Backreferences: Capture and Reuse

Parentheses `(...)` serve two roles in regex: they **group** tokens (so quantifiers apply to the whole group) and they **capture** the matched text for later reference.

### Grouping

```
(ha)+          → matches "ha", "haha", "hahaha"
(foo|bar)baz   → matches "foobaz" or "barbaz"
(\d{1,3}\.){3}\d{1,3}
               → cleaner IPv4 pattern using a repeated group
```

### Capturing Groups

Each `(...)` in your pattern creates a numbered group. The first group is `\1`, the second is `\2`, and so on.

```
# Input: "2026-03-20"
(\d{4})-(\d{2})-(\d{2})
→ Group 1: "2026", Group 2: "03", Group 3: "20"

# Reformat date using backreferences (in replacement string):
# Replace with: $3/$2/$1  →  "20/03/2026"
```

### Named Groups

Named groups make complex patterns dramatically more readable:

```
(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})   # Python syntax
(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})       # .NET / JS syntax
```

### Non-Capturing Groups

When you need grouping behavior but don't need to capture, use `(?:...)`:

```
(?:foo|bar)baz   → groups "foo|bar" but doesn't capture
```

This is a performance win for complex patterns with many alternatives, and it avoids polluting your capture group numbering.

---

## Lookahead and Lookbehind: Assert Context Without Consuming

Lookarounds let you match a pattern only when it's **preceded or followed** by another pattern — without including that surrounding context in the match itself. They're zero-width assertions: they look but don't consume.

### Lookahead

```
(?=...)    → positive lookahead — must be followed by
(?!...)    → negative lookahead — must NOT be followed by
```

```
\d+(?= dollars)    → matches the number in "100 dollars" but not in "100 euros"
\w+(?!\.com)       → matches domain names that don't end in ".com"
```

### Lookbehind

```
(?<=...)   → positive lookbehind — must be preceded by
(?<!...)   → negative lookbehind — must NOT be preceded by
```

```
(?<=\$)\d+        → matches digits preceded by "$", e.g., "500" in "$500"
(?<!un)happy      → matches "happy" in "happy" but not in "unhappy"
```

### Real-World Lookaround Example

Extracting version numbers from a string like `"Version: 3.4.1"`:

```
(?<=Version: )\d+\.\d+\.\d+
→ matches "3.4.1" without including "Version: " in the result
```

---

## Common Regex Patterns You'll Actually Use

This is the section most developers bookmark. Below is a curated **regex cheat sheet** of production-ready patterns for everyday validation and extraction tasks.

### Email Address

```regex
^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$
```

Covers the vast majority of real-world email addresses. For true RFC 5322 compliance, the pattern becomes prohibitively complex — this pragmatic version handles 99%+ of cases.

### URL (HTTP/HTTPS)

```regex
https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)
```

### IP Address (IPv4)

```regex
^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$
```

This pattern properly validates each octet (0–255), unlike simpler `\d{1,3}` approaches that would accept `999.999.999.999`.

### Date (YYYY-MM-DD)

```regex
^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$
```

### US Phone Number

```regex
^(\+1\s?)?(\(?\d{3}\)?[\s.\-]?)?\d{3}[\s.\-]?\d{4}$
```

Handles formats: `555-1234`, `(555) 123-4567`, `+1 555.123.4567`.

### Hex Color Code

```regex
^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$
```

Matches both `#ff5733` (full) and `#f53` (shorthand).

### Credit Card Number (Basic Structure)

```regex
^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$
```

Identifies Visa, Mastercard, Amex, and Discover by their leading digit patterns.

### Slug (URL-Friendly String)

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Ensures slugs like `my-blog-post` are valid — lowercase, hyphen-separated, no trailing hyphens.

### Strong Password

```regex
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$
```

Requires at least 8 characters with at least one lowercase letter, one uppercase letter, one digit, and one special character. Uses lookaheads to enforce all four conditions simultaneously.

### Semantic Version (SemVer)

```regex
^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$
```

Fully compliant with the SemVer 2.0.0 specification, including pre-release and build metadata.

### JWT Token

```regex
^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$
```

Matches the three base64url-encoded segments separated by dots.

---

## Flags and Modifiers

Flags change how the entire pattern is interpreted. They're typically appended after the closing delimiter or passed as a second argument.

```
i   → case-insensitive matching
g   → global (find all matches, not just the first)
m   → multiline (^ and $ match line boundaries, not just string boundaries)
s   → dotAll / singleline (. matches newlines too)
x   → extended / verbose (allows whitespace and comments in pattern)
u   → unicode (treat pattern and input as Unicode)
```

### JavaScript Examples

```javascript
/hello/i.test("Hello World")          // true — case-insensitive
"aababab".match(/a/g)                 // ["a", "a", "a"] — global
"line1\nline2".match(/^\w+$/gm)       // ["line1", "line2"] — multiline
```

---

## Language-Specific Tips and Gotchas

Different languages and engines have subtle differences. This section highlights the most impactful ones.

### JavaScript

- Use `/pattern/flags` literal syntax or `new RegExp(string, flags)` for dynamic patterns.
- `String.prototype.match()` with `g` flag returns an array of matches but **no capture groups**.
- Use `String.prototype.matchAll()` (ES2020) to get an iterator with both full matches and capture groups.
- Named groups use `(?<name>...)` syntax; access via `match.groups.name`.

```javascript
const re = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const { year, month, day } = "2026-03-20".match(re).groups;
```

### Python

- Use the `re` module. Always use raw strings `r"pattern"` to avoid backslash hell.
- `re.match()` anchors at the start; `re.search()` searches anywhere; `re.fullmatch()` requires the entire string to match.
- Named groups use `(?P<name>...)` syntax; access via `match.group('name')`.

```python
import re
pattern = re.compile(r'(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})')
m = pattern.search("Date: 2026-03-20")
print(m.group('year'))  # "2026"
```

### Go

- The `regexp` package uses RE2 syntax — **no lookaheads or lookbehinds**.
- All quantifiers are greedy by default; append `?` to make lazy.
- Use `MustCompile` for patterns known at compile time (panics if invalid, catches bugs early).

```go
re := regexp.MustCompile(`\d{4}-\d{2}-\d{2}`)
match := re.FindString("Today is 2026-03-20")
```

### .NET / C#

- Use `System.Text.RegularExpressions.Regex`.
- Supports named groups with both `(?<name>...)` and `(?'name'...)` syntax.
- Has `RegexOptions.Compiled` which JIT-compiles the pattern for repeated use — significant performance gain in hot paths.

```csharp
var match = Regex.Match("2026-03-20", @"(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})");
string year = match.Groups["year"].Value;
```

### Bash / grep / sed

- Use `grep -E` (extended regex) or `grep -P` (Perl-compatible) for modern syntax.
- `sed` uses BRE (basic regex) by default; use `-E` for ERE.
- In BRE, groups require `\(` and `\)` rather than plain `(` and `)`.

```bash
# Extract all IP addresses from a log file
grep -oP '\b(?:\d{1,3}\.){3}\d{1,3}\b' access.log

# Replace YYYY-MM-DD dates with DD/MM/YYYY
sed -E 's/([0-9]{4})-([0-9]{2})-([0-9]{2})/\3\/\2\/\1/g' dates.txt
```

---

## Performance Tips for Production Regex

A poorly written regex can grind your application to a halt. Here are the most important optimizations:

**1. Avoid catastrophic backtracking.** Patterns like `(a+)+b` on a string like `"aaaaaaaaaaaac"` cause exponential backtracking. Restructure to eliminate ambiguity in what each group matches.

**2. Compile patterns once, reuse them.** In every language, compiling a regex has overhead. If you're running the same pattern thousands of times, compile it once and cache the result.

**3. Be specific, not general.** `[a-z]+` is faster than `\w+` if you only expect lowercase letters, because it eliminates unnecessary character class checks.

**4. Use non-capturing groups `(?:...)` when you don't need the capture.** Capture groups add overhead because the engine must track match positions.

**5. Anchor when possible.** `^` and `$` allow the engine to fail fast rather than testing the pattern at every position.

You can profile and debug all of these behaviors visually in the [Regex Playground](/tools/regex-playground) — it shows match steps and helps identify performance bottlenecks before they hit production.

---

## Regex in API Development

When building APIs, regex shows up in more places than you might expect: route matching, request validation, header parsing, and log analysis. If you're designing or testing API endpoints, the [API Request Builder](/tools/api-request-builder) pairs naturally with regex-based validation — you can craft requests with edge-case inputs and immediately verify your backend patterns handle them correctly.

Common API-related regex tasks:

```
# Match a UUID in a route parameter
[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}

# Extract Bearer token from Authorization header
(?<=Bearer )[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*

# Validate Content-Type header
^(application/json|application/x-www-form-urlencoded|multipart/form-data)(;\s*charset=[\w-]+)?$

# Match API version in path: /v1/, /v2/, /v12/
/v[1-9]\d*/
```

---

## Quick-Reference Summary

Here's the condensed **regex cheat sheet** — everything on one screen:

```
CHARACTERS        QUANTIFIERS       ANCHORS
.  any char        *  0+             ^  start
\d digit           +  1+             $  end
\w word char       ?  0 or 1         \b word boundary
\s whitespace      {n} exactly n
\D non-digit       {n,} n or more    GROUPS
\W non-word        {n,m} n to m      (...)  capture
\S non-white       *? lazy           (?:...) non-capture
                   +? lazy           (?=...) lookahead
CLASSES            ?? lazy           (?!...) neg lookahead
[abc]  a, b, or c                    (?<=...) lookbehind
[^abc] NOT a/b/c   FLAGS             (?<!...) neg lookbehind
[a-z]  range       i  case-insens    (?<n>...) named group
                   g  global
ESCAPES            m  multiline      BACKREFERENCES
\.  \*  \+  \?     s  dotAll         \1 \2 ... in pattern
\(  \)  \[  \{     x  verbose        $1 $2 ... in replacement
```

---

## Start Practicing Today

Reading about regex is one thing. Writing and testing patterns is where the real learning happens. Here's a suggested progression:

1. **Start with the basics** — write patterns matching literal strings, then add character classes and quantifiers.
2. **Tackle validation** — implement email, URL, and password validation for a sample form.
3. **Work with real data** — grab a log file from a project and extract meaningful fields using capture groups.
4. **Optimize a pattern** — take a working but slow pattern and benchmark improvements.

Every one of these steps is faster with instant feedback. Use the [Regex Tester](/tools/regex-tester) to test your patterns as you build them — see exactly which parts of your input match, which groups capture what, and where your pattern fails.

---

## Conclusion

Regular expressions are a superpower for any developer who invests the time to understand them. This regex cheat sheet has covered the full spectrum — from basic literal matching all the way through lookarounds, performance optimization, and language-specific nuances. The patterns in the Common Patterns section alone will save you hours of trial and error on real projects.

The best developers don't memorize every detail of regex syntax. They understand the concepts deeply enough to construct any pattern they need, and they know where to look for the rest. Keep this cheat sheet bookmarked for the former, and rely on your tools for the latter.

**Ready to put it into practice? Try it free at [devplaybook.cc](https://devplaybook.cc)** — the [Regex Tester](/tools/regex-tester), [Regex Playground](/tools/regex-playground), and all the other developer tools are available instantly, no signup required.

---

*Tags: regex cheat sheet, regular expressions, regex tutorial, regex patterns, regex syntax, developer tools, text processing, input validation*
