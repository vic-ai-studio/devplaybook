---
title: "Base64 Encode Decode Explained: Developer Guide with Real Use Cases"
description: "Understand Base64 encoding and decoding with real-world use cases, code examples in JavaScript and Python, and when to use (or avoid) it. Includes online encoder tool."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["base64", "encoding", "javascript", "python", "web-development", "api"]
readingTime: "7 min read"
---

Base64 is one of the most misunderstood tools in a developer's toolkit. It looks like encryption but provides zero security. It bloats data by 33% yet appears everywhere from JWTs to email attachments. Developers reach for it instinctively, sometimes when they should not.

This guide explains exactly what Base64 is, how it works, where you should use it, and where you absolutely should not. For quick encoding tasks, use our free [Base64 Encoder/Decoder](/tools/base64) to convert text and binary data instantly.

## What Is Base64?

Base64 is an encoding scheme that converts arbitrary binary data into a string of 64 printable ASCII characters. Those characters are: `A-Z` (26), `a-z` (26), `0-9` (10), `+` and `/` (2), with `=` used for padding — totaling 64.

The name "Base64" comes from the 64-character alphabet, the same way "Base10" describes our decimal system.

**Key fact:** Base64 is an encoding, not encryption. The original data can be decoded by anyone. It provides no confidentiality.

## How Base64 Encoding Works

Base64 works in 3-byte chunks. Every 3 bytes of input (24 bits) become 4 Base64 characters (6 bits each):

```
Input:    M        a        n
Binary:   01001101 01100001 01101110
Groups:   010011 010110 000101 101110
Base64:   T      W      F      u    → "TWFu"
```

When input length is not divisible by 3, padding characters (`=`) are added:

```
"Ma" → 2 bytes → 3 Base64 chars + 1 padding → "TWE="
"M"  → 1 byte  → 2 Base64 chars + 2 padding → "TQ=="
```

**Size overhead:** Every 3 bytes become 4 characters, so Base64 output is always 4/3 (~33%) larger than the input.

## Base64 vs Base64URL

Standard Base64 uses `+` and `/` characters, which have special meaning in URLs. **Base64URL** replaces these:

| Standard Base64 | Base64URL |
|----------------|-----------|
| `+` | `-` |
| `/` | `_` |
| `=` (padding) | (often omitted) |

JWTs use Base64URL. URLs and file names require Base64URL. When you see a token with `-` and `_` instead of `+` and `/`, it's Base64URL-encoded.

## How to Encode and Decode in JavaScript

### Browser

```javascript
// Encode string to Base64
const encoded = btoa('Hello, World!');
console.log(encoded); // 'SGVsbG8sIFdvcmxkIQ=='

// Decode Base64 to string
const decoded = atob('SGVsbG8sIFdvcmxkIQ==');
console.log(decoded); // 'Hello, World!'

// Unicode strings (btoa only handles Latin-1)
const encodeUnicode = (str) =>
  btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
    (_, p1) => String.fromCharCode('0x' + p1)));

const decodeUnicode = (str) =>
  decodeURIComponent(atob(str).split('').map(
    c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));

console.log(encodeUnicode('日本語')); // '5pel5pys6Kqe'
```

### Node.js

```javascript
// Encode
const encoded = Buffer.from('Hello, World!').toString('base64');
console.log(encoded); // 'SGVsbG8sIFdvcmxkIQ=='

// Decode
const decoded = Buffer.from('SGVsbG8sIFdvcmxkIQ==', 'base64').toString('utf8');
console.log(decoded); // 'Hello, World!'

// Encode a file
const fs = require('fs');
const fileBuffer = fs.readFileSync('./image.png');
const base64Image = fileBuffer.toString('base64');
console.log(`data:image/png;base64,${base64Image}`);

// Base64URL (for JWTs, URLs)
const base64url = (str) => Buffer.from(str).toString('base64url');
const fromBase64url = (str) => Buffer.from(str, 'base64url').toString('utf8');
```

## How to Encode and Decode in Python

```python
import base64

# Encode string
text = "Hello, World!"
encoded = base64.b64encode(text.encode('utf-8'))
print(encoded)           # b'SGVsbG8sIFdvcmxkIQ=='
print(encoded.decode())  # 'SGVsbG8sIFdvcmxkIQ=='

# Decode string
decoded = base64.b64decode('SGVsbG8sIFdvcmxkIQ==').decode('utf-8')
print(decoded)  # 'Hello, World!'

# Encode binary file
with open('image.png', 'rb') as f:
    image_data = f.read()
encoded_image = base64.b64encode(image_data).decode()
data_uri = f"data:image/png;base64,{encoded_image}"

# Base64URL (for JWTs, URL-safe use)
encoded_url = base64.urlsafe_b64encode(text.encode('utf-8'))
decoded_url = base64.urlsafe_b64decode(encoded_url).decode('utf-8')
```

## Real-World Use Cases

### 1. Data URIs in HTML/CSS

Embed small images directly in HTML or CSS without extra HTTP requests:

```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" alt="1x1 red pixel">
```

```css
.icon {
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==");
}
```

**Best for:** Small icons, loading spinners, critical above-the-fold images. Avoid for large images — the 33% size increase hurts more than the request savings.

### 2. HTTP Basic Authentication

The `Authorization: Basic` header encodes `username:password` as Base64:

```javascript
const credentials = btoa('alice:supersecret123');
fetch('https://api.example.com/data', {
  headers: {
    'Authorization': `Basic ${credentials}`
  }
});
```

**Important:** Basic Auth over plain HTTP is insecure. Always use HTTPS.

### 3. JWT Tokens

All three JWT parts (header, payload, signature) are Base64URL-encoded:

```javascript
const [header, payload] = token.split('.');
const decodedPayload = JSON.parse(atob(
  payload.replace(/-/g, '+').replace(/_/g, '/')
));
```

### 4. Email Attachments (MIME)

Email protocols (SMTP) were designed for ASCII text. Attachments are Base64-encoded in the MIME envelope:

```
Content-Type: application/pdf
Content-Transfer-Encoding: base64

JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PC9MZW5ndGggNiAwIFIKL0ZpbHRlci9GbGF0ZURlY29k...
```

### 5. Storing Binary Data in JSON/XML

APIs that return binary data (like AI-generated images) often Base64-encode it:

```python
import anthropic
import base64

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "describe this image",
               "images": [{"type": "base64", "media_type": "image/jpeg",
                           "data": base64.b64encode(image_bytes).decode()}]}]
)
```

### 6. Environment Variables and Config

Storing binary secrets (private keys, certificates) in environment variables:

```bash
# Encode a PEM key for use in an env var
export PRIVATE_KEY=$(base64 -w 0 private_key.pem)

# Decode it in your app
import base64, os
key = base64.b64decode(os.environ['PRIVATE_KEY'])
```

## When NOT to Use Base64

### Don't use it for security

Base64 is trivially reversible. Using it to "hide" passwords or sensitive data gives false security:

```python
# THIS IS NOT SECURITY
encoded_password = base64.b64encode(b"my_password")  # Anyone can decode this
```

### Don't use it for large files

A 10MB image becomes ~13.3MB when Base64-encoded. For large binary files, use multipart/form-data upload instead.

### Don't use it when binary transfer is already supported

REST APIs with `Content-Type: application/octet-stream` can send binary data directly. Base64 is only needed when the transport channel is text-only.

## Quick Reference

| Task | JavaScript | Python |
|------|-----------|--------|
| Encode string | `btoa(str)` | `base64.b64encode(s.encode())` |
| Decode string | `atob(str)` | `base64.b64decode(s).decode()` |
| Encode Buffer/bytes | `buf.toString('base64')` | already bytes |
| Base64URL encode | `buf.toString('base64url')` | `base64.urlsafe_b64encode(s)` |
| Data URI prefix | `data:image/png;base64,` | same |

Test your encoding interactively with the [Base64 Encoder/Decoder](/tools/base64) — encode text, decode tokens, or convert files right in your browser.
