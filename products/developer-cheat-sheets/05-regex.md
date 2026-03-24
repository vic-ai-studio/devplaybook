# Regex Cheat Sheet

---

## Character Classes

| Pattern | Matches |
|---------|---------|
| `.` | Any character except newline |
| `\d` | Digit `[0-9]` |
| `\D` | Non-digit |
| `\w` | Word character `[a-zA-Z0-9_]` |
| `\W` | Non-word character |
| `\s` | Whitespace (space, tab, newline) |
| `\S` | Non-whitespace |
| `[abc]` | Character a, b, or c |
| `[^abc]` | Not a, b, or c |
| `[a-z]` | Lowercase letter |
| `[A-Z0-9]` | Uppercase or digit |

---

## Anchors

| Pattern | Matches |
|---------|---------|
| `^` | Start of string/line |
| `$` | End of string/line |
| `\b` | Word boundary |
| `\B` | Not a word boundary |

```
^hello      matches "hello world" but not "say hello"
world$      matches "hello world" but not "world class"
\bcat\b     matches "cat" but not "catch" or "scat"
```

---

## Quantifiers

| Pattern | Meaning |
|---------|---------|
| `*` | 0 or more |
| `+` | 1 or more |
| `?` | 0 or 1 (optional) |
| `{3}` | Exactly 3 |
| `{3,}` | 3 or more |
| `{3,5}` | Between 3 and 5 |
| `*?` `+?` `??` | Lazy (match as few as possible) |

```
\d+         one or more digits
\d{4}       exactly 4 digits
colou?r     matches "color" and "colour"
```

---

## Groups & Alternation

| Pattern | Meaning |
|---------|---------|
| `(abc)` | Capturing group |
| `(?:abc)` | Non-capturing group |
| `(?P<name>abc)` | Named group (Python) |
| `(?<name>abc)` | Named group (JS/PCRE) |
| `a\|b` | a or b |
| `\1` | Backreference to group 1 |

```
(\d{4})-(\d{2})-(\d{2})    capture year, month, day
(?:https?|ftp)://           non-capturing: http, https, or ftp
(foo|bar)baz                matches "foobaz" or "barbaz"
```

---

## Lookahead & Lookbehind

| Pattern | Meaning |
|---------|---------|
| `(?=...)` | Positive lookahead |
| `(?!...)` | Negative lookahead |
| `(?<=...)` | Positive lookbehind |
| `(?<!...)` | Negative lookbehind |

```
\d+(?= dollars)    matches number only if followed by " dollars"
(?<=\$)\d+         matches number only if preceded by "$"
foo(?!bar)         "foo" not followed by "bar"
```

---

## Flags

| Flag | Meaning |
|------|---------|
| `i` | Case insensitive |
| `g` | Global (find all matches) |
| `m` | Multiline (^ and $ match line start/end) |
| `s` | Dot matches newline |
| `x` | Extended (ignore whitespace, allow comments) |

```js
/pattern/gi   // global + case insensitive (JavaScript)
re.compile(r'pattern', re.IGNORECASE | re.MULTILINE)  // Python
```

---

## Common Patterns

```
# Email (basic)
^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$

# URL
https?://[^\s/$.?#].[^\s]*

# IPv4 address
\b(?:\d{1,3}\.){3}\d{1,3}\b

# Date (YYYY-MM-DD)
\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])

# Time (HH:MM or HH:MM:SS)
(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?

# Phone (US)
\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})

# Hex color
#(?:[0-9a-fA-F]{3}){1,2}

# Slug
^[a-z0-9]+(?:-[a-z0-9]+)*$

# UUID
[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}

# JWT
^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$

# Semantic version
^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[a-zA-Z0-9.]+)?$

# Credit card (basic 4×4 groups)
\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b

# HTML tag
<([a-zA-Z][a-zA-Z0-9]*)[^>]*>(.*?)<\/\1>
```

---

## By Language

```python
# Python
import re
re.search(r'\d+', text)          # first match
re.findall(r'\d+', text)         # all matches
re.sub(r'\d+', 'NUM', text)      # replace
re.split(r'\s+', text)           # split
m = re.match(r'(\d+)-(\w+)', text)
m.group(1)  # first group
```

```javascript
// JavaScript
/\d+/.test(str)                  // test if matches
str.match(/\d+/g)                // all matches (array)
str.replace(/\d+/g, 'NUM')       // replace
str.split(/\s+/)                 // split
const [, year, month] = str.match(/(\d{4})-(\d{2})/)  // capture groups
```

```bash
# grep
grep -E '\d+' file.txt           # extended regex
grep -P '\d{4}' file.txt         # Perl-compatible regex
grep -oE '\b\w+@\w+\.\w+\b' file.txt   # extract emails

# sed
sed -E 's/(\d{4})-(\d{2})-(\d{2})/\3\/\2\/\1/' file  # date reformat
```

---

*Developer Cheat Sheet Bundle v1.0 — DevPlaybook*
