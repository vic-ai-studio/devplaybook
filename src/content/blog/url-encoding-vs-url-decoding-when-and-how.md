---
title: "URL Encoding vs URL Decoding: When and How to Use It"
description: "Learn the difference between URL encoding and URL decoding, why they exist, what percent-encoding means, and how to encode or decode URLs instantly online."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["url", "encoding", "developer-tools", "web-development", "api"]
readingTime: "9 min read"
---

URLs are everywhere — in browser address bars, API requests, curl commands, email links, and log files. But URLs have strict rules about which characters they can contain. When your URL needs to include spaces, special characters, or non-ASCII text, URL encoding (also called percent-encoding) is the mechanism that makes it work.

This guide explains URL encoding and decoding from first principles: why it exists, what the rules are, when you need to encode versus when you don't, and how to do it instantly in any language.

---

## What Is URL Encoding?

URL encoding converts characters that are not safe for use in a URL into a format that is. It replaces unsafe characters with a `%` sign followed by two hexadecimal digits representing the character's ASCII code.

Examples:
- Space → `%20`
- `@` → `%40`
- `/` → `%2F`
- `=` → `%3D`
- `&` → `%26`
- `+` → `%2B`

A URL like:
```
https://example.com/search?q=hello world&category=dev tools
```

Becomes:
```
https://example.com/search?q=hello%20world&category=dev%20tools
```

Both URLs convey the same information. The encoded version is what browsers and HTTP clients actually send.

---

## Why Does URL Encoding Exist?

URLs were designed to be transmitted over the internet using the ASCII character set. The URL specification (RFC 3986) defines a strict set of characters that are "safe" in URLs. Characters outside that set — spaces, Unicode characters, many punctuation marks — must be encoded.

Without encoding:
- A space in a URL confuses parsers (where does the URL end?)
- A `&` in a query value would be interpreted as a parameter separator
- A `#` would be interpreted as a fragment identifier
- Non-ASCII characters (accented letters, CJK characters) have no valid representation in raw URLs

URL encoding solves this by providing a universal text representation for any byte value.

---

## URL-Safe vs. Unsafe Characters

### Always Safe (No Encoding Needed)

Per RFC 3986, these characters are "unreserved" and are always safe in URLs:

```
A-Z a-z 0-9 - _ . ~
```

### Reserved Characters

These characters have special meaning in URLs and must be encoded if used as data (not as URL structure):

| Character | Meaning in URL | Encoded form |
|-----------|---------------|--------------|
| `/` | Path separator | `%2F` |
| `?` | Query string start | `%3F` |
| `#` | Fragment start | `%23` |
| `&` | Parameter separator | `%26` |
| `=` | Key-value separator | `%3D` |
| `+` | Space (in query strings) | `%2B` |
| `@` | User info separator | `%40` |
| `:` | Scheme or port separator | `%3A` |

### Characters That Must Always Be Encoded

Anything not in the safe or reserved categories must be encoded. This includes:
- Spaces → `%20`
- `<`, `>`, `"`, `{`, `}`, `|`, `\`, `^`, `` ` ``
- All non-ASCII characters (encoded as their UTF-8 byte sequences)

---

## URL Encoding in Practice

Use the [URL Encoder/Decoder](/tools/url-encoder) on DevPlaybook to encode or decode any URL component instantly.

### Encoding a Query Parameter

If you have a search term that contains special characters:

```
Input: hello & goodbye
Encoded: hello%20%26%20goodbye
```

In a URL:
```
https://api.example.com/search?q=hello%20%26%20goodbye
```

### Encoding a File Path with Spaces

```
Input: /documents/my report 2026.pdf
Encoded: /documents/my%20report%202026.pdf
```

### Encoding Unicode Text

Non-ASCII characters are first converted to UTF-8 bytes, then each byte is percent-encoded:

```
Input: café
UTF-8 bytes: 63 61 66 c3 a9
Encoded: caf%C3%A9
```

---

## The `+` vs `%20` Confusion

There are two common conventions for encoding spaces in URLs:

**`%20`**: The correct percent-encoding for a space. Works everywhere in a URL.

**`+`**: A shorthand for space that is only valid in query strings (form-encoded data). It was popularized by HTML forms using `application/x-www-form-urlencoded` encoding.

**The rule:**
- In the path part of a URL: always use `%20` for spaces
- In query string values from HTML forms: `+` means space
- In query string values in most API contexts: use `%20` to be safe

If you see a URL with `+` signs and decode them as `%2B` (plus sign literal) instead of spaces, you'll get wrong output. This is one of the most common URL decoding bugs.

---

## URL Encoding vs. Base64 Encoding

These are different tools for different problems:

| Property | URL Encoding | Base64 |
|----------|-------------|--------|
| Purpose | Make characters safe in URLs | Encode binary data as text |
| Output | Mostly readable with % codes | Opaque character string |
| Size increase | Small (only unsafe chars encoded) | ~33% always |
| Reversible | Yes | Yes |
| Used for | URL parameters, query strings | Binary data, JWTs, auth headers |

Don't use Base64 to encode URL components — use URL encoding. Don't use URL encoding to transmit binary data — use Base64.

---

## URL Encoding in Code

### JavaScript

**Browser:**
```javascript
// Encode a URI component (query value, path segment)
encodeURIComponent("hello world & café")
// "hello%20world%20%26%20caf%C3%A9"

// Decode
decodeURIComponent("hello%20world%20%26%20caf%C3%A9")
// "hello world & café"

// For full URLs (don't encode slashes, colons, etc.)
encodeURI("https://example.com/path with spaces")
// "https://example.com/path%20with%20spaces"
```

**When to use which:**
- `encodeURIComponent()` — for encoding individual query parameter values or path segments
- `encodeURI()` — for encoding a complete URL (leaves structure characters like `/`, `?`, `&` untouched)

**Never use `escape()`** — it's deprecated, doesn't encode `+` and `/` correctly, and uses `%uXXXX` for Unicode instead of proper percent-encoding.

### Python

```python
from urllib.parse import quote, unquote, urlencode, parse_qs

# Encode a path segment
quote("hello world/café")
# 'hello%20world/caf%C3%A9'  (keeps / safe)

# Encode a query value (encode everything)
quote("hello world/café", safe='')
# 'hello%20world%2Fcaf%C3%A9'

# Decode
unquote("hello%20world%2Fcaf%C3%A9")
# 'hello world/café'

# Encode query parameters
params = {"q": "hello world", "category": "developer & ops"}
urlencode(params)
# 'q=hello+world&category=developer+%26+ops'
```

Note: `urlencode()` uses `+` for spaces (form encoding). Use `quote()` with `safe=''` if you need `%20`.

### Node.js

```javascript
const { URL } = require('url');
const querystring = require('querystring');

// URLSearchParams (recommended)
const params = new URLSearchParams({ q: "hello world", cat: "dev & ops" });
params.toString();
// q=hello+world&cat=dev+%26+ops

// Manual with encodeURIComponent
const encoded = `q=${encodeURIComponent("hello world")}&cat=${encodeURIComponent("dev & ops")}`;
// q=hello%20world&cat=dev%20%26%20ops
```

### Go

```go
import "net/url"

// Encode a query string
params := url.Values{}
params.Set("q", "hello world & café")
params.Encode()  // q=hello+world+%26+caf%C3%A9

// Encode a path segment
url.PathEscape("hello world/file")  // hello%20world%2Ffile

// Decode
decoded, err := url.QueryUnescape("hello+world+%26+caf%C3%A9")
// "hello world & café"
```

### Bash/curl

```bash
# curl handles encoding automatically when using --data-urlencode
curl -G "https://api.example.com/search" \
  --data-urlencode "q=hello world & café"

# Manual encoding with Python
python3 -c "from urllib.parse import quote; print(quote('hello world'))"
```

---

## URL Decoding: Reading Encoded URLs

Decoding is the reverse operation: converting `%XX` sequences back to their original characters.

When you receive a URL with encoded parameters (from a form, an API, or a webhook), you need to decode the values before using them.

**Common decoding scenario:**

A webhook sends you a URL like:
```
https://yourapp.com/callback?email=alice%40example.com&message=Hello%20World%21
```

Decoding the parameters:
- `email`: `alice%40example.com` → `alice@example.com`
- `message`: `Hello%20World%21` → `Hello World!`

Use the [URL Encoder/Decoder](/tools/url-encoder) to decode these quickly.

---

## Double Encoding: A Common Bug

Double encoding happens when you encode an already-encoded URL:

```
Original: hello world
Encoded once: hello%20world
Encoded twice: hello%2520world   ← %25 is the encoding for %
```

When the server decodes `%2520`, it gets `%20` — not `hello world`. This is a common bug in middleware, proxies, and code that calls `encodeURIComponent()` on an already-encoded string.

**Fix:** Decode first, then encode once:
```javascript
const clean = decodeURIComponent(possiblyEncodedString);
const safe = encodeURIComponent(clean);
```

---

## URL Structure Reference

A full URL has several components:

```
https://user:password@example.com:8080/path/to/page?key=value&foo=bar#section
│──┘  │───────────────────────────────────────────────────────────────────────
scheme  authority                   path            query           fragment
```

| Component | Encoding Rules |
|-----------|---------------|
| Scheme (`https`) | No encoding needed |
| Username/Password | Encode special chars |
| Host | No encoding (use punycode for internationalized domains) |
| Port | No encoding |
| Path segments | Encode everything except unreserved chars and `/` |
| Query values | Encode everything except unreserved chars |
| Fragment | Encode everything except unreserved chars |

---

## Practical Tips

**Use built-in library functions** — don't write your own URL encoder. Every language has standard library functions that handle the edge cases correctly.

**Encode at the last moment** — encode values when constructing the URL, not before. If you encode `"hello world"` to `"hello%20world"` and then pass it to a function that also encodes it, you'll double-encode.

**Always decode input** — when receiving URL parameters from users or external systems, decode them before processing or storing.

**Test with edge cases** — try inputs containing `&`, `=`, `#`, `%`, `+`, spaces, and non-ASCII characters to make sure your encoding/decoding is correct.

---

## Summary

URL encoding (percent-encoding) converts characters that aren't safe in URLs into `%XX` sequences. Key takeaways:

- Unreserved characters (`A-Z`, `a-z`, `0-9`, `-`, `_`, `.`, `~`) never need encoding
- Reserved characters need encoding when used as data, not URL structure
- `%20` and `+` both mean "space" — `+` only in query strings
- Use `encodeURIComponent()` in JavaScript for individual values; `encodeURI()` for full URLs
- Double encoding is a common bug — decode before re-encoding
- Never build your own encoder; use standard library functions

For quick one-off encoding and decoding, the [URL Encoder/Decoder](/tools/url-encoder) handles it instantly, no setup needed.
