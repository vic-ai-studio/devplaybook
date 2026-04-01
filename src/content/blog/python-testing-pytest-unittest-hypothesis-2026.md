---
title: "Python Testing 2026: pytest, unittest, Hypothesis & Coverage"
description: "Python testing guide 2026: pytest features (fixtures/parametrize/marks), unittest comparison, Hypothesis property-based testing, coverage.py, pytest-cov, and CI integration."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Python", "pytest", "unittest", "testing", "Hypothesis", "coverage", "TDD"]
readingTime: "11 min read"
category: "python"
---

Writing tests is the difference between software you can change confidently and software you're afraid to touch. In Python 2026, the testing ecosystem is rich, fast, and—once you understand the key tools—genuinely enjoyable to use. This guide covers everything from the pytest vs. unittest decision to advanced patterns like property-based testing and mutation testing.

---

## pytest vs. unittest: The Core Comparison

`unittest` ships with the Python standard library. `pytest` is a third-party framework that has become the de facto standard. Understanding the difference will save you from unnecessary boilerplate.

### unittest style

```python
import unittest

class TestMath(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(1 + 1, 2)

    def test_zero_division(self):
        with self.assertRaises(ZeroDivisionError):
            1 / 0

    def setUp(self):
        self.data = [1, 2, 3]

    def test_sum(self):
        self.assertEqual(sum(self.data), 6)

if __name__ == "__main__":
    unittest.main()
```

### pytest style (same tests)

```python
def test_addition():
    assert 1 + 1 == 2

def test_zero_division():
    import pytest
    with pytest.raises(ZeroDivisionError):
        1 / 0

def test_sum():
    data = [1, 2, 3]
    assert sum(data) == 6
```

pytest uses plain `assert` statements (no `assertEqual`, `assertTrue`, etc.) and rewrites them at collection time to produce detailed failure messages. The output shows exactly what the left side and right side evaluated to.

| Feature | unittest | pytest |
|---|---|---|
| **Standard library** | Yes | No (install needed) |
| **Assertion style** | `self.assertEqual(a, b)` | `assert a == b` |
| **Test discovery** | Class-based `TestCase` | Functions and classes |
| **Fixtures** | `setUp`/`tearDown` | `@pytest.fixture` |
| **Parametrize** | Manual or `subTest` | `@pytest.mark.parametrize` |
| **Plugin ecosystem** | Minimal | 1,000+ plugins |
| **Output clarity** | Basic | Detailed diffs |
| **Running subset** | Limited | `-k`, `-m`, `::test_name` |

**The verdict:** Use pytest for everything new. pytest can also run `unittest.TestCase` subclasses without modification, so migration is painless.

---

## pytest Fixtures: Dependency Injection for Tests

Fixtures are pytest's most powerful feature. They handle setup and teardown, are reusable, composable, and scoped.

```python
# conftest.py — shared fixtures across the test suite
import pytest
import sqlite3

@pytest.fixture(scope="session")
def db_connection():
    """One connection for the entire test session."""
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
    yield conn
    conn.close()

@pytest.fixture(scope="module")
def populated_db(db_connection):
    """Populated DB, reset once per module."""
    db_connection.execute("INSERT INTO users VALUES (1, 'Alice')")
    db_connection.execute("INSERT INTO users VALUES (2, 'Bob')")
    db_connection.commit()
    yield db_connection
    db_connection.execute("DELETE FROM users")
    db_connection.commit()

@pytest.fixture
def http_client():
    """A fresh client for each test function."""
    import httpx
    with httpx.Client(base_url="http://testserver") as client:
        yield client
```

### Fixture scopes

| Scope | Created | Destroyed |
|---|---|---|
| `function` (default) | Before each test | After each test |
| `class` | Before each test class | After each test class |
| `module` | Before each test file | After each test file |
| `package` | Before each package | After each package |
| `session` | Once per test run | After all tests |

Fixtures can request other fixtures by name, creating a dependency graph that pytest resolves automatically.

```python
# test_users.py
def test_get_user(populated_db):
    cursor = populated_db.execute("SELECT name FROM users WHERE id = 1")
    assert cursor.fetchone()[0] == "Alice"
```

---

## Parametrize: Data-Driven Tests

`@pytest.mark.parametrize` eliminates copy-paste test duplication.

```python
import pytest

def is_palindrome(s: str) -> bool:
    cleaned = s.lower().replace(" ", "")
    return cleaned == cleaned[::-1]

@pytest.mark.parametrize("input_str,expected", [
    ("racecar", True),
    ("hello", False),
    ("A man a plan a canal Panama", True),
    ("", True),
    ("a", True),
])
def test_is_palindrome(input_str, expected):
    assert is_palindrome(input_str) == expected
```

Output shows each case individually:
```
test_palindrome.py::test_is_palindrome[racecar-True] PASSED
test_palindrome.py::test_is_palindrome[hello-False] PASSED
test_palindrome.py::test_is_palindrome[A man a plan a canal Panama-True] PASSED
```

You can also parametrize with IDs for clearer output:

```python
@pytest.mark.parametrize("email,valid", [
    pytest.param("user@example.com", True, id="valid_email"),
    pytest.param("not-an-email", False, id="no_at_sign"),
    pytest.param("@nodomain.com", False, id="no_local_part"),
])
def test_email_validation(email, valid):
    from myapp.validators import validate_email
    assert validate_email(email) == valid
```

---

## Marks: Organizing and Controlling Tests

```python
import pytest

@pytest.mark.slow
def test_database_migration():
    # Takes 30+ seconds
    ...

@pytest.mark.skip(reason="Feature not yet implemented")
def test_future_feature():
    ...

@pytest.mark.xfail(reason="Known bug, tracked in #123")
def test_known_broken():
    assert False  # This will be reported as xfailed, not failed

@pytest.mark.skipif(
    condition=sys.platform == "win32",
    reason="POSIX-only test"
)
def test_unix_signals():
    ...
```

Register custom marks in `pyproject.toml` to avoid warnings:

```toml
[tool.pytest.ini_options]
markers = [
    "slow: marks tests as slow (use -m 'not slow' to skip)",
    "integration: marks integration tests requiring external services",
    "unit: marks fast unit tests",
]
```

Run selectively:
```bash
pytest -m "not slow"          # Skip slow tests
pytest -m "unit and not slow" # Only fast unit tests
pytest -k "test_user"         # Run tests matching keyword
```

---

## conftest.py: Shared Configuration

`conftest.py` files are automatically discovered by pytest. They can live at any directory level.

```python
# conftest.py (project root)
import pytest
from myapp import create_app, db as _db

@pytest.fixture(scope="session")
def app():
    app = create_app(testing=True)
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture(autouse=True)
def reset_db(app):
    """Automatically roll back each test's DB changes."""
    with app.app_context():
        yield
        _db.session.rollback()
```

---

## Hypothesis: Property-Based Testing

Hypothesis generates test cases automatically by searching for inputs that break your code. Instead of writing specific examples, you describe properties that should always hold.

```bash
uv add --dev hypothesis
```

```python
from hypothesis import given, strategies as st, settings, assume
from hypothesis import HealthCheck

def sort_and_deduplicate(items: list[int]) -> list[int]:
    return sorted(set(items))

@given(st.lists(st.integers()))
def test_output_is_sorted(items):
    result = sort_and_deduplicate(items)
    assert result == sorted(result)

@given(st.lists(st.integers()))
def test_no_duplicates(items):
    result = sort_and_deduplicate(items)
    assert len(result) == len(set(result))

@given(st.lists(st.integers()))
def test_subset_of_input(items):
    result = sort_and_deduplicate(items)
    assert all(x in items for x in result)
```

Hypothesis will try hundreds of examples including edge cases: empty lists, negative numbers, duplicates, `sys.maxsize`, and more. When it finds a failure, it shrinks the example to the smallest failing case.

### Hypothesis strategies

```python
from hypothesis import given, strategies as st

# Built-in strategies
@given(st.text())                    # Any unicode string
@given(st.emails())                  # Valid email addresses
@given(st.floats(allow_nan=False))   # Floats excluding NaN
@given(st.datetimes())               # datetime objects
@given(st.dictionaries(st.text(), st.integers()))  # Dicts

# Composing strategies
@given(st.lists(st.integers(min_value=0, max_value=100), min_size=1))
def test_average_in_range(numbers):
    avg = sum(numbers) / len(numbers)
    assert 0 <= avg <= 100

# Custom composite strategies
@st.composite
def user_data(draw):
    name = draw(st.text(min_size=1, max_size=50))
    age = draw(st.integers(min_value=0, max_value=150))
    return {"name": name, "age": age}

@given(user_data())
def test_user_creation(data):
    from myapp.models import User
    user = User(**data)
    assert user.name == data["name"]
```

---

## Coverage: Measuring What Gets Tested

```bash
uv add --dev pytest-cov coverage
```

```bash
# Run tests with coverage
pytest --cov=myapp --cov-report=term-missing --cov-report=html

# Output:
# Name                Stmts   Miss  Cover   Missing
# -------------------------------------------------
# myapp/__init__.py       5      0   100%
# myapp/models.py        42      3    93%   45, 67-68
# myapp/utils.py         28      8    71%   12-15, 30, 45
```

### .coveragerc or pyproject.toml config

```toml
[tool.coverage.run]
source = ["myapp"]
omit = [
    "*/migrations/*",
    "*/tests/*",
    "*/__pycache__/*",
]
branch = true  # Track branch coverage, not just line coverage

[tool.coverage.report]
fail_under = 85  # Fail CI if coverage drops below 85%
show_missing = true
skip_covered = false

[tool.coverage.html]
directory = "htmlcov"
```

**Branch coverage** is more informative than line coverage. A line `if x > 0: return x` has 100% line coverage if any test hits it, but only 100% branch coverage if tests exercise both the `True` and `False` paths.

---

## Mutation Testing with mutmut

Coverage tells you which lines ran. Mutation testing tells you whether your tests actually catch bugs.

```bash
uv add --dev mutmut

# Run mutation testing
mutmut run --paths-to-mutate=myapp/

# See results
mutmut results
mutmut show 5  # Show mutation #5
```

mutmut modifies your source code (changes `+` to `-`, `True` to `False`, etc.) and runs your test suite against each mutation. Mutations that don't cause test failures are "survived mutants"—meaning your tests missed those scenarios.

---

## GitHub Actions CI Configuration

```yaml
# .github/workflows/tests.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.12", "3.13"]

    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v3

      - name: Set up Python ${{ matrix.python-version }}
        run: uv python install ${{ matrix.python-version }}

      - name: Install dependencies
        run: uv sync --all-extras

      - name: Run tests with coverage
        run: |
          uv run pytest \
            --cov=myapp \
            --cov-report=term-missing \
            --cov-report=xml \
            --cov-fail-under=85 \
            -v

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml
```

---

## Recommended pytest.ini_options

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "--strict-markers",     # Error on unregistered marks
    "--strict-config",      # Error on config warnings
    "-ra",                  # Show short summary for all non-passing
    "--tb=short",           # Shorter tracebacks
]
markers = [
    "slow: marks slow tests",
    "integration: requires external services",
    "unit: fast unit tests",
]
filterwarnings = [
    "error",                        # Turn warnings into errors
    "ignore::DeprecationWarning",   # Except known ones
]
```

---

## Summary

The modern Python testing stack for 2026:

- **pytest** as the test runner — no reason to use `unittest` directly for new code
- **Fixtures** at appropriate scopes — session for expensive resources, function for isolation
- **Parametrize** to replace copy-paste tests
- **Hypothesis** for property-based testing on pure functions and data transformers
- **pytest-cov** with branch coverage, 85%+ threshold enforced in CI
- **mutmut** periodically to find test gaps that coverage misses
- **GitHub Actions** matrix testing across Python versions

Start with pytest and fixtures. Add Hypothesis when you have pure functions worth property-testing. The combination catches bugs that hand-written tests routinely miss.
