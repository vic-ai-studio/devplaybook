---
title: "10 Essential Regex Patterns Every Developer Should Know"
description: "10 essential regex patterns for developers: email validation, URLs, IP addresses, dates, phone numbers, and more—with explanations and a live testing tool."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["regex", "regular-expressions", "developer-tips", "validation", "patterns", "programming"]
readingTime: "10 min read"
---

Regex is one of those skills that looks intimidating until the moment you need it. Then it's indispensable. A well-crafted regex can replace 20 lines of string manipulation code with one line. A poorly crafted one can take down your production server or let invalid data slip through.

This guide covers 10 patterns that solve real validation problems—with explanations of each component so you understand what you're using, not just copying it.

Before diving in: open the [regex playground](/tools/regex-playground) in another tab. Paste each pattern there and test it against your actual input while you read.

---

## 1. Email Validation

```regex
^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
```

**What it matches:** Most standard email addresses.

**Breakdown:**
- `^[a-zA-Z0-9._%+-]+` — One or more characters before the @: letters, digits, dots, underscores, percent, plus, hyphen
- `@` — Literal @ sign
- `[a-zA-Z0-9.-]+` — Domain name: letters, digits, dots, hyphens
- `\.` — Literal dot before TLD
- `[a-zA-Z]{2,}$` — TLD of at least 2 characters

**Note:** Full RFC 5322 email validation is significantly more complex. For most forms, this pattern is sufficient. Always verify email addresses with a confirmation email, not just regex.

---

## 2. URL Validation

```regex
^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$
```

**What it matches:** HTTP and HTTPS URLs with optional paths.

**Breakdown:**
- `^(https?:\/\/)?` — Optional http:// or https://
- `([\da-z\.-]+)` — Domain name: digits, lowercase letters, dots, hyphens
- `\.([a-z\.]{2,6})` — TLD
- `([\/\w \.-]*)*\/?$` — Optional path segments

For stricter URL validation (including ports, query strings, fragments), extend the pattern or use the URL constructor in JavaScript: `new URL(input)` throws on invalid URLs.

---

## 3. IPv4 Address

```regex
^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$
```

**What it matches:** Valid IPv4 addresses (0.0.0.0 through 255.255.255.255).

**Breakdown:**
- `25[0-5]` — 250–255
- `2[0-4][0-9]` — 200–249
- `[01]?[0-9][0-9]?` — 0–199

This pattern correctly rejects `999.0.0.1` and `256.1.1.1`—something a simple `\d+\.\d+\.\d+\.\d+` pattern misses.

---

## 4. Date (YYYY-MM-DD)

```regex
^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$
```

**What it matches:** ISO 8601 dates: 2026-03-24.

**Breakdown:**
- `\d{4}` — 4-digit year
- `(0[1-9]|1[0-2])` — Month: 01–12
- `(0[1-9]|[12]\d|3[01])` — Day: 01–31

**Caveat:** This validates format, not calendar validity. February 30 would pass. For real date validation, parse with a date library after regex format-checking.

---

## 5. Phone Number (US Format)

```regex
^\+?1?\s*[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$
```

**What it matches:** US phone numbers in various formats: `(555) 555-5555`, `555-555-5555`, `+1 555 555 5555`, `5555555555`.

**Breakdown:**
- `^\+?1?\s*` — Optional +1 country code
- `[-.\s]?` — Optional separator: hyphen, dot, or space
- `\(?\d{3}\)?` — Area code, optional parentheses
- `\d{3}` — Exchange code
- `\d{4}$` — Subscriber number

For international phone numbers, the E.164 format is more predictable: `^\+[1-9]\d{1,14}$`.

---

## 6. Strong Password

```regex
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$
```

**What it matches:** Passwords with at least 8 characters, including one uppercase letter, one lowercase letter, one digit, and one special character.

**Breakdown:**
- `(?=.*[a-z])` — Lookahead: must contain lowercase
- `(?=.*[A-Z])` — Lookahead: must contain uppercase
- `(?=.*\d)` — Lookahead: must contain digit
- `(?=.*[@$!%*?&])` — Lookahead: must contain special character
- `[A-Za-z\d@$!%*?&]{8,}$` — Only allowed characters, min 8 length

Lookaheads (`(?=...)`) assert conditions without consuming characters—they check the whole string from the current position.

---

## 7. Hex Color Code

```regex
^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$
```

**What it matches:** 3-digit and 6-digit hex color codes: `#fff`, `#ffffff`, `#FF5733`.

**Breakdown:**
- `^#` — Literal hash
- `[A-Fa-f0-9]{6}` — 6 hex characters (full color)
- `|` — Or
- `[A-Fa-f0-9]{3}` — 3 hex characters (shorthand)

For CSS color validation including `rgb()`, `hsl()`, and named colors, a more comprehensive approach is needed.

---

## 8. Slug (URL-friendly String)

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

**What it matches:** URL slugs like `my-blog-post`, `devplaybook-pro`, `2026-update`.

**Breakdown:**
- `^[a-z0-9]+` — Starts with one or more lowercase letters or digits
- `(?:-[a-z0-9]+)*$` — Optionally followed by hyphen-separated groups

Rejects strings that start with a hyphen, end with a hyphen, or contain consecutive hyphens.

---

## 9. Credit Card Number (Basic Format)

```regex
^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})$
```

**What it matches:** Visa, Mastercard, Amex, and Discover card numbers by format.

**Note:** This validates format only, not whether the card is real or valid. Always use the **Luhn algorithm** to validate the check digit, and never build your own payment validation—use a payment provider's official SDK.

---

## 10. Semantic Version Number

```regex
^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$
```

**What it matches:** Full semver strings: `1.0.0`, `2.3.1-beta.1`, `4.0.0+build.123`.

**Breakdown:**
- `(0|[1-9]\d*)` — Major, minor, patch: no leading zeros
- `(?:-(...))?` — Optional pre-release identifier
- `(?:\+(...))?` — Optional build metadata

This is the official semver.org regex. It correctly rejects `01.2.3` (leading zero) and requires all three version components.

---

## Testing Your Patterns

The patterns above are starting points. Your actual input might have edge cases these patterns don't account for. Always test against:

- Valid input that should match
- Invalid input that should not match
- Edge cases: empty strings, very long strings, strings with only special characters

The [regex playground](/tools/regex-playground) lets you test all these cases at once with real-time highlighting. The [AI regex explainer](/tools/ai-regex-explainer) can break down any pattern you don't understand—paste a regex, get a plain-English explanation of each component.

For generating test strings that match your pattern, describe what you want to match and the tool suggests a regex with examples.

---

## One Rule for Writing Regex

**Be as specific as possible.** The more specific your pattern, the fewer false positives slip through. Start strict and relax if needed. It's much harder to fix the consequences of accepting invalid data than to handle a rejected valid case.
