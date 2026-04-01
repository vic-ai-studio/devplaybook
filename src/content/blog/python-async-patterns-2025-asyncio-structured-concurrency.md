---
title: "Python Async Patterns 2025: asyncio, Trio & Structured Concurrency"
description: "Master Python async programming in 2025. asyncio patterns, TaskGroup structured concurrency, async context managers, Trio comparison, and real-world async database and HTTP patterns."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["python", "asyncio", "async", "concurrency", "fastapi", "backend", "performance"]
readingTime: "14 min read"
---

Python's async ecosystem matured significantly in 3.11-3.13. `asyncio.TaskGroup` landed in 3.11, `asyncio.timeout()` in 3.11, and the exception group handling (`ExceptionGroup`, `except*`) in 3.11 changed how we think about concurrent error handling. This guide covers modern async patterns you should be using in 2025.

---

## The Core Mental Model

Async Python uses cooperative multitasking: tasks run on a single thread, voluntarily yielding control at `await` points. This means:

- **No parallelism for CPU work** — async doesn't help if you're computing; use `multiprocessing` or `concurrent.futures` for CPU-bound tasks
- **Massive parallelism for I/O** — thousands of concurrent network requests, file reads, or database queries on a single thread
- **No thread safety issues** — only one coroutine runs at a time (within a single event loop)

```python
import asyncio
import time

# WRONG: this is still sequential
async def bad_example():
    start = time.time()
    await asyncio.sleep(1)  # Wait 1 second
    await asyncio.sleep(1)  # Wait another second
    print(f"Took {time.time() - start:.1f}s")  # 2.0s

# RIGHT: concurrent — both sleeps happen simultaneously
async def good_example():
    start = time.time()
    async with asyncio.TaskGroup() as tg:
        tg.create_task(asyncio.sleep(1))
        tg.create_task(asyncio.sleep(1))
    print(f"Took {time.time() - start:.1f}s")  # 1.0s
```

---

## Pattern 1: TaskGroup (Python 3.11+)

`asyncio.TaskGroup` is the modern replacement for `asyncio.gather()`. It provides structured concurrency: tasks are guaranteed to be done (or cancelled) when the `async with` block exits.

```python
async def fetch_user(user_id: int) -> User:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"/api/users/{user_id}")
        return User.model_validate(response.json())

async def load_dashboard(user_id: int):
    async with asyncio.TaskGroup() as tg:
        user_task = tg.create_task(fetch_user(user_id))
        orders_task = tg.create_task(fetch_orders(user_id))
        notifications_task = tg.create_task(fetch_notifications(user_id))

    # All tasks complete by here (or an exception was raised)
    return Dashboard(
        user=user_task.result(),
        orders=orders_task.result(),
        notifications=notifications_task.result(),
    )
```

**Why TaskGroup over gather():**
- If one task raises, all other tasks are cancelled automatically
- No "fire and forget" accidental untracked tasks
- Exception propagation is cleaner
- Better stack traces

### Handling Partial Failures

```python
async def load_dashboard_graceful(user_id: int):
    results = {}

    try:
        async with asyncio.TaskGroup() as tg:
            user_task = tg.create_task(fetch_user(user_id))
            optional_task = tg.create_task(fetch_recommendations(user_id))
    except* HTTPError as eg:
        # Exception groups: handle errors from multiple tasks
        for exc in eg.exceptions:
            print(f"HTTP error: {exc}")

    # user_task may have succeeded even if optional_task failed
    if not user_task.exception():
        results["user"] = user_task.result()

    return results
```

The `except*` syntax (Python 3.11+) handles `ExceptionGroup` — when multiple tasks fail simultaneously.

---

## Pattern 2: asyncio.timeout (Python 3.11+)

```python
import asyncio

async def fetch_with_timeout(url: str) -> dict:
    try:
        async with asyncio.timeout(5.0):  # 5 second timeout
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                return response.json()
    except TimeoutError:
        return {"error": "Request timed out"}
```

**v3.11+ replacement for asyncio.wait_for:**
```python
# Old pattern
result = await asyncio.wait_for(coro(), timeout=5.0)

# New pattern — more composable, works with context managers
async with asyncio.timeout(5.0):
    result = await coro()
```

---

## Pattern 3: Async Context Managers

Any resource that needs setup and teardown should be an async context manager:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def database_transaction(pool):
    async with pool.acquire() as conn:
        async with conn.transaction():
            try:
                yield conn
                # Transaction commits if no exception
            except Exception:
                # Transaction rolls back automatically
                raise

# Usage
async with database_transaction(pool) as conn:
    await conn.execute("INSERT INTO orders ...")
    await conn.execute("UPDATE inventory ...")
    # Both queries commit together, or both roll back
```

### Lifespan Management (FastAPI)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: runs before first request
    app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)
    app.state.redis = await aioredis.from_url(REDIS_URL)
    app.state.http_client = httpx.AsyncClient()

    yield  # Application runs here

    # Shutdown: runs after last request
    await app.state.db_pool.close()
    await app.state.redis.close()
    await app.state.http_client.aclose()

app = FastAPI(lifespan=lifespan)
```

---

## Pattern 4: Async Generators and Streaming

```python
from typing import AsyncGenerator

async def stream_events(user_id: int) -> AsyncGenerator[dict, None]:
    """Yields events as they arrive — used for SSE or WebSocket streams."""
    async with get_db() as db:
        async for event in db.subscribe(f"user:{user_id}"):
            yield {
                "type": event.type,
                "data": event.data,
                "timestamp": event.created_at.isoformat(),
            }

# FastAPI SSE endpoint
from fastapi.responses import StreamingResponse

@app.get("/events/{user_id}")
async def event_stream(user_id: int):
    async def generate():
        async for event in stream_events(user_id):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

### Process Large Files Without Memory Issues

```python
async def process_large_csv(file_path: Path) -> AsyncGenerator[dict, None]:
    async with aiofiles.open(file_path) as f:
        header = None
        async for line in f:
            if header is None:
                header = line.strip().split(",")
                continue
            values = line.strip().split(",")
            yield dict(zip(header, values))

# Usage: processes one line at a time
async for row in process_large_csv(Path("big-file.csv")):
    await process_row(row)
```

---

## Pattern 5: Semaphores for Rate Limiting

```python
async def fetch_all_users(user_ids: list[int]) -> list[User]:
    # Limit to 10 concurrent requests (avoid overwhelming the server)
    semaphore = asyncio.Semaphore(10)

    async def fetch_one(user_id: int) -> User:
        async with semaphore:
            return await fetch_user(user_id)

    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch_one(uid)) for uid in user_ids]

    return [t.result() for t in tasks]
```

Without the semaphore, `len(user_ids)` requests fire simultaneously. With it, at most 10 are in-flight at any time.

---

## Pattern 6: Async Database Patterns

### asyncpg (PostgreSQL)

```python
import asyncpg

async def get_users_by_ids(
    pool: asyncpg.Pool,
    user_ids: list[int]
) -> list[dict]:
    # asyncpg uses prepared statements automatically
    query = "SELECT id, name, email FROM users WHERE id = ANY($1)"

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, user_ids)
        return [dict(row) for row in rows]

# Batch insert
async def bulk_insert_users(pool: asyncpg.Pool, users: list[dict]):
    async with pool.acquire() as conn:
        await conn.executemany(
            "INSERT INTO users(name, email) VALUES($1, $2)",
            [(u["name"], u["email"]) for u in users]
        )
```

### SQLAlchemy Async

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import selectinload
from sqlalchemy import select

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")

async def get_user_with_orders(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.orders))  # Eager load relationships
    )
    return result.scalar_one_or_none()

# Transaction
async def transfer_funds(db: AsyncSession, from_id: int, to_id: int, amount: float):
    async with db.begin():  # Auto-commits or rolls back
        from_user = await db.get(User, from_id)
        to_user = await db.get(User, to_id)

        if from_user.balance < amount:
            raise ValueError("Insufficient funds")

        from_user.balance -= amount
        to_user.balance += amount
```

---

## Pattern 7: Background Tasks

For work that should happen after an HTTP response:

```python
from fastapi import BackgroundTasks

async def send_welcome_email(user_email: str, user_name: str):
    await email_client.send(
        to=user_email,
        subject="Welcome!",
        body=f"Hello {user_name}..."
    )

@app.post("/users", status_code=201)
async def create_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.create(db, user_data)

    # Schedule email — response returns immediately, email sends after
    background_tasks.add_task(send_welcome_email, user.email, user.name)

    return user
```

For longer-running work, use a task queue (Celery, arq, dramatiq) instead of `BackgroundTasks`.

---

## Trio vs asyncio

Trio is an alternative async library with better defaults for structured concurrency. It pioneered the patterns that `asyncio.TaskGroup` later adopted.

| Feature | asyncio | Trio |
|---------|---------|------|
| TaskGroup equivalent | `asyncio.TaskGroup` (3.11+) | `trio.open_nursery()` |
| Timeouts | `asyncio.timeout()` (3.11+) | `trio.move_on_after()` |
| Cancellation | Complex | First-class, predictable |
| Exception handling | ExceptionGroup (3.11+) | `MultiError` |
| Ecosystem | Massive | Smaller |
| Learning curve | Steeper | Gentler |

**When to use Trio:** New projects where you control all async code, you value strict structured concurrency, and ecosystem compatibility isn't a constraint.

**When to use asyncio:** FastAPI projects, existing codebases, maximum library compatibility (aiohttp, asyncpg, aioredis all target asyncio).

---

## Common Async Bugs

**1. Blocking the event loop:**
```python
# BAD: blocks all other coroutines while sleeping
import time
async def bad():
    time.sleep(1)  # Blocks the entire event loop

# GOOD: yields control during sleep
async def good():
    await asyncio.sleep(1)

# BAD: CPU-intensive work in async function
async def process_image(path: str):
    result = heavy_image_processing(path)  # Blocks for 2 seconds

# GOOD: run in thread pool
async def process_image(path: str):
    result = await asyncio.to_thread(heavy_image_processing, path)
```

**2. Missing await:**
```python
# BUG: create_connection returns a coroutine, not a connection
conn = create_connection()  # Missing await
await conn.execute(...)     # AttributeError: NoneType has no execute

# FIX
conn = await create_connection()
```

**3. Untracked task:**
```python
# BUG: fire-and-forget task may be garbage collected mid-execution
asyncio.create_task(background_work())

# GOOD: keep a reference
_background_tasks = set()

task = asyncio.create_task(background_work())
_background_tasks.add(task)
task.add_done_callback(_background_tasks.discard)
```

---

## Quick Reference

```python
# Run async from sync
asyncio.run(main())

# Concurrent tasks (structured)
async with asyncio.TaskGroup() as tg:
    t1 = tg.create_task(coro1())
    t2 = tg.create_task(coro2())

# Timeout
async with asyncio.timeout(5.0):
    result = await long_operation()

# Semaphore (rate limiting)
sem = asyncio.Semaphore(10)
async with sem:
    await limited_operation()

# Run blocking code in thread
result = await asyncio.to_thread(blocking_function, arg)

# Gather (older pattern, still works)
results = await asyncio.gather(coro1(), coro2(), return_exceptions=True)
```

---

## Related Tools on DevPlaybook

- [Python formatter](/tools/python-formatter) — format async Python code
- [FastAPI guide](/blog/fastapi-vs-django-rest-framework-2025-which-to-choose)
- [Pydantic v2 guide](/blog/pydantic-v2-complete-guide-validation-settings-data-modeling)
- [uv package manager](/blog/uv-python-package-manager-replace-pip-poetry)
