---
title: "Python Type Checking 2026: mypy vs Pyright vs Pytype + Ruff Linting"
description: "Python type checking guide 2026: mypy vs Pyright (Pylance) comparison, Ruff linter replacing flake8/isort/black, type annotation best practices, TypeVar/Protocol/TypedDict."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Python", "mypy", "Pyright", "Ruff", "type hints", "static analysis", "linting"]
readingTime: "10 min read"
category: "python"
---

Python's type system has come a long way since PEP 484 landed in 2015. In 2026, type checking is no longer optional for serious Python codebases—it catches entire categories of bugs before they reach production. And with Ruff replacing the old linting stack in a single fast tool, your static analysis setup is simpler and faster than ever.

This guide covers the type annotation basics, the mypy vs. Pyright decision, Ruff's role in linting, and advanced type patterns that make the most of the modern type system.

---

## Python Type Hints: The Basics (PEP 484+)

Type hints are annotations added to functions and variables. They don't affect runtime behavior—the interpreter ignores them—but static analysis tools use them to catch errors.

```python
# Before type hints
def greet(name):
    return "Hello, " + name

# With type hints
def greet(name: str) -> str:
    return "Hello, " + name

# Variables
user_id: int = 42
names: list[str] = ["Alice", "Bob"]
config: dict[str, int] = {"timeout": 30, "retries": 3}

# Optional values (can be None)
from typing import Optional
def find_user(user_id: int) -> Optional[str]:  # pre-3.10 style
    ...

def find_user(user_id: int) -> str | None:  # 3.10+ union syntax
    ...
```

### Modern syntax (Python 3.10+)

```python
# Use built-in generics instead of typing imports
# Old:
from typing import List, Dict, Tuple, Optional
def process(items: List[str]) -> Dict[str, int]: ...

# New (3.9+):
def process(items: list[str]) -> dict[str, int]: ...

# Union types (3.10+)
def parse(value: str | int | None) -> str: ...

# Match statement type narrowing (3.10+)
def describe(shape: Circle | Square | Triangle) -> str:
    match shape:
        case Circle(radius=r):
            return f"Circle with radius {r}"
        case Square(side=s):
            return f"Square with side {s}"
```

---

## mypy: The Original Static Type Checker

mypy has been the standard Python type checker since 2012. It's mature, widely supported, and integrates with most editors and CI systems.

```bash
uv add --dev mypy
mypy myapp/          # Type-check a package
mypy --strict myapp/ # Strict mode (enables all checks)
```

### mypy configuration in pyproject.toml

```toml
[tool.mypy]
python_version = "3.12"
strict = true                    # Enable all strict checks
warn_return_any = true
warn_unused_ignores = true
warn_redundant_casts = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
no_implicit_optional = true

# Per-module overrides for third-party code without stubs
[[tool.mypy.overrides]]
module = ["boto3.*", "botocore.*"]
ignore_missing_imports = true

[[tool.mypy.overrides]]
module = "legacy_module.*"
disallow_untyped_defs = false    # Gradual adoption
```

### mypy's gradual typing approach

mypy supports incremental adoption. You can start with `ignore_missing_imports = true` and `disallow_untyped_defs = false`, then tighten the config as you add annotations.

---

## Pyright: Faster and Stricter

Pyright is Microsoft's type checker, written in TypeScript. It powers Pylance in VS Code. Compared to mypy:

- **Significantly faster** — Pyright uses incremental analysis and parallel processing
- **Stricter by default** in many areas (narrowing, generic inference)
- **Better IDE integration** out of the box via Pylance
- **More modern** feature support (faster to implement new typing PEPs)

```bash
uv add --dev pyright
pyright myapp/
```

### pyright configuration (pyrightconfig.json or pyproject.toml)

```json
// pyrightconfig.json
{
  "include": ["myapp"],
  "exclude": ["**/node_modules", "**/__pycache__", "tests/fixtures"],
  "typeCheckingMode": "strict",
  "pythonVersion": "3.12",
  "reportMissingImports": true,
  "reportMissingTypeStubs": false,
  "reportUnknownVariableType": true,
  "reportUnknownArgumentType": true
}
```

```toml
# pyproject.toml alternative
[tool.pyright]
include = ["myapp"]
pythonVersion = "3.12"
typeCheckingMode = "strict"
```

### mypy vs. Pyright Comparison

| Feature | mypy | Pyright |
|---|---|---|
| **Speed** | Moderate (cached) | Fast (incremental) |
| **Strictness** | Configurable | Stricter defaults |
| **IDE integration** | Via plugin | Native (Pylance/VS Code) |
| **PEP support** | Slightly behind | Faster adoption |
| **Community size** | Very large | Large and growing |
| **CI usage** | Very common | Growing rapidly |
| **Plugin system** | Yes (mypy plugins) | Limited |
| **Error messages** | Clear | Very clear |

**Which to choose:** If you use VS Code with Pylance, Pyright is already running—lean into it. For CI, either works. Many teams run both to catch different issues. If you must pick one: Pyright for speed and IDE alignment, mypy for broader plugin ecosystem.

---

## Ruff: The Unified Linter

Ruff is a Rust-based linter that replaces `flake8`, `isort`, `pyupgrade`, `pydocstyle`, `bandit` (partially), and `black` in one tool. It is **10-100x faster** than the Python-based tools it replaces and understands the same rule sets.

```bash
uv add --dev ruff

# Check
ruff check myapp/

# Check and auto-fix
ruff check --fix myapp/

# Format (replaces black)
ruff format myapp/

# Format check only (for CI)
ruff format --check myapp/
```

### Ruff configuration in pyproject.toml

```toml
[tool.ruff]
target-version = "py312"
line-length = 88

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "B",    # flake8-bugbear
    "C4",   # flake8-comprehensions
    "UP",   # pyupgrade
    "N",    # pep8-naming
    "SIM",  # flake8-simplify
    "TID",  # flake8-tidy-imports
    "ANN",  # flake8-annotations
    "PT",   # flake8-pytest-style
    "RUF",  # Ruff-specific rules
]
ignore = [
    "ANN101",  # Missing type annotation for self
    "ANN102",  # Missing type annotation for cls
    "E501",    # Line too long (handled by formatter)
]
fixable = ["ALL"]

[tool.ruff.lint.isort]
known-first-party = ["myapp"]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["ANN", "S101"]  # No type annotations required in tests
"scripts/**/*.py" = ["T201"]        # Allow print() in scripts

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

---

## Advanced Type Patterns

### Protocol: Structural Subtyping

Instead of requiring inheritance, `Protocol` lets you define interfaces by structure (duck typing with types).

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Drawable(Protocol):
    def draw(self) -> None: ...
    def get_bounds(self) -> tuple[int, int, int, int]: ...

class Circle:
    def draw(self) -> None:
        print("Drawing circle")

    def get_bounds(self) -> tuple[int, int, int, int]:
        return (0, 0, 100, 100)

def render(shape: Drawable) -> None:
    bounds = shape.get_bounds()
    shape.draw()

# Works without Circle inheriting from Drawable
render(Circle())
isinstance(Circle(), Drawable)  # True (runtime_checkable)
```

### TypeVar: Generic Functions

```python
from typing import TypeVar, Sequence

T = TypeVar("T")

def first(items: Sequence[T]) -> T | None:
    return items[0] if items else None

# Type checker knows the return type matches the input type
x: int | None = first([1, 2, 3])       # x is int | None
s: str | None = first(["a", "b", "c"]) # s is str | None
```

### ParamSpec: Generic Decorators

```python
from typing import Callable, ParamSpec, TypeVar
import functools
import time

P = ParamSpec("P")
R = TypeVar("R")

def timer(func: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.3f}s")
        return result
    return wrapper

@timer
def fetch_data(url: str, timeout: int = 30) -> dict:
    ...

# Type checker correctly understands fetch_data's signature
```

### TypedDict: Typed Dictionaries

```python
from typing import TypedDict, NotRequired

class UserConfig(TypedDict):
    name: str
    email: str
    age: int
    bio: NotRequired[str]  # Optional key

def create_user(config: UserConfig) -> None:
    print(f"Creating {config['name']}")

# Type checker catches missing required keys
create_user({"name": "Alice", "email": "alice@example.com", "age": 30})
```

### Literal: Constrained Values

```python
from typing import Literal

HttpMethod = Literal["GET", "POST", "PUT", "DELETE", "PATCH"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

def make_request(url: str, method: HttpMethod = "GET") -> None:
    ...

make_request("/api/users", "POST")    # OK
make_request("/api/users", "FLYING")  # Type error!
```

---

## Pre-commit Hooks

Automate type checking and linting before every commit:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks:
      - id: mypy
        additional_dependencies:
          - types-requests
          - types-boto3
        args: [--strict]
```

```bash
# Install pre-commit
uv add --dev pre-commit
pre-commit install

# Run manually
pre-commit run --all-files
```

---

## Recommended Full Stack for 2026

```toml
# pyproject.toml — complete type + lint config

[tool.ruff]
target-version = "py312"
line-length = 88

[tool.ruff.lint]
select = ["E", "W", "F", "I", "B", "C4", "UP", "N", "SIM", "ANN", "RUF"]
ignore = ["ANN101", "ANN102", "E501"]

[tool.mypy]
python_version = "3.12"
strict = true
warn_unused_ignores = true

[tool.pyright]
typeCheckingMode = "basic"    # mypy handles strict; Pyright for IDE
pythonVersion = "3.12"
```

Run this in CI:

```bash
ruff check --output-format=github myapp/
ruff format --check myapp/
mypy --strict myapp/
```

---

## Summary

The modern Python static analysis stack:

- **Ruff** replaces flake8 + isort + black + dozens of plugins — install it first
- **mypy** with `--strict` for thorough type checking in CI
- **Pyright** for fast IDE feedback in VS Code
- **Protocol** for structural typing instead of ABC-based inheritance
- **TypedDict + Literal** for precisely typed data structures
- **pre-commit** to enforce everything locally before code reaches CI

Start with Ruff alone — it provides immediate value. Add mypy strict mode as you annotate more of the codebase. The combination eliminates a large class of bugs before any tests run.
