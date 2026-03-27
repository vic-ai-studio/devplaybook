---
title: "URL Encoding 101: encodeURIComponent vs encodeURI vs rawuriencode"
description: "The complete guide to URL encoding in JavaScript and Python. Covers when to use encodeURIComponent, encodeURI, and how to handle special characters correctly."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["url", "encoding", "javascript", "python", "http", "api"]
readingTime: "2 min read"
---

# URL Encoding 101: encodeURIComponent vs encodeURI vs rawuriencode

## The Core Problem

URLs have a strict syntax. Only certain characters are allowed unencoded. Everything else must be percent-encoded.

```
✅ Valid in URLs: A-Z a-z 0-9 - _ . ~ !
❌ Must be encoded: space, &, =, #, %, /, ?, :, @, $, &
```

## Three JavaScript Functions

| Function | Encodes | Does NOT Encode |
|----------|---------|----------------|
| `encodeURIComponent()` | Almost everything | `A-Z a-z 0-9 - _ . ~ ! ' ( ) *` |
| `encodeURI()` | Reserved characters | `A-Z a-z 0-9 ; , / ? : @ & = + $ - _ . ~ ! ' ( ) * #` |

## When to Use Which

```javascript
// ✅ Use encodeURIComponent for query parameter VALUES
const value = encodeURIComponent("Hello World");  // "Hello%20World"
const query = `name=${value}`;  // "name=Hello%20World"

// ✅ Use encodeURI for the full URL path (when you want to preserve /)
const url = encodeURI("https://example.com/path/to/page");  // preserved slashes

// ❌ NEVER use encodeURI for query strings (it leaves = ? & unencoded)
const bad = encodeURI("name=Hello World");
// "name=Hello%20World" — but the = sign between name and value looks fine here
// But if value contains ?: @ & = +, it breaks
```

## Common Mistakes

```javascript
// ❌ Common mistake: mixing them up
const bad = "https://example.com/search?q=" + encodeURI("Hello World");
// Works, but semantically wrong

// ✅ Correct
const good = "https://example.com/search?q=" + encodeURIComponent("Hello World");

// ❌ Forgetting to encode API keys or tokens
const apiKey = "abc123&secret=xyz";  // has & which will break the URL
const url = `https://api.example.com?key=${apiKey}`;  // BROKEN
// The & in apiKey splits the parameter!

// ✅ Always encode the value, not the URL
const url = `https://api.example.com?key=${encodeURIComponent(apiKey)}`;
```

## Python Equivalent

```python
from urllib.parse import urlencode, quote, quote_plus

# For query parameter values
params = { 'name': 'Hello World', 'city': 'Tainan' }
qs = urlencode(params)  # "name=Hello+World&city=Tainan"

# For URL paths
path = quote('path/with/slashes')  # "path%2Fwith%2Fslashes"
```

## Special Cases

| Character | `encodeURIComponent` | `encodeURI` |
|-----------|---------------------|-------------|
| Space | `%20` | `%20` |
| `!` | `%21` | `!` |
| `#` | `%23` | `%23` |
| `&` | `%26` | `&` |
| `=` | `%3D` | `=` |
| `/` | `%2F` | `/` |

**Key insight:** Use `encodeURIComponent` for any value that goes inside a query string parameter. Use `encodeURI` for full URLs where you want to preserve path separators.
