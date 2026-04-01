---
title: "Rust for JavaScript Developers: A Practical Guide in 2026"
description: "Learn Rust as a JavaScript/TypeScript developer. Ownership, borrowing, async/await, and building CLI tools. Side-by-side JS vs Rust code examples throughout."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["rust", "javascript", "typescript", "systems-programming", "webassembly"]
readingTime: "14 min read"
---

Rust is the language JavaScript developers are most likely to encounter next—and for good reason. It powers the tools you use daily: Bun, Deno, SWC, Rolldown, Biome, and Turbopack are all written in Rust. In 2026, understanding Rust is increasingly a prerequisite for contributing to the JS ecosystem toolchain, building WebAssembly modules, or writing performance-critical server-side code.

This guide is written specifically for JavaScript and TypeScript developers. Every Rust concept is explained with a JS/TS comparison. No C++ background required.

## Why Rust Feels Familiar (and What's Different)

JavaScript and Rust have more in common than you'd expect:

- Both support `async/await`
- Both have closures and first-class functions
- Both have pattern matching (sort of—`switch` in JS, `match` in Rust)
- Both support iterators with `.map()`, `.filter()`, `.reduce()`

The big differences:
- **No garbage collector**: Rust uses ownership and borrowing instead
- **Explicit types, always**: TypeScript is optional types; Rust types are mandatory
- **No null/undefined**: Rust uses `Option<T>` instead
- **No exceptions**: Rust uses `Result<T, E>` instead

Let's work through these with code.

## Setting Up Rust

```bash
# Install Rust via rustup (the official installer)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify installation
rustc --version
cargo --version

# Create a new project (like npm init)
cargo new my-project
cd my-project

# Build and run
cargo run
```

`cargo` is Rust's package manager—think of it as npm + webpack + tsc combined. `cargo.toml` is your `package.json`.

## Variables: let vs let mut

In JavaScript, `let` creates a mutable variable. In Rust, `let` creates an *immutable* binding by default. You need `let mut` for mutability.

```javascript
// JavaScript
let count = 0;
count = 1;  // Fine

const MAX = 100;
// MAX = 200;  // Error: Assignment to constant variable
```

```rust
// Rust
let count = 0;
// count = 1;  // Error: cannot assign twice to immutable variable

let mut count = 0;
count = 1;  // Fine

const MAX: u32 = 100;  // Constants require explicit type
```

Rust's default immutability encourages you to be explicit about what changes—a pattern TypeScript developers appreciate when using `readonly` and `const`.

## Types: TypeScript vs Rust

If you're comfortable with TypeScript, Rust types will feel familiar but more strict.

```typescript
// TypeScript
function add(a: number, b: number): number {
  return a + b;
}

type User = {
  id: number;
  name: string;
  email: string | null;
};
```

```rust
// Rust
fn add(a: i32, b: i32) -> i32 {
    a + b  // No semicolon = expression = return value
}

struct User {
    id: u32,
    name: String,
    email: Option<String>,  // No null — use Option<T>
}
```

Key differences:
- Rust has multiple integer types (`i32`, `u32`, `i64`, `u64`, `usize`, etc.)
- Rust has no `null` or `undefined`—use `Option<T>` instead
- `Option<String>` is like TypeScript's `string | null`

## The Ownership System: Rust's Most Unique Feature

This is the concept JavaScript developers find most unfamiliar—and the most important to understand.

### The Problem Rust Solves

JavaScript uses a garbage collector to manage memory. The GC periodically pauses your program to find and free unused memory. This causes unpredictable latency. Rust achieves the same memory safety *without* a GC by enforcing ownership rules at compile time.

### Ownership Rules (Simplified)

1. Every value has exactly one owner
2. When the owner goes out of scope, the value is freed
3. You can *move* ownership (transfer) or *borrow* a reference

```javascript
// JavaScript: Copying is implicit
const a = { name: "Alice" };
const b = a;  // b references the same object
a.name = "Bob";
console.log(b.name);  // "Bob" — same object!
```

```rust
// Rust: Ownership is explicit
let a = String::from("Alice");
let b = a;  // Ownership MOVED to b. a is now invalid.
// println!("{}", a);  // Compile error: value used after move

// To keep both, clone explicitly (like deep copy in JS)
let a = String::from("Alice");
let b = a.clone();  // Deep copy — both are valid
println!("{} {}", a, b);  // "Alice Alice"
```

### Borrowing: References Without Transferring Ownership

Most of the time, you don't want to transfer ownership—you want to read or modify a value temporarily. That's what references (`&`) are for.

```typescript
// TypeScript: Pass object by reference implicitly
function greet(user: { name: string }): string {
  return `Hello, ${user.name}`;
}

const user = { name: "Alice" };
const greeting = greet(user);
console.log(user.name);  // Still valid
```

```rust
// Rust: Pass by reference explicitly with &
fn greet(user: &User) -> String {
    format!("Hello, {}", user.name)
}

let user = User { name: String::from("Alice"), id: 1, email: None };
let greeting = greet(&user);  // Borrow, don't move
println!("{}", user.name);  // Still valid — we only borrowed
```

### Mutable References

```rust
fn add_greeting(user: &mut User) {
    user.name = format!("Greeted {}", user.name);
}

let mut user = User { name: String::from("Alice"), id: 1, email: None };
add_greeting(&mut user);  // Mutable borrow
println!("{}", user.name);  // "Greeted Alice"

// Rust rule: Only ONE mutable reference at a time
// This prevents data races at compile time
```

The compiler rejects code that would cause data races or use-after-free bugs. You learn to write the code correctly upfront, which is why Rust programs rarely crash in production.

## Option and Result: Goodbye null and Exceptions

### Option: No More null Checks

```typescript
// TypeScript
function findUser(id: number): User | null {
  const user = db.find(id);
  if (user === null) {
    return null;
  }
  return user;
}

const user = findUser(1);
if (user !== null) {
  console.log(user.name);
}
```

```rust
// Rust
fn find_user(id: u32) -> Option<User> {
    db.iter().find(|u| u.id == id).cloned()
}

// Pattern matching (like a type-safe switch)
match find_user(1) {
    Some(user) => println!("{}", user.name),
    None => println!("User not found"),
}

// Or use if let for single case
if let Some(user) = find_user(1) {
    println!("{}", user.name);
}

// Chaining with ? (like optional chaining in JS)
fn get_user_email(id: u32) -> Option<String> {
    let user = find_user(id)?;  // Returns None if not found
    user.email  // Returns Option<String>
}
```

### Result: No More try/catch

```typescript
// TypeScript
async function fetchData(url: string): Promise<Data> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    throw new Error(`Fetch failed: ${error}`);
  }
}
```

```rust
// Rust
use std::error::Error;

async fn fetch_data(url: &str) -> Result<Data, Box<dyn Error>> {
    let response = reqwest::get(url).await?;  // ? propagates errors

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()).into());
    }

    let data = response.json::<Data>().await?;
    Ok(data)
}

// Caller handles it
match fetch_data("https://api.example.com/data").await {
    Ok(data) => process(data),
    Err(e) => eprintln!("Error: {}", e),
}
```

The `?` operator is like a short-circuit: if the `Result` is an error, it returns early with that error. This makes error propagation explicit and chainable without nested try/catch blocks.

## Async/Await in Rust

Rust has `async/await` syntax, but the runtime is not built in—you choose one. [Tokio](/tools/tokio) is the dominant choice.

```toml
# Cargo.toml
[dependencies]
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

```javascript
// Node.js async
async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  return response.json();
}

async function main() {
  const users = await fetchUsers();
  const names = users.map(u => u.name);
  console.log(names);
}
```

```rust
// Rust async with Tokio
use tokio;
use serde::Deserialize;

#[derive(Deserialize)]
struct User {
    id: u32,
    name: String,
}

async fn fetch_users() -> Result<Vec<User>, reqwest::Error> {
    let users = reqwest::get("https://api.example.com/users")
        .await?
        .json::<Vec<User>>()
        .await?;
    Ok(users)
}

#[tokio::main]  // This macro sets up the Tokio runtime
async fn main() {
    let users = fetch_users().await.expect("Failed to fetch users");
    let names: Vec<&str> = users.iter().map(|u| u.name.as_str()).collect();
    println!("{:?}", names);
}
```

## Iterators: .map(), .filter(), .collect()

Rust iterators are lazy and composable—very similar to JavaScript array methods.

```javascript
// JavaScript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const result = numbers
  .filter(n => n % 2 === 0)
  .map(n => n * n)
  .reduce((sum, n) => sum + n, 0);

console.log(result);  // 220
```

```rust
// Rust
let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

let result: i32 = numbers
    .iter()
    .filter(|&&n| n % 2 == 0)
    .map(|&n| n * n)
    .sum();

println!("{}", result);  // 220
```

Rust iterators are zero-cost abstractions—the compiler optimizes iterator chains into the same machine code as a hand-written loop.

## Building a CLI Tool in Rust

Let's build a practical tool: a CLI that reads a JSON file and formats it. This is a complete, runnable project.

```toml
# Cargo.toml
[package]
name = "json-fmt"
version = "0.1.0"
edition = "2021"

[dependencies]
clap = { version = "4", features = ["derive"] }
serde_json = "1"
colored = "2"
```

```rust
// src/main.rs
use clap::Parser;
use std::fs;
use std::io::{self, Read};
use colored::*;

#[derive(Parser)]
#[command(name = "json-fmt")]
#[command(about = "Format and validate JSON files", long_about = None)]
struct Cli {
    /// Input file (reads from stdin if not provided)
    #[arg(short, long)]
    file: Option<String>,

    /// Output indentation (default: 2)
    #[arg(short, long, default_value = "2")]
    indent: usize,

    /// Compact output (no whitespace)
    #[arg(short, long)]
    compact: bool,
}

fn main() {
    let cli = Cli::parse();

    // Read input
    let input = if let Some(file) = cli.file {
        fs::read_to_string(&file).unwrap_or_else(|e| {
            eprintln!("{}: {}", "Error reading file".red(), e);
            std::process::exit(1);
        })
    } else {
        let mut buf = String::new();
        io::stdin().read_to_string(&mut buf).expect("Failed to read stdin");
        buf
    };

    // Parse JSON
    let value: serde_json::Value = serde_json::from_str(&input).unwrap_or_else(|e| {
        eprintln!("{}: {}", "Invalid JSON".red(), e);
        std::process::exit(1);
    });

    // Format output
    let output = if cli.compact {
        serde_json::to_string(&value).unwrap()
    } else {
        let indent = " ".repeat(cli.indent);
        let formatter = serde_json::ser::PrettyFormatter::with_indent(indent.as_bytes());
        let mut buf = Vec::new();
        let mut ser = serde_json::Serializer::with_formatter(&mut buf, formatter);
        serde_json::ser::Serialize::serialize(&value, &mut ser).unwrap();
        String::from_utf8(buf).unwrap()
    };

    println!("{}", output);
}
```

```bash
# Build optimized release binary
cargo build --release

# Use it
echo '{"name":"Alice","age":30}' | ./target/release/json-fmt
./target/release/json-fmt --file data.json --indent 4
./target/release/json-fmt --file data.json --compact
```

This produces a single binary with no runtime dependencies—a major advantage over Node.js CLIs that require Node to be installed.

## WebAssembly: Running Rust in the Browser

Rust compiles to WebAssembly with excellent tooling. This is ideal for performance-critical code that needs to run in the browser.

```bash
# Install wasm-pack
cargo install wasm-pack

# Create a new wasm library
cargo new --lib image-processor
```

```toml
# Cargo.toml
[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
```

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

#[wasm_bindgen]
pub fn process_pixels(data: &[u8], width: u32, height: u32) -> Vec<u8> {
    // Grayscale conversion — massively faster than pure JS
    data.chunks(4).flat_map(|pixel| {
        let gray = (0.299 * pixel[0] as f32
            + 0.587 * pixel[1] as f32
            + 0.114 * pixel[2] as f32) as u8;
        vec![gray, gray, gray, pixel[3]]
    }).collect()
}
```

```bash
wasm-pack build --target web
```

```javascript
// In your browser/Node.js code
import init, { fibonacci, process_pixels } from './pkg/image_processor.js';

await init();
console.log(fibonacci(40));  // Computed in Rust at near-native speed
```

For a canvas pixel manipulation benchmark, Rust/WASM typically runs 10–30x faster than equivalent JavaScript.

## Learning Path for JS Developers

1. **Week 1**: Variables, functions, structs, enums, pattern matching
2. **Week 2**: Ownership and borrowing (this takes time—be patient)
3. **Week 3**: Error handling with `Option` and `Result`
4. **Week 4**: Traits (Rust's equivalent of interfaces/type classes)
5. **Week 5**: Async/await with Tokio
6. **Month 2**: Build a real project (CLI tool, HTTP server with Axum, or WASM module)

### Essential Resources

- [The Rust Book](https://doc.rust-lang.org/book/) — the official tutorial, free online
- [Rustlings](https://github.com/rust-lang/rustlings) — small exercises (like Advent of Code for Rust basics)
- [Exercism Rust track](https://exercism.org/tracks/rust) — community-reviewed exercises

### Common Gotchas for JS Developers

1. **Semicolons matter in Rust**: A line without a semicolon is an expression (return value); with one is a statement
2. **`String` vs `&str`**: `String` is owned heap data; `&str` is a borrowed reference. Use `&str` for function parameters, `String` for owned values
3. **The borrow checker is your friend**: When it rejects your code, it's preventing a bug. Don't fight it—restructure

## Conclusion

Rust's learning curve is real, but it's worth it. The ownership system initially feels like fighting the compiler—but once it clicks, you'll write code that is both safe and fast by construction. No runtime errors from null dereferences, no memory leaks, no data races.

For JavaScript developers, the immediate payoffs are:
- Contributing to JS ecosystem tools (Biome, Rolldown, SWC)
- Writing WebAssembly modules for performance-critical browser code
- Building CLI tools that distribute as single binaries
- Systems-level programming when Node.js performance isn't enough

Explore the [Rust tools and libraries](/tools/rust) collection and the [WebAssembly tools](/tools/webassembly) on DevPlaybook.
