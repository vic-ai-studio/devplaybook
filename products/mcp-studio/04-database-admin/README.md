# 04 — Database Admin MCP Server

A database administration toolkit: query, inspect schemas, run migrations, create backups, and analyze data.

Uses SQLite by default. Swap the connection layer for PostgreSQL (asyncpg) or MySQL (aiomysql) in production.

## Tools

| Tool | Description |
|------|-------------|
| `execute_query` | Run read-only SQL (SELECT/WITH) with parameterized queries |
| `execute_write` | Run write SQL (INSERT/UPDATE/DELETE/DDL) with safety confirmations |
| `inspect_schema` | View all tables or detailed column/index/FK info for one table |
| `create_backup` | Create a timestamped database backup file |
| `list_backups` | List all existing backups with sizes and dates |
| `run_migration` | Apply schema migrations with up/down SQL tracking |
| `get_table_stats` | Column distributions, nulls, min/max/avg, top values |

## Safety Features

- SELECT-only enforcement on `execute_query`
- Destructive operation confirmation required (DROP, DELETE without WHERE)
- Row limit (500) on query results to prevent memory issues
- Migration deduplication

## Example Prompts

- "Show me all tables in the database"
- "How many users signed up this month?"
- "What are the column types for the orders table?"
- "Create a backup labeled 'pre-migration'"
- "Add a phone column to the users table"
- "Give me stats on the products table"

## Environment Variables

- `DB_PATH` — Path to SQLite database (default: `demo.db`)
- `BACKUP_DIR` — Directory for backups (default: `backups/`)

## Setup

```bash
pip install mcp pydantic
python server.py
```
