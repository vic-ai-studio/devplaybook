---
title: "Regex Tester Online Tutorial: Learn Regular Expressions From Scratch"
description: "Beginner's guide to regular expressions with a free online regex tester. Covers character classes, quantifiers, groups, lookaheads, and real-world patterns with live examples."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["regex", "regular-expressions", "developer-tools", "tutorials", "beginner-guide"]
readingTime: "9 min read"
---

# Regex Tester Online Tutorial: Learn Regular Expressions From Scratch

Regular expressions (regex) look intimidating. A pattern like `^(?=.*[A-Z])(?=.*\d).{8,}$` looks like noise until you understand the parts. Once you do, regex becomes one of the most useful tools in a developer's toolkit — for validation, parsing, search-and-replace, and data extraction.

This tutorial teaches regex from the ground up, using a live online tester so you can experiment as you learn.

---

## Where to Practice

Open [DevPlaybook Regex Tester](https://devplaybook.cc/tools/regex-tester) in another tab. As you read each section, type the patterns and test them against the examples. Regex is learned by doing.

The [AI Regex Explainer](https://devplaybook.cc/tools/ai-regex-explainer) is also useful — paste any complex regex and get a plain-English explanation of what each part does.

---

## Part 1: The Basics

### Literal Characters

The simplest regex is just text. The pattern `cat` matches the string "cat" anywhere it appears:

| Test string | Match? |
|------------|--------|
| `cat` | ✅ matches "cat" |
| `concatenate` | ✅ matches "cat" inside "concatenate" |
| `CAT` | ❌ case-sensitive by default |
| `dog` | ❌ no match |

### Case-Insensitive Flag

Add the `i` flag to match regardless of case:

- Pattern: `/cat/i`
- Matches: "cat", "CAT", "Cat", "cAt"

In [DevPlaybook Regex Tester](https://devplaybook.cc/tools/regex-tester), flags are available as checkboxes next to the pattern input.

---

## Part 2: Special Characters

These characters have special meaning in regex — they're not matched literally:

`. * + ? ^ $ { } [ ] | ( ) \`

To match them literally, escape with a backslash: `\.` matches a period, `\*` matches an asterisk.

### The Dot (`.`)

Matches **any single character** except a newline:

- Pattern: `c.t`
- Matches: "cat", "cut", "c4t", "c t" (with space)
- Doesn't match: "ct" (no character between c and t)

### Anchors

- `^` — matches the **start** of the string
- `$` — matches the **end** of the string

| Pattern | Matches | Doesn't match |
|---------|---------|---------------|
| `^cat` | "cat food" | "the cat" |
| `cat$` | "the cat" | "cat food" |
| `^cat$` | "cat" (only) | "the cat", "cat food" |

---

## Part 3: Character Classes

Square brackets define a **character class** — match any one of the listed characters.

### Basic Character Classes

- `[abc]` — matches "a", "b", or "c"
- `[0-9]` — matches any digit (range shorthand)
- `[a-z]` — matches any lowercase letter
- `[A-Za-z]` — matches any letter, upper or lower
- `[^abc]` — matches anything **except** "a", "b", or "c" (^ inside brackets = negation)

**Example:** Pattern `[aeiou]` matches any vowel.

### Shorthand Character Classes

These are so common they have shortcuts:

| Shorthand | Equivalent | Meaning |
|-----------|-----------|---------|
| `\d` | `[0-9]` | Any digit |
| `\D` | `[^0-9]` | Any non-digit |
| `\w` | `[a-zA-Z0-9_]` | Word character (letter, digit, underscore) |
| `\W` | `[^a-zA-Z0-9_]` | Non-word character |
| `\s` | `[ \t\n\r]` | Whitespace |
| `\S` | `[^ \t\n\r]` | Non-whitespace |

---

## Part 4: Quantifiers

Quantifiers control how many times the preceding element is matched.

| Quantifier | Meaning | Example |
|-----------|---------|---------|
| `*` | 0 or more | `\d*` — zero or more digits |
| `+` | 1 or more | `\d+` — one or more digits |
| `?` | 0 or 1 (optional) | `colou?r` — "color" or "colour" |
| `{3}` | Exactly 3 times | `\d{3}` — exactly 3 digits |
| `{2,5}` | 2 to 5 times | `\d{2,5}` — 2 to 5 digits |
| `{3,}` | 3 or more times | `\d{3,}` — 3+ digits |

**Example — match a US phone number format:**

Pattern: `\d{3}-\d{3}-\d{4}`

Matches: "415-555-1234"
Doesn't match: "415-55-1234" (only 2 digits in middle)

---

## Part 5: Groups and Alternation

### Parentheses (Groups)

Parentheses group parts of a pattern and capture the matched text:

- Pattern: `(cat|dog)`
- Matches: "cat" or "dog"

The `|` inside the group means "or."

### Alternation Without Groups

- Pattern: `cat|dog`
- Same result — matches "cat" or "dog"

Groups become important when you need to apply a quantifier to multiple characters:

- `(ha)+` — matches "ha", "haha", "hahaha"
- `ha+` — matches "ha", "haa", "haaa" (quantifier only applies to "a")

### Non-Capturing Groups

If you need to group for alternation but don't need to capture the match, use `(?:...)`:

- `(?:cat|dog)s` — matches "cats" or "dogs" (groups "cat|dog" without capturing)

---

## Part 6: Real-World Patterns

Here are practical regex patterns you can use directly. Test them in [DevPlaybook Regex Playground](https://devplaybook.cc/tools/regex-playground) to see them in action.

### Email Address (Basic)

```
^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$
```

- `[a-zA-Z0-9._%+\-]+` — local part (before @)
- `@` — literal @
- `[a-zA-Z0-9.\-]+` — domain name
- `\.` — literal dot
- `[a-zA-Z]{2,}` — TLD, at least 2 letters

**Note:** Full RFC 5321 email validation is extremely complex. This covers 99% of real-world emails.

### URL

```
https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(\/[^\s]*)?
```

Matches: "https://devplaybook.cc/tools" or "http://example.com"

### Strong Password

```
^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$
```

Requires: 1 uppercase, 1 lowercase, 1 digit, 1 special character, minimum 8 characters.

The `(?=...)` syntax is a **lookahead** — it checks a condition without consuming characters. More on that below.

### IP Address (IPv4)

```
^(\d{1,3}\.){3}\d{1,3}$
```

Matches: "192.168.1.1" — though this also matches "999.999.999.999" (not a valid IP). Full IP validation requires more complex logic.

### Date (YYYY-MM-DD)

```
^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$
```

Matches: "2026-03-24" — validates month (01-12) and day (01-31) ranges.

### Hex Color Code

```
^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$
```

Matches: "#FF5733" or "#F57" (shorthand)

---

## Part 7: Lookaheads and Lookbehinds

Lookaheads let you assert what comes after the current position without including it in the match.

### Positive Lookahead `(?=...)`

`\d+(?= dollars)` — matches digits only if followed by " dollars"

- "100 dollars" → matches "100"
- "100 euros" → no match

### Negative Lookahead `(?!...)`

`\d+(?! dollars)` — matches digits NOT followed by " dollars"

- "100 euros" → matches "100"
- "100 dollars" → no match

### Positive Lookbehind `(?<=...)`

`(?<=\$)\d+` — matches digits preceded by "$"

- "$100" → matches "100"
- "100" → no match

---

## Part 8: Flags Reference

| Flag | Effect |
|------|--------|
| `i` | Case-insensitive matching |
| `g` | Global — find all matches, not just the first |
| `m` | Multiline — `^` and `$` match line start/end |
| `s` | Dotall — `.` matches newlines too |

In most languages, flags are added after the closing `/`:

```javascript
const pattern = /cat/gi;  // case-insensitive, find all
```

---

## Part 9: Testing in JavaScript

```javascript
// Test if a string matches
const email = "user@example.com";
const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
console.log(emailRegex.test(email));  // true

// Extract all matches
const text = "Call 415-555-1234 or 800-555-5678";
const phoneRegex = /\d{3}-\d{3}-\d{4}/g;
const phones = text.match(phoneRegex);  // ["415-555-1234", "800-555-5678"]

// Replace matches
const result = "Hello World".replace(/world/i, "DevPlaybook");
// "Hello DevPlaybook"

// Extract groups
const date = "2026-03-24";
const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
const [_, year, month, day] = date.match(dateRegex);
// year = "2026", month = "03", day = "24"
```

---

## Common Mistakes

**Forgetting to escape special characters.** `3.14` matches "3X14" because `.` is any character. Use `3\.14` to match the literal dot.

**Not anchoring patterns.** `\d+` matches any digits anywhere. `^\d+$` matches strings that are only digits.

**Greedy vs. lazy quantifiers.** `.*` is greedy — it matches as much as possible. `.*?` is lazy — it matches as little as possible. Matters when extracting content between tags.

**Testing only the happy path.** Test your regex against invalid inputs, edge cases, and strings it should reject.

---

## Tools Summary

| Task | Tool |
|------|------|
| Test regex with live matching | [Regex Tester](https://devplaybook.cc/tools/regex-tester) |
| Experiment with a sandbox | [Regex Playground](https://devplaybook.cc/tools/regex-playground) |
| Understand complex patterns | [AI Regex Explainer](https://devplaybook.cc/tools/ai-regex-explainer) |

---

**Want to level up faster?** [DevPlaybook Pro](https://devplaybook.cc/pro) includes AI-powered regex generation — describe what you want to match in plain English and get a working pattern instantly.
