---
title: "URL Encoder Decoder Online: Encode and Decode URLs and Query Strings Free"
description: "Encode and decode URLs online for free. Convert special characters to percent-encoding and back. Learn URL encoding rules, query string escaping, and fix common encoding bugs."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["url", "encoder", "decoder", "percent-encoding", "developer-tools", "api"]
readingTime: "6 min read"
---

# URL Encoder Decoder Online: Encode and Decode URLs and Query Strings Free

URLs can only contain a specific set of ASCII characters. Spaces, Chinese characters, special symbols, and many other characters must be encoded as percent-encoded sequences (like `%20` for space) before they can appear in a valid URL. An online URL encoder/decoder handles this conversion instantly.

---

## What Is URL Encoding?

URL encoding (also called percent-encoding) converts characters that aren't allowed in URLs into a safe format. Each unsafe character is replaced with a `%` followed by its two-digit hexadecimal ASCII code.

**Common URL encoding examples:**

| Character | Encoded | Notes |
|-----------|---------|-------|
| Space | `%20` or `+` | `+` is form-data style |
| `#` | `%23` | Fragment identifier |
| `&` | `%26` | Query string separator |
| `=` | `%3D` | Key-value separator |
| `+` | `%2B` | Literal plus sign |
| `?` | `%3F` | Query string start |
| `/` | `%2F` | Path separator |
| `@` | `%40` | Used in auth URLs |
| `,` | `%2C` | Often safe, sometimes encoded |

**Try it now:** [DevPlaybook URL Encoder/Decoder](https://devplaybook.cc/tools/url-encoder) — encode or decode any URL or query string instantly.

---

## Why URL Encoding Is Essential

### 1. Query Parameters with Special Characters

```
# ❌ Invalid URL — spaces and special characters
https://api.example.com/search?q=hello world&sort=date&filter=type:article

# ✅ Valid URL — all special characters encoded
https://api.example.com/search?q=hello%20world&sort=date&filter=type%3Aarticle
```

### 2. URLs with Non-ASCII Characters

```
# ❌ Contains Chinese characters — not valid in URLs
https://example.com/news/台灣科技

# ✅ Encoded (Punycode for domain, percent-encoding for path)
https://example.com/news/%E5%8F%B0%E7%81%A3%E7%A7%91%E6%8A%80
```

### 3. Embedding URLs Inside URLs

When a URL is used as a query parameter value, the entire inner URL must be encoded:

```
Outer URL: https://redirect.example.com?target=<inner URL>

# ❌ Broken — inner URL's special chars conflict with outer URL
https://redirect.example.com?target=https://example.com/page?id=123&type=post

# ✅ Inner URL is encoded
https://redirect.example.com?target=https%3A%2F%2Fexample.com%2Fpage%3Fid%3D123%26type%3Dpost
```

---

## How to Use the URL Encoder/Decoder Online

1. **Open** [DevPlaybook URL Encoder/Decoder](https://devplaybook.cc/tools/url-encoder)
2. **Choose mode** — Encode or Decode
3. **Paste your URL, query string, or parameter value**
4. **Select encoding type** — full URL encoding, or component encoding (more aggressive)
5. **Copy** the encoded or decoded output

---

## URL Encoding in Code

### JavaScript

```javascript
// Encode a full URL (preserves ://?&= structure)
encodeURI('https://example.com/search?q=hello world&lang=zh-TW')
// → "https://example.com/search?q=hello%20world&lang=zh-TW"

// Encode a single component (encodes everything special)
encodeURIComponent('hello world & more')
// → "hello%20world%20%26%20more"

// Decode
decodeURIComponent('hello%20world%20%26%20more')
// → "hello world & more"

// Build URLs safely with URLSearchParams
const params = new URLSearchParams({
  q: 'hello world',
  type: 'article & news',
  page: '1'
});
const url = `https://api.example.com/search?${params.toString()}`;
// → "https://api.example.com/search?q=hello+world&type=article+%26+news&page=1"
```

### Python

```python
from urllib.parse import quote, unquote, urlencode, urlparse

# Encode a component
encoded = quote('hello world & more')
# → "hello%20world%20%26%20more"

# Encode a path (preserves /)
encoded = quote('/path/to/resource with spaces', safe='/')
# → "/path/to/resource%20with%20spaces"

# Decode
decoded = unquote('hello%20world%20%26%20more')
# → "hello world & more"

# Build query string
params = {'q': 'hello world', 'type': 'article & news'}
qs = urlencode(params)
# → "q=hello+world&type=article+%26+news"
```

### Node.js

```javascript
import { URL } from 'url';

// Safe URL construction
const url = new URL('https://api.example.com/search');
url.searchParams.set('q', 'hello world & more');
url.searchParams.set('page', '1');
console.log(url.toString());
// → "https://api.example.com/search?q=hello+world+%26+more&page=1"
```

---

## Common URL Encoding Mistakes

### Using `encodeURI` When You Should Use `encodeURIComponent`

```javascript
// ❌ encodeURI doesn't encode & = ? # — dangerous in query params
encodeURI('hello & world')
// → "hello%20&%20world"  (& not encoded — breaks query string parsing)

// ✅ encodeURIComponent encodes everything unsafe in a component
encodeURIComponent('hello & world')
// → "hello%20%26%20world"  (& encoded to %26)
```

### Double-Encoding

```javascript
// ❌ Already encoded, encoding again
encodeURIComponent('hello%20world')
// → "hello%2520world"  (%25 = encoded %, results in literal %20 display)

// ✅ Decode first if already encoded
decodeURIComponent('hello%20world')  // "hello world"
encodeURIComponent('hello world')    // "hello%20world"
```

### Space as `+` vs `%20`

Both are valid in query strings:
- `application/x-www-form-urlencoded` (HTML forms) uses `+` for spaces
- Standard percent-encoding uses `%20`

Most servers accept both, but be consistent and aware of which your API expects.

---

## `encodeURI` vs `encodeURIComponent` Comparison

| Character | `encodeURI` | `encodeURIComponent` |
|-----------|------------|----------------------|
| Space | `%20` | `%20` |
| `&` | **Not encoded** | `%26` |
| `=` | **Not encoded** | `%3D` |
| `?` | **Not encoded** | `%3F` |
| `#` | **Not encoded** | `%23` |
| `/` | **Not encoded** | `%2F` |
| `:` | **Not encoded** | `%3A` |
| `@` | **Not encoded** | `%40` |

**Rule of thumb:**
- Use `encodeURI` when you want to encode a complete URL (preserves URL structure)
- Use `encodeURIComponent` when encoding a value that will be placed inside a URL (encodes everything)

---

## Frequently Asked Questions

### What's the difference between URL encoding and HTML encoding?

URL encoding (`%3C`) converts characters for use in URLs. HTML encoding (`&lt;`) converts characters for use in HTML documents. They encode to different formats and are used in different contexts. `<` in a URL becomes `%3C`; in HTML it becomes `&lt;`.

### Why does my API call fail with special characters in parameters?

The query parameter value likely contains `&`, `=`, `#`, `+`, or similar characters that break URL parsing. Always encode parameter values with `encodeURIComponent` (JS) or `quote()` (Python) before appending to a URL.

### Is it safe to decode a URL from user input?

Decode first, then validate. Attackers can use double-encoding or path traversal tricks (`%2F..%2F..`) to bypass naive input validation. Always normalize and validate the decoded value.

### What are safe characters that don't need encoding?

Unreserved characters are safe in URLs without encoding: letters (A–Z, a–z), digits (0–9), hyphen (`-`), underscore (`_`), period (`.`), tilde (`~`).

### How do I decode a URL in the browser address bar?

Open DevTools console and run:

```javascript
decodeURIComponent(location.search)
// Decodes the query string of the current page
```

---

## Related Tools

- [HTML Encoder/Decoder](https://devplaybook.cc/tools/html-entity-encoder) — encode HTML entities (different from URL encoding)
- [JSON Formatter](https://devplaybook.cc/tools/json-formatter) — format API responses from URL calls
- [UUID Generator](https://devplaybook.cc/tools/uuid-generator) — generate IDs safe for URL inclusion
