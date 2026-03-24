---
title: "How to Format JSON in VS Code, Terminal, and Online (2026 Guide)"
description: "Learn how to format JSON in VS Code, the terminal with jq and Python, and instantly online. This 2026 guide covers every method with working code examples and shortcuts."
date: "2026-03-25"
author: "DevPlaybook Team"
tags: ["json", "vscode", "terminal", "developer-tools", "formatting", "2026"]
readingTime: "10 min read"
faq:
  - question: "How do I format JSON in VS Code with a keyboard shortcut?"
    answer: "Press Shift+Alt+F on Windows/Linux or Shift+Option+F on macOS. Make sure the file language mode is set to JSON first."
  - question: "What is the best command-line tool for formatting JSON?"
    answer: "jq is the gold standard for JSON processing in the terminal. For quick formatting without installing anything extra, Python's json.tool module works on every machine that has Python."
  - question: "Can I format JSON online without installing anything?"
    answer: "Yes. DevPlaybook's JSON Formatter Pro formats, validates, and highlights JSON entirely in the browser with no installation or signup required."
  - question: "Why does my JSON fail to format?"
    answer: "Common causes: trailing commas (not allowed in JSON), single quotes instead of double quotes, missing or extra brackets, or unescaped special characters in string values."
  - question: "What is the difference between JSON formatting and JSON validation?"
    answer: "Formatting adds whitespace and indentation for readability. Validation checks whether the JSON structure is syntactically correct according to the JSON spec (RFC 8259)."
---

JSON is everywhere in modern development — API responses, config files, log output, database records. The problem is that most JSON arrives as a compact, unreadable blob. Formatting it properly is a daily task for developers, and doing it efficiently saves real time.

This guide covers every method for formatting JSON in 2026: VS Code shortcuts and extensions, command-line tools like `jq` and Python, and instant online formatters. By the end, you'll have a reliable approach for every situation.

---

## Why JSON Formatting Matters

Raw JSON from a production API often looks like this:

```
{"users":[{"id":1,"name":"Alice","role":"admin","lastLogin":1711144800,"permissions":["read","write","delete"]},{"id":2,"name":"Bob","role":"viewer","lastLogin":1711058400,"permissions":["read"]}]}
```

That's syntactically valid. It's also impossible to scan quickly when you're debugging a permissions issue at midnight. Formatted, the same data looks like this:

```json
{
  "users": [
    {
      "id": 1,
      "name": "Alice",
      "role": "admin",
      "lastLogin": 1711144800,
      "permissions": ["read", "write", "delete"]
    },
    {
      "id": 2,
      "name": "Bob",
      "role": "viewer",
      "lastLogin": 1711058400,
      "permissions": ["read"]
    }
  ]
}
```

Same data — completely different cognitive load. Proper formatting also surfaces structural problems. An extra bracket or a missing comma is invisible in a minified blob but obvious in an indented structure.

---

## How to Format JSON in VS Code

VS Code has first-class JSON support built in. You don't need any extension for basic formatting.

### Built-in Format Document

**Keyboard shortcut:**
- Windows / Linux: `Shift+Alt+F`
- macOS: `Shift+Option+F`

**Using the Command Palette:**
1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type `Format Document`
3. Press Enter

If the file extension is `.json`, VS Code automatically applies JSON formatting rules. For files without a `.json` extension (like `.babelrc` or `tsconfig`), make sure the language mode in the bottom status bar shows **JSON**.

### Format on Save

To format JSON automatically every time you save:

1. Open Settings (`Ctrl+,` / `Cmd+,`)
2. Search for `editor.formatOnSave`
3. Enable it

Or add it directly to `settings.json`:

```json
{
  "editor.formatOnSave": true,
  "[json]": {
    "editor.defaultFormatter": "vscode.json-language-features"
  }
}
```

This means you never think about formatting again — just paste, save, done.

### Controlling Indentation

VS Code formats JSON with 2-space indentation by default. To change it:

```json
{
  "[json]": {
    "editor.tabSize": 4,
    "editor.insertSpaces": true
  }
}
```

### Format a JSON Selection

If you only want to format part of a file:

1. Select the JSON text
2. Right-click → **Format Selection**

This is useful when you have JSON embedded in a larger file — a JavaScript string, a documentation comment, a test fixture.

### Using the Prettier Extension

[Prettier](https://prettier.io/) is a popular code formatter that supports JSON alongside JavaScript, TypeScript, CSS, and more. Install it from the VS Code marketplace and set it as the default formatter:

```json
{
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

Prettier enforces consistent style across your entire project — useful if your team has mixed editor configurations.

### VS Code JSON Schema Validation

VS Code can validate JSON against a schema while formatting. For `package.json`, `tsconfig.json`, and other standard files, this happens automatically. For custom schemas, add them to settings:

```json
{
  "json.schemas": [
    {
      "fileMatch": ["config/*.json"],
      "url": "./schemas/my-config-schema.json"
    }
  ]
}
```

With schema validation active, VS Code highlights invalid field names and wrong value types directly in the editor — formatting and validation in one pass.

---

## How to Format JSON in the Terminal

When you're SSHed into a server, writing a script, or processing JSON in a pipeline, you need terminal-based tools.

### Method 1: Python (No Installation Needed)

Every system with Python installed has `json.tool` built in:

```bash
# Format a JSON string
echo '{"name":"Alice","role":"admin"}' | python3 -m json.tool

# Format a JSON file
python3 -m json.tool raw.json

# Format and write to a new file
python3 -m json.tool raw.json formatted.json

# Control indentation
python3 -m json.tool --indent 4 raw.json
```

Output:

```json
{
    "name": "Alice",
    "role": "admin"
}
```

Python's `json.tool` also validates as it formats — if the JSON is malformed, it exits with an error and prints the line where parsing failed. Excellent for CI/CD pipelines.

### Method 2: jq (The Proper Tool)

`jq` is the standard JSON processor for the command line. It formats, filters, transforms, and queries JSON.

**Install jq:**

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq

# Windows (via Chocolatey)
choco install jq

# Windows (via winget)
winget install jqlang.jq
```

**Basic formatting:**

```bash
# Format from stdin
echo '{"name":"Alice","role":"admin"}' | jq .

# Format a file
jq . raw.json

# Format with compact output (reverse — minify)
jq -c . formatted.json
```

**Why jq is better than Python for pipelines:**

Beyond formatting, jq lets you filter and transform JSON in the same command:

```bash
# Extract a specific field
curl -s https://api.example.com/users | jq '.users[0].email'

# Filter by condition
jq '.users[] | select(.role == "admin")' users.json

# Format and extract in one command
curl -s https://api.example.com/data | jq '.results | map(select(.active)) | .[0:10]'
```

Once you start using `jq` for filtering, pure Python piping feels clunky. For developers working heavily with APIs, `jq` is worth learning.

### Method 3: Node.js

If you have Node.js available and prefer it:

```bash
# One-liner to format from stdin
node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)));"

# Format a file
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('raw.json','utf8')); console.log(JSON.stringify(data,null,2));"
```

Or create a reusable script `fmt.js`:

```javascript
#!/usr/bin/env node
const fs = require('fs');

const input = process.argv[2];
const indent = parseInt(process.argv[3] || '2', 10);

let raw;
if (input) {
  raw = fs.readFileSync(input, 'utf8');
} else {
  raw = fs.readFileSync('/dev/stdin', 'utf8');
}

try {
  const parsed = JSON.parse(raw);
  console.log(JSON.stringify(parsed, null, indent));
} catch (err) {
  console.error('Invalid JSON:', err.message);
  process.exit(1);
}
```

Run it as `node fmt.js input.json` or pipe into it.

### Method 4: cat + jq in Scripts

For CI/CD pipelines, use jq to validate and format JSON as part of your build:

```bash
#!/bin/bash
# validate-config.sh — run before deployment

CONFIG_FILE="config/app.json"

if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
  echo "ERROR: $CONFIG_FILE is not valid JSON"
  exit 1
fi

echo "Config is valid JSON"

# Optional: show formatted output for logging
jq . "$CONFIG_FILE"
```

This approach catches malformed configs before they reach production.

---

## How to Format JSON Online

For quick one-off formatting — when you have a JSON blob from an API response and just need to see it — an online tool is the fastest option. No setup, no commands.

### DevPlaybook JSON Formatter Pro

[DevPlaybook's JSON Formatter Pro](/tools/json-formatter-pro) is built specifically for developers who need more than basic pretty-printing:

- **Instant formatting** — processes in the browser, no server round-trip
- **Syntax validation** — highlights errors with line numbers and descriptive messages
- **Tree view** — click to expand/collapse nested objects
- **Multiple themes** — light, dark, and high-contrast options
- **Copy and download** — get formatted JSON back to your clipboard or as a file
- **Minify mode** — collapse formatted JSON back to a single line

It handles edge cases well: deeply nested structures, arrays with thousands of items, escaped unicode characters, and large payloads that would choke simpler tools.

**When to use it:**
- Debugging API responses during development
- Checking config file structure before committing
- Sharing formatted JSON in documentation or Slack
- Quick spot-checks when you're not at your dev machine

The tool requires no account and stores nothing — JSON stays in your browser tab.

---

## Common JSON Formatting Errors and Fixes

Even experienced developers hit formatting issues. Here are the most common problems:

### Trailing Commas

```json
// INVALID
{
  "name": "Alice",
  "role": "admin",
}

// VALID
{
  "name": "Alice",
  "role": "admin"
}
```

JavaScript allows trailing commas; JSON does not. This trips up developers who copy from JS object literals.

### Single Quotes

```json
// INVALID
{
  'name': 'Alice'
}

// VALID
{
  "name": "Alice"
}
```

JSON requires double quotes for both keys and string values. Single quotes are not part of the JSON spec.

### Unquoted Keys

```json
// INVALID (this is JavaScript object literal syntax)
{
  name: "Alice"
}

// VALID
{
  "name": "Alice"
}
```

JavaScript developers sometimes forget that JSON keys must be quoted strings.

### Unescaped Special Characters

```json
// INVALID
{
  "message": "She said "hello""
}

// VALID
{
  "message": "She said \"hello\""
}
```

Double quotes inside string values must be escaped. The same applies to backslashes, newlines, and other control characters.

### Mismatched Brackets

```json
// INVALID — extra closing bracket
{
  "users": [
    {"name": "Alice"}
  ]]
}
```

Deep nesting makes it easy to lose track. A formatter shows the structure visually, which makes bracket mismatches obvious immediately.

---

## JSON Formatting in Different Languages

For programmatic formatting (building an API, generating reports, writing tests):

### JavaScript / TypeScript

```typescript
// Basic formatting
const formatted = JSON.stringify(data, null, 2);

// Custom replacer — exclude sensitive fields
const safe = JSON.stringify(data, (key, value) => {
  if (key === 'password' || key === 'token') return '[REDACTED]';
  return value;
}, 2);

// Compact (minified)
const compact = JSON.stringify(data);
```

### Python

```python
import json

# Format with indentation
formatted = json.dumps(data, indent=2, ensure_ascii=False)

# Sort keys for consistent output
sorted_output = json.dumps(data, indent=2, sort_keys=True)

# Parse then format (pretty-print a JSON string)
raw = '{"name":"Alice","role":"admin"}'
pretty = json.dumps(json.loads(raw), indent=2)
print(pretty)
```

### Go

```go
import (
    "encoding/json"
    "log"
)

// Marshal with indentation
formatted, err := json.MarshalIndent(data, "", "  ")
if err != nil {
    log.Fatal(err)
}
fmt.Println(string(formatted))
```

### Rust

```rust
use serde_json;

// Using serde_json with the "pretty" feature
let formatted = serde_json::to_string_pretty(&data)?;
println!("{}", formatted);
```

---

## When to Use Each Method

| Situation | Best Method |
|-----------|-------------|
| Editing a JSON file in VS Code | Built-in formatter (`Shift+Alt+F`) |
| Formatting in a CI/CD script | `python3 -m json.tool` or `jq` |
| Processing and filtering API data | `jq` |
| Quick ad-hoc inspection | DevPlaybook JSON Formatter Pro |
| Large JSON with deep nesting | jq or DevPlaybook (tree view) |
| Generating formatted JSON in code | Language-native serializer |

---

## Performance Considerations for Large JSON Files

If you're working with JSON files over 10MB:

- VS Code handles them, but the formatter can lag on very large files
- `jq` is extremely fast — written in C, handles gigabyte files easily
- Python's `json.tool` is slower but still fine for files under ~100MB
- Online tools vary — DevPlaybook handles typical API response sizes well, but for multi-megabyte files, a local tool is faster

For log aggregation, ETL pipelines, or any programmatic processing of large JSON, `jq` is the clear choice.

---

## Automating JSON Formatting in Your Workflow

A consistent formatting setup prevents "formatting-only" commits from polluting your git history.

### Pre-commit Hook with jq

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Format all staged JSON files before committing

for file in $(git diff --cached --name-only | grep '\.json$'); do
  if jq . "$file" > /tmp/formatted_json 2>/dev/null; then
    mv /tmp/formatted_json "$file"
    git add "$file"
  else
    echo "ERROR: $file contains invalid JSON"
    exit 1
  fi
done
```

### EditorConfig for JSON

An `.editorconfig` file sets consistent indentation across editors:

```ini
[*.json]
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
```

### ESLint / Prettier for Project-Wide Consistency

In JavaScript/TypeScript projects, Prettier handles JSON alongside your source files:

```json
// .prettierrc
{
  "tabWidth": 2,
  "printWidth": 100
}
```

Run `prettier --write "**/*.json"` as part of your lint step.

---

## Conclusion

For everyday JSON formatting, the right tool depends on context:

- **In VS Code:** use the built-in formatter with `Shift+Alt+F` and enable format-on-save for effortless consistency.
- **In the terminal:** learn `jq` — it handles everything from basic formatting to complex data transformations.
- **Online:** [DevPlaybook's JSON Formatter Pro](/tools/json-formatter-pro) is the fastest option for quick inspection with no setup overhead.

The pattern that works best: configure your editor to format on save, add a `jq`-based validation step to your CI pipeline, and keep an online formatter bookmarked for the inevitable moment when you're debugging an API response in a browser.

---

*Also useful: if your JSON contains Base64-encoded values, the [Base64 Decoder](/tools/base64) can decode them inline. Working with JWTs? The [JWT Decoder](/tools/jwt-decoder) shows the structured payload at a glance.*
