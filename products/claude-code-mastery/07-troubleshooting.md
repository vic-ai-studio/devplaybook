# Chapter 07: Troubleshooting

> Every tool has failure modes. Knowing how to diagnose and fix Claude Code issues will save you hours of frustration. This chapter covers every common problem and its solution.

---

## Context Limit Issues

The most common issue you'll encounter. Every Claude model has a context window — the maximum amount of text it can process in a single conversation.

### Symptom: "Context length exceeded" Error

**Cause:** Your conversation (including all file reads, tool outputs, and messages) has exceeded the model's context window.

**Solutions:**

1. **Use /compact** — Compresses your conversation context by summarizing previous messages

```
/compact
```

This preserves the key information while dramatically reducing token usage. Use it proactively when you notice the conversation getting long.

2. **Use /clear and start fresh** — For a clean break

```
/clear
```

3. **Start a new session with --continue** — Keeps some context

```bash
# Exit current session, then:
claude --continue
```

4. **Be more specific in your requests** — Instead of "read all files in src/", specify the exact files you need.

### Symptom: Claude "Forgets" Earlier Context

**Cause:** In long conversations, earlier context gets compressed or dropped.

**Solutions:**

- Summarize key decisions before continuing: "To recap: we decided to use Strategy A because X. Now let's implement step 3."
- Use CLAUDE.md for persistent context instead of repeating instructions
- Break large tasks into separate sessions

### Prevention: Token-Aware Habits

| Habit | Token Impact |
|-------|-------------|
| Read entire files | High (large files = thousands of tokens) |
| Read specific line ranges | Low |
| Search with Grep (targeted) | Low |
| Search with Grep (broad) | Medium-High |
| Ask Claude to summarize findings | Reduces follow-up token usage |
| Use /compact regularly | Reduces accumulated context |

---

## Permission Issues

### Symptom: "Permission denied" When Running Commands

**Cause:** Claude Code runs commands with your user permissions. If your user can't run it, Claude can't either.

**Solutions:**

```bash
# Check if the script is executable
chmod +x ./scripts/deploy.sh

# Check if you have write access
ls -la target-directory/

# Check if a port is already in use
lsof -i :3000
# or on Windows:
netstat -ano | findstr :3000
```

### Symptom: Claude Won't Execute a Command (Keeps Asking)

**Cause:** The command isn't in the allowed list and you haven't approved it.

**Solutions:**

1. Pre-approve safe commands in settings:

```json
// .claude/settings.json
{
  "permissions": {
    "allow": [
      "Bash(npm *)",
      "Bash(git *)",
      "Bash(python3 *)"
    ]
  }
}
```

2. Use `a` (always allow) when prompted for frequently used tools.

### Symptom: MCP Server Won't Start

**Cause:** Usually a path, dependency, or authentication issue.

**Diagnosis:**

```bash
# Test the server command manually
npx -y @modelcontextprotocol/server-postgres "postgresql://localhost:5432/mydb"

# Check if the package exists
npm view @modelcontextprotocol/server-postgres

# Verify environment variables
echo $DATABASE_URL
```

**Common fixes:**

```bash
# Clear npm cache
npm cache clean --force

# Install the server globally for reliability
npm install -g @modelcontextprotocol/server-postgres

# Check Node.js version (MCP servers often need 18+)
node --version
```

---

## Installation Issues

### Symptom: `claude: command not found`

```bash
# Check if it's installed
npm list -g @anthropic-ai/claude-code

# Reinstall
npm install -g @anthropic-ai/claude-code

# Check your PATH includes npm global bin
npm config get prefix
# Add to PATH if needed: export PATH="$(npm config get prefix)/bin:$PATH"
```

### Symptom: Old Version, New Features Missing

```bash
# Check current version
claude --version

# Update to latest
npm update -g @anthropic-ai/claude-code

# Or force a clean install
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code
```

### Symptom: Slow Startup

**Causes and fixes:**

| Cause | Fix |
|-------|-----|
| Large CLAUDE.md files | Split into focused files, keep each under 200 lines |
| Many MCP servers | Only configure servers you actually use |
| Slow network (API key auth) | Check internet connection, try different DNS |
| Many files in project root | Add `.claudeignore` to exclude irrelevant files |
| Antivirus scanning | Whitelist the Claude Code binary and project directory |

---

## Authentication Issues

### Symptom: 401 Unauthorized

```bash
# Verify API key is set
echo $ANTHROPIC_API_KEY | head -c 10

# Check if key is valid (should return a response, not an error)
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

**Common causes:**
- API key has a leading/trailing space
- API key is for a different environment
- API key was revoked or expired
- Rate limit exceeded on the API key

### Symptom: OAuth Session Expired

```bash
# Re-authenticate
claude auth login

# Or clear credentials and start fresh
claude auth logout
claude auth login
```

### Symptom: "Insufficient credits" or Billing Error

Check your Anthropic dashboard at console.anthropic.com for:
- Credit balance
- Usage limits
- Payment method status

---

## Common Error Messages

### "I can't modify that file because I haven't read it yet"

Claude Code requires reading a file before editing it. This is a safety feature.

```
# Fix: Ask Claude to read it first
> Read src/config.ts and then change the port to 4000
```

### "The edit failed because the text wasn't found"

The `Edit` tool requires an exact text match. If the file changed since Claude last read it:

```
# Fix: Ask Claude to re-read the file
> Read src/config.ts again, then make the change
```

### "Command timed out"

Default timeout is 2 minutes. For long-running commands:

```
> Run the full test suite. It takes about 5 minutes.
```

Claude will use a longer timeout for commands it expects to take time.

### "File too large to read"

Some files are too large for Claude to process at once:

```
# Fix: Read specific sections
> Read lines 1-100 of src/generated/schema.ts

# Or ask Claude to search instead of reading
> Search for "createUser" in src/generated/schema.ts
```

---

## Performance Optimization

### Reducing Token Usage

**1. Use .claudeignore aggressively**

```gitignore
# These files are large and rarely needed
package-lock.json
yarn.lock
*.map
*.min.js
*.chunk.js
coverage/
.next/
dist/
```

**2. Be specific in requests**

```
# Expensive (reads many files)
> Find all bugs in the project

# Cheap (targeted)
> Check src/lib/auth.ts for potential race conditions
```

**3. Use /compact proactively**

Don't wait for context limits. Run `/compact` every 20-30 exchanges.

**4. Use non-interactive mode for simple tasks**

```bash
# Interactive session (maintains context, higher token usage)
claude
> What's in package.json?

# One-shot (minimal token usage)
claude -p "What framework does this project use?"
```

### Reducing Latency

**1. Pre-approve common tools**

Every permission prompt adds latency. Pre-approve tools you trust:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test*)",
      "Bash(npm run*)",
      "Bash(git *)",
      "Bash(ls *)",
      "Bash(cat *)"
    ]
  }
}
```

**2. Use the right model for the task**

| Task | Model | Why |
|------|-------|-----|
| Quick lookup | Haiku | Fastest response |
| Daily coding | Sonnet | Good balance |
| Complex architecture | Opus | Best reasoning |

**3. Keep CLAUDE.md focused**

A 500-line CLAUDE.md adds ~2K tokens to every single message. Keep it under 200 lines for the most-read root file.

---

## Platform-Specific Issues

### Windows

| Issue | Solution |
|-------|----------|
| Path separators confuse Claude | Use forward slashes: `src/lib/auth.ts` not `src\lib\auth.ts` |
| PowerShell syntax differences | Claude adapts, but specify if you need PowerShell-specific commands |
| Line ending issues (CRLF vs LF) | Configure Git: `git config core.autocrlf true` |
| Long path names fail | Enable long paths in Windows: `git config --system core.longpaths true` |
| npm global install fails | Run terminal as Administrator, or use `npx` instead |

### macOS

| Issue | Solution |
|-------|----------|
| Xcode command line tools missing | `xcode-select --install` |
| File system case sensitivity | macOS is case-insensitive by default; be careful with imports |
| Homebrew path issues | Ensure `/opt/homebrew/bin` is in PATH for Apple Silicon |

### Linux

| Issue | Solution |
|-------|----------|
| Node.js version too old | Use nvm: `nvm install 20` |
| Permission denied on global install | Use `nvm` or `npx` instead of `sudo npm install -g` |
| Missing build tools | `sudo apt install build-essential` (Debian/Ubuntu) |

### WSL

| Issue | Solution |
|-------|----------|
| File changes not detected | Work within the WSL filesystem (`/home/`), not `/mnt/c/` |
| Slow file operations on /mnt/c/ | Move project to WSL native filesystem |
| Network issues | Check WSL network mode, ensure DNS works |

---

## Debugging Hooks

### Symptom: Hook Not Running

```bash
# Check settings.json is valid JSON
python3 -c "import json; json.load(open('.claude/settings.json'))"

# Check the hook script exists and is executable
ls -la .claude/hooks/validate-bash.py
chmod +x .claude/hooks/validate-bash.py

# Test the hook script manually
echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | python3 .claude/hooks/validate-bash.py
```

### Symptom: Hook Blocks Everything

A hook that exits with a non-zero code or returns a "block" decision blocks the action. Debug:

```bash
# Test with a known-good input
echo '{"tool_name":"Write","tool_input":{"file_path":"test.txt","content":"hello"}}' | python3 .claude/hooks/protect-files.py
```

### Symptom: Hook Causes Errors

Check:
- Is the hook script's shebang correct? (`#!/usr/bin/env python3` or `#!/bin/bash`)
- Does it read from stdin? (Hooks receive JSON via stdin)
- Does it output valid JSON to stdout?
- Are all dependencies installed?

---

## Recovery Strategies

### When Claude Made a Wrong Change

```
> Undo the last file change you made. Show me the diff first.
```

Or use Git:

```bash
# See what changed
git diff

# Revert a specific file
git checkout -- src/lib/auth.ts

# Revert all changes
git checkout -- .
```

### When You're Lost in a Long Session

```
> Let's reset. Summarize:
> 1. What we've accomplished so far
> 2. What's still pending
> 3. What problems we've hit
>
> Then let's pick up from the most important remaining item.
```

### When Claude Is Going in Circles

If Claude keeps trying the same approach that isn't working:

```
> Stop. The approach you're trying isn't working. Let's step back.
> What are THREE different ways we could solve this problem?
> Don't try the same thing again — give me genuinely different approaches.
```

### When Context Is Too Polluted

Start a new session with a clear brief:

```bash
claude
```

```
> I'm continuing work from a previous session. Here's the context:
>
> ## What we're building
> [brief description]
>
> ## What's done
> [completed items]
>
> ## What's next
> [specific next step]
>
> ## Key decisions made
> [important constraints]
```

---

## Getting Help

### Official Resources

- **Documentation:** https://docs.anthropic.com/claude-code
- **GitHub Issues:** Report bugs and feature requests
- **Discord:** Community support and discussions

### In-Session Help

```
/help                  # Show all commands
/bug                   # Report a bug with session context
claude --help          # CLI help
claude mcp --help      # MCP-specific help
```

### Diagnostic Information

When reporting bugs, include:

```bash
claude --version
node --version
npm --version
uname -a  # or systeminfo on Windows
```

---

**Next Chapter:** [08 - Real-World Examples](08-real-world-examples.md) — 10 complete workflow examples from start to finish.
