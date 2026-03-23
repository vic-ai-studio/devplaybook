# Chapter 05: Hooks & Automation

> Hooks let you inject custom logic before or after Claude Code actions. They're the bridge between AI-generated code and your team's quality standards.

---

## What Are Hooks?

Hooks are scripts that run automatically when Claude Code performs specific actions. They work like Git hooks or CI/CD pipelines — invisible quality gates that enforce your standards without manual intervention.

### Hook Types

| Hook | When It Runs | Use Case |
|------|-------------|----------|
| **PreToolUse** | Before Claude executes a tool | Validate, block, or modify tool calls |
| **PostToolUse** | After Claude executes a tool | Check output, log actions, enforce rules |
| **Notification** | On specific events | Alert on errors, track progress |
| **Stop** | When Claude finishes a response | Run final validation, format output |

---

## Configuring Hooks

Hooks are configured in your Claude Code settings file.

### Settings File Locations

| Scope | Path |
|-------|------|
| **Project** | `.claude/settings.json` |
| **User** | `~/.claude/settings.json` |

### Hook Configuration Format

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .claude/hooks/validate-bash.py"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint:changed"
          }
        ]
      }
    ]
  }
}
```

### Hook Matchers

Matchers determine which tool invocations trigger the hook:

| Matcher | Matches |
|---------|---------|
| `"Bash"` | Any Bash command execution |
| `"Write"` | File creation or overwrite |
| `"Edit"` | File edits |
| `"Write\|Edit"` | Either Write or Edit |
| `"Bash(npm*)"` | Bash commands starting with `npm` |
| `"*"` | All tool invocations |

---

## PreToolUse Hooks

PreToolUse hooks run before Claude executes a tool. They can:
- **Approve** the action (exit code 0)
- **Block** the action (exit code non-zero with message)
- **Modify** the action (return modified parameters)

### Example: Prevent Dangerous Commands

```python
#!/usr/bin/env python3
# .claude/hooks/validate-bash.py
"""Block dangerous bash commands before execution."""

import json
import sys

# Read the tool use details from stdin
input_data = json.loads(sys.stdin.read())
command = input_data.get("tool_input", {}).get("command", "")

BLOCKED_PATTERNS = [
    "rm -rf /",
    "rm -rf ~",
    "DROP DATABASE",
    "DROP TABLE",
    "git push --force origin main",
    "git reset --hard",
    "> /dev/sda",
    "mkfs",
    "dd if=",
    "chmod -R 777",
]

for pattern in BLOCKED_PATTERNS:
    if pattern.lower() in command.lower():
        print(json.dumps({
            "decision": "block",
            "reason": f"Blocked dangerous command pattern: {pattern}"
        }))
        sys.exit(0)

# Allow the command
print(json.dumps({"decision": "approve"}))
```

Register it:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .claude/hooks/validate-bash.py"
          }
        ]
      }
    ]
  }
}
```

### Example: Prevent Writing to Protected Files

```python
#!/usr/bin/env python3
# .claude/hooks/protect-files.py
"""Prevent modifications to protected files."""

import json
import sys

input_data = json.loads(sys.stdin.read())
file_path = input_data.get("tool_input", {}).get("file_path", "")

PROTECTED_FILES = [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".env",
    ".env.production",
    "prisma/migrations/",  # Never modify applied migrations
    "docker-compose.prod.yml",
]

for protected in PROTECTED_FILES:
    if protected in file_path:
        print(json.dumps({
            "decision": "block",
            "reason": f"Cannot modify protected file: {file_path}. "
                      f"These files should only be changed through their proper workflow."
        }))
        sys.exit(0)

print(json.dumps({"decision": "approve"}))
```

### Example: Require Test Files for New Source Files

```python
#!/usr/bin/env python3
# .claude/hooks/require-tests.py
"""When creating a new source file, remind about tests."""

import json
import sys
import os

input_data = json.loads(sys.stdin.read())
file_path = input_data.get("tool_input", {}).get("file_path", "")

# Only check Write operations for new source files
if not file_path:
    print(json.dumps({"decision": "approve"}))
    sys.exit(0)

# Check if this is a new source file (not a test, not config)
is_source = any(file_path.endswith(ext) for ext in [".ts", ".tsx", ".py", ".js", ".jsx"])
is_test = any(pattern in file_path for pattern in ["test", "spec", "__tests__", "tests/"])
is_config = any(pattern in file_path for pattern in ["config", ".json", ".yaml", ".yml"])

if is_source and not is_test and not is_config and not os.path.exists(file_path):
    # Don't block, just add a reminder
    print(json.dumps({
        "decision": "approve",
        "message": f"Reminder: New source file {file_path} — ensure a corresponding test file is created."
    }))
    sys.exit(0)

print(json.dumps({"decision": "approve"}))
```

---

## PostToolUse Hooks

PostToolUse hooks run after a tool completes. They're ideal for validation and enforcement.

### Example: Auto-Lint After File Changes

```bash
#!/bin/bash
# .claude/hooks/post-lint.sh
# Run linter on any file Claude just wrote or edited

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Determine file type and run appropriate linter
case "$FILE_PATH" in
    *.ts|*.tsx|*.js|*.jsx)
        npx eslint --fix "$FILE_PATH" 2>/dev/null
        ;;
    *.py)
        python3 -m black "$FILE_PATH" 2>/dev/null
        python3 -m ruff check --fix "$FILE_PATH" 2>/dev/null
        ;;
    *.rs)
        rustfmt "$FILE_PATH" 2>/dev/null
        ;;
    *.go)
        gofmt -w "$FILE_PATH" 2>/dev/null
        ;;
esac
```

### Example: Track All File Modifications

```python
#!/usr/bin/env python3
# .claude/hooks/audit-log.py
"""Log all file modifications for audit purposes."""

import json
import sys
from datetime import datetime

input_data = json.loads(sys.stdin.read())
tool_name = input_data.get("tool_name", "")
tool_input = input_data.get("tool_input", {})
tool_output = input_data.get("tool_output", {})

file_path = tool_input.get("file_path", "")
if not file_path:
    sys.exit(0)

log_entry = {
    "timestamp": datetime.now().isoformat(),
    "tool": tool_name,
    "file": file_path,
    "success": tool_output.get("success", True),
}

# Append to audit log
with open(".claude/audit.log", "a") as f:
    f.write(json.dumps(log_entry) + "\n")
```

### Example: Run Tests After Code Changes

```bash
#!/bin/bash
# .claude/hooks/post-test.sh
# Run related tests after code changes

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Skip if the changed file is a test itself
if echo "$FILE_PATH" | grep -qE "(test|spec)\.(ts|js|tsx|jsx)$"; then
    exit 0
fi

# Find related test file
TEST_FILE=$(echo "$FILE_PATH" | sed 's/\.ts$/.test.ts/' | sed 's/\.tsx$/.test.tsx/')

if [ -f "$TEST_FILE" ]; then
    echo "Running related tests..."
    npx vitest run "$TEST_FILE" --reporter=verbose 2>&1
fi
```

---

## CI/CD Integration

Claude Code shines in CI/CD pipelines. Use it for automated code review, test generation, and migration validation.

### GitHub Actions: AI Code Review

```yaml
# .github/workflows/claude-review.yml
name: Claude Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Review Changes
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          DIFF=$(git diff origin/${{ github.base_ref }}...HEAD)
          REVIEW=$(echo "$DIFF" | claude -p "Review this diff for:
          1. Bugs or logic errors
          2. Security vulnerabilities
          3. Performance issues
          4. Code style violations
          Be concise. Only flag real issues, not style preferences.
          Format as a markdown list." --dangerously-skip-permissions)
          echo "$REVIEW" > review.md

      - name: Post Review Comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const review = fs.readFileSync('review.md', 'utf8');
            if (review.trim()) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: `## Claude Code Review\n\n${review}`
              });
            }
```

### GitHub Actions: Auto-Generate Tests

```yaml
# .github/workflows/claude-tests.yml
name: Generate Missing Tests
on:
  pull_request:
    types: [opened]

jobs:
  generate-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Dependencies
        run: |
          npm ci
          npm install -g @anthropic-ai/claude-code

      - name: Find Untested Files
        run: |
          # Find source files without corresponding test files
          for f in $(find src -name "*.ts" ! -name "*.test.ts" ! -name "*.d.ts"); do
            test_file="${f%.ts}.test.ts"
            if [ ! -f "$test_file" ]; then
              echo "$f" >> untested.txt
            fi
          done

      - name: Generate Tests
        if: hashFiles('untested.txt') != ''
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          while IFS= read -r file; do
            claude -p "Write comprehensive unit tests for $file.
            Follow the project's existing test patterns.
            Use Vitest. Include edge cases." --dangerously-skip-permissions
          done < untested.txt

      - name: Create PR with Tests
        uses: peter-evans/create-pull-request@v6
        with:
          title: "test: add missing unit tests"
          body: "Auto-generated tests for untested source files."
          branch: auto/missing-tests
```

### GitLab CI: Migration Validation

```yaml
# .gitlab-ci.yml
claude-migration-check:
  stage: validate
  rules:
    - changes:
        - prisma/migrations/**/*
  script:
    - npm install -g @anthropic-ai/claude-code
    - |
      claude -p "Review the latest Prisma migration in prisma/migrations/.
      Check for:
      1. Destructive operations (DROP COLUMN, DROP TABLE) without data backup
      2. Missing indexes on foreign keys
      3. NOT NULL columns added without defaults
      4. Potential data loss scenarios
      If any critical issues found, output 'CRITICAL:' followed by the issue.
      If safe, output 'SAFE: migration looks good.'" \
      --dangerously-skip-permissions > migration-review.txt
    - cat migration-review.txt
    - "! grep -q 'CRITICAL:' migration-review.txt"
```

---

## Automated Workflows

### Workflow: Daily Code Quality Report

```bash
#!/bin/bash
# scripts/daily-quality-report.sh
# Run via cron: 0 9 * * * /path/to/daily-quality-report.sh

cd /path/to/project

REPORT=$(claude -p "Generate a code quality report for this project:
1. Count of TODO/FIXME/HACK comments
2. Files with no test coverage (source files without corresponding test)
3. Functions longer than 50 lines
4. Files with more than 300 lines
5. Any TypeScript 'any' types
Format as a clean markdown report with counts and file paths." \
--dangerously-skip-permissions)

# Send to Slack
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"Daily Code Quality Report\n\n$REPORT\"}"
```

### Workflow: Automatic Documentation Updates

```bash
#!/bin/bash
# .git/hooks/pre-push (or via CI)
# Auto-update API documentation when routes change

CHANGED_FILES=$(git diff --name-only HEAD~1)

if echo "$CHANGED_FILES" | grep -q "src/routes/"; then
    echo "API routes changed — updating documentation..."
    claude -p "The API routes have changed. Update docs/api-reference.md to reflect
    the current state of all routes in src/routes/.
    Include: method, path, request body schema, response schema, auth requirements.
    Preserve existing documentation structure." --dangerously-skip-permissions
    git add docs/api-reference.md
fi
```

### Workflow: Dependency Update Review

```bash
#!/bin/bash
# scripts/review-deps.sh
# Run after renovate/dependabot PRs

claude -p "Review the dependency changes in package.json:
$(git diff HEAD~1 -- package.json)

For each changed dependency:
1. What changed (version bump)
2. Is it a major, minor, or patch update
3. Breaking changes to watch for
4. Any known security advisories

Recommend: merge, review carefully, or reject." --dangerously-skip-permissions
```

---

## Hook Recipes

### Recipe: Enforce Import Order

```python
#!/usr/bin/env python3
# .claude/hooks/check-imports.py
"""Ensure imports follow the project's ordering convention."""

import json
import sys
import re

input_data = json.loads(sys.stdin.read())
file_path = input_data.get("tool_input", {}).get("file_path", "")

if not file_path or not file_path.endswith((".ts", ".tsx")):
    print(json.dumps({"decision": "approve"}))
    sys.exit(0)

# Read the file content from tool output
content = input_data.get("tool_output", {}).get("content", "")
if not content:
    print(json.dumps({"decision": "approve"}))
    sys.exit(0)

# Check import order: 1. React/Next 2. External 3. Internal (@/) 4. Relative (./)
import_lines = [l for l in content.split("\n") if l.startswith("import ")]

categories = {"react": [], "external": [], "internal": [], "relative": []}
for imp in import_lines:
    if "from 'react" in imp or "from 'next" in imp:
        categories["react"].append(imp)
    elif "from '@/" in imp or 'from "@/' in imp:
        categories["internal"].append(imp)
    elif "from './" in imp or "from '../" in imp:
        categories["relative"].append(imp)
    else:
        categories["external"].append(imp)

# Verify ordering
expected_order = categories["react"] + categories["external"] + categories["internal"] + categories["relative"]
if import_lines != expected_order and import_lines:
    print(json.dumps({
        "decision": "approve",
        "message": "Import order should be: React/Next → External → Internal (@/) → Relative (./) — consider reordering."
    }))
else:
    print(json.dumps({"decision": "approve"}))
```

### Recipe: Max File Size Enforcement

```python
#!/usr/bin/env python3
# .claude/hooks/check-file-size.py
"""Warn when files exceed size limits."""

import json
import sys

input_data = json.loads(sys.stdin.read())
content = input_data.get("tool_input", {}).get("content", "")
file_path = input_data.get("tool_input", {}).get("file_path", "")

if not content:
    print(json.dumps({"decision": "approve"}))
    sys.exit(0)

line_count = content.count("\n") + 1
MAX_LINES = 300

if line_count > MAX_LINES:
    print(json.dumps({
        "decision": "approve",
        "message": f"Warning: {file_path} is {line_count} lines (limit: {MAX_LINES}). "
                   f"Consider splitting into smaller modules."
    }))
else:
    print(json.dumps({"decision": "approve"}))
```

### Recipe: Commit Message Validation

```bash
#!/bin/bash
# .claude/hooks/validate-commit.sh
# Ensure conventional commit format

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check git commit commands
if ! echo "$COMMAND" | grep -q "git commit"; then
    echo '{"decision": "approve"}'
    exit 0
fi

# Extract commit message
MSG=$(echo "$COMMAND" | grep -oP '(?<=-m ")[^"]+')

# Validate conventional commit format
if ! echo "$MSG" | grep -qE "^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\(.+\))?: .+"; then
    echo '{"decision": "block", "reason": "Commit message must follow conventional commits format: type(scope): description"}'
    exit 0
fi

echo '{"decision": "approve"}'
```

---

## Combining Hooks for a Complete Quality Pipeline

Here's a full `.claude/settings.json` that implements a comprehensive quality pipeline:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .claude/hooks/validate-bash.py"
          }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .claude/hooks/protect-files.py"
          },
          {
            "type": "command",
            "command": "python3 .claude/hooks/check-file-size.py"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/post-lint.sh"
          },
          {
            "type": "command",
            "command": "python3 .claude/hooks/audit-log.py"
          }
        ]
      }
    ]
  },
  "permissions": {
    "allow": [
      "Bash(npm test*)",
      "Bash(npm run lint*)",
      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(git log*)"
    ],
    "deny": [
      "Bash(rm -rf*)",
      "Bash(git push --force*)"
    ]
  }
}
```

This gives you:
- Dangerous command blocking
- Protected file enforcement
- File size warnings
- Auto-linting after every change
- Full audit trail
- Whitelisted safe commands
- Blacklisted dangerous commands

---

**Next Chapter:** [06 - Advanced Workflows](06-advanced-workflows.md) — Master complex refactoring, debugging, and code review workflows.
