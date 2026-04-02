---
title: Database Migration Tools in 2026: The Complete Guide
description: A comprehensive guide to database migration tools and strategies for 2026. Covers Flyway, Liquibase, Alembic, Prisma Migrate, Atlas, and strategies for zero-downtime migrations across PostgreSQL, MySQL, and more.
publishDate: '2026-04-02'
tags:
  - database
  - migration
  - flyway
  - liquibase
  - alembic
  - devops
  - backend
author: devplaybook
---

# Database Migration Tools in 2026: The Complete Guide

Database migrations are one of the most feared operations in software development. A badly executed migration can bring down a production system, corrupt data, or create hours of emergency debugging. Yet migrations are inevitable — as your application evolves, your database schema must evolve with it. The difference between a team that deploys confidently multiple times per day and one that dreads every schema change often comes down to the migration tooling and strategies they use.

This guide covers everything you need to know about database migration tools in 2026, from established open-source standards like Flyway and Liquibase to modern approaches like Prisma Migrate and Atlas, plus strategies for executing migrations with zero downtime.

## Table of Contents

1. [Why Database Migrations Matter](#why-database-migrations-matter)
2. [The Two Migration Paradigms](#the-two-migration-paradigms)
3. [Flyway](#flyway)
4. [Liquibase](#liquibase)
5. [Alembic (Python)](#alembic-python)
6. [Prisma Migrate](#prisma-migrate)
7. [Atlas](#atlas)
8. [Rails Active Record Migrations](#rails-active-record-migrations)
9. [Django Migrations](#django-migrations)
10. [Zero-Downtime Migration Strategies](#zero-downtime-migration-strategies)
11. [Multi-Database Considerations](#multi-database-considerations)
12. [Choosing the Right Tool](#choosing-the-right-tool)

---

## Why Database Migrations Matter

Database migrations are not just about changing schemas — they're about maintaining data integrity, enabling continuous delivery, and keeping your production system healthy. Poor migration practices lead to:

- **Production incidents** — Locking tables with aggressive ALTER statements
- **Data loss** — Dropping columns before data is migrated
- **Deployment paralysis** — Teams avoiding schema changes due to fear
- **Inconsistent environments** — Dev/staging/prod schema drift

Modern teams treat database migrations as first-class citizens in their CI/CD pipeline, with the same rigor applied to code deployments.

---

## The Two Migration Paradigms

Before diving into specific tools, it's important to understand the two fundamental approaches to database migrations:

### 1. Versioned (State-Based) Migrations

The tool maintains a history of migration files, each representing a transformation step. The tool tracks which migrations have been applied and runs any new ones in order.

**Tools:** Flyway, Alembic, Rails Migrations
**Approach:** "Here's the sequence of changes to get from A to B"

```sql
-- V1__create_users.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- V2__add_email.sql
ALTER TABLE users ADD COLUMN email VARCHAR(255);
```

### 2. Declarative (Model-Based) Diff Migrations

You define the desired final state of your schema, and the tool computes the diff between your model and the current database state, then generates the necessary migration.

**Tools:** Prisma Migrate, Django Migrations, Atlas (with --diff), Liquibase (withchangelog-diff)
**Approach:** "Here's what I want the schema to look like — figure out how to get there"

```prisma
model User {
  id    Int     @id @default(autoincrement())
  name  String
  email String  @unique  // Tool detects this new constraint
}
```

Both approaches have merits. Versioned migrations give you explicit control over exactly what runs. Declarative migrations are more ergonomic when iterating on schema design.

---

## Flyway

**Best for:** Teams wanting simple, reliable SQL-based migrations with minimal setup

Flyway is the most popular Java-based database migration tool, widely used in Spring Boot and general JVM projects. It runs SQL migration scripts in order and tracks applied migrations in a special `flyway_schema_history` table.

### Installation

```bash
# Maven
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
    <version>10.8.1</version>
</dependency>

# Gradle
implementation("org.flywaydb:flyway-core:10.8.1")

# Standalone CLI
# Download from https://flywaydb.org/download/
# Extract and add to PATH
```

### Migration File Naming

```
V1__create_users_table.sql
V2__add_email_to_users.sql
V3__create_orders_table.sql
V3__add_status_to_orders.sql    ← Careful! Same version, runs in undefined order
V4__create_products_table.sql
```

Convention: `V<VERSION>__<DESCRIPTION>.sql`

### Basic SQL Migrations

```sql
-- src/main/resources/db/migration/V1__create_users.sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- src/main/resources/db/migration/V2__add_active_flag.sql
ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
```

### Flyway Commands

```bash
# Run migrations
flyway migrate

# Check current status
flyway info

# Validate applied migrations (useful in CI)
flyway validate

# Undo last migration (requires flyway.undo.sql料)
flyway undo

# Repair (clean up corrupted history table)
flyway repair

# Baseline existing database
flyway baseline -baselineVersion=1 -baselineDescription="Initial schema"
```

### Flyway Configuration

```properties
# flyway.conf
flyway.url=jdbc:postgresql://localhost:5432/mydb
flyway.user=postgres
flyway.password=secret
flyway.locations=filesystem:./migrations,classpath:db/migration
flyway.baselineOnMigrate=true
flyway.baselineVersion=1
flyway.table=flyway_schema_history
flyway.outOfOrder=false
flyway.ignoreMissingMigrations=false
flyway.ignoreIgnoredMigrations=false
flyway.ignorePendingMigrations=false
flyway.ignoreFutureMigrations=false
```

### Flyway with Spring Boot

```properties
# application.properties
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.baselineOnMigrate=true
spring.flyway.validateOnMigrate=true
```

Spring Boot auto-configures Flyway on startup, running any pending migrations automatically.

---

## Liquibase

**Best for:** Enterprise teams needing cross-database compatibility, rollback support, and change audit trails

Liquibase is a powerful, XML/YAML/JSON/JSON-based migration tool with extensive database support and built-in rollback capabilities. It's the enterprise standard for Java-based projects requiring robust change management.

### Installation

```bash
# Maven
<dependency>
    <groupId>org.liquibase</groupId>
    <artifactId>liquibase-core</artifactId>
    <version>4.29.2</version>
</dependency>

# CLI
# Download from https://www.liquibase.org/download/
chmod +x liquibase
sudo mv liquibase /usr/local/bin/
```

### changelog.xml (Root File)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    https://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <include file="changelogs/users.xml"/>
    <include file="changelogs/orders.xml"/>
</databaseChangeLog>
```

### Users Changelog

```xml
<!-- changelogs/users.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog">

    <changeSet id="1" author="dev">
        <createTable tableName="users">
            <column name="id" type="BIGINT" autoIncrement="true">
                <constraints primaryKey="true"/>
            </column>
            <column name="name" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <column name="email" type="VARCHAR(255)">
                <constraints unique="true" nullable="false"/>
            </column>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="CURRENT_TIMESTAMP"/>
        </createTable>
        
        <rollback>
            <dropTable tableName="users"/>
        </rollback>
    </changeSet>

    <changeSet id="2" author="dev">
        <addColumn tableName="users">
            <column name="active" type="BOOLEAN" defaultValueBoolean="true"/>
        </addColumn>
        
        <rollback>
            <dropColumn tableName="users" columnName="active"/>
        </rollback>
    </changeSet>

    <changeSet id="3" author="dev" runAlways="true">
        <sql>CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)</sql>
        <rollback>
            <dropIndex tableName="users" indexName="idx_users_email"/>
        </rollback>
    </changeSet>

    <!-- With rollback tag for easy revert -->
    <changeSet id="4" author="dev">
        <insert tableName="users">
            <column name="name">System</column>
            <column name="email">system@example.com</column>
        </insert>
        <rollback>
            <delete tableName="users" where="email='system@example.com'"/>
        </rollback>
    </changeSet>

</databaseChangeLog>
```

### Liquibase Commands

```bash
# Update database
liquibase update

# Check status
liquibase status --verbose

# Generate changelog from existing database
liquibase generate-changelog --output-file=existing_schema.xml

# Rollback one changeSet
liquibase rollback --changeSetCount=1

# Rollback to a tag
liquibase rollbackToTag v1.0.0

# Tag current state
liquibase tag v1.0.0

# Update SQL without applying (for review)
liquibase updateSQL

# Diff between two databases
liquibase diff --referenceUrl=jdbc:postgresql://localhost:5432/prod \
    --referenceUsername=postgres \
    --referencePassword=secret \
    --url=jdbc:postgresql://localhost:5432/test \
    --username=postgres \
    --password=secret
```

### Liquibase with YAML or JSON

Prefer YAML or JSON? Liquibase supports them all:

```yaml
# changelogs/users.yaml
databaseChangeLog:
  - changeSet:
      id: 1
      author: dev
      changes:
        - createTable:
            tableName: users
            columns:
              - column:
                  name: id
                  type: BIGINT
                  autoIncrement: true
                  constraints:
                    primaryKey: true
              - column:
                  name: name
                  type: VARCHAR(255)
                  constraints:
                    nullable: false
              - column:
                  name: email
                  type: VARCHAR(255)
                  constraints:
                    unique: true
                    nullable: false
      rollback:
        - dropTable:
            tableName: users
```

---

## Alembic (Python)

**Best for:** Python/async teams using SQLAlchemy, especially FastAPI and asyncpg

Alembic is the de facto standard migration tool for Python projects using SQLAlchemy. It combines versioned migration files with SQLAlchemy's database abstraction, supporting all major databases.

### Installation

```bash
pip install alembic
alembic init alembic
```

### alembic.ini

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os

sqlalchemy.url = postgresql://postgres:secret@localhost:5432/mydb

[post_write_hooks]

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

### env.py Configuration

```python
# alembic/env.py
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy import engine_from_config
from sqlalchemy import column
from alembic import context

# Import your models
from myapp.models import Base
from myapp.models.user import User
from myapp.models.order import Order

config = context.config
target_metadata = Base.metadata

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_config().get("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### Generate a Migration

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "add users table"

# Create empty migration for manual editing
alembic revision -m "manual migration"
```

### Generated Migration (Auto)

```python
# alembic/versions/2026_04_02_add_users.py
"""add users table

Revision ID: abc123
Revises: 
Create Date: 2026-04-02 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = 'abc123'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

def downgrade() -> None:
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
```

### Manual Migration with Data Migration

```python
# alembic/versions/2026_04_02_add_status_column.py
"""add status column with default

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'xyz789'
down_revision: Union[str, None] = 'abc123'  # Point to parent migration
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add column as nullable first (no lock!)
    op.add_column('orders', 
        sa.Column('status', sa.String(length=50), nullable=True))
    
    # Backfill existing rows
    op.execute("UPDATE orders SET status = 'pending' WHERE status IS NULL")
    
    # Now make it non-nullable
    op.alter_column('orders', 'status', nullable=False)

def downgrade() -> None:
    op.drop_column('orders', 'status')
```

### Alembic Commands

```bash
# Run pending migrations
alembic upgrade head

# Check current version
alembic current

# Show migration history
alembic history --verbose

# Rollback one migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade abc123

# Generate SQL without applying
alembic upgrade --sql +1 > migration.sql

# Stamp current version (without running migrations)
alembic stamp head
```

---

## Prisma Migrate

**Best for:** TypeScript/Node.js developers wanting declarative migrations with full type safety

Prisma Migrate takes a declarative model-first approach. You define your schema in `schema.prisma`, and Prisma generates and runs migrations.

### schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  active    Boolean  @default(true)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
}
```

### Prisma Migrate Commands

```bash
# Create and apply initial migration
npx prisma migrate dev --name init

# Apply pending migrations (production)
npx prisma migrate deploy

# Reset database and re-apply (dev only!)
npx prisma migrate reset

# Check for drift
npx prisma migrate status

# Resolve a migration conflict (when DB was manually changed)
npx prisma migrate resolve --applied 20260402_add_users
npx prisma migrate resolve --rolled-back 20260402_add_users

# Reset migrations in development
npx prisma migrate dev --name fixed_email_unique --create-only
```

### Prisma Migrate with SQL Embeds

For operations Prisma's schema can't express, use raw SQL:

```prisma
// In a migration file (created manually)
// prisma/migrations/20260402_custom SQL/migration.sql

-- Custom index that Prisma can't express
CREATE UNIQUE INDEX CONCURRENTLY idx_users_lower_email 
ON users (lower(email));

-- Custom trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

### Shadow Database (for CI)

Prisma uses a shadow database for migration development. Configure it to avoid conflicts:

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")  // Separate DB for migrations
}
```

---

## Atlas

**Best for:** Teams wanting the best of both worlds — declarative schema definitions AND versioned migration files

Atlas is the newest major player in the migration space. It supports both declarative (HCL) and versioned migration approaches, with support for all major databases including the emerging libSQL/SQLite variants.

### Installation

```bash
# macOS
brew install ariga/tap/atlas

# Linux
curl -sSf https://atlasgo.sh | sh

# Docker
docker pull ariga/atlas
```

### Declarative Mode (HCL Schema)

```hcl
# schema.hcl
database "mydb" {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

table "users" {
  schema = schema.mydb
  columns = [
    { name = "id"    type = "bigint"  auto_increment = true },
    { name = "name"  type = "varchar" size = 255 },
    { name = "email" type = "varchar" size = 255 },
    { name = "created_at" type = "timestamp" default = "now()" },
  ]
  primary_key = {
    columns = [column.id]
  }
  indexes = [
    { unique = true, columns = [column.email] },
  ]
}

schema "mydb" {
}
```

### Atlas Commands

```bash
# Diff current database against schema
atlas schema inspect --url "postgresql://postgres:secret@localhost:5432/mydb" | atlas schema apply --url "postgresql://..."

# Apply schema changes (interactive)
atlas schema apply --url "postgresql://postgres:secret@localhost:5432/mydb" --schema-file="schema.hcl"

# Generate migration from diff
atlas migrate diff --to="file://schema.hcl" --dir="file://migrations"

# Run migrations
atlas migrate run --dir="file://migrations" --url "postgresql://..."

# Check migration status
atlas migrate status --dir="file://migrations" --url "postgresql://..."
```

### Versioned Migration Mode

Atlas can also work with Flyway-style versioned SQL migrations:

```bash
# Compare two databases and generate a migration
atlas migrate diff --from="postgresql://db1" --to="postgresql://db2" --dir="file://migrations"
```

---

## Rails Active Record Migrations

**Best for:** Ruby on Rails applications

Rails migrations are the gold standard for developer experience in migration tooling. They've inspired countless other tools and remain excellent in 2026.

### Generate Migrations

```bash
rails generate migration AddStatusToOrders status:string
rails generate migration CreateJoinTableUserRole user:references role:references
rails generate model Product name:string price:decimal{10,2}
```

### Migration Files

```ruby
# db/migrate/20260402100000_create_users.rb
class CreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users do |t|
      t.string :name, null: false
      t.string :email, null: false
      t.timestamps
    end

    add_index :users, :email, unique: true
  end
end

# db/migrate/20260402110000_add_status_to_orders.rb
class AddStatusToOrders < ActiveRecord::Migration[8.0]
  def change
    add_column :orders, :status, :string, default: 'pending', null: false
    add_index :orders, :status
    
    # Reversible migration for data changes
    reversible do |dir|
      dir.up do
        execute "UPDATE orders SET status = 'pending' WHERE status IS NULL"
      end
    end
  end

  def down
    remove_column :orders, :status
  end
end
```

### Rails Migration Commands

```bash
rails db:migrate
rails db:migrate:status
rails db:rollback STEP=1
rails db:rollback STEP=5
rails db:migrate:redo STEP=1
rails db:reset          # Drop, recreate, load seed
rails db:migrate:fresh  # Drop, recreate, migrate
rails db:migrate:up VERSION=20260402100000
rails db:migrate:down VERSION=20260402100000
```

---

## Django Migrations

**Best for:** Python/Django applications

Django's migration system is integrated directly into the ORM. Model changes auto-generate migrations.

### Generate Migrations

```bash
python manage.py makemigrations
python manage.py makemigrations myapp
```

### Migration Files

```python
# migrations/0003_add_status_to_order.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('orders', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='status',
            field=models.CharField(
                max_length=20,
                default='pending',
                choices=[
                    ('pending', 'Pending'),
                    ('processing', 'Processing'),
                    ('shipped', 'Shipped'),
                    ('delivered', 'Delivered'),
                ]
            ),
            preserve_default=False,
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['status'], name='orders_status_idx'),
        ),
    ]
```

### Django Migration Commands

```bash
python manage.py migrate
python manage.py showmigrations
python manage.py migrate myapp  # Migrate specific app
python manage.py migrate myapp 0003  # Migrate to specific version
python manage.py migrate myapp zero  # Undo all migrations
python manage.py sqlmigrate myapp 0003  # Show SQL without executing
python manage.py migrate --check  # Fail if unapplied migrations (CI use)
```

---

## Zero-Downtime Migration Strategies

Zero-downtime migrations are critical for production systems. Here are proven patterns that work across all databases:

### 1. Expand-Contract Pattern (Blue-Green Deployment)

The safest approach for risky migrations:

```
Phase 1: EXPAND
- Add new column (nullable, no default)
- Deploy app code that writes to BOTH old and new columns
- Backfill new column from old column

Phase 2: MIGRATE  
- Deploy app code that reads/writes only new column
- Drop old column
```

```sql
-- EXPAND: Add new column
ALTER TABLE users ADD COLUMN email_lower VARCHAR(255);

-- BACKFILL (in batches to avoid locking)
UPDATE users SET email_lower = lower(email) WHERE id BETWEEN 1 AND 10000;
UPDATE users SET email_lower = lower(email) WHERE id BETWEEN 10001 AND 20000;
-- ... continue in batches

-- Now app writes to both columns

-- CONTRACT: Remove old column
ALTER TABLE users DROP COLUMN email_lower;  -- After all reads/writes switched
```

### 2. Online Index Creation

Always create indexes CONCURRENTLY in PostgreSQL to avoid table locks:

```sql
-- BAD: Locks the table
CREATE INDEX idx_users_email ON users(email);

-- GOOD: No lock, but can't be run inside a transaction block
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- For partial indexes
CREATE INDEX CONCURRENTLY idx_users_active_email ON users(email) WHERE active = true;
```

For MySQL 8.0+, use `ALGORITHM=INPLACE, LOCK=NONE`:

```sql
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE;
```

### 3. Safe Column Operations

```sql
-- Step 1: Add nullable column (fast, no data rewrite)
ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100);

-- Step 2: Start writing to new column
-- Deploy app code that populates both old and new

-- Step 3: Backfill (in batches)
UPDATE orders SET tracking_number = 'PENDING-' || id 
WHERE tracking_number IS NULL 
  AND id BETWEEN 1 AND 10000;

-- Step 4: Add constraint after backfill complete
ALTER TABLE orders ALTER COLUMN tracking_number SET NOT NULL;

-- Step 5: Drop old column
ALTER TABLE orders DROP COLUMN legacy_tracking;
```

### 4. Big Table Considerations

For tables with millions of rows:

```sql
-- PostgreSQL: Use pg_repack for large reorganizations without table locks
-- Install: apt-get install pg_repack

-- Repack table to reclaim space and rebuild indexes without lock
pg_repack -t orders -o tracking_number -O

-- MySQL: Use pt-online-schema-change (Percona Toolkit)
pt-online-schema-change \
    --alter "ADD COLUMN new_col VARCHAR(100)" \
    --user=root \
    --password=secret \
    D=mydb,t=orders \
    --execute
```

### 5. Migration Lock Timeout

Set lock timeouts to prevent migrations from waiting indefinitely:

```sql
-- PostgreSQL
SET lock_timeout = '2s';
ALTER TABLE orders ADD COLUMN new_col VARCHAR(100);

-- MySQL
SET SESSION lock_wait_timeout = 180;
ALTER TABLE orders ADD COLUMN new_col VARCHAR(100);
```

---

## Multi-Database Considerations

Modern applications often use multiple databases. Here's how migration tools handle this:

### Prisma Multi-Database

```prisma
datasource db_primary {
  provider = "postgresql"
  url      = env("DATABASE_URL_PRIMARY")
}

datasource db_analytics {
  provider = "postgresql"
  url      = env("DATABASE_URL_ANALYTICS")
}

generator client {
  provider = "prisma-client-js"
}
```

```bash
# Run migrations on specific database
DATABASE_URL=postgres://.../analytics npx prisma migrate deploy
```

### Flyway Multiple Schemas

```properties
flyway.url=jdbc:postgresql://localhost:5432/mydb
flyway.schemas=public,analytics
flyway.defaultSchema=public
```

### Atlas Multi-Database

```bash
# Inspect and apply to specific database
atlas schema inspect --url "postgresql://prod/mydb" | atlas schema apply --url "postgresql://analytics/anotherdb"
```

---

## Choosing the Right Tool

| Tool | Language/Framework | Approach | Best For |
|------|-------------------|---------|---------|
| **Flyway** | Java, any | Versioned SQL | JVM teams, simple SQL migrations |
| **Liquibase** | Java, any | Declarative XML/YAML/JSON | Enterprise, rollback requirements |
| **Alembic** | Python, SQLAlchemy | Versioned SQL + auto-generate | FastAPI, async Python |
| **Prisma Migrate** | TypeScript, Node.js | Declarative schema | Full-stack TypeScript apps |
| **Atlas** | Any | Both declarative + versioned | Teams wanting flexibility |
| **Rails Migrations** | Ruby on Rails | Auto-generate + versioned | Rails applications |
| **Django Migrations** | Python, Django | Auto-generate | Django applications |

### Decision Framework

1. **What language is your application written in?**
   - Python → Alembic (SQLAlchemy) or Django Migrations
   - TypeScript/Node.js → Prisma Migrate
   - Ruby → Rails Migrations
   - Java/Kotlin/JVM → Flyway or Liquibase

2. **Do you prefer versioned or declarative migrations?**
   - Want explicit control → Flyway, Alembic
   - Want to work from schema definition → Prisma, Atlas

3. **Do you need rollback capabilities?**
   - Yes → Liquibase, Rails, Django
   - Not critical → Flyway, Alembic

4. **Do you need zero-downtime strategies?**
   - All tools support it, but Atlas has the best built-in analysis

---

## Conclusion

Database migrations in 2026 are safer and more ergonomic than ever, but they're still one of the highest-risk operations in software deployment. The tools in this guide — Flyway, Liquibase, Alembic, Prisma, Atlas, and the framework-specific options — all represent mature, production-proven approaches to schema evolution.

The most important insight is that migration tools are only part of the solution. Pairing your migration tool with:

- **Zero-downtime patterns** (expand-contract, online indexes, safe column operations)
- **Proper CI/CD integration** (validate before deploy, automatic rollbacks)
- **Database observability** (monitor migration progress, lock waits, replication lag)

is what separates teams that deploy confidently from those that treat schema changes as emergencies.

Start with the tool that best fits your tech stack and workflow, then layer in the operational practices that make zero-downtime migrations achievable in your environment.

---

*For more database guides, explore [PostgreSQL performance tuning](/blog/postgresql-performance-2026), [MySQL tools](/blog/mysql-tools-2026), and [SQLite browser tools](/blog/sqlite-browser-tools-2026) on DevPlaybook.*
