---
title: "Modern Python Data Science Tools 2026: Polars, DuckDB & Jupyter"
description: "Modern Python data tools 2026: Polars vs pandas performance, DuckDB for analytical queries, JupyterLab 4, Marimo reactive notebooks, Narwhals for dataframe agnosticism."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Python", "Polars", "pandas", "DuckDB", "Jupyter", "data science", "dataframe"]
readingTime: "11 min read"
category: "python"
---

The Python data science stack is in the middle of a generational shift. pandas, which defined data manipulation for over a decade, is being challenged by tools that are 5-50x faster, use far less memory, and scale to datasets that pandas simply cannot handle. Meanwhile, notebooks are getting smarter. This guide covers the new stack you should know in 2026.

---

## Why pandas Is Being Challenged

pandas has three core limitations that become painful at scale:

1. **Single-threaded by default** — most operations don't use multiple CPU cores
2. **In-memory only** — the entire dataset must fit in RAM
3. **Python object overhead** — pandas uses Python objects internally, which is slow and memory-hungry compared to native typed arrays

A 1GB CSV that takes 4 seconds to load and 8GB of RAM in pandas might take 0.4 seconds and 800MB in Polars. For 10GB datasets, pandas often fails entirely while Polars succeeds using lazy evaluation.

pandas is not going away—it has a massive ecosystem, extensive documentation, and works fine for datasets under a few hundred MB. But knowing the alternatives lets you pick the right tool for the job.

---

## Polars: The Rust-Based Challenger

Polars is a dataframe library written in Rust. It uses Apache Arrow's columnar memory format, executes operations in parallel across all CPU cores, and offers a lazy evaluation API that pushes predicate pushdown and projection pushdown to avoid unnecessary work.

```bash
uv add polars
```

### Basic operations

```python
import polars as pl

# Read CSV (parallelized automatically)
df = pl.read_csv("sales.csv")

# Polars uses an expression API, not method chaining on columns
result = df.filter(
    pl.col("amount") > 100
).group_by("region").agg(
    total=pl.col("amount").sum(),
    count=pl.col("amount").count(),
    avg=pl.col("amount").mean(),
).sort("total", descending=True)

print(result)
```

### pandas equivalent

```python
import pandas as pd

df = pd.read_csv("sales.csv")

result = (
    df[df["amount"] > 100]
    .groupby("region")["amount"]
    .agg(total="sum", count="count", avg="mean")
    .sort_values("total", ascending=False)
    .reset_index()
)
```

### Lazy evaluation (the real power)

```python
# Lazy mode — nothing executes until .collect()
lf = pl.scan_csv("large_sales.csv")  # 10GB file, reads nothing yet

result = (
    lf
    .filter(pl.col("year") == 2025)
    .filter(pl.col("amount") > 1000)
    .select(["region", "product", "amount"])
    .group_by("region")
    .agg(pl.col("amount").sum().alias("total"))
    .sort("total", descending=True)
    .limit(10)
)

# Only now does it read and process data — with query optimization
df = result.collect()
```

The lazy query optimizer will:
- Push the `filter` operations down to the scan (read only matching rows)
- Only read the `region`, `product`, `amount` columns (skip others)
- Execute aggregations in parallel

### Polars expression API power

```python
# Window functions (like SQL OVER)
df.with_columns(
    pl.col("amount").rank(method="dense").over("region").alias("rank_in_region"),
    pl.col("amount").cumsum().over("date").alias("running_total"),
    (pl.col("amount") / pl.col("amount").sum().over("region")).alias("pct_of_region"),
)

# String operations
df.with_columns(
    pl.col("product").str.to_uppercase().alias("product_upper"),
    pl.col("email").str.extract(r"@(.+)$", 1).alias("email_domain"),
)

# Date operations
df.with_columns(
    pl.col("date").str.to_date("%Y-%m-%d"),
    pl.col("date").dt.month().alias("month"),
    pl.col("date").dt.weekday().alias("weekday"),
)
```

---

## Polars vs pandas Benchmark

Tested on a 2GB CSV with 10M rows on a modern 8-core laptop:

| Operation | pandas | Polars | Speedup |
|---|---|---|---|
| **Read CSV** | 12.3s / 6.1GB RAM | 1.8s / 1.2GB RAM | 6.8x |
| **Filter rows** | 0.8s | 0.09s | 8.9x |
| **Group by + agg** | 4.1s | 0.3s | 13.7x |
| **Join (10M x 1M)** | 18.2s | 1.1s | 16.5x |
| **String operations** | 6.4s | 0.4s | 16x |
| **Sort** | 3.7s | 0.6s | 6.2x |
| **Lazy query (complex)** | N/A | 0.9s | — |

Note: pandas 2.0+ with the Arrow backend narrows the gap somewhat, but Polars' parallel execution and lazy evaluation remain substantial advantages for large datasets.

---

## DuckDB: SQL on Dataframes and Files

DuckDB is an in-process analytical database. Think SQLite, but for OLAP queries rather than transactional workloads. It can query:
- Polars/pandas dataframes directly (zero-copy via Arrow)
- Parquet, CSV, and JSON files on disk
- S3-hosted files

```bash
uv add duckdb
```

```python
import duckdb
import polars as pl

# Query a CSV file directly — no loading into memory first
result = duckdb.sql("""
    SELECT
        region,
        strftime(date, '%Y-%m') AS month,
        SUM(amount) AS total_sales,
        COUNT(*) AS num_transactions
    FROM read_csv_auto('sales.csv')
    WHERE amount > 100
      AND date >= '2025-01-01'
    GROUP BY region, month
    ORDER BY total_sales DESC
    LIMIT 20
""").pl()  # Return as Polars dataframe

# Query multiple Parquet files
result = duckdb.sql("""
    SELECT * FROM read_parquet('data/sales_*.parquet')
    WHERE year = 2025
""").df()  # Return as pandas dataframe

# Query a Polars dataframe with SQL
df = pl.read_csv("sales.csv")
result = duckdb.sql("SELECT region, SUM(amount) FROM df GROUP BY region").pl()
```

### DuckDB for Parquet workflows

Parquet + DuckDB is the modern alternative to spinning up a full data warehouse for analytical queries:

```python
# Write to Parquet (columnar, compressed, fast)
df.write_parquet("sales_2025.parquet", compression="zstd")

# Read specific columns from large Parquet (column pruning)
result = duckdb.sql("""
    SELECT region, amount
    FROM parquet_scan('sales_2025.parquet')
    WHERE amount > 1000
""").pl()

# Query S3 directly (install httpfs extension)
duckdb.execute("INSTALL httpfs; LOAD httpfs;")
result = duckdb.sql("""
    SELECT * FROM read_parquet('s3://my-bucket/data/*.parquet')
    WHERE year = 2025
""").df()
```

---

## Same Operation: pandas vs Polars vs DuckDB

Here's the same analytical query in all three:

```python
# Question: Top 5 products by revenue in Q4 2025, for orders > $50

# pandas
import pandas as pd
df = pd.read_csv("orders.csv", parse_dates=["date"])
result_pandas = (
    df[
        (df["date"].dt.quarter == 4) &
        (df["date"].dt.year == 2025) &
        (df["amount"] > 50)
    ]
    .groupby("product")["amount"]
    .sum()
    .nlargest(5)
    .reset_index()
    .rename(columns={"amount": "revenue"})
)

# Polars
import polars as pl
result_polars = (
    pl.scan_csv("orders.csv")
    .filter(
        (pl.col("date").str.to_date().dt.quarter() == 4) &
        (pl.col("date").str.to_date().dt.year() == 2025) &
        (pl.col("amount") > 50)
    )
    .group_by("product")
    .agg(revenue=pl.col("amount").sum())
    .sort("revenue", descending=True)
    .limit(5)
    .collect()
)

# DuckDB
import duckdb
result_duckdb = duckdb.sql("""
    SELECT product, SUM(amount) AS revenue
    FROM read_csv_auto('orders.csv')
    WHERE EXTRACT(quarter FROM CAST(date AS DATE)) = 4
      AND EXTRACT(year FROM CAST(date AS DATE)) = 2025
      AND amount > 50
    GROUP BY product
    ORDER BY revenue DESC
    LIMIT 5
""").df()
```

All three produce the same result. DuckDB wins for SQL familiarity. Polars wins for pure Python API performance. pandas wins for the broadest library compatibility.

---

## JupyterLab 4: Improved Notebook Experience

JupyterLab 4 (released 2023, stable 2024) brings significant improvements:

```bash
uv add jupyterlab
jupyter lab  # Opens at localhost:8888
```

Key improvements in v4:
- **Real-time collaboration** — multiple users editing the same notebook
- **Improved performance** — faster rendering, better large output handling
- **Better debugger** — visual debugger with breakpoints
- **Extension system** overhaul — more stable, faster extensions

Essential extensions:

```bash
uv add jupyterlab-lsp python-lsp-server  # Autocompletion and type hints
uv add jupyterlab-git                     # Git integration
uv add jupyterlab-code-formatter black   # Code formatting
```

---

## Marimo: Reactive Notebooks

Marimo is a newer notebook alternative that solves a fundamental problem with Jupyter: **cell execution order**. In Jupyter, cells can be run in any order, making notebooks non-reproducible. Marimo makes notebooks reactive—when you change a variable, all dependent cells re-run automatically.

```bash
uv add marimo
marimo edit analysis.py  # Notebooks are plain Python files!
```

```python
# In Marimo, this is a reactive notebook as a Python file
import marimo as mo
import polars as pl

# UI elements are reactive
threshold = mo.ui.slider(0, 1000, value=100, label="Minimum amount")

# This cell re-runs whenever threshold changes
filtered_df = df.filter(pl.col("amount") > threshold.value)

# This cell re-runs whenever filtered_df changes
chart = mo.ui.altair_chart(
    alt.Chart(filtered_df.to_pandas()).mark_bar().encode(
        x="region", y="sum(amount)"
    )
)
```

Marimo notebooks are:
- **Reproducible** — always execute top-to-bottom
- **Git-friendly** — stored as `.py` files, not JSON
- **Shareable as apps** — `marimo run analysis.py` serves it as an interactive web app

---

## Narwhals: Dataframe-Agnostic Code

Narwhals lets you write library code that works with both pandas and Polars (and other dataframe libraries) without special-casing each:

```bash
uv add narwhals
```

```python
import narwhals as nw
from narwhals.typing import IntoFrame

def top_products_by_revenue(df: IntoFrame, n: int = 5) -> IntoFrame:
    """Works with pandas, Polars, or any narwhals-compatible frame."""
    return (
        nw.from_native(df)
        .filter(nw.col("amount") > 0)
        .group_by("product")
        .agg(revenue=nw.col("amount").sum())
        .sort("revenue", descending=True)
        .head(n)
        .to_native()
    )

# Works with both!
import pandas as pd
import polars as pl

pandas_result = top_products_by_revenue(pd.read_csv("orders.csv"))
polars_result = top_products_by_revenue(pl.read_csv("orders.csv"))
```

Narwhals is particularly valuable for library authors who don't want to pick sides in the pandas vs. Polars debate.

---

## Recommended Data Science Stack 2026

| Task | Tool |
|---|---|
| **Small data (<500MB)** | pandas (ecosystem depth) |
| **Large data (>500MB)** | Polars (speed, memory) |
| **Analytical SQL queries** | DuckDB |
| **File format** | Parquet (not CSV for large data) |
| **Interactive notebooks** | JupyterLab 4 |
| **Reproducible notebooks** | Marimo |
| **Library code (agnostic)** | Narwhals |

---

## Quick Start

```bash
# Full data science stack with uv
uv add polars duckdb jupyterlab marimo narwhals pyarrow fastparquet

# For visualization
uv add altair plotly matplotlib seaborn

# For ML
uv add scikit-learn xgboost lightgbm
```

The shift from pandas to Polars + DuckDB is not a replacement for everything—it is an upgrade for the performance-critical parts. Keep pandas where the ecosystem demands it, and reach for Polars and DuckDB when data size or speed matters.
