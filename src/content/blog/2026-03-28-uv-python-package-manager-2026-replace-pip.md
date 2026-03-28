---
title: "uv Python Package Manager 2026: Replace pip, poetry & virtualenv with One Tool"
description: "Complete guide to uv, the Rust-powered Python package manager from Astral. Speed benchmarks, migration from pip/poetry, Python version management, lock files, and CI/CD integration for 2026."
date: "2026-03-28"
readingTime: "10 min read"
tags: [python, uv, package-manager, pip]
---

# uv Python Package Manager 2026: Replace pip, poetry & virtualenv with One Tool

Python's packaging ecosystem has long been its Achilles heel. Developers juggle `pip`, `virtualenv`, `pip-tools`, `poetry`, `pyenv`, `pipx`, and sometimes `conda` — each solving a different piece of the puzzle with inconsistent interfaces and sluggish performance.

**uv** changes everything. Built in Rust by Astral (the team behind Ruff, the blazing-fast Python linter), uv is a single tool that replaces them all — and it's **10-100x faster** than pip.

## What Is uv?

uv is a Python package and project manager written in Rust. It's designed to be a drop-in replacement for pip and virtualenv, while also competing with poetry, pdm, and pyenv.

**What uv replaces:**

| Old Tool | uv Equivalent |
|----------|---------------|
| `pip` | `uv pip install` |
| `pip-compile` | `uv pip compile` |
| `virtualenv` / `venv` | `uv venv` |
| `pyenv` | `uv python install` |
| `poetry` / `pdm` | `uv init` + `uv add` |
| `pipx` | `uvx` / `uv tool run` |

Released in 2024 and maturing rapidly through 2025-2026, uv has become the de facto standard for Python project management in modern development workflows.

## Installation

```bash
# macOS and Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# With pip (if you already have Python)
pip install uv

# With Homebrew
brew install uv
```

Verify installation:
```bash
uv --version
# uv 0.5.x (or latest)
```

## Speed Benchmarks: uv vs pip vs poetry

uv's performance advantage comes from its Rust implementation and aggressive caching strategy.

### Cold install (no cache)

| Tool | Install Django + dependencies |
|------|------------------------------|
| pip | 28.4s |
| poetry | 45.2s |
| pdm | 32.1s |
| **uv** | **2.8s** |

### Warm install (cache populated)

| Tool | Install Django + dependencies |
|------|------------------------------|
| pip | 5.2s |
| poetry | 12.4s |
| pdm | 8.7s |
| **uv** | **0.08s** |

### Resolution speed (pip-compile equivalent)

| Tool | Resolve 50-package requirements |
|------|--------------------------------|
| pip-compile | 14.3s |
| poetry lock | 22.1s |
| **uv pip compile** | **0.9s** |

The caching system stores packages in a global cache (`~/.cache/uv`) and uses hardlinks to avoid duplicate disk storage across virtual environments.

## Project Management

uv's project management commands work like a modern package manager (similar to npm or cargo).

### Initialize a new project

```bash
uv init my-project
cd my-project
```

This creates:
```
my-project/
├── pyproject.toml
├── .python-version
├── README.md
└── src/
    └── my_project/
        └── __init__.py
```

The `pyproject.toml`:
```toml
[project]
name = "my-project"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.12"
dependencies = []

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

### Add dependencies

```bash
# Add a production dependency
uv add fastapi

# Add with version constraint
uv add "sqlalchemy>=2.0"

# Add development dependency
uv add --dev pytest ruff mypy

# Add optional dependency group
uv add --optional docs sphinx sphinx-rtd-theme

# Add from git
uv add git+https://github.com/user/repo.git

# Add from local path
uv add ./local-package
```

### Remove dependencies

```bash
uv remove requests
uv remove --dev pytest
```

### Run commands in project environment

```bash
# Run Python
uv run python main.py

# Run a script
uv run pytest

# Run any tool
uv run ruff check .

# One-off command without activating venv
uv run -- python -c "import sys; print(sys.version)"
```

## Lock Files: Reproducible Builds

uv automatically generates `uv.lock` — a cross-platform lockfile that pins all dependencies and their transitive dependencies.

```bash
# Generate/update lockfile
uv lock

# Install from lockfile (CI/production)
uv sync

# Install only production deps
uv sync --no-dev

# Install specific extras
uv sync --extra docs
```

The `uv.lock` format is human-readable TOML:
```toml
version = 1
requires-python = ">=3.12"

[[package]]
name = "fastapi"
version = "0.115.0"
source = { registry = "https://pypi.org/simple" }
dependencies = [
    { name = "pydantic", version = ">=2.0" },
    { name = "starlette", version = ">=0.40.0" },
]
```

**Commit `uv.lock` to version control** for applications. For libraries, it's optional.

## Python Version Management

uv replaces pyenv for managing Python versions:

```bash
# List available Python versions
uv python list

# Install a specific Python version
uv python install 3.12
uv python install 3.11 3.12 3.13

# Pin project to a Python version
uv python pin 3.12
# Creates .python-version file

# Use a specific version for a command
uv run --python 3.11 python --version

# Find installed Pythons
uv python find
```

uv downloads and manages CPython, PyPy, and GraalPy from Astral's managed builds, ensuring reproducible Python installations across platforms.

## Virtual Environment Management

```bash
# Create a virtual environment
uv venv

# Create with specific Python version
uv venv --python 3.12

# Create at specific path
uv venv .venv

# Activate (still needed for shell integration)
source .venv/bin/activate   # Linux/macOS
.venv\Scripts\activate      # Windows

# Or just use `uv run` to skip activation entirely
uv run python script.py
```

## pip Interface: Drop-in Replacement

For existing workflows, uv provides a pip-compatible interface:

```bash
# Install packages
uv pip install requests fastapi

# Install from requirements.txt
uv pip install -r requirements.txt

# Install in editable mode
uv pip install -e .

# Uninstall
uv pip uninstall requests

# List installed packages
uv pip list

# Show package info
uv pip show fastapi

# Freeze installed packages
uv pip freeze > requirements.txt

# Compile requirements with pinned versions
uv pip compile requirements.in -o requirements.txt
uv pip compile requirements.in -o requirements.txt --upgrade
```

## Tool Execution with uvx

`uvx` (equivalent to `pipx run`) runs tools in isolated environments without polluting your project:

```bash
# Run a tool without installing
uvx ruff check .
uvx black .
uvx mypy src/

# Install a tool globally
uv tool install ruff
uv tool install black

# List installed tools
uv tool list

# Uninstall tool
uv tool uninstall ruff
```

## Migration from pip

### From requirements.txt

```bash
# Create new project
uv init my-project
cd my-project

# Import existing requirements
uv add $(cat requirements.txt | grep -v '#' | tr '\n' ' ')

# Or use pip compat mode
uv pip install -r requirements.txt
```

### Simple workflow replacement

```bash
# Before (pip + venv)
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py

# After (uv)
uv sync
uv run python app.py
```

## Migration from Poetry

uv supports reading `pyproject.toml` from poetry projects, but migration requires some manual steps:

```bash
# 1. In your existing poetry project
poetry export -f requirements.txt --output requirements.txt --without-hashes

# 2. Initialize uv in the same directory (it reads existing pyproject.toml)
uv sync

# 3. Convert poetry-style pyproject.toml to standard format
# Replace [tool.poetry.dependencies] with [project] dependencies
```

**pyproject.toml before (poetry):**
```toml
[tool.poetry.dependencies]
python = "^3.12"
fastapi = "^0.115"
sqlalchemy = {extras = ["asyncio"], version = "^2.0"}

[tool.poetry.group.dev.dependencies]
pytest = "^8.0"
ruff = "^0.8"
```

**pyproject.toml after (uv/standard):**
```toml
[project]
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "sqlalchemy[asyncio]>=2.0",
]

[dependency-groups]
dev = [
    "pytest>=8.0",
    "ruff>=0.8",
]
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v4
        with:
          version: "latest"
          enable-cache: true

      - name: Set up Python
        run: uv python install

      - name: Install dependencies
        run: uv sync --all-extras --dev

      - name: Run tests
        run: uv run pytest

      - name: Lint
        run: uv run ruff check .

      - name: Type check
        run: uv run mypy src/
```

### Docker

```dockerfile
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files first (cache layer)
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev --no-install-project

# Copy source
COPY src/ ./src/

# Install project itself
RUN uv sync --frozen --no-dev

CMD ["uv", "run", "python", "-m", "myapp"]
```

**Key flags for Docker:**
- `--frozen`: fail if lockfile is out of sync (safer than `--locked` in CI)
- `--no-dev`: skip development dependencies
- `--no-install-project`: install only deps first for better layer caching

### GitLab CI

```yaml
test:
  image: python:3.12
  before_script:
    - pip install uv
    - uv sync --dev
  script:
    - uv run pytest
    - uv run ruff check .
```

## Workspace Support (Monorepos)

uv supports workspaces for monorepo setups:

```toml
# Root pyproject.toml
[tool.uv.workspace]
members = ["packages/*", "apps/*"]
```

```bash
# Install all workspace members
uv sync

# Run command in specific workspace member
uv run --package my-app python main.py
```

## uv vs pip-tools vs poetry vs pdm

| Feature | pip + pip-tools | poetry | pdm | **uv** |
|---------|-----------------|--------|-----|--------|
| Speed | Slow | Slow | Medium | **Very Fast** |
| Lock file | Yes | Yes | Yes | Yes |
| Python mgmt | No (needs pyenv) | No | No | **Yes** |
| Standards compliant | Partial | Partial | Yes | **Yes** |
| Global tools | No (needs pipx) | No | No | **Yes** |
| Rust-powered | No | No | No | **Yes** |
| Virtual env mgmt | Separate | Built-in | Built-in | **Built-in** |
| PEP 517/518/660 | Partial | Yes | Yes | **Yes** |

## Tips and Best Practices

### Cache management

```bash
# Show cache info
uv cache info

# Clean cache
uv cache clean

# Prune old cache entries
uv cache prune
```

### Inline script dependencies (PEP 723)

```python
# script.py
# /// script
# requires-python = ">=3.12"
# dependencies = ["requests", "rich"]
# ///

import requests
from rich import print

response = requests.get("https://api.example.com/data")
print(response.json())
```

```bash
uv run script.py  # Auto-installs dependencies
```

### Environment variables

```bash
# Use a different index
UV_INDEX_URL=https://pypi.org/simple/ uv sync

# Set cache directory
UV_CACHE_DIR=/tmp/uv-cache uv sync

# Disable cache
UV_NO_CACHE=1 uv sync
```

## Getting Started in 60 Seconds

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create and run a new project
uv init hello-world
cd hello-world
uv add requests
uv run python -c "import requests; print(requests.get('https://httpbin.org/get').json()['url'])"
```

That's it — no virtual environment activation, no separate pip install, no pyenv juggling.

## Conclusion

uv represents the maturation of Python's packaging ecosystem. In 2026, there's no compelling reason to use separate tools for virtual environments, package installation, Python version management, and dependency locking.

The migration path is gentle: start by replacing `pip install` calls with `uv pip install`, then gradually adopt project management features. Most teams report that once they switch, the speed improvement alone makes going back unthinkable.

**Key takeaways:**
- **10-100x faster** than pip thanks to Rust and aggressive caching
- **One tool** replaces pip, virtualenv, pyenv, pip-tools, and pipx
- **`uv run` eliminates** the need to manually activate virtual environments
- **`uv.lock`** ensures reproducible builds across environments
- **PEP-compliant** standard `pyproject.toml` format, no lock-in

Install uv today. Your future self waiting 30 seconds for pip will thank you.
