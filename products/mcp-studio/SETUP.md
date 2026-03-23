# MCP Studio — Setup Guide

Complete guide to get any MCP server template running with Claude Desktop or Claude Code.

---

## Step 1: Python Environment

### Option A: System Python (Simple)

Ensure Python 3.10+ is installed:

```bash
python --version
# Python 3.10.x or higher
```

### Option B: Virtual Environment (Recommended)

```bash
# Create a virtual environment
python -m venv mcp-env

# Activate it
# macOS/Linux:
source mcp-env/bin/activate
# Windows:
mcp-env\Scripts\activate
```

### Option C: uv (Fastest)

```bash
# Install uv
pip install uv

# Create environment and install
uv venv
uv pip install mcp pydantic
```

---

## Step 2: Install Dependencies

Every template needs these two packages:

```bash
pip install mcp pydantic
```

Some templates have optional dependencies for production use:

| Template | Optional Dependency | Purpose |
|----------|-------------------|---------|
| 04-database-admin | `asyncpg` / `aiosqlite` | Real database connections |
| 05-email-assistant | `aiosmtplib` / `aioimaplib` | Real email server connections |
| 06-devops-monitor | `psutil` | System metrics |
| 08-analytics-dashboard | `pandas` | Data analysis |

Install optional dependencies only if you plan to connect to real services:

```bash
# Example: for database-admin with PostgreSQL
pip install asyncpg
```

---

## Step 3: Test a Server Locally

Pick any template and run it:

```bash
cd 01-appointment-booking
python server.py
```

The server starts and waits for JSON-RPC messages on stdin. You should see no errors. Press `Ctrl+C` to stop.

To test with the MCP inspector (optional):

```bash
pip install mcp[cli]
mcp dev server.py
```

This opens a web UI at `http://localhost:5173` where you can browse tools and test them interactively.

---

## Step 4: Connect to Claude Desktop

### Locate Your Config File

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

### Add a Server Entry

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "appointment-booking": {
      "command": "python",
      "args": ["/full/path/to/mcp-studio/01-appointment-booking/server.py"]
    }
  }
}
```

**Important:**
- Use the **full absolute path** to `server.py`
- On Windows, use forward slashes or escaped backslashes: `"C:/Users/you/mcp-studio/01-appointment-booking/server.py"`
- If using a virtual environment, point `command` to the venv Python:

```json
{
  "mcpServers": {
    "appointment-booking": {
      "command": "/full/path/to/mcp-env/bin/python",
      "args": ["/full/path/to/mcp-studio/01-appointment-booking/server.py"]
    }
  }
}
```

### Add Multiple Servers

You can run multiple MCP servers simultaneously:

```json
{
  "mcpServers": {
    "appointment-booking": {
      "command": "python",
      "args": ["/path/to/01-appointment-booking/server.py"]
    },
    "database-admin": {
      "command": "python",
      "args": ["/path/to/04-database-admin/server.py"]
    },
    "file-manager": {
      "command": "python",
      "args": ["/path/to/10-file-manager/server.py"]
    }
  }
}
```

### Restart Claude Desktop

After editing the config, **quit and reopen** Claude Desktop. The MCP servers will appear as available tools.

---

## Step 5: Connect to Claude Code

Claude Code uses a simpler command-line approach:

```bash
# Add a server
claude mcp add appointment-booking python /path/to/01-appointment-booking/server.py

# List active servers
claude mcp list

# Remove a server
claude mcp remove appointment-booking
```

---

## Step 6: Verify the Connection

### In Claude Desktop

1. Open a new conversation
2. Look for the hammer icon (tools) in the input area
3. Click it to see available tools from your MCP server
4. Ask Claude something like: "Show me today's appointments" or "List all products"

### In Claude Code

1. Start Claude Code: `claude`
2. Ask Claude to use a tool: "Can you list the available appointment slots?"
3. Claude will discover and call the MCP tools automatically

---

## Troubleshooting

### Server won't start

```bash
# Check Python version
python --version  # Must be 3.10+

# Check mcp is installed
python -c "import mcp; print(mcp.__version__)"

# Run with verbose output
python server.py 2>&1
```

### Claude doesn't see the tools

1. Verify `claude_desktop_config.json` is valid JSON (use a JSON validator)
2. Ensure the path to `server.py` is absolute and correct
3. Restart Claude Desktop completely (quit, not just close)
4. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/mcp*.log`
   - Windows: `%APPDATA%\Claude\logs\mcp*.log`

### Permission errors

```bash
# Make server.py executable (macOS/Linux)
chmod +x server.py

# On Windows, ensure Python is in your PATH
where python
```

### "Module not found" errors

```bash
# Ensure you're using the right Python
which python  # Should match your venv or system Python

# Reinstall dependencies
pip install --force-reinstall mcp pydantic
```

---

## Environment Variables

Some templates support configuration via environment variables:

```bash
# Example: set a database URL for the database-admin template
export DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"

# Example: set GitHub token for the github-project-manager template
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"

# Example: set SMTP credentials for the email-assistant template
export SMTP_HOST="smtp.gmail.com"
export SMTP_USER="you@gmail.com"
export SMTP_PASS="your-app-password"
```

You can also set these in the Claude Desktop config:

```json
{
  "mcpServers": {
    "database-admin": {
      "command": "python",
      "args": ["/path/to/04-database-admin/server.py"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/mydb"
      }
    }
  }
}
```

---

## Next Steps

- Pick a template that matches your use case
- Read its `README.md` for tool descriptions
- Customize the data layer for your real backend
- Deploy and enjoy AI-powered automation

Happy building!
