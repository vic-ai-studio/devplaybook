---
title: "YAML Validator Online: Lint and Format YAML Files"
description: "Validate and lint YAML online for free. Understand YAML syntax errors, indentation rules, and how to fix common YAML issues in config files and CI/CD pipelines."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["yaml", "yaml-validator", "yaml-linter", "developer-tools", "devops"]
readingTime: "9 min read"
---

YAML is everywhere in modern development. Your CI/CD pipelines, Kubernetes manifests, Docker Compose files, Ansible playbooks, GitHub Actions workflows, and application configuration files are almost certainly written in YAML. And yet, YAML is also notorious for being deceptively fragile. A single misplaced space, an errant tab, or an ambiguous string literal can break your entire deployment — often with a cryptic error message.

This guide covers YAML validation and linting in depth: what makes YAML tricky, what a validator actually checks, common errors and how to fix them, and when to reach for an online YAML validator instead of running tooling locally.

## What Is YAML and Why Is It Error-Prone?

YAML (YAML Ain't Markup Language) is a human-readable data serialization format. Its design goal was to be more readable than JSON or XML, using indentation to represent structure instead of brackets and tags.

That readability comes at a cost: **YAML is whitespace-sensitive in ways that are easy to get wrong**. The parser uses indentation to determine the structure of your document, and it has opinions about things like implicit type coercion that can produce surprising results.

Here's a taste of the weirdness:

```yaml
# These look similar but mean very different things
key1: yes      # parsed as boolean true
key1: "yes"    # parsed as the string "yes"

key2: 1.0      # parsed as float
key2: "1.0"    # parsed as string

key3:          # null value
key3: ~        # also null
key3: null     # also null
```

The implicit type coercion in YAML 1.1 (used by many parsers) is a particularly famous source of bugs — the so-called "Norway problem" where the country code `NO` is parsed as boolean `false`. YAML 1.2 fixed many of these issues, but library support is inconsistent.

## What Does a YAML Validator Check?

A YAML validator performs several layers of checking:

### Syntax Validation
The most basic check: is this valid YAML that a parser can process without errors?

- Proper indentation (consistent spaces, no tabs mixed in)
- Correct use of colons, dashes, and brackets
- Properly quoted strings
- Valid escape sequences
- Balanced brackets and braces (for flow style)

### Structure Validation
Does the document represent a valid data structure?

- Keys in mappings are unique (duplicate keys are technically invalid, though some parsers accept them)
- Sequences use consistent dash notation
- Anchors and aliases are properly defined and referenced

### Semantic Linting
More advanced linters check for style and best practices:

- Trailing whitespace
- Inconsistent indentation width
- Lines that exceed a maximum length
- Truthy values that should be quoted (`yes`, `no`, `on`, `off`, `true`, `false`)
- Octal numbers that might be misinterpreted

## YAML Indentation Rules

Indentation is where most YAML errors originate. The rules:

1. **Use spaces, not tabs.** Tabs are explicitly forbidden in YAML. This is non-negotiable.
2. **Be consistent within a block.** All items at the same level must use the same indentation.
3. **Child elements must be indented more than their parent.** There's no rule about how many spaces, but 2 is conventional.

```yaml
# CORRECT
parent:
  child1: value1
  child2: value2
  nested:
    grandchild: value3

# WRONG — inconsistent indentation
parent:
  child1: value1
    child2: value2   # ← indented too much, now looks like child of child1
```

### Indentation and Sequences

List items use a dash (`-`) followed by a space. The dash itself counts as part of the indentation:

```yaml
# Items at the top level
- item1
- item2

# Items nested under a key
fruits:
  - apple
  - banana
  - cherry

# Sequence of mappings
people:
  - name: Alice
    age: 30
  - name: Bob
    age: 25
```

A common mistake is inconsistent placement of the dash relative to the mapping keys:

```yaml
# WRONG — the keys after the dash are at different levels
people:
  - name: Alice
   age: 30      # ← this is at wrong indentation level

# CORRECT — both keys at same level relative to the dash
people:
  - name: Alice
    age: 30
```

## Common YAML Errors and How to Fix Them

### Tabs Instead of Spaces

**Symptom:**
```
yaml.scanner.ScannerError: while scanning for the next token found character '\t' that cannot start any token
```

**Fix:** Replace all tabs with spaces. In most editors, you can set "convert tabs to spaces" or use a command like:
```bash
expand -t 2 config.yaml > config_fixed.yaml
```

### Duplicate Keys

**Symptom:** No error, but one of your keys silently disappears.

```yaml
# WRONG — duplicate key
database:
  host: localhost
  port: 5432
  host: production.db.example.com  # ← overwrites the first 'host'
```

Most parsers accept duplicate keys but use the last value, silently discarding the earlier one. A linter will flag this as an error.

### Unquoted Special Characters

**Symptom:**
```
yaml.scanner.ScannerError: mapping values are not allowed here
```

Colons, brackets, and other special characters can confuse the parser when unquoted:

```yaml
# WRONG
message: Error: something went wrong
url: http://example.com/path?key=value&other=data

# CORRECT
message: "Error: something went wrong"
url: "http://example.com/path?key=value&other=data"
```

### Implicit Type Coercion Surprises

```yaml
# WRONG if you want strings
enabled: yes       # becomes boolean true
port: 08080        # the leading zero makes this an octal literal in YAML 1.1!
version: 1.0       # becomes float, may serialize back as "1" without decimal

# CORRECT
enabled: "yes"
port: "08080"
version: "1.0"
```

The port example is particularly dangerous in old-style YAML parsers — `0777` is the octal value 511, not 777.

### Multiline String Confusion

YAML has two multiline string notations that behave differently:

```yaml
# Literal block scalar — preserves newlines
description: |
  Line one
  Line two
  Line three

# Folded block scalar — newlines become spaces (except blank lines)
description: >
  This is a long sentence
  that continues here
  and ends here.

  New paragraph starts after blank line.
```

Forgetting which one you're using leads to unexpected whitespace in your strings.

### Anchor and Alias Errors

```yaml
# Define an anchor
defaults: &defaults
  timeout: 30
  retries: 3

# Reference it with an alias
production:
  <<: *defaults    # merge key — copies all keys from defaults
  host: prod.example.com

# WRONG — referencing undefined anchor
staging:
  <<: *undefined_anchor  # ParseError
```

## YAML in CI/CD Pipelines

YAML errors in CI/CD are particularly painful because they often only surface at runtime, causing pipeline failures with confusing error messages. Here are the most common pitfalls:

### GitHub Actions

```yaml
# Common mistake — string that looks like a number
on:
  push:
    branches:
      - main

# WRONG — 'on' is a YAML truthy value! Quote it or use the longer form
"on":
  push:
    branches:
      - main
```

### Kubernetes Manifests

```yaml
# Integer vs string port — matters for some tools
ports:
  - containerPort: 8080    # integer
  - containerPort: "8080"  # string — some validators warn about this

# Resource limits — must be strings
resources:
  limits:
    memory: "256Mi"   # CORRECT
    memory: 256Mi     # WRONG — Mi suffix makes this a string anyway, but be explicit
```

### Docker Compose

```yaml
# Version field — should be a string
version: "3.8"   # CORRECT
version: 3.8     # Parsed as float 3.8, may cause issues

# Environment variables — be careful with special characters
environment:
  DATABASE_URL: "postgres://user:pass@host:5432/db"  # Quote the URL
  API_KEY: "${SECRET_KEY}"   # Variable substitution
```

## YAML Linting Tools

### yamllint

The standard Python YAML linter. Install with `pip install yamllint` and configure with `.yamllint`:

```yaml
# .yamllint configuration
extends: default
rules:
  line-length:
    max: 120
  truthy:
    allowed-values: ['true', 'false']
  indentation:
    spaces: 2
    indent-sequences: true
```

Run it:
```bash
yamllint config.yaml
yamllint -d relaxed docker-compose.yml
```

### VS Code Extensions

- **YAML** by Red Hat — syntax highlighting, schema validation, formatting
- **YAML Lint** — inline linting as you type

### Language-Specific Libraries

```python
# Python — use PyYAML or ruamel.yaml
import yaml

try:
    with open('config.yaml') as f:
        data = yaml.safe_load(f)
except yaml.YAMLError as e:
    print(f"YAML Error: {e}")
```

```javascript
// Node.js — use js-yaml
const yaml = require('js-yaml');

try {
  const doc = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
} catch (e) {
  console.error('YAML Error:', e.message);
}
```

## When to Use an Online YAML Validator

Running `yamllint` locally requires Python, pip, and a config file. That's fine for a project, but overkill when you just need to quickly check a YAML snippet. An online validator is the right tool when:

- **You're debugging a CI/CD pipeline failure** and want to validate the YAML before pushing again
- **You copied YAML from documentation or Stack Overflow** and want to verify it's valid before using it
- **You're writing a Kubernetes manifest or Helm chart** and want instant feedback on structure
- **You're on a new machine or container** where tooling isn't installed
- **You need to quickly format and pretty-print** a YAML file that's been minimized or hand-edited
- **You want to convert between JSON and YAML** — most online validators support this in both directions

## FAQ

**Q: Is YAML a superset of JSON?**

YAML 1.2 is a superset of JSON — every valid JSON document is also valid YAML 1.2. In practice, the libraries you use matter. PyYAML implements YAML 1.1, which doesn't fully support JSON's escape sequences. js-yaml defaults to YAML 1.2 compatibility.

**Q: Why does my YAML work locally but fail in production?**

Different YAML libraries implement different versions of the spec with different default behaviors. The most common culprit is YAML 1.1 vs 1.2 type coercion differences. Another common cause: your local tool is more lenient about duplicate keys or tabs than the production parser.

**Q: How do I validate YAML against a JSON Schema?**

Tools like `yamllint` focus on syntax. For schema validation (validating that your YAML has the right structure and types), you need a JSON Schema validator that accepts YAML input. The Red Hat YAML VS Code extension supports this with `# yaml-language-server: $schema=...` comments at the top of your file.

**Q: What's the difference between block style and flow style YAML?**

Block style uses indentation:
```yaml
person:
  name: Alice
  hobbies:
    - reading
    - coding
```

Flow style uses JSON-like brackets:
```yaml
person: {name: Alice, hobbies: [reading, coding]}
```

Both are valid. Flow style is more compact but less readable for nested structures.

**Q: How do I represent an empty value in YAML?**

```yaml
key:           # implicit null
key: ~         # explicit null
key: null      # also null
key: ""        # empty string — NOT null
key: []        # empty sequence
key: {}        # empty mapping
```

---

## Validate Your YAML Instantly

Tired of pushing to CI only to discover your YAML had a tab on line 47? The **[DevPlaybook YAML Validator](https://devplaybook.cc/tools/yaml-validator)** gives you instant validation and formatting in your browser — no install, no setup, no pushing broken configs.

Paste your YAML, see the errors highlighted with line numbers and clear explanations, fix them, and you're done.

**[Open YAML Validator →](https://devplaybook.cc/tools/yaml-validator)**

It handles syntax validation, structure checking, and pretty-printing for everything from simple config files to multi-document Kubernetes manifests. Catch the error before it catches you.
