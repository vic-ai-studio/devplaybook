"""
MCP Server: Database Admin
Query databases, inspect schemas, manage migrations, and perform backups.
Uses SQLite by default; swap the connection layer for PostgreSQL/MySQL.
"""

import json
import os
import sqlite3
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

server = FastMCP("database-admin")

DB_PATH = os.environ.get("DB_PATH", "demo.db")
BACKUP_DIR = os.environ.get("BACKUP_DIR", "backups")
MAX_ROWS = 500  # Safety limit for query results

# Migration tracking
_applied_migrations: list[dict[str, Any]] = []


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _ensure_demo_db() -> None:
    """Create demo tables if the database is empty."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table'")
    if cursor.fetchone()[0] == 0:
        cursor.executescript("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                total REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                stock INTEGER DEFAULT 0,
                category TEXT
            );
            INSERT INTO users (name, email, role) VALUES
                ('Alice Chen', 'alice@example.com', 'admin'),
                ('Bob Smith', 'bob@example.com', 'user'),
                ('Carol Davis', 'carol@example.com', 'user');
            INSERT INTO products (name, price, stock, category) VALUES
                ('Widget A', 29.99, 150, 'widgets'),
                ('Widget B', 49.99, 75, 'widgets'),
                ('Gadget X', 99.99, 30, 'gadgets');
            INSERT INTO orders (user_id, total, status) VALUES
                (1, 79.98, 'completed'),
                (2, 99.99, 'pending'),
                (3, 29.99, 'shipped');
        """)
        conn.commit()
    conn.close()


_ensure_demo_db()


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


@server.tool()
async def execute_query(sql: str, params: str = "[]") -> str:
    """Execute a read-only SQL query and return results.

    Only SELECT statements are allowed. For modifications, use execute_write.

    Args:
        sql: SQL SELECT query to execute.
        params: JSON array of query parameters (optional).
    """
    sql_stripped = sql.strip().upper()
    if not sql_stripped.startswith("SELECT") and not sql_stripped.startswith("WITH"):
        return json.dumps({"error": "Only SELECT/WITH queries allowed. Use execute_write for modifications."})

    try:
        param_list = json.loads(params)
    except json.JSONDecodeError:
        return json.dumps({"error": "Invalid params JSON. Expected an array."})

    try:
        conn = _get_conn()
        cursor = conn.cursor()
        cursor.execute(sql, param_list)
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = cursor.fetchmany(MAX_ROWS)
        result_rows = [dict(zip(columns, row)) for row in rows]
        total = len(result_rows)
        conn.close()

        return json.dumps({
            "columns": columns,
            "row_count": total,
            "truncated": total >= MAX_ROWS,
            "rows": result_rows,
        }, indent=2, default=str)
    except sqlite3.Error as e:
        return json.dumps({"error": f"SQL error: {str(e)}"})


@server.tool()
async def execute_write(sql: str, params: str = "[]", confirm: bool = False) -> str:
    """Execute a write SQL statement (INSERT, UPDATE, DELETE, CREATE, ALTER).

    Args:
        sql: SQL statement to execute.
        params: JSON array of query parameters (optional).
        confirm: Must be true to execute destructive operations (UPDATE/DELETE without WHERE, DROP, TRUNCATE).
    """
    sql_upper = sql.strip().upper()
    is_destructive = any([
        "DROP " in sql_upper,
        "TRUNCATE " in sql_upper,
        ("DELETE " in sql_upper and "WHERE" not in sql_upper),
        ("UPDATE " in sql_upper and "WHERE" not in sql_upper),
    ])

    if is_destructive and not confirm:
        return json.dumps({
            "error": "Destructive operation detected. Set confirm=true to proceed.",
            "sql": sql,
            "warning": "This operation may affect all rows or drop objects.",
        })

    try:
        param_list = json.loads(params)
    except json.JSONDecodeError:
        return json.dumps({"error": "Invalid params JSON."})

    try:
        conn = _get_conn()
        cursor = conn.cursor()
        cursor.execute(sql, param_list)
        conn.commit()
        result = {
            "success": True,
            "rows_affected": cursor.rowcount,
            "last_row_id": cursor.lastrowid,
        }
        conn.close()
        return json.dumps(result, indent=2)
    except sqlite3.Error as e:
        return json.dumps({"error": f"SQL error: {str(e)}"})


@server.tool()
async def inspect_schema(table_name: str = "") -> str:
    """Inspect database schema. Shows all tables or details for a specific table.

    Args:
        table_name: Specific table to inspect (optional, shows all if empty).
    """
    try:
        conn = _get_conn()
        cursor = conn.cursor()

        if table_name:
            # Table details
            cursor.execute(f"PRAGMA table_info('{table_name}')")
            columns = cursor.fetchall()
            if not columns:
                conn.close()
                return json.dumps({"error": f"Table '{table_name}' not found."})

            col_info = []
            for col in columns:
                col_info.append({
                    "name": col["name"],
                    "type": col["type"],
                    "nullable": not col["notnull"],
                    "default": col["dflt_value"],
                    "primary_key": bool(col["pk"]),
                })

            cursor.execute(f"PRAGMA foreign_key_list('{table_name}')")
            fks = [{"column": fk["from"], "references": f"{fk['table']}.{fk['to']}"} for fk in cursor.fetchall()]

            cursor.execute(f"PRAGMA index_list('{table_name}')")
            indexes = []
            for idx in cursor.fetchall():
                cursor.execute(f"PRAGMA index_info('{idx['name']}')")
                idx_cols = [ic["name"] for ic in cursor.fetchall()]
                indexes.append({
                    "name": idx["name"],
                    "unique": bool(idx["unique"]),
                    "columns": idx_cols,
                })

            cursor.execute(f"SELECT count(*) as cnt FROM '{table_name}'")
            row_count = cursor.fetchone()["cnt"]
            conn.close()

            return json.dumps({
                "table": table_name,
                "columns": col_info,
                "foreign_keys": fks,
                "indexes": indexes,
                "row_count": row_count,
            }, indent=2)
        else:
            # All tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            tables = []
            for row in cursor.fetchall():
                name = row["name"]
                cursor.execute(f"SELECT count(*) as cnt FROM '{name}'")
                cnt = cursor.fetchone()["cnt"]
                cursor.execute(f"PRAGMA table_info('{name}')")
                col_count = len(cursor.fetchall())
                tables.append({"name": name, "columns": col_count, "rows": cnt})
            conn.close()
            return json.dumps({"database": DB_PATH, "tables": tables}, indent=2)
    except sqlite3.Error as e:
        return json.dumps({"error": f"Schema inspection failed: {str(e)}"})


@server.tool()
async def create_backup(label: str = "") -> str:
    """Create a backup of the current database.

    Args:
        label: Optional label for the backup file name.
    """
    if not os.path.exists(DB_PATH):
        return json.dumps({"error": f"Database file {DB_PATH} not found."})

    Path(BACKUP_DIR).mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    suffix = f"_{label}" if label else ""
    backup_name = f"backup_{timestamp}{suffix}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_name)

    try:
        shutil.copy2(DB_PATH, backup_path)
        size_kb = os.path.getsize(backup_path) / 1024
        return json.dumps({
            "success": True,
            "backup_file": backup_path,
            "size_kb": round(size_kb, 2),
            "timestamp": timestamp,
            "source": DB_PATH,
        }, indent=2)
    except OSError as e:
        return json.dumps({"error": f"Backup failed: {str(e)}"})


@server.tool()
async def list_backups() -> str:
    """List all available database backups with file sizes and dates."""
    if not os.path.exists(BACKUP_DIR):
        return json.dumps({"backups": [], "total": 0})

    backups = []
    for f in sorted(Path(BACKUP_DIR).glob("backup_*.db"), reverse=True):
        stat = f.stat()
        backups.append({
            "file": f.name,
            "path": str(f),
            "size_kb": round(stat.st_size / 1024, 2),
            "created": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        })

    return json.dumps({"total": len(backups), "backups": backups}, indent=2)


@server.tool()
async def run_migration(name: str, up_sql: str, down_sql: str = "") -> str:
    """Run a database migration (schema change).

    Args:
        name: Descriptive name for the migration (e.g. 'add_users_phone_column').
        up_sql: SQL to apply the migration.
        down_sql: SQL to reverse the migration (optional but recommended).
    """
    for m in _applied_migrations:
        if m["name"] == name:
            return json.dumps({"error": f"Migration '{name}' has already been applied."})

    try:
        conn = _get_conn()
        cursor = conn.cursor()
        cursor.executescript(up_sql)
        conn.commit()
        conn.close()

        migration_record = {
            "name": name,
            "up_sql": up_sql,
            "down_sql": down_sql,
            "applied_at": datetime.now().isoformat(),
            "status": "applied",
        }
        _applied_migrations.append(migration_record)

        return json.dumps({"success": True, "migration": migration_record}, indent=2)
    except sqlite3.Error as e:
        return json.dumps({"error": f"Migration failed: {str(e)}", "migration": name})


@server.tool()
async def get_table_stats(table_name: str) -> str:
    """Get statistics for a table: row counts, column distributions, null counts.

    Args:
        table_name: Table to analyze.
    """
    try:
        conn = _get_conn()
        cursor = conn.cursor()

        cursor.execute(f"PRAGMA table_info('{table_name}')")
        columns = cursor.fetchall()
        if not columns:
            conn.close()
            return json.dumps({"error": f"Table '{table_name}' not found."})

        cursor.execute(f"SELECT count(*) as cnt FROM '{table_name}'")
        total_rows = cursor.fetchone()["cnt"]

        col_stats = []
        for col in columns:
            name = col["name"]
            col_type = col["type"]

            cursor.execute(f"SELECT count(*) as cnt FROM '{table_name}' WHERE \"{name}\" IS NULL")
            null_count = cursor.fetchone()["cnt"]

            cursor.execute(f"SELECT count(DISTINCT \"{name}\") as cnt FROM '{table_name}'")
            distinct_count = cursor.fetchone()["cnt"]

            stat: dict[str, Any] = {
                "column": name,
                "type": col_type,
                "null_count": null_count,
                "null_percent": f"{(null_count / total_rows * 100):.1f}%" if total_rows > 0 else "0%",
                "distinct_values": distinct_count,
            }

            # Min/max for numeric or date-like columns
            if col_type in ("INTEGER", "REAL", "NUMERIC"):
                cursor.execute(
                    f"SELECT min(\"{name}\") as mn, max(\"{name}\") as mx, avg(\"{name}\") as av "
                    f"FROM '{table_name}' WHERE \"{name}\" IS NOT NULL"
                )
                agg = cursor.fetchone()
                stat["min"] = agg["mn"]
                stat["max"] = agg["mx"]
                stat["avg"] = round(agg["av"], 2) if agg["av"] is not None else None

            # Top 5 most common values
            cursor.execute(
                f"SELECT \"{name}\" as val, count(*) as cnt FROM '{table_name}' "
                f"GROUP BY \"{name}\" ORDER BY cnt DESC LIMIT 5"
            )
            stat["top_values"] = [{"value": r["val"], "count": r["cnt"]} for r in cursor.fetchall()]
            col_stats.append(stat)

        conn.close()
        return json.dumps({
            "table": table_name,
            "total_rows": total_rows,
            "column_count": len(columns),
            "column_stats": col_stats,
        }, indent=2, default=str)
    except sqlite3.Error as e:
        return json.dumps({"error": f"Stats failed: {str(e)}"})


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    server.run()
