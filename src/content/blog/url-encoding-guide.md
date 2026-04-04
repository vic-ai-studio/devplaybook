---
title: "URL Encoding 101: encodeURIComponent vs encodeURI vs rawuriencode"
description: "The complete guide to URL encoding in JavaScript and Python. Covers when to use encodeURIComponent, encodeURI, and how to handle special characters correctly."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["url", "encoding", "javascript", "python", "http", "web"]
readingTime: "8 min read"
---

# URL Encoding 101: encodeURIComponent vs encodeURI vs rawuriencode

URL encoding is one of those things that seems simple until you hit a bug where a space in a username breaks everything, or an API call fails because `+` signs are being interpreted as spaces. Understanding exactly *why* URLs need encoding and *which* function to use is fundamental to building reliable web applications.

## Why URL Encoding Exists

URLs have a limited character set. They can only contain certain safe characters: letters (A-Z, a-z), digits (0-9), and a small set of special characters (`-`, `_`, `.`, `~`). Everything else must be percent-encoded.

Percent-encoding replaces a character with a `%` followed by its two-digit hexadecimal code:

```
space → %20
& → %26
= → %3D
+ → %2B
# → %23
? → %3F
/  → %2F
```

Without encoding, `https://example.com/search?q=hello world&type=all` would be ambiguous — the browser can't tell if that space is part of the query parameter value or a URL syntax error.

## The Three JavaScript Functions

JavaScript provides three functions for URL encoding. They encode different sets of characters, which is why choosing the wrong one causes bugs.

### `encodeURIComponent` — For Query Parameter Values

```javascript
// Use when encoding individual parameter values
encodeURIComponent('hello world');
// 'hello%20world'

encodeURIComponent('user@example.com');
// 'user%40example.com'

encodeURIComponent('price: $100 & $200');
// 'price%3A%20%24100%20%26%20%24200'

encodeURIComponent('search?q=test#section');
// 'search%3Fq%3Dtest%23section'
```

Characters NOT encoded by `encodeURIComponent`: `A-Za-z0-9 - _ . ! ~ * ' ( )`

Characters that ARE encoded: everything else, including `/ ? # & = + @ : ,`

Use this when encoding individual query parameter values or path segments:

```javascript
// Building a query string
const params = new URLSearchParams();
params.append('q', 'hello world & more');
params.append('category', 'tech/gadgets');
const url = `https://api.example.com/search?${params.toString()}`;
// https://api.example.com/search?q=hello+world+%26+more&category=tech%2Fgadgets

// Or manually:
const value = 'hello world & more';
const url = `https://api.example.com/search?q=${encodeURIComponent(value)}`;
```

### `encodeURI` — For Complete URLs

```javascript
// Use when encoding a complete URL (preserves URL structure characters)
encodeURI('https://example.com/search?q=hello world');
// 'https://example.com/search?q=hello%20world'
```

Characters NOT encoded by `encodeURI`: everything `encodeURIComponent` skips, PLUS `: / ? # [ ] @ ! $ & ' ( ) * + , ; =`

The difference is that `encodeURI` preserves characters that have meaning in URL structure (`/`, `?`, `#`, `&`, `=`). Use it when encoding an entire URL where you want to preserve the URL syntax.

```javascript
// Correct usage
const url = 'https://example.com/path with spaces/file.html?key=hello world';
encodeURI(url);
// 'https://example.com/path%20with%20spaces/file.html?key=hello%20world'
// (preserves ://?=)

// Wrong: encodeURIComponent would encode the whole URL into garbage
encodeURIComponent(url);
// 'https%3A%2F%2Fexample.com%2F...' — breaks the URL
```

### `decodeURIComponent` / `decodeURI`

```javascript
// Decode
decodeURIComponent('hello%20world%26more');
// 'hello world&more'

decodeURI('https://example.com/path%20with%20spaces');
// 'https://example.com/path with spaces'
```

Always wrap `decodeURIComponent` in try/catch — malformed `%` sequences throw:

```javascript
try {
  const decoded = decodeURIComponent(userInput);
} catch (e) {
  // Handle malformed encoding
  console.error('Invalid URL encoding:', userInput);
}
```

## URLSearchParams — The Modern Way

In modern JavaScript, `URLSearchParams` handles encoding and decoding automatically:

```javascript
// Building query strings
const params = new URLSearchParams({
  q: 'hello world',
  category: 'tech & science',
  page: 1
});
console.log(params.toString());
// q=hello+world&category=tech+%26+science&page=1

// URLSearchParams uses + for spaces (not %20) — both are valid in query strings

// Parsing query strings
const url = new URL('https://example.com/search?q=hello+world&page=2');
console.log(url.searchParams.get('q'));  // 'hello world'
console.log(url.searchParams.get('page'));  // '2'

// Iterating
for (const [key, value] of url.searchParams) {
  console.log(`${key}: ${value}`);
}
```

`URLSearchParams` is available in all modern browsers and Node.js 10+. Prefer it over manual encoding for query strings.

## The + vs %20 Confusion

Both `+` and `%20` represent a space in query strings. This is a historical quirk:

- `%20` is the "proper" percent-encoding for a space
- `+` is a shorthand for space that's only valid in query strings (not in URL paths)

The confusion happens when `+` appears in non-space contexts:

```javascript
// A literal + sign in a query value
const params = new URLSearchParams({ key: 'a+b' });
params.toString();  // key=a%2Bb  (+ is encoded as %2B to distinguish from space)

// But if you manually build: ?key=a+b
// When decoded: the + is interpreted as a space: 'a b' (wrong!)
```

Rule: always use `URLSearchParams` or `encodeURIComponent` to build query strings. Never concatenate values directly with `+` or `&`.

## Python URL Encoding

```python
from urllib.parse import quote, quote_plus, urlencode, urlparse, parse_qs

# quote: like encodeURIComponent (safe='/' by default, which you usually don't want)
quote('hello world')          # 'hello%20world'
quote('hello world', safe='') # 'hello%20world' (no safe chars)

# quote_plus: like form encoding (spaces become +)
quote_plus('hello world')  # 'hello+world'
quote_plus('a & b')        # 'a+%26+b'

# urlencode: encode a dict as query string
from urllib.parse import urlencode
params = {'q': 'hello world', 'category': 'tech & science'}
urlencode(params)
# 'q=hello+world&category=tech+%26+science'

# Parse a URL
from urllib.parse import urlparse, parse_qs
parsed = urlparse('https://example.com/search?q=hello+world&page=2')
print(parsed.scheme)   # 'https'
print(parsed.netloc)   # 'example.com'
print(parsed.path)     # '/search'

# Parse query string
qs = parse_qs(parsed.query)
print(qs)  # {'q': ['hello world'], 'page': ['2']}  (values are lists)
print(qs['q'][0])  # 'hello world'
```

## Building URLs Safely

Never build URLs by string concatenation:

```javascript
// Unsafe: user input breaks the URL structure
const username = 'alice & bob';
const url = `https://api.example.com/users?name=${username}`;
// https://api.example.com/users?name=alice & bob
// The & breaks the query string — 'bob' becomes a separate parameter

// Safe: always encode
const url = `https://api.example.com/users?name=${encodeURIComponent(username)}`;
// https://api.example.com/users?name=alice%20%26%20bob

// Better: use URLSearchParams
const params = new URLSearchParams({ name: username });
const url = `https://api.example.com/users?${params}`;
```

## Path Segments vs Query Parameters

The encoding rules differ between URL paths and query parameters:

```javascript
// Path segment encoding: encode individual segments, not the slashes
const userSlug = 'john doe / portfolio';
const encodedSlug = encodeURIComponent(userSlug);
// 'john%20doe%20%2F%20portfolio'
const url = `https://example.com/users/${encodedSlug}`;

// Query parameter: same, encode the value
const searchTerm = 'hello world / test';
const url = `https://api.example.com/search?q=${encodeURIComponent(searchTerm)}`;
```

## Special Characters in Practice

```javascript
// Email addresses in URLs
const email = 'user+tag@example.com';
encodeURIComponent(email);
// 'user%2Btag%40example.com'

// File paths
const filePath = '/home/user/my file.txt';
encodeURIComponent(filePath);
// '%2Fhome%2Fuser%2Fmy%20file.txt'

// JSON as a query parameter (usually a design smell, but sometimes needed)
const filter = JSON.stringify({ status: 'active', limit: 10 });
encodeURIComponent(filter);
// '%7B%22status%22%3A%22active%22%2C%22limit%22%3A10%7D'
```

## Key Takeaways

- `encodeURIComponent` encodes individual values (most commonly used).
- `encodeURI` encodes a full URL (preserves URL syntax characters).
- `URLSearchParams` is the modern, safe way to build query strings in JavaScript.
- In Python, use `urllib.parse.quote` (for paths) or `urllib.parse.urlencode` (for query strings).
- Never build URLs with direct string concatenation of user-supplied values.
- `+` and `%20` both mean space in query strings — use consistent encoding.

## FAQ

**Why does `encodeURIComponent` not encode single quotes?**
Single quotes (`'`) are in the "unreserved characters" set and don't need encoding. However, some contexts (like HTML attributes) require escaping them differently.

**Should I use `+` or `%20` for spaces?**
Both work in query strings. `URLSearchParams` uses `+`. `encodeURIComponent` uses `%20`. Choose one and be consistent; don't mix them.

**What's the difference between `quote` and `quote_plus` in Python?**
`quote` encodes spaces as `%20`. `quote_plus` encodes spaces as `+`. Use `quote_plus` for form data and query strings. Use `quote` for path segments.

**How do I handle hash fragments (#) in URLs?**
The `#` and everything after it is the fragment identifier — it's client-side only and never sent to the server. Encode `#` as `%23` if it appears inside a query parameter value.
