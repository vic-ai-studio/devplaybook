---
title: "DBeaver — Universal Database Tool for Developers"
description: "DBeaver is the most popular universal database tool supporting 100+ databases including PostgreSQL, MySQL, MongoDB, Redis, Cassandra, SQLite, and more. Free community edition with powerful query and schema tools."
category: "Database"
pricing: "Free / Paid"
pricingDetail: "DBeaver Community is free and open-source (Apache 2.0). DBeaver Pro/Enterprise adds advanced features (cloud, NoSQL, ERD export) at $99/year."
website: "https://dbeaver.io"
github: "https://github.com/dbeaver/dbeaver"
tags: ["database", "postgresql", "mysql", "mongodb", "gui", "sql", "developer-tools", "data"]
pros:
  - "Universal: 100+ databases from one tool (PostgreSQL, MySQL, MongoDB, Redis, Cassandra, Oracle, etc.)"
  - "SQL editor with intelligent auto-completion and syntax highlighting"
  - "ER diagrams: auto-generate visual schema diagrams"
  - "Data export: CSV, JSON, Excel, SQL, XML formats"
  - "SSH tunneling: connect through bastion hosts to private databases"
cons:
  - "Heavy Java application — slower startup than native tools"
  - "Community edition lacks some advanced NoSQL features (Pro required)"
  - "UI can feel cluttered with many open connections and editors"
  - "Not web-based — desktop installation required"
date: "2026-04-02"
---

## What is DBeaver?

DBeaver is a universal database management tool that works with virtually any database through JDBC/ODBC drivers. Whether you're working with PostgreSQL, MySQL, Oracle, MongoDB, Redis, Cassandra, or an exotic proprietary database, DBeaver provides a consistent interface.

The Community edition is free, feature-rich, and covers most development needs.

## Installation

```bash
# macOS
brew install --cask dbeaver-community

# Or download from dbeaver.io/download
# Available for Windows, macOS, Linux
```

## Connecting to Databases

### PostgreSQL
1. New Database Connection → PostgreSQL
2. Enter: Host, Port (5432), Database, Username, Password
3. Test Connection → OK → Finish

### Via SSH Tunnel (Private RDS/Cloud)
1. Connection → SSH tab
2. Enable SSH tunneling
3. SSH Host: bastion.example.com, Port: 22
4. Authentication: Private Key → browse to ~/.ssh/id_rsa
5. Local Port (auto-assigned)

### Connection Profiles (Team Sharing)
Export connection settings (without passwords) and share via:
- DBeaver project files
- Version control (passwords excluded)

## SQL Editor

```sql
-- Smart autocomplete: Ctrl+Space (Cmd+Space on macOS)
-- Auto-complete table names, column names, keywords, functions

-- Run query: Ctrl+Enter (runs cursor's query)
-- Run all: Ctrl+Shift+Enter

-- Format SQL: Ctrl+Shift+F
SELECT
  u.id,
  u.name,
  u.email,
  COUNT(p.id) AS post_count,
  MAX(p.created_at) AS last_post_date
FROM users u
LEFT JOIN posts p ON p.author_id = u.id
WHERE u.active = true
GROUP BY u.id, u.name, u.email
ORDER BY post_count DESC
LIMIT 10;

-- Explain plan: Ctrl+Shift+E (shows graphical execution plan)
-- Export results: right-click results → Export Data
```

## Data Browser

Navigate your data without SQL:
- Expand database in tree → Tables → double-click table
- See data in grid view
- Filter with the filter icon at top
- Edit cells directly (with save confirmation)
- Ctrl+S to save changes

## ER Diagram Generation

```
Right-click Schema → View Diagram
```

DBeaver auto-generates ER diagrams showing:
- Table structures with column types
- Foreign key relationships as visual arrows
- Export as PNG for documentation

**Community edition**: View only
**Pro edition**: Edit and generate CREATE scripts from visual ERD

## Data Import/Export

```
Right-click table → Export Data
```

Supported formats:
- CSV (with custom delimiters, encoding)
- JSON (nested or flat)
- Excel (XLSX)
- SQL INSERT statements
- XML

```
Right-click table → Import Data
```

Import from CSV, Excel, or other tables.

## SQL Macros and Scripts

```
Window → SQL Editor → Create SQL Script
```

Save frequently-used queries as named scripts. Organize in the Scripts panel for team use.

## Mock Data Generation

```
Right-click table → Generate Mock Data
```

DBeaver can generate realistic test data:
- Names, emails, addresses (using built-in generators)
- Custom patterns with regex
- N rows of mock data inserted directly

## Connecting to Cloud Databases

```
# Example: AWS RDS (through tunnel or direct)
Host: mydb.cluster-xxxx.us-east-1.rds.amazonaws.com
Port: 5432
Database: myapp
Username: dbuser
Password: [from AWS Secrets Manager]

# Enable SSL
Driver Properties → ssl=true → sslmode=require
```

DBeaver is the best choice for developers who work with multiple database types and want one consistent tool for all of them.
