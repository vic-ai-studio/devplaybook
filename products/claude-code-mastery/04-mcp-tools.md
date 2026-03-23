# Chapter 04: MCP Tools

> Model Context Protocol (MCP) turns Claude Code from a code assistant into a fully connected development platform. Give Claude access to your database, APIs, browser, and any custom tool you can imagine.

---

## What Is MCP?

MCP (Model Context Protocol) is an open standard that lets AI models connect to external tools and data sources through a unified interface. Think of it as USB for AI — a single protocol that connects any tool to any model.

With MCP, Claude Code can:
- Query your database directly
- Read and write to Notion, Linear, Jira, or GitHub
- Browse the web and scrape documentation
- Run custom scripts and return structured data
- Access file systems, APIs, and cloud services

---

## How MCP Works in Claude Code

```
┌──────────────┐    MCP Protocol    ┌───────────────┐
│  Claude Code  │ ◄──────────────► │  MCP Server    │
│  (MCP Client) │    JSON-RPC      │  (Your Tool)   │
└──────────────┘                   └───────────────┘
                                          │
                                          ▼
                                   ┌───────────────┐
                                   │  Data Source   │
                                   │  (DB, API, etc)│
                                   └───────────────┘
```

1. Claude Code acts as an **MCP client**
2. MCP servers expose **tools** (functions Claude can call)
3. Servers also expose **resources** (data Claude can read)
4. Communication happens over **JSON-RPC** via stdio or HTTP

---

## Built-In Tools

Before configuring any MCP servers, Claude Code already has powerful built-in tools:

| Tool | What It Does |
|------|-------------|
| **Read** | Read file contents from the filesystem |
| **Write** | Create or overwrite files |
| **Edit** | Make targeted edits to existing files |
| **Glob** | Find files by pattern (e.g., `**/*.ts`) |
| **Grep** | Search file contents with regex |
| **Bash** | Execute shell commands |
| **WebFetch** | Fetch content from URLs |
| **WebSearch** | Search the web for information |

These tools are always available. MCP servers add capabilities beyond these.

---

## Configuring MCP Servers

MCP servers are configured in your Claude Code settings.

### Configuration File Locations

| Scope | File Location |
|-------|---------------|
| **Project** | `.claude/mcp.json` (in project root) |
| **User** | `~/.claude/mcp.json` |

Project-level configuration is recommended — it travels with your repo and team.

### Configuration Format

```json
{
  "mcpServers": {
    "server-name": {
      "command": "command-to-start-server",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

### Adding an MCP Server via CLI

The fastest way to add a server:

```bash
claude mcp add server-name command arg1 arg2
```

Example:

```bash
claude mcp add postgres npx -y @modelcontextprotocol/server-postgres \
  "postgresql://localhost:5432/mydb"
```

### Listing Configured Servers

```bash
claude mcp list
```

### Removing a Server

```bash
claude mcp remove server-name
```

---

## Essential MCP Servers

### 1. PostgreSQL Server

Query your database directly from Claude Code.

```bash
claude mcp add postgres npx -y @modelcontextprotocol/server-postgres \
  "postgresql://user:pass@localhost:5432/mydb"
```

Or in `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://localhost:5432/mydb"
      ]
    }
  }
}
```

**What you can do:**

```
> Show me all tables and their row counts.

> What are the most common query patterns hitting the orders table?

> Find all users who signed up in the last 7 days but haven't completed onboarding.

> Generate a migration to add a "preferences" JSONB column to the users table.
```

**Security note:** Use a read-only database user for safety. Create a dedicated user with SELECT-only permissions:

```sql
CREATE USER claude_readonly WITH PASSWORD 'your-secure-password';
GRANT CONNECT ON DATABASE mydb TO claude_readonly;
GRANT USAGE ON SCHEMA public TO claude_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO claude_readonly;
```

### 2. Filesystem Server

Give Claude access to files outside your project directory.

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    }
  }
}
```

**Use cases:**
- Access config files in `/etc/`
- Read logs from `/var/log/`
- Access shared documentation across projects

### 3. GitHub Server

Full GitHub integration — issues, PRs, repos, actions.

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

**What you can do:**

```
> Check the status of all open PRs in this repo.

> Create an issue for the bug we just found, with steps to reproduce.

> Look at the failing CI checks on PR #142 and tell me what's wrong.

> Find all issues labeled "good first issue" that haven't been assigned.
```

### 4. Puppeteer / Browser Server

Let Claude interact with web pages.

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

**What you can do:**

```
> Navigate to http://localhost:3000 and take a screenshot of the dashboard.

> Fill out the registration form and verify the success message appears.

> Check if our landing page has any broken images or 404 links.
```

### 5. Memory / Knowledge Graph Server

Persistent memory that survives across sessions.

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

**Use cases:**
- Store architectural decisions
- Remember debugging solutions
- Track project conventions that emerge over time

### 6. Slack Server

Interact with Slack channels directly.

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token",
        "SLACK_TEAM_ID": "T0123456"
      }
    }
  }
}
```

**What you can do:**

```
> Post a deployment notification to #engineering with the changelog.

> Check #incidents for any recent alerts related to the billing service.
```

---

## Building Custom MCP Servers

When existing servers don't cover your needs, build your own. It's simpler than you think.

### Minimal Python MCP Server

```python
# my_tool_server.py
import json
import sys

def handle_request(request):
    method = request.get("method")

    if method == "initialize":
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "my-tools", "version": "1.0.0"}
        }

    if method == "tools/list":
        return {
            "tools": [
                {
                    "name": "check_service_health",
                    "description": "Check if a microservice is healthy",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "service": {
                                "type": "string",
                                "description": "Service name (e.g., 'api', 'worker', 'scheduler')"
                            }
                        },
                        "required": ["service"]
                    }
                }
            ]
        }

    if method == "tools/call":
        tool_name = request["params"]["name"]
        args = request["params"]["arguments"]

        if tool_name == "check_service_health":
            service = args["service"]
            # Your actual health check logic here
            import urllib.request
            try:
                url = f"http://{service}.internal:8080/health"
                resp = urllib.request.urlopen(url, timeout=5)
                status = json.loads(resp.read())
                return {"content": [{"type": "text", "text": json.dumps(status, indent=2)}]}
            except Exception as e:
                return {"content": [{"type": "text", "text": f"Service {service} is DOWN: {e}"}]}

    return {"error": {"code": -32601, "message": f"Unknown method: {method}"}}

# Main loop: read JSON-RPC from stdin, write to stdout
for line in sys.stdin:
    request = json.loads(line)
    response = handle_request(request)
    response["jsonrpc"] = "2.0"
    response["id"] = request.get("id")
    print(json.dumps(response), flush=True)
```

### Using the MCP SDK (Recommended)

The official MCP SDK makes it much easier:

```bash
npm install @modelcontextprotocol/sdk
```

```typescript
// src/mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "project-tools",
  version: "1.0.0",
});

// Define a tool
server.tool(
  "query_analytics",
  "Query our analytics database for metrics",
  {
    metric: z.enum(["page_views", "signups", "revenue", "churn"]),
    period: z.enum(["today", "week", "month", "quarter"]),
  },
  async ({ metric, period }) => {
    // Your analytics query logic
    const result = await queryAnalytics(metric, period);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Define a resource
server.resource(
  "config://app",
  "Application configuration",
  async () => {
    const config = await loadConfig();
    return {
      contents: [
        {
          uri: "config://app",
          mimeType: "application/json",
          text: JSON.stringify(config, null, 2),
        },
      ],
    };
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
```

Register it:

```json
{
  "mcpServers": {
    "project-tools": {
      "command": "npx",
      "args": ["tsx", "src/mcp-server.ts"]
    }
  }
}
```

### Custom Server Ideas

| Tool | Description |
|------|-------------|
| **Deploy checker** | Query your deployment pipeline for status, logs, rollback options |
| **Feature flag manager** | List, toggle, and audit feature flags from LaunchDarkly/Unleash |
| **Log searcher** | Query structured logs from Elasticsearch, Datadog, or CloudWatch |
| **Schema validator** | Validate API requests/responses against OpenAPI specs |
| **Migration runner** | Run and rollback database migrations with safety checks |
| **Dependency auditor** | Check for outdated or vulnerable packages |
| **Performance profiler** | Trigger and analyze performance profiles |
| **Secret scanner** | Scan code for accidentally committed secrets |

---

## MCP Resources vs. Tools

MCP servers can expose two types of capabilities:

### Tools (Functions Claude Can Call)

Tools are actions. Claude invokes them with parameters and gets results.

```typescript
server.tool(
  "create_user",
  "Create a new user in the system",
  { email: z.string().email(), role: z.enum(["admin", "user"]) },
  async ({ email, role }) => {
    const user = await db.users.create({ email, role });
    return { content: [{ type: "text", text: `Created user ${user.id}` }] };
  }
);
```

### Resources (Data Claude Can Read)

Resources are data sources. Claude reads them for context.

```typescript
server.resource(
  "schema://database",
  "Current database schema",
  async () => ({
    contents: [{
      uri: "schema://database",
      mimeType: "text/plain",
      text: await getDatabaseSchema(),
    }],
  })
);
```

**When to use which:**
- **Tool** when Claude needs to perform an action or query with parameters
- **Resource** when Claude needs passive context (documentation, schemas, configs)

---

## Security Best Practices

### 1. Principle of Least Privilege

Give MCP servers the minimum permissions needed:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y", "@modelcontextprotocol/server-postgres",
        "postgresql://readonly_user:pass@localhost:5432/mydb"
      ]
    }
  }
}
```

### 2. Environment Variable Isolation

Never hardcode secrets in `mcp.json`. Use environment variables:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### 3. Network Restrictions

For custom servers, limit network access:

```typescript
// Only allow connections to internal services
const ALLOWED_HOSTS = ["api.internal", "db.internal", "cache.internal"];

function validateHost(url: string): boolean {
  const parsed = new URL(url);
  return ALLOWED_HOSTS.includes(parsed.hostname);
}
```

### 4. Audit Logging

Log all MCP tool calls for security audits:

```typescript
server.tool("sensitive_action", "...", schema, async (args) => {
  console.error(`[AUDIT] Tool called: sensitive_action, args: ${JSON.stringify(args)}`);
  // ... implementation
});
```

### 5. Rate Limiting

Prevent accidental resource exhaustion:

```typescript
const callCounts = new Map<string, number>();
const RATE_LIMIT = 100; // per minute

function checkRateLimit(toolName: string): boolean {
  const count = callCounts.get(toolName) || 0;
  if (count >= RATE_LIMIT) return false;
  callCounts.set(toolName, count + 1);
  return true;
}
```

---

## Debugging MCP Servers

### Check Server Status

```bash
claude mcp list
```

Look for servers showing as "connected" vs "error."

### View Server Logs

MCP servers write to stderr, which Claude Code captures. If a tool call fails, Claude will show you the error.

### Test a Server Manually

You can test your MCP server independently:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node your-server.js
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Server won't start | Check the command path, ensure deps installed |
| Tool calls timeout | Increase timeout, check network/DB connectivity |
| Permission denied | Check file permissions on the server script |
| "Unknown tool" error | Verify tool name matches exactly in tools/list |
| Environment vars not found | Check `env` block in mcp.json, verify vars are set |

---

## MCP in Team Environments

### Sharing Configuration

Commit `.claude/mcp.json` to your repo so the whole team gets the same tools. Use environment variables for credentials:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

Each developer sets `DATABASE_URL` in their own environment.

### Server Registry

The MCP ecosystem has a growing registry of community servers. Search for what you need:

```bash
# Search the MCP registry (if available)
npx @anthropic/mcp-registry search "database"
```

Or browse the community list at the MCP GitHub organization.

---

**Next Chapter:** [05 - Hooks & Automation](05-hooks-and-automation.md) — Automate quality checks and workflows.
