# MCP Studio — 10 Production-Ready Templates

> Build powerful AI integrations in minutes, not weeks.

**MCP Studio** gives you 10 battle-tested Model Context Protocol (MCP) server templates that connect Claude (Desktop or Code) to real-world systems: databases, APIs, file systems, email, DevOps, and more.

Each template is a standalone, production-ready Python server with 5-8 tools, proper error handling, type hints, and async patterns. Copy, customize, deploy.

---

## What Is MCP?

**Model Context Protocol (MCP)** is an open standard by Anthropic that lets AI assistants like Claude interact with external tools and data sources through a structured server interface.

Instead of copy-pasting data into chat, MCP lets Claude:
- Query your database directly
- Manage your calendar and appointments
- Monitor your servers
- Read and write files
- Interact with APIs (GitHub, email, e-commerce, etc.)

MCP servers expose **tools** (functions Claude can call) and **resources** (data Claude can read). Claude discovers available tools automatically and calls them when relevant.

### Why MCP Matters

| Without MCP | With MCP |
|---|---|
| Copy-paste data into chat | Claude reads data directly |
| Describe what you want done | Claude executes actions |
| Switch between apps | One interface for everything |
| Manual API calls | AI-driven automation |

---

## Included Templates

| # | Template | Tools | Use Case |
|---|---------|-------|----------|
| 01 | Appointment Booking | 7 | Manage appointments, availability, clients |
| 02 | E-Commerce Inventory | 7 | Products, stock, orders, price management |
| 03 | GitHub Project Manager | 6 | Issues, PRs, repos, project boards |
| 04 | Database Admin | 7 | Query, schema inspect, backup, migrations |
| 05 | Email Assistant | 7 | Send, search, draft, manage email |
| 06 | DevOps Monitor | 7 | Server health, logs, deployments, alerts |
| 07 | Content CMS | 7 | Articles, media, categories, publishing |
| 08 | Analytics Dashboard | 6 | Metrics, reports, funnels, cohorts |
| 09 | Customer Support | 7 | Tickets, knowledge base, SLA tracking |
| 10 | File Manager | 7 | Browse, search, transform, organize files |

---

## Quick Start

### 1. Install Dependencies

```bash
pip install mcp pydantic
```

### 2. Run Any Template

```bash
cd 01-appointment-booking
python server.py
```

### 3. Connect to Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "appointment-booking": {
      "command": "python",
      "args": ["/absolute/path/to/01-appointment-booking/server.py"]
    }
  }
}
```

### 4. Connect to Claude Code

```bash
claude mcp add appointment-booking python /absolute/path/to/01-appointment-booking/server.py
```

See [SETUP.md](SETUP.md) for detailed setup instructions.

---

## How to Customize

Each template follows the same pattern:

1. **Data layer** — Replace the in-memory store with your real database/API
2. **Tool definitions** — Add, remove, or modify tools
3. **Business logic** — Adjust validation rules, defaults, workflows
4. **Error handling** — Customize error messages for your domain

### Example: Adding a New Tool

```python
@server.tool()
async def my_custom_tool(param1: str, param2: int) -> str:
    """Description of what this tool does."""
    # Your logic here
    result = await do_something(param1, param2)
    return json.dumps(result, indent=2)
```

### Example: Connecting to a Real Database

Replace the in-memory dict:

```python
# Before (template default)
appointments: dict[str, dict] = {}

# After (your real database)
import asyncpg

pool = await asyncpg.create_pool("postgresql://user:pass@localhost/mydb")

async def get_appointments():
    async with pool.acquire() as conn:
        return await conn.fetch("SELECT * FROM appointments")
```

---

## Architecture

```
Claude Desktop / Claude Code
        │
        │ stdio (JSON-RPC)
        │
   MCP Server (Python)
        │
        ├── Tools (functions Claude can call)
        ├── Resources (data Claude can read)
        └── Your Backend (DB, API, filesystem)
```

Each server communicates with Claude over **stdio** using JSON-RPC. No HTTP server needed. No ports to open. No authentication to configure.

---

## Requirements

- Python 3.10+
- `mcp` package (`pip install mcp`)
- `pydantic` package (`pip install pydantic`)
- Claude Desktop or Claude Code

---

## License

This product is for personal and commercial use. You may modify and deploy these templates in your own projects. Redistribution of the templates themselves is not permitted.

---

## Support

Questions? Issues? Email support@devplaybook.cc

Built with care by the DevPlaybook team.
