---
title: "URL Encoder Decoder Online: How to Encode Special Characters"
description: "Encode and decode URLs online for free. Learn percent-encoding, which characters need encoding, and how to handle special characters in URLs and query strings."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["url-encoder", "url-decoder", "url-encoding", "developer-tools", "free-tools"]
readingTime: "8 min read"
---

If you've ever pasted a URL into a browser and watched it transform `hello world` into `hello%20world`, you've seen percent-encoding in action. URL encoding is one of those fundamentals that every developer runs into, yet it's surprisingly easy to get wrong — especially when you're dealing with query strings, form submissions, or building API clients.

This guide covers everything you need to know about URL encoding and decoding: what it is, why it exists, how it works under the hood, and how to use an online URL encoder/decoder to handle special characters quickly and correctly.

## What Is URL Encoding?

URL encoding (formally called **percent-encoding**) is a method for representing characters that aren't allowed in URLs using a safe ASCII format. The URL specification (RFC 3986) defines a limited set of characters that are valid in a URL without encoding. Everything else must be encoded.

The encoding format is straightforward: a `%` sign followed by two hexadecimal digits representing the byte value of the character. For example:

- Space → `%20`
- `@` → `%40`
- `/` → `%2F`
- `?` → `%3F`
- `=` → `%3D`
- `&` → `%26`

Some tools also encode spaces as `+` (the `application/x-www-form-urlencoded` format used in HTML forms), but `%20` is the standard for URL paths and query strings.

## Why URL Encoding Exists

URLs were designed to be transmitted over the internet using ASCII — a 128-character set that doesn't include accented characters, Chinese characters, emoji, or many special symbols. Beyond character set limitations, certain characters have **reserved meaning** in URLs:

- `?` — marks the start of a query string
- `&` — separates query parameters
- `=` — separates parameter names from values
- `#` — marks a fragment identifier
- `/` — separates path segments

If your data contains any of these characters, you need to encode them, otherwise the URL parser will misinterpret your data as structural syntax.

**Example:** Say you want to pass the value `price=10&discount=5` as a query parameter:

```
# WRONG — the parser sees three separate parameters
https://example.com/search?filter=price=10&discount=5&category=shoes

# CORRECT — the value is properly encoded
https://example.com/search?filter=price%3D10%26discount%3D5&category=shoes
```

Without encoding, you'd get a broken request and a debugging headache.

## Characters That Must Be Encoded

RFC 3986 divides URL characters into three categories:

### Unreserved Characters (never encode these)
These are safe everywhere in a URL:
- Letters: `A-Z`, `a-z`
- Digits: `0-9`
- Special: `-`, `_`, `.`, `~`

### Reserved Characters (encode in data, not structure)
These have special meaning in URL syntax. Encode them when they appear in your data:

```
: / ? # [ ] @ ! $ & ' ( ) * + , ; =
```

### Everything Else (always encode)
Any character outside the above two sets must be encoded — this includes spaces, Unicode characters, and control characters.

**Quick reference for common characters:**

| Character | Encoded | When it appears in... |
|-----------|---------|----------------------|
| Space | `%20` | Any context |
| `+` | `%2B` | Query values |
| `/` | `%2F` | Path values |
| `?` | `%3F` | Query values |
| `#` | `%23` | Any context |
| `&` | `%26` | Query values |
| `=` | `%3D` | Query values |
| `@` | `%40` | Userinfo, query values |
| `%` | `%25` | Any context (literal percent) |

## How URL Encoding Works Step by Step

Here's what happens when a string gets URL-encoded:

1. **Convert to bytes** — the string is encoded as UTF-8 (or occasionally another encoding like Latin-1 for legacy systems)
2. **Check each byte** — if the byte represents an unreserved character, keep it as-is
3. **Encode everything else** — replace each byte with `%` followed by its two-digit hex value

**Example with a Unicode character:**

The character `é` (e with acute accent) has the Unicode code point U+00E9. In UTF-8, it's two bytes: `0xC3 0xA9`.

So `café` → `caf%C3%A9`

For emoji, it's even more bytes. The 🚀 emoji (U+1F680) encodes to four UTF-8 bytes: `0xF0 0x9F 0x9A 0x80`, giving you `%F0%9F%9A%80`.

## URL Encoding vs. URL Decoding

**Encoding** converts a raw string into a URL-safe representation. You do this when building a URL from user input or program data.

**Decoding** converts a percent-encoded string back to its original form. You do this when parsing a URL to extract the actual values.

In most web frameworks, decoding happens automatically when you access request parameters. But you'll often need to decode manually when:
- Parsing URLs from logs or analytics data
- Inspecting API responses that contain encoded URLs
- Debugging redirect chains
- Reading encoded values in OAuth tokens or SAML assertions

## Encoding in Different Programming Languages

### JavaScript

```javascript
// Encoding a full URI component (for query values)
encodeURIComponent("hello world & more")
// → "hello%20world%20%26%20more"

// Encoding a full URI (preserves structural characters)
encodeURI("https://example.com/search?q=hello world")
// → "https://example.com/search?q=hello%20world"

// Decoding
decodeURIComponent("hello%20world%20%26%20more")
// → "hello world & more"
```

Use `encodeURIComponent` for individual parameter values, `encodeURI` for full URLs.

### Python

```python
from urllib.parse import quote, unquote, urlencode

# Encode a single value
quote("hello world & more")
# → 'hello%20world%20%26%20more'

# Encode query parameters properly
params = {"q": "hello world", "filter": "price=10&max=50"}
urlencode(params)
# → 'q=hello+world&filter=price%3D10%26max%3D50'

# Decode
unquote("hello%20world%20%26%20more")
# → 'hello world & more'
```

### PHP

```php
// Encode
urlencode("hello world & more"); // hello+world+%26+more
rawurlencode("hello world & more"); // hello%20world%20%26%20more

// Decode
urldecode("hello+world+%26+more"); // hello world & more
rawurldecode("hello%20world%20%26%20more"); // hello world & more
```

Note: `urlencode` uses `+` for spaces (form encoding), `rawurlencode` uses `%20` (RFC 3986).

### cURL / CLI

```bash
# Using curl with automatic encoding
curl --data-urlencode "q=hello world & more" https://example.com/search

# Manual encoding with Python one-liner
python3 -c "from urllib.parse import quote; print(quote('hello world & more'))"
```

## Common Mistakes to Avoid

### Double-Encoding

This is the most frequent URL encoding bug. It happens when you encode an already-encoded string:

```
Original: hello world
Encoded once: hello%20world
Encoded twice: hello%2520world  ← WRONG, %25 is the encoding for %
```

When debugging a 400 or 404 error, always check whether your URL contains `%25` where you expected `%20` — that's a telltale sign of double-encoding.

### Forgetting to Encode the `+` Sign

In query strings, `+` is often decoded as a space (legacy HTML form behavior). If your data contains a literal `+`, you must encode it as `%2B`, or it'll be interpreted as a space on the receiving end.

### Encoding the Entire URL Instead of Just Values

```javascript
// WRONG — breaks the URL structure
encodeURIComponent("https://example.com/search?q=hello world")
// → "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world"

// CORRECT — only encode the value
"https://example.com/search?q=" + encodeURIComponent("hello world")
// → "https://example.com/search?q=hello%20world"
```

### Ignoring Character Encoding

URL encoding operates on bytes, not characters. If you're encoding non-ASCII characters, the byte values depend on the character encoding (UTF-8, Latin-1, etc.). Always use UTF-8 unless you have a specific reason not to — it's the standard for modern web applications.

### Not Encoding Fragment Identifiers

The `#` in a URL marks a fragment, and browsers don't send fragments to the server. If you need to pass a literal `#` in data, encode it as `%23`.

## When to Use an Online URL Encoder/Decoder

You don't always want to fire up a code editor or terminal just to encode a string. An online tool is the right choice when:

- **Debugging API calls** — you have an encoded URL in a log file and need to read the actual values
- **Building requests manually** — constructing a complex query string by hand
- **Testing webhook payloads** — checking what a URL-encoded form body actually contains
- **Inspecting redirect chains** — decoding a series of redirects to understand where a user ends up
- **Quick one-offs** — you need to encode a single value and don't want to open a REPL

## FAQ

**Q: What's the difference between `encodeURI` and `encodeURIComponent` in JavaScript?**

`encodeURI` is designed for full URLs — it encodes everything except characters that are valid in a complete URL (including `:`, `/`, `?`, `&`, `=`, `#`). `encodeURIComponent` is more aggressive and encodes those structural characters too, making it suitable for encoding individual values that will be embedded in a URL.

**Q: Should I use `%20` or `+` for spaces?**

Use `%20` in URL paths and when following RFC 3986 strictly. Use `+` only in `application/x-www-form-urlencoded` bodies (HTML form submissions). When in doubt, `%20` is safer and more universally understood.

**Q: How do I encode a URL in a shell script?**

```bash
# Using Python (usually available)
encoded=$(python3 -c "from urllib.parse import quote; print(quote('$value'))")

# Using jq
encoded=$(echo -n "$value" | jq -sRr @uri)

# Using curl
encoded=$(curl -s -o /dev/null -w "%{url_effective}" --get --data-urlencode "q=$value" "")
```

**Q: Why does my encoded URL look different in different tools?**

Different tools make different choices about which characters to encode. All technically valid encodings are equivalent — `%41` and `A` are the same character. However, some tools encode more aggressively than others. The key is that your encoder and decoder use compatible conventions.

**Q: Can I URL-encode binary data?**

Yes — each byte of the binary data gets encoded as `%XX`. This is how file uploads work in multipart forms and how binary values appear in query strings. That said, for large binary data, Base64 encoding is typically more practical.

---

## Try the DevPlaybook URL Encoder/Decoder

Stop opening a browser console or firing up a Python shell just to encode a string. The **[DevPlaybook URL Encoder/Decoder](https://devplaybook.cc/tools/url-encoder)** handles both encoding and decoding instantly, right in your browser — no install, no login, no tracking.

It handles edge cases correctly: proper UTF-8 byte encoding for Unicode characters, correct treatment of the `+` vs `%20` space variants, and no double-encoding. Paste your string, get your result, move on.

**[Open URL Encoder/Decoder →](https://devplaybook.cc/tools/url-encoder)**

Whether you're debugging a broken redirect, building an API client, or just need to quickly decode what's hiding inside a percent-encoded query string, it's the fastest path from confused to unblocked.
