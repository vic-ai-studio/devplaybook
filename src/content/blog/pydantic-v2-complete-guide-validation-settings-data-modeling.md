---
title: "Pydantic v2 Complete Guide: Validation, Settings & Data Modeling"
description: "Master Pydantic v2 in 2025. BaseModel validation, field validators, model settings, custom types, serialization, and performance improvements over v1 with code examples."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["pydantic", "python", "validation", "fastapi", "data-modeling", "backend"]
readingTime: "13 min read"
---

Pydantic v2 rewrote the core in Rust and introduced a fundamentally different API. If you're upgrading from v1 or learning Pydantic for the first time in 2025, this guide covers the patterns you'll use daily.

---

## Why Pydantic v2?

Pydantic v2 is 5-50x faster than v1 for validation-heavy workloads. It also ships with stricter defaults, better error messages, and a cleaned-up API that removes v1's inconsistencies.

```bash
pip install pydantic  # Installs v2 by default
# or
uv add pydantic
```

---

## Part 1: BaseModel Fundamentals

### Defining Models

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class User(BaseModel):
    id: int
    name: str
    email: str
    bio: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
```

`Field()` is used for metadata, defaults, validation constraints, and serialization control.

### Creating and Accessing Models

```python
user = User(id=1, name="Alice", email="alice@example.com")

# Attribute access
print(user.name)      # "Alice"
print(user.id)        # 1

# Dictionary conversion
user.model_dump()     # {"id": 1, "name": "Alice", "email": "alice@example.com", ...}

# JSON serialization
user.model_dump_json()  # '{"id":1,"name":"Alice",...}'

# Model copy with updates
updated = user.model_copy(update={"name": "Bob"})
```

**v1 → v2 method rename:**
| v1 | v2 |
|----|-----|
| `.dict()` | `.model_dump()` |
| `.json()` | `.model_dump_json()` |
| `.copy()` | `.model_copy()` |
| `.schema()` | `.model_json_schema()` |
| `parse_obj()` | `model_validate()` |
| `parse_raw()` | `model_validate_json()` |

---

## Part 2: Field Validation

### Built-in Constraints

```python
from pydantic import BaseModel, Field

class Product(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: float = Field(gt=0, le=10_000)  # 0 < price <= 10000
    quantity: int = Field(ge=0)             # quantity >= 0
    description: str = Field(default="", max_length=500)
    tags: list[str] = Field(default_factory=list, max_length=10)
```

Available constraints:
- `min_length` / `max_length` — string and list length
- `gt` / `ge` / `lt` / `le` — numeric comparison (greater than, etc.)
- `pattern` — regex pattern for strings
- `strict=True` — disables type coercion

### Field Validators (`@field_validator`)

```python
from pydantic import BaseModel, field_validator

class User(BaseModel):
    email: str
    password: str
    age: int

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain an uppercase letter")
        return v

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int) -> int:
        if not (0 <= v <= 150):
            raise ValueError("Age must be between 0 and 150")
        return v
```

**Key v2 change:** `@validator` (v1) → `@field_validator` (v2). Must be `@classmethod`. Return the (possibly modified) value.

### Model Validators (`@model_validator`)

For cross-field validation:

```python
from pydantic import BaseModel, model_validator
from typing import Self

class DateRange(BaseModel):
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_date_range(self) -> Self:
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self

class PasswordConfirmation(BaseModel):
    password: str
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self) -> Self:
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self
```

`mode="before"` runs before field validation (receives raw dict); `mode="after"` runs after all fields are validated.

---

## Part 3: Strict Mode and Type Coercion

Pydantic v2 coerces types by default: `"5"` becomes `5` for an `int` field. Use `strict=True` to disable:

```python
from pydantic import BaseModel

class StrictUser(BaseModel):
    model_config = {"strict": True}

    id: int
    name: str

# Coercion mode (default)
User(id="5", name="Alice")  # Works: "5" coerced to 5

# Strict mode
StrictUser(id="5", name="Alice")  # ValidationError: id must be int
StrictUser(id=5, name="Alice")   # Works
```

Strict mode is useful for API endpoints where you want to reject type mismatches rather than silently convert.

---

## Part 4: Pydantic Settings

`pydantic-settings` manages application configuration from environment variables, `.env` files, and secrets:

```bash
uv add pydantic-settings
```

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Required (no default) — must be in environment
    database_url: str
    secret_key: str

    # Optional with defaults
    debug: bool = False
    port: int = 8000
    workers: int = Field(default=4, ge=1, le=64)
    allowed_hosts: list[str] = ["localhost"]

# Usage
settings = Settings()

# .env file
# DATABASE_URL=postgresql://user:pass@localhost/db
# SECRET_KEY=my-secret-key
# DEBUG=true
# PORT=8080
```

**FastAPI integration:**

```python
from functools import lru_cache

@lru_cache
def get_settings() -> Settings:
    return Settings()

# In route handlers
@app.get("/config")
def read_config(settings: Settings = Depends(get_settings)):
    return {"debug": settings.debug, "port": settings.port}
```

`lru_cache` ensures Settings is instantiated once (reads `.env` once).

### Nested Settings

```python
class DatabaseSettings(BaseSettings):
    host: str = "localhost"
    port: int = 5432
    name: str = "mydb"

class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(env_nested_delimiter="__")

    db: DatabaseSettings = DatabaseSettings()
    debug: bool = False

# Environment variables with nested delimiter:
# DB__HOST=prod-server
# DB__PORT=5432
# DB__NAME=proddb
```

---

## Part 5: Discriminated Unions

Pydantic v2 handles discriminated unions efficiently — ideal for polymorphic API payloads:

```python
from typing import Annotated, Literal, Union
from pydantic import BaseModel, Field

class Circle(BaseModel):
    type: Literal["circle"]
    radius: float

class Square(BaseModel):
    type: Literal["square"]
    side: float

class Triangle(BaseModel):
    type: Literal["triangle"]
    base: float
    height: float

Shape = Annotated[
    Union[Circle, Square, Triangle],
    Field(discriminator="type")
]

class Drawing(BaseModel):
    shapes: list[Shape]

# Pydantic routes directly to the correct model based on "type" field
drawing = Drawing(shapes=[
    {"type": "circle", "radius": 5.0},
    {"type": "square", "side": 3.0},
])
```

Without `discriminator`, Pydantic tries all models in order. With it, it routes directly — much faster for large union types.

---

## Part 6: Custom Types

```python
from pydantic import GetCoreSchemaHandler
from pydantic_core import core_schema

class PositiveInt:
    def __init__(self, value: int):
        if value <= 0:
            raise ValueError(f"{value} is not positive")
        self.value = value

    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        source_type: type,
        handler: GetCoreSchemaHandler,
    ) -> core_schema.CoreSchema:
        return core_schema.no_info_plain_validator_function(
            lambda v: cls(int(v)),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: x.value
            ),
        )

class Order(BaseModel):
    quantity: PositiveInt

order = Order(quantity=5)
print(order.quantity.value)  # 5
order.model_dump()  # {"quantity": 5}
```

---

## Part 7: Serialization Control

### Exclude/Include Fields

```python
class User(BaseModel):
    id: int
    name: str
    password: str
    internal_notes: str

user = User(id=1, name="Alice", password="secret", internal_notes="VIP")

# Exclude sensitive fields
user.model_dump(exclude={"password", "internal_notes"})
# {"id": 1, "name": "Alice"}

# Include only specific fields
user.model_dump(include={"id", "name"})
# {"id": 1, "name": "Alice"}
```

### Field-Level Serialization

```python
from pydantic import BaseModel, Field

class User(BaseModel):
    id: int
    internal_id: str = Field(exclude=True)  # Never serialized
    created_at: datetime = Field(serialization_alias="createdAt")

user.model_dump(by_alias=True)
# {"id": 1, "createdAt": "2025-01-01T..."}
```

---

## Part 8: Performance Tips

**1. Use `model_validate` instead of constructor for bulk operations:**
```python
# Slower: Python constructor overhead
users = [User(id=i, name=f"User {i}") for i in range(1000)]

# Faster: Pydantic's optimized path
users = [User.model_validate({"id": i, "name": f"User {i}"}) for i in range(1000)]
```

**2. Compile validators once with `TypeAdapter`:**
```python
from pydantic import TypeAdapter

# For validating lists or simple types without a full model
IntAdapter = TypeAdapter(int)
ListAdapter = TypeAdapter(list[User])

users = ListAdapter.validate_python(raw_data)  # Validates entire list at once
```

**3. Cache model JSON schema:**
```python
schema = User.model_json_schema()  # Compute once and cache
```

---

## Common v1 → v2 Migration Issues

| v1 Pattern | v2 Fix |
|------------|--------|
| `@validator("field")` | `@field_validator("field")` + `@classmethod` |
| `@root_validator` | `@model_validator(mode="before"/"after")` |
| `class Config:` | `model_config = ConfigDict(...)` |
| `orm_mode = True` | `from_attributes = True` |
| `.dict()` | `.model_dump()` |
| `__fields__` | `model_fields` |
| `Schema()` → `Field()` | `Field()` (unchanged) |

---

## Related Tools on DevPlaybook

- [Python formatter](/tools/python-formatter) — format Python code online
- [JSON to Pydantic converter](/tools/json-to-python-class) — generate Pydantic models from JSON
- [FastAPI guide](/blog/fastapi-vs-django-rest-framework-2025-which-to-choose)
- [uv package manager](/blog/uv-python-package-manager-replace-pip-poetry) — install Pydantic fast
