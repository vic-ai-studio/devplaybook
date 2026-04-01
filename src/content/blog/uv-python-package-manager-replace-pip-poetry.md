---
title: "uv: The Blazing-Fast Python Package Manager Replacing pip & Poetry"
description: "uv is 10-100x faster than pip and replaces pip, pip-tools, virtualenv, and pyenv in one tool. Complete migration guide from pip, poetry, and conda for 2025."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["python", "uv", "package-manager", "pip", "poetry", "tooling", "developer-tools"]
readingTime: "10 min read"
---

`uv` is a Python package manager written in Rust by Astral (the team behind `ruff`). It replaces `pip`, `pip-tools`, `virtualenv`, `venv`, and even `pyenv` in a single tool — and it's 10-100x faster than pip.

If you're still using pip or Poetry in 2025, this guide shows you how to migrate.

---

## Why uv Is Different

Most Python tooling is slow because it's written in Python. `uv` is written in Rust, uses a global package cache, and resolves dependencies with a SAT solver instead of pip's slow backtracking algorithm.

**Installation benchmark:**
```
Installing requests + 5 dependencies

pip:     8.3 seconds
poetry:  12.1 seconds
uv:      0.4 seconds  (21x faster)
```

**Lock file resolution:**
```
Resolving 200-package project

pip-tools:  45 seconds
poetry:     38 seconds
uv:         1.2 seconds  (35x faster)
```

The speed difference is most noticeable in CI/CD pipelines that install dependencies on every run.

---

## Installation

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# or via pip (bootstrap)
pip install uv
```

Verify:
```bash
uv --version
# uv 0.4.x (or latest)
```

---

## Core Concepts

### What uv Replaces

| Old tool | uv equivalent |
|----------|---------------|
| `python -m venv .venv` | `uv venv` |
| `pip install package` | `uv pip install package` |
| `pip-tools pip-compile` | `uv pip compile requirements.in` |
| `pip-tools pip-sync` | `uv pip sync requirements.txt` |
| `pyenv install 3.12` | `uv python install 3.12` |
| `pyenv use 3.12` | `uv python pin 3.12` |
| `poetry add package` | `uv add package` |
| `poetry install` | `uv sync` |
| `poetry run python` | `uv run python` |

---

## Project Workflow (Modern uv)

### Create a new project

```bash
uv init my-project
cd my-project
```

This creates:
```
my-project/
├── pyproject.toml    # Project config
├── uv.lock           # Lock file (commit this)
├── .python-version   # Pinned Python version
└── src/
    └── my_project/
        └── __init__.py
```

### Add dependencies

```bash
# Add a runtime dependency
uv add fastapi

# Add a dev dependency
uv add --dev pytest ruff mypy

# Add with version constraint
uv add "pydantic>=2.0"

# Add optional dependency group
uv add --group lint ruff
```

`uv add` updates `pyproject.toml`, resolves the full dependency tree, updates `uv.lock`, and installs the package — all in one command.

### Install all dependencies

```bash
uv sync                    # Install all dependencies
uv sync --no-dev           # Production only (skip dev deps)
uv sync --group lint       # Include optional group
```

### Run commands

```bash
uv run python main.py      # Run with project's Python
uv run pytest              # Run pytest from project env
uv run fastapi dev         # Run any installed CLI tool
```

### Check your lock file

```bash
uv lock --check            # Verify lock file is up to date
uv lock                    # Update lock file
```

---

## Migration from pip

### Simple project (requirements.txt)

```bash
# 1. Create virtual environment
uv venv

# 2. Install from existing requirements
uv pip install -r requirements.txt

# 3. Going forward, use uv pip instead of pip
uv pip install newpackage
uv pip install -r requirements.txt
```

### Upgrade your workflow

The direct pip replacement is `uv pip` — it accepts the same flags as pip:

```bash
uv pip install fastapi           # Instead of: pip install fastapi
uv pip install -r requirements.txt
uv pip install -e .              # Editable install
uv pip list                      # List installed packages
uv pip show fastapi              # Package info
uv pip uninstall fastapi
```

### Generate a lock file from requirements.in

```bash
# requirements.in (your direct dependencies)
fastapi
pydantic>=2.0
sqlalchemy[asyncio]

# Compile to pinned requirements.txt
uv pip compile requirements.in -o requirements.txt

# Install exact versions
uv pip sync requirements.txt
```

---

## Migration from Poetry

### Automatic migration

```bash
# In your existing Poetry project
uv init --no-readme --no-package  # Doesn't overwrite pyproject.toml

# OR: manually update pyproject.toml tool section
# Poetry [tool.poetry] → uv uses [project] (PEP 621)
```

### Manual pyproject.toml migration

```toml
# Poetry format (old)
[tool.poetry]
name = "my-app"
version = "0.1.0"
description = ""

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.110"
pydantic = "^2.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0"
ruff = "^0.3"

# PEP 621 format (uv native)
[project]
name = "my-app"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110",
    "pydantic>=2.0",
]

[dependency-groups]
dev = [
    "pytest>=8.0",
    "ruff>=0.3",
]
```

Then:
```bash
uv sync        # Replaces: poetry install
uv add fastapi # Replaces: poetry add fastapi
uv run pytest  # Replaces: poetry run pytest
```

---

## Python Version Management

`uv` replaces `pyenv` for Python version management:

```bash
# List available Python versions
uv python list

# Install a specific version
uv python install 3.12
uv python install 3.11.9

# Pin a version for the current project
uv python pin 3.12

# Create a venv with a specific version
uv venv --python 3.11

# Run a one-off command with a specific version
uv run --python 3.12 python --version
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v3

      - name: Set up Python
        run: uv python install

      - name: Install dependencies
        run: uv sync --frozen  # --frozen: fail if lock file needs update

      - name: Run tests
        run: uv run pytest

      - name: Lint
        run: uv run ruff check .
```

`--frozen` flag in CI prevents accidental lock file drift.

### Docker

```dockerfile
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy lock file and pyproject.toml first (Docker cache)
COPY pyproject.toml uv.lock ./

# Install dependencies only (not the project itself)
RUN uv sync --frozen --no-dev --no-install-project

# Copy source
COPY src/ ./src/

# Install the project
RUN uv sync --frozen --no-dev

CMD ["uv", "run", "fastapi", "run", "src/main.py"]
```

Copying `pyproject.toml` and `uv.lock` before source code maximizes Docker layer caching.

---

## Global Tool Installation

`uv` can also manage globally installed CLI tools without affecting your projects:

```bash
# Install a tool globally
uv tool install ruff
uv tool install black
uv tool install httpie

# Run a one-off tool without installing
uvx ruff check .
uvx black --check .
uvx cowsay "hello"

# List installed tools
uv tool list

# Upgrade a tool
uv tool upgrade ruff
```

`uvx` (equivalent to `pipx run`) downloads and runs a tool in an isolated environment without installing it permanently.

---

## Workspace Support (Monorepos)

`uv` supports workspaces for monorepos with multiple Python packages:

```toml
# Root pyproject.toml
[tool.uv.workspace]
members = [
    "packages/api",
    "packages/shared",
    "packages/cli",
]
```

```bash
# Install all workspace packages
uv sync

# Run in a specific workspace member
uv run --package api python main.py
```

---

## Common Commands Reference

```bash
# Project setup
uv init my-project              # New project
uv venv                         # Create virtual environment
uv sync                         # Install all deps from lock file
uv sync --frozen                # Install without updating lock (CI)

# Dependencies
uv add fastapi                  # Add dependency
uv add --dev pytest             # Add dev dependency
uv remove fastapi               # Remove dependency
uv lock                         # Update lock file

# Running
uv run python script.py         # Run with project env
uv run pytest                   # Run tool from project env
uvx ruff check .                # Run tool without installing

# Python versions
uv python install 3.12          # Install Python
uv python pin 3.12              # Pin for project
uv python list                  # List available versions

# pip compatibility
uv pip install package          # pip-style install
uv pip compile requirements.in  # Generate lock file
uv pip sync requirements.txt    # Install from lock file
```

---

## Related Tools on DevPlaybook

- [Python async patterns 2025](/blog/python-async-patterns-2025-asyncio-structured-concurrency)
- [Pydantic v2 guide](/blog/pydantic-v2-complete-guide-validation-settings-data-modeling)
- [FastAPI vs DRF comparison](/blog/fastapi-vs-django-rest-framework-2025-which-to-choose)
- [Python best practices](/tools/python-formatter) — format Python code online
