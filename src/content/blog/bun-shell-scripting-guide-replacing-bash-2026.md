---
title: "Bun Shell Scripting Guide: Replace Bash Scripts with $.cmd() and Bun APIs"
description: "Learn how to replace complex bash scripts with Bun's built-in shell API. Covers $.cmd(), Bun.file(), spawn(), and practical real-world automation scripts."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["bun", "shell-scripting", "automation", "javascript", "bash", "developer-tools"]
readingTime: "11 min read"
---

Bash scripting gets the job done—until it doesn't. The quoting rules are arcane, error handling is verbose, and debugging is painful. Once your scripts grow beyond a few lines, you're fighting the language more than solving problems.

Bun's built-in shell API changes that. You get JavaScript ergonomics, proper error handling, async/await, and access to the full Node.js/Bun ecosystem—all while writing shell-style commands that look and behave like the real thing.

This guide covers everything you need to migrate from bash to Bun shell scripting: the core APIs, practical patterns, and real automation scripts you can use today.

---

## Why Bun Shell Instead of Bash?

Before diving into the API, here's the honest comparison:

| Concern | Bash | Bun Shell |
|---------|------|-----------|
| Cross-platform | No (WSL required on Windows) | Yes (Windows, macOS, Linux) |
| Error handling | `set -e` and `$?` | Try/catch, `.exitCode` |
| String interpolation | Complex quoting rules | Template literals |
| Data processing | `awk`, `sed`, `jq` | Native JS/TS |
| Package ecosystem | None | npm/Bun packages |
| IDE support | Minimal | Full TypeScript |
| Testing | Difficult | Jest/Bun test |

Bash still wins for small one-liners and universal compatibility. But for anything beyond 20 lines, Bun shell scripts are easier to write, read, and maintain.

---

## Setup

You need Bun installed:

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1|iex"
```

Create a script file:

```bash
touch deploy.ts
chmod +x deploy.ts
```

Add the shebang:

```typescript
#!/usr/bin/env bun
```

Run it directly:

```bash
./deploy.ts
# or
bun run deploy.ts
```

---

## The `$` Shell API

The `$` template literal is Bun's core shell primitive. It executes shell commands and returns a `ShellOutput` object.

### Basic Usage

```typescript
import { $ } from "bun";

// Run a command
await $`echo "Hello, World!"`;

// Capture output
const result = await $`git log --oneline -5`;
console.log(result.stdout.toString());

// Check exit code
const ls = await $`ls -la`;
console.log(ls.exitCode); // 0 = success
```

### Handling Errors

By default, `$` throws on non-zero exit codes:

```typescript
import { $ } from "bun";

try {
  await $`cat /nonexistent/file`;
} catch (err) {
  console.error("Exit code:", err.exitCode);
  console.error("Stderr:", err.stderr.toString());
}
```

Use `.nothrow()` to suppress throws and handle errors manually:

```typescript
const result = await $`git status`.nothrow();

if (result.exitCode !== 0) {
  console.log("Not a git repo");
}
```

### Variable Interpolation (Safe by Default)

Shell injection is a common bash vulnerability. Bun's `$` automatically escapes interpolated values:

```typescript
const filename = "file with spaces.txt";
await $`cat ${filename}`;  // Safe: automatically quoted

// Equivalent to: cat "file with spaces.txt"
```

For dynamic command parts (use with caution):

```typescript
import { $, ShellPromise } from "bun";

const flag = "--all";
await $`git log ${{ raw: flag }}`;  // raw: bypasses escaping
```

---

## `$.cmd()` — Programmatic Command Building

When you need to build commands dynamically, `$.cmd()` gives you an array-style interface:

```typescript
import { $ } from "bun";

// Build command from array
const args = ["log", "--oneline", "-10"];
const result = await $.cmd(["git", ...args]);
console.log(result.stdout.toString());
```

This is especially useful when arguments come from user input or config files:

```typescript
interface DeployConfig {
  environment: string;
  tag: string;
  flags: string[];
}

async function deploy(config: DeployConfig) {
  const cmd = [
    "kubectl",
    "set",
    "image",
    `deployment/${config.environment}`,
    `app=${config.tag}`,
    ...config.flags,
  ];

  const result = await $.cmd(cmd).nothrow();

  if (result.exitCode !== 0) {
    throw new Error(`Deploy failed: ${result.stderr.toString()}`);
  }

  return result.stdout.toString().trim();
}
```

### Piping with `$.cmd()`

Chain commands using `.pipe()`:

```typescript
import { $ } from "bun";

// Equivalent to: ps aux | grep node | awk '{print $2}'
const pids = await $`ps aux`
  .pipe($`grep node`)
  .pipe($`awk '{print $2}'`);

console.log("Node PIDs:", pids.stdout.toString());
```

---

## `Bun.file()` — File Operations

`Bun.file()` provides a high-performance API for reading and writing files—much faster than Node.js `fs` and easier to use than bash's file operations.

### Reading Files

```typescript
// Read as text
const config = await Bun.file("config.json").text();
const parsed = JSON.parse(config);

// Read as JSON directly
const pkg = await Bun.file("package.json").json();
console.log("Version:", pkg.version);

// Read as stream (for large files)
const stream = Bun.file("large.log").stream();
const reader = stream.getReader();
```

### Writing Files

```typescript
// Write text
await Bun.write("output.log", "Build completed at " + new Date());

// Write JSON
const report = { status: "success", timestamp: Date.now() };
await Bun.write("report.json", JSON.stringify(report, null, 2));

// Append (write doesn't support append natively — use this pattern)
const existing = await Bun.file("app.log").text().catch(() => "");
await Bun.write("app.log", existing + "\n" + "New log line");
```

### File Operations in Scripts

```typescript
import { $ } from "bun";

async function rotateLog(logPath: string) {
  const file = Bun.file(logPath);

  // Check if exists
  if (!(await file.exists())) {
    console.log("Log file not found, skipping rotation");
    return;
  }

  // Read content
  const content = await file.text();
  const lines = content.split("\n");

  // Keep last 1000 lines
  if (lines.length > 1000) {
    const trimmed = lines.slice(-1000).join("\n");
    await Bun.write(logPath, trimmed);
    console.log(`Trimmed log from ${lines.length} to 1000 lines`);
  }

  // Archive if > 5MB
  const { size } = file;
  if (size > 5 * 1024 * 1024) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await $`mv ${logPath} ${logPath}.${timestamp}.bak`;
    console.log(`Archived ${logPath} (${(size / 1024 / 1024).toFixed(1)}MB)`);
  }
}
```

---

## `Bun.spawn()` — Long-Running Processes

For processes you need to monitor or control (servers, watchers, background tasks), use `Bun.spawn()`:

```typescript
import { $ } from "bun";

// Start a process and capture output
const proc = Bun.spawn(["node", "server.js"], {
  stdout: "pipe",
  stderr: "pipe",
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: "3000",
  },
});

// Read stdout as it streams
const reader = proc.stdout.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  process.stdout.write(decoder.decode(value));
}

// Wait for process to finish
const exitCode = await proc.exited;
console.log("Exit code:", exitCode);
```

### Process Management Pattern

```typescript
interface ManagedProcess {
  proc: ReturnType<typeof Bun.spawn>;
  kill: () => void;
}

function startService(name: string, cmd: string[]): ManagedProcess {
  const proc = Bun.spawn(cmd, {
    stdout: "inherit",
    stderr: "inherit",
    onExit: (proc, exitCode) => {
      console.log(`${name} exited with code ${exitCode}`);
    },
  });

  return {
    proc,
    kill: () => proc.kill(),
  };
}

// Usage
const api = startService("API", ["bun", "run", "api/server.ts"]);
const worker = startService("Worker", ["bun", "run", "workers/index.ts"]);

// Graceful shutdown on SIGTERM
process.on("SIGTERM", () => {
  api.kill();
  worker.kill();
  process.exit(0);
});
```

---

## Real-World Scripts

### 1. Deployment Script

This replaces a typical `deploy.sh` that orchestrates git, Docker, and Kubernetes:

```typescript
#!/usr/bin/env bun
import { $ } from "bun";

const ENV = process.argv[2] || "staging";
const VALID_ENVS = ["staging", "production"];

if (!VALID_ENVS.includes(ENV)) {
  console.error(`Invalid environment: ${ENV}. Use: ${VALID_ENVS.join(", ")}`);
  process.exit(1);
}

async function deploy() {
  console.log(`🚀 Deploying to ${ENV}...`);

  // Get current git info
  const branch = (await $`git rev-parse --abbrev-ref HEAD`).stdout.toString().trim();
  const sha = (await $`git rev-parse --short HEAD`).stdout.toString().trim();
  const tag = `${ENV}-${sha}`;

  console.log(`📌 Branch: ${branch}, SHA: ${sha}`);

  // Run tests
  console.log("🧪 Running tests...");
  await $`bun test`;

  // Build Docker image
  console.log(`🐳 Building image: ${tag}`);
  await $`docker build -t myapp:${tag} .`;
  await $`docker push registry.example.com/myapp:${tag}`;

  // Deploy to Kubernetes
  console.log("☸️ Updating deployment...");
  await $`kubectl set image deployment/myapp app=registry.example.com/myapp:${tag} --namespace=${ENV}`;
  await $`kubectl rollout status deployment/myapp --namespace=${ENV} --timeout=120s`;

  // Write deployment log
  const log = {
    env: ENV,
    tag,
    branch,
    sha,
    timestamp: new Date().toISOString(),
    deployedBy: (await $`git config user.email`).stdout.toString().trim(),
  };

  await Bun.write(`deployments/${ENV}-latest.json`, JSON.stringify(log, null, 2));
  console.log(`✅ Deployed ${tag} to ${ENV}`);
}

deploy().catch((err) => {
  console.error("❌ Deploy failed:", err.message);
  process.exit(1);
});
```

### 2. CI Environment Setup Script

Replace your `.sh` CI setup scripts with a typed, readable alternative:

```typescript
#!/usr/bin/env bun
import { $ } from "bun";

interface EnvCheck {
  name: string;
  required: boolean;
}

const ENV_CHECKS: EnvCheck[] = [
  { name: "DATABASE_URL", required: true },
  { name: "API_KEY", required: true },
  { name: "CACHE_URL", required: false },
];

async function validateEnv() {
  const missing = ENV_CHECKS
    .filter(({ name, required }) => required && !process.env[name])
    .map(({ name }) => name);

  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log("✅ Environment validated");
}

async function installDeps() {
  console.log("📦 Installing dependencies...");
  await $`bun install --frozen-lockfile`;
}

async function generatePrismaClient() {
  if (await Bun.file("prisma/schema.prisma").exists()) {
    console.log("🔧 Generating Prisma client...");
    await $`bunx prisma generate`;
    await $`bunx prisma migrate deploy`;
  }
}

async function buildApp() {
  console.log("🏗️ Building...");
  await $`bun run build`;

  // Verify build output exists
  if (!(await Bun.file("dist/index.js").exists())) {
    throw new Error("Build failed: dist/index.js not found");
  }
}

// Run all setup steps
await validateEnv();
await installDeps();
await generatePrismaClient();
await buildApp();
console.log("🎉 CI setup complete");
```

### 3. Log Analyzer

A script that would require awk/sed/grep pipelines in bash:

```typescript
#!/usr/bin/env bun
import { $ } from "bun";

const LOG_FILE = process.argv[2] || "app.log";
const file = Bun.file(LOG_FILE);

if (!(await file.exists())) {
  console.error(`File not found: ${LOG_FILE}`);
  process.exit(1);
}

const content = await file.text();
const lines = content.split("\n").filter(Boolean);

// Parse structured logs (JSON format)
const errors = lines
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter((entry) => entry?.level === "error");

// Group by error code
const byCode: Record<string, number> = {};
for (const err of errors) {
  const code = err.code || "UNKNOWN";
  byCode[code] = (byCode[code] || 0) + 1;
}

// Print report
console.log(`\n📊 Error Report for ${LOG_FILE}`);
console.log(`Total errors: ${errors.length} / ${lines.length} lines\n`);

Object.entries(byCode)
  .sort(([, a], [, b]) => b - a)
  .forEach(([code, count]) => {
    const pct = ((count / errors.length) * 100).toFixed(1);
    console.log(`  ${code.padEnd(20)} ${count.toString().padStart(5)}  (${pct}%)`);
  });

// Save report
const report = { file: LOG_FILE, total: lines.length, errors: errors.length, byCode };
await Bun.write("error-report.json", JSON.stringify(report, null, 2));
console.log("\n✅ Report saved to error-report.json");
```

---

## Linting Your Shell Scripts

Before shipping any shell script to CI, use the [shell script linter](/tools/shell-script-linter) to catch common mistakes: undefined variables, dangerous patterns, and quoting issues in your embedded bash commands.

---

## Environment Variables

Access and validate env vars cleanly:

```typescript
// Single var with fallback
const port = process.env.PORT ?? "3000";

// Type-safe env parsing
function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

const dbUrl = requireEnv("DATABASE_URL");
const apiKey = requireEnv("API_KEY");
```

---

## Migrating from Bash: Quick Reference

| Bash | Bun Shell |
|------|-----------|
| `$(git rev-parse HEAD)` | `` (await $`git rev-parse HEAD`).stdout.toString().trim() `` |
| `cat file.txt` | `await Bun.file("file.txt").text()` |
| `echo "text" > file.txt` | `await Bun.write("file.txt", "text")` |
| `if [ -f file ]; then` | `if (await Bun.file("file").exists())` |
| `command || exit 1` | `await $`command`` (throws by default) |
| `command 2>/dev/null` | `` await $`command`.quiet() `` |
| `set -e` | Automatic (each `$` throws on failure) |
| `FOO=bar ./script` | `await $({ env: { FOO: "bar" } })`command`` |

---

## Performance Notes

Bun's shell API adds minimal overhead compared to native shell. For scripts that run hundreds of shell commands in a loop, you'll notice some process spawn overhead—but for typical automation (< 50 commands), it's negligible.

Where Bun genuinely wins: file I/O. `Bun.file()` reads and writes are significantly faster than Node.js `fs` equivalents, and much faster than shelling out to `cat`, `tee`, or `awk`.

---

## Summary

Bun's shell API doesn't replace bash for quick one-liners, but it's a genuine upgrade for anything more complex:

- `$` template literal for shell commands with safe interpolation
- `$.cmd()` for dynamic command building from arrays
- `Bun.file()` for high-performance file operations
- `Bun.spawn()` for long-running process management
- Full TypeScript support, real error handling, and the entire npm ecosystem

Start by migrating your most painful bash scripts—deployment, CI setup, log processing. Once you see how much cleaner the error handling is, you won't go back.

**Further reading:**
- [Official Bun Shell docs](https://bun.sh/docs/runtime/shell)
- [Bun vs Node.js comparison](/blog/bun-vs-nodejs-2026) — performance benchmarks and API differences
- [Shell Script Linter Tool](/tools/shell-script-linter) — validate embedded bash in your scripts
