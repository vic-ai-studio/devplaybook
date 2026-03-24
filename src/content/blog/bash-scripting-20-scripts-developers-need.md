---
title: "Bash Scripting: 20 Scripts Every Developer Needs"
description: "Stop doing the same tasks manually. These 20 practical Bash scripts automate deployments, backups, file processing, git workflows, and daily developer tasks — ready to copy and use."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["bash", "shell-scripting", "automation", "command-line", "devops", "developer-tools"]
readingTime: "15 min read"
---

Every minute you spend doing a repetitive task manually is a minute stolen from building things. Bash scripting is the fastest way to get those minutes back. You do not need to be a shell wizard — you just need working scripts for the jobs that keep coming up.

Here are 20 practical Bash scripts built for real developer workflows. Each one is production-tested, annotated, and ready to drop into your toolbox.

---

## Bash Script Template (Start Every Script Right)

Before the scripts, here is the template every good Bash script starts with:

```bash
#!/usr/bin/env bash
set -euo pipefail

# -e: exit on error
# -u: treat unset variables as errors
# -o pipefail: catch errors in pipes

# Usage: ./script.sh [args]
# Description: What this script does

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
```

Always use `set -euo pipefail`. It prevents silent failures that waste hours of debugging.

---

## 1. Automated Project Setup

Creates a new project directory with standard structure and git initialization.

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${1:?Usage: $0 <project-name>}"
BASE_DIR="${2:-$HOME/projects}"
PROJECT_DIR="$BASE_DIR/$PROJECT_NAME"

echo "Creating project: $PROJECT_NAME"
mkdir -p "$PROJECT_DIR"/{src,tests,docs,.github/workflows}
touch "$PROJECT_DIR"/{README.md,.gitignore,.env.example}

cat > "$PROJECT_DIR/README.md" << EOF
# $PROJECT_NAME

## Setup
\`\`\`
cp .env.example .env
\`\`\`
EOF

cd "$PROJECT_DIR"
git init
git add .
git commit -m "chore: initial project scaffold"

echo "Done! Project created at $PROJECT_DIR"
```

---

## 2. Git Branch Cleanup

Deletes merged local branches (and optionally remote ones).

```bash
#!/usr/bin/env bash
set -euo pipefail

DEFAULT_BRANCH="${1:-main}"

echo "Fetching remote state..."
git fetch --prune

echo "Merged branches that will be deleted:"
git branch --merged "$DEFAULT_BRANCH" | grep -v "^\*\|$DEFAULT_BRANCH\|main\|master\|develop"

read -rp "Delete these branches? [y/N] " confirm
if [[ "${confirm,,}" == "y" ]]; then
  git branch --merged "$DEFAULT_BRANCH" \
    | grep -v "^\*\|$DEFAULT_BRANCH\|main\|master\|develop" \
    | xargs -r git branch -d
  echo "Done."
fi
```

---

## 3. File Backup with Timestamps

Backs up a file or directory with a timestamp suffix.

```bash
#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:?Usage: $0 <file-or-dir>}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP="${TARGET}.backup_${TIMESTAMP}"

if [[ -d "$TARGET" ]]; then
  cp -r "$TARGET" "$BACKUP"
else
  cp "$TARGET" "$BACKUP"
fi

echo "Backed up to: $BACKUP"
```

---

## 4. Bulk File Rename

Renames files matching a pattern — useful for reformatting filenames in bulk.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Usage: ./rename.sh "*.jpeg" "jpg"
# Renames all .jpeg files to .jpg

PATTERN="${1:?Usage: $0 <pattern> <new-extension>}"
NEW_EXT="${2:?}"

for file in $PATTERN; do
  [[ -f "$file" ]] || continue
  base="${file%.*}"
  mv -v "$file" "${base}.${NEW_EXT}"
done
```

---

## 5. Environment Variables Validator

Checks that all required environment variables are set before running an app.

```bash
#!/usr/bin/env bash
set -euo pipefail

REQUIRED_VARS=(
  "DATABASE_URL"
  "SECRET_KEY"
  "REDIS_URL"
  "PORT"
)

MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    MISSING+=("$var")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "ERROR: Missing required environment variables:"
  printf '  - %s\n' "${MISSING[@]}"
  exit 1
fi

echo "All required environment variables are set."
```

---

## 6. Log File Monitor with Alerting

Watches a log file and sends a message when an error pattern appears.

```bash
#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="${1:?Usage: $0 <log-file>}"
PATTERN="${2:-ERROR|FATAL|CRITICAL}"
WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

tail -F "$LOG_FILE" | while read -r line; do
  if echo "$line" | grep -qE "$PATTERN"; then
    echo "ALERT: $line"
    if [[ -n "$WEBHOOK_URL" ]]; then
      curl -s -X POST "$WEBHOOK_URL" \
        -H 'Content-type: application/json' \
        -d "{\"text\": \"Log alert: \`$line\`\"}"
    fi
  fi
done
```

---

## 7. Simple Deployment Script

Deploys a Node.js app via SSH with zero-downtime swap.

```bash
#!/usr/bin/env bash
set -euo pipefail

SERVER="${DEPLOY_SERVER:?Set DEPLOY_SERVER}"
APP_DIR="${DEPLOY_DIR:-/app}"
BRANCH="${1:-main}"

echo "Deploying branch: $BRANCH to $SERVER"

ssh "$SERVER" bash << REMOTE
  set -euo pipefail
  cd $APP_DIR
  git fetch origin
  git checkout $BRANCH
  git pull origin $BRANCH
  npm ci --only=production
  npm run build 2>/dev/null || true
  pm2 reload ecosystem.config.js --update-env
  echo "Deploy complete on \$(hostname) at \$(date)"
REMOTE

echo "Deployment finished."
```

---

## 8. Database Backup (PostgreSQL)

Backs up a Postgres database and compresses with gzip.

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:?Usage: $0 <db-name>}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/db-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up $DB_NAME..."
pg_dump "$DB_NAME" | gzip > "$BACKUP_FILE"
echo "Saved: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# Keep only last 7 backups
ls -t "$BACKUP_DIR/${DB_NAME}"_*.sql.gz | tail -n +8 | xargs -r rm -v
```

---

## 9. Find and Replace Across Files

Replaces a string across all matching files in a directory.

```bash
#!/usr/bin/env bash
set -euo pipefail

SEARCH="${1:?Usage: $0 <search> <replace> [file-pattern]}"
REPLACE="${2:?}"
PATTERN="${3:-*.js}"

echo "Replacing '$SEARCH' with '$REPLACE' in $PATTERN files..."

# macOS uses BSD sed, Linux uses GNU sed
if [[ "$OSTYPE" == "darwin"* ]]; then
  find . -name "$PATTERN" -exec sed -i '' "s|$SEARCH|$REPLACE|g" {} +
else
  find . -name "$PATTERN" -exec sed -i "s|$SEARCH|$REPLACE|g" {} +
fi

echo "Done. Verify with: grep -r '$REPLACE' --include='$PATTERN'"
```

---

## 10. Port Scanner / Port in Use Checker

Checks if a port is in use and shows which process is using it.

```bash
#!/usr/bin/env bash
set -euo pipefail

PORT="${1:?Usage: $0 <port>}"

if lsof -Pi ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Port $PORT is IN USE:"
  lsof -Pi ":$PORT" -sTCP:LISTEN
else
  echo "Port $PORT is available."
fi
```

---

## 11. Health Check Script

Polls a URL until it returns 200 — useful after deployments.

```bash
#!/usr/bin/env bash
set -euo pipefail

URL="${1:?Usage: $0 <url> [timeout-seconds]}"
TIMEOUT="${2:-60}"
INTERVAL=3
ELAPSED=0

echo "Waiting for $URL to be healthy..."

until curl -sf "$URL" > /dev/null; do
  if [[ $ELAPSED -ge $TIMEOUT ]]; then
    echo "ERROR: $URL did not become healthy within ${TIMEOUT}s"
    exit 1
  fi
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
  echo "  Still waiting... (${ELAPSED}s)"
done

echo "Healthy after ${ELAPSED}s"
```

---

## 12. Generate a `.env` File from `.env.example`

Copies `.env.example` and prompts for values for required fields.

```bash
#!/usr/bin/env bash
set -euo pipefail

EXAMPLE=".env.example"
OUTPUT=".env"

[[ -f "$EXAMPLE" ]] || { echo "No .env.example found"; exit 1; }

if [[ -f "$OUTPUT" ]]; then
  read -rp ".env already exists. Overwrite? [y/N] " yn
  [[ "${yn,,}" == "y" ]] || exit 0
fi

cp "$EXAMPLE" "$OUTPUT"

# Prompt for empty values
while IFS= read -r line; do
  if [[ "$line" =~ ^([A-Z_]+)=$ ]]; then
    key="${BASH_REMATCH[1]}"
    read -rp "Enter value for $key: " val
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^${key}=$|${key}=${val}|" "$OUTPUT"
    else
      sed -i "s|^${key}=$|${key}=${val}|" "$OUTPUT"
    fi
  fi
done < "$EXAMPLE"

echo "Created $OUTPUT"
```

---

## 13. Monitor Disk Usage and Alert

Warns when a filesystem exceeds a usage threshold.

```bash
#!/usr/bin/env bash
set -euo pipefail

THRESHOLD="${1:-85}"

df -h | awk -v t="$THRESHOLD" 'NR>1 {
  gsub(/%/, "", $5)
  if ($5 > t) {
    print "ALERT: " $6 " is at " $5 "% (" $3 " used of " $2 ")"
  }
}'
```

---

## 14. Diff Two API Responses

Compares the JSON output of two endpoints for debugging.

```bash
#!/usr/bin/env bash
set -euo pipefail

URL1="${1:?Usage: $0 <url1> <url2>}"
URL2="${2:?}"

RESP1=$(curl -sf "$URL1" | python3 -m json.tool | sort)
RESP2=$(curl -sf "$URL2" | python3 -m json.tool | sort)

diff <(echo "$RESP1") <(echo "$RESP2") && echo "Responses are identical." || true
```

---

## 15. Auto-Commit Script

Stages, commits, and pushes all changes with a timestamped message — useful for automated content or data repos.

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-.}"
BRANCH="${2:-main}"
MSG="${3:-"chore: auto-update $(date '+%Y-%m-%d %H:%M')"}"

cd "$REPO_DIR"

if [[ -z "$(git status --porcelain)" ]]; then
  echo "No changes to commit."
  exit 0
fi

git add .
git commit -m "$MSG"
git push origin "$BRANCH"
echo "Pushed: $MSG"
```

---

## 16. Extract All URLs from a File

Pulls every URL from a file or HTML page.

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT="${1:?Usage: $0 <file-or-url>}"

if [[ "$INPUT" =~ ^https?:// ]]; then
  curl -sf "$INPUT"
else
  cat "$INPUT"
fi | grep -oP 'https?://[^\s"<>]+' | sort -u
```

---

## 17. Recursive File Size Report

Shows the largest files and directories in a path.

```bash
#!/usr/bin/env bash
set -euo pipefail

DIR="${1:-.}"
COUNT="${2:-20}"

echo "=== Top $COUNT largest files in $DIR ==="
find "$DIR" -type f -printf '%s\t%p\n' 2>/dev/null \
  | sort -rn | head -"$COUNT" \
  | awk '{printf "%-10s %s\n", $1/1024/1024" MB", $2}'

echo ""
echo "=== Directory sizes ==="
du -sh "$DIR"/*/  2>/dev/null | sort -rh | head -"$COUNT"
```

---

## 18. Wait for a Docker Container to Be Ready

Polls a container's health status before proceeding.

```bash
#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${1:?Usage: $0 <container-name> [timeout]}"
TIMEOUT="${2:-30}"
ELAPSED=0

echo "Waiting for $CONTAINER to be healthy..."

until [[ "$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null)" == "healthy" ]]; do
  if [[ $ELAPSED -ge $TIMEOUT ]]; then
    echo "ERROR: $CONTAINER not healthy after ${TIMEOUT}s"
    docker logs --tail=20 "$CONTAINER"
    exit 1
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

echo "$CONTAINER is healthy after ${ELAPSED}s"
```

---

## 19. Run Script with a Timeout

Kills a script if it runs longer than expected.

```bash
#!/usr/bin/env bash
set -euo pipefail

TIMEOUT="${1:?Usage: $0 <timeout-seconds> <command...>}"
shift

timeout "$TIMEOUT" "$@"
EXIT=$?

if [[ $EXIT -eq 124 ]]; then
  echo "ERROR: Command timed out after ${TIMEOUT}s"
  exit 1
fi

exit $EXIT
```

---

## 20. Daily Summary Script

Shows a snapshot of your day: git commits, system info, running processes.

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Daily Dev Summary: $(date '+%A, %B %d %Y') ==="
echo ""

echo "--- Git Activity (today) ---"
git log --all --since=midnight --oneline --author="$(git config user.email)" 2>/dev/null \
  || echo "(not a git repo)"
echo ""

echo "--- System ---"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
echo "CPU:    $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}')% used"
echo "Memory: $(free -h 2>/dev/null | awk '/Mem:/{print $3"/"$2}' || vm_stat | awk 'NR==2{print $3}')"
echo "Disk:   $(df -h / | tail -1 | awk '{print $3"/"$2" ("$5" used)"}')"
echo ""

echo "--- Listening Ports ---"
ss -tlnp 2>/dev/null | grep LISTEN | awk '{print $4}' | sort -u \
  || netstat -tlnp 2>/dev/null | grep LISTEN | awk '{print $4}' | sort -u
```

---

## Bash Scripting Quick Reference

| Pattern | Purpose |
|---|---|
| `${VAR:?msg}` | Require variable, exit with message if unset |
| `${VAR:-default}` | Use default if variable is unset |
| `$(command)` | Command substitution |
| `$?` | Exit code of last command |
| `>&2` | Redirect to stderr |
| `2>/dev/null` | Suppress error output |
| `|| true` | Continue even if command fails |
| `[[ -f file ]]` | Test if file exists |
| `[[ -d dir ]]` | Test if directory exists |
| `[[ -z "$VAR" ]]` | Test if string is empty |
| `read -rp "Prompt: " var` | Read user input |
| `xargs -r` | Only run if input exists |

These 20 scripts cover 80% of the repetitive work in a typical developer's day. Copy them, adapt them to your environment, and add them to a personal `~/bin/` directory on your `PATH`. Your future self will thank you.
