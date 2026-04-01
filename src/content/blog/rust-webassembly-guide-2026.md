---
title: "Rust + WebAssembly: Building High-Performance Web Apps 2026"
description: "Rust WebAssembly guide 2026: wasm-pack, wasm-bindgen, Leptos/Yew frameworks, calling JS from Rust, passing complex types, bundle size optimization, and edge function deployment."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Rust", "WebAssembly", "WASM", "wasm-pack", "wasm-bindgen", "Leptos", "edge computing"]
readingTime: "11 min read"
category: "rust"
---

Rust is the dominant language for production WebAssembly in 2026. Its zero-cost abstractions compile to tight WASM bytecode, and the toolchain — wasm-pack, wasm-bindgen, and the growing set of WASM frameworks — makes browser and edge deployment practical. This guide covers the full stack from first WASM module to full-stack Leptos app.

## Why Rust for WebAssembly?

- **No GC overhead**: No garbage collector pauses in the browser
- **Predictable performance**: Same LLVM optimizer as native builds
- **Small binaries**: With optimization, under 100KB for many use cases
- **Safety**: Memory safety without a runtime
- **Ecosystem**: wasm-bindgen, wasm-pack, Leptos, Yew, Dioxus all mature

**Performance comparison (image processing, 1000 iterations):**

| Implementation | Time | Bundle Size |
|---------------|------|------------|
| Rust + WASM | 180ms | 95KB |
| JavaScript | 820ms | — |
| AssemblyScript | 310ms | 180KB |
| C++ via Emscripten | 175ms | 340KB |

---

## wasm-pack Workflow

`wasm-pack` is the build tool for Rust → WebAssembly. It compiles your crate, generates JS bindings, and packages for npm.

```bash
# Install
cargo install wasm-pack
# Or:
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Create a new WASM project
wasm-pack new my-wasm-lib
cd my-wasm-lib

# Build for different targets
wasm-pack build --target web       # ES modules for bundlers
wasm-pack build --target bundler   # for webpack/vite
wasm-pack build --target nodejs    # for Node.js
wasm-pack build --release          # optimized build
```

**Cargo.toml for WASM:**

```toml
[lib]
crate-type = ["cdylib", "rlib"]  # cdylib for WASM, rlib for tests

[dependencies]
wasm-bindgen = "0.2"
web-sys = { version = "0.3", features = ["console", "Window", "Document"] }
js-sys = "0.3"
console_error_panic_hook = "0.1"

[profile.release]
opt-level = "s"    # optimize for size
lto = true
```

---

## wasm-bindgen: Rust ↔ JavaScript Interop

`wasm-bindgen` generates the glue code to call Rust from JS and vice versa.

### Exporting Rust to JavaScript

```rust
use wasm_bindgen::prelude::*;

// Export a simple function
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// Export a struct with methods
#[wasm_bindgen]
pub struct ImageProcessor {
    width: u32,
    height: u32,
    pixels: Vec<u8>,
}

#[wasm_bindgen]
impl ImageProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> Self {
        ImageProcessor {
            width,
            height,
            pixels: vec![0u8; (width * height * 4) as usize],
        }
    }

    pub fn grayscale(&mut self) {
        for chunk in self.pixels.chunks_mut(4) {
            let avg = ((chunk[0] as u32 + chunk[1] as u32 + chunk[2] as u32) / 3) as u8;
            chunk[0] = avg;
            chunk[1] = avg;
            chunk[2] = avg;
        }
    }

    pub fn get_pixels(&self) -> Vec<u8> {
        self.pixels.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn width(&self) -> u32 {
        self.width
    }
}
```

### Calling from JavaScript

```javascript
import init, { add, ImageProcessor } from './pkg/my_wasm_lib.js';

async function run() {
    await init(); // load and initialize WASM module

    console.log(add(2, 3)); // 5

    const processor = new ImageProcessor(800, 600);
    processor.grayscale();
    const pixels = processor.get_pixels();
    console.log(`Processed ${pixels.length} bytes`);
}

run();
```

---

## Passing Complex Types Between Rust and JS

### Strings

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn reverse_string(s: &str) -> String {
    s.chars().rev().collect()
}

#[wasm_bindgen]
pub fn process_name(name: String) -> String {
    format!("Hello, {}!", name.to_uppercase())
}
```

### Arrays and Typed Arrays

```rust
use wasm_bindgen::prelude::*;
use js_sys::Float32Array;

// Pass a JS Float32Array directly (zero-copy view)
#[wasm_bindgen]
pub fn sum_array(data: &[f32]) -> f32 {
    data.iter().sum()
}

// Return a typed array
#[wasm_bindgen]
pub fn generate_sine_wave(frequency: f32, samples: usize) -> Vec<f32> {
    (0..samples)
        .map(|i| {
            let t = i as f32 / samples as f32;
            (2.0 * std::f32::consts::PI * frequency * t).sin()
        })
        .collect()
}
```

### JsValue for Dynamic Types

```rust
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct AnalysisResult {
    pub score: f64,
    pub label: String,
    pub confidence: f64,
}

#[wasm_bindgen]
pub fn analyze(data: &[f32]) -> JsValue {
    let result = AnalysisResult {
        score: data.iter().map(|&x| x as f64).sum::<f64>() / data.len() as f64,
        label: "normal".to_string(),
        confidence: 0.95,
    };
    serde_wasm_bindgen::to_value(&result).unwrap()
}
```

```javascript
const result = analyze(floatArray);
console.log(result.score, result.label); // deserialized JS object
```

### Closures from JavaScript

```rust
use wasm_bindgen::prelude::*;
use js_sys::Function;

#[wasm_bindgen]
pub fn process_with_callback(data: &[f32], callback: &Function) {
    for (i, &value) in data.iter().enumerate() {
        let processed = value * 2.0;
        callback.call2(
            &JsValue::NULL,
            &JsValue::from(i as u32),
            &JsValue::from(processed),
        ).unwrap();
    }
}
```

---

## Leptos: Full-Stack Rust in the Browser

Leptos is a reactive web framework that compiles to WASM for the client side and Rust for the server. It's the most complete Rust SPA/SSR framework in 2026.

```bash
cargo install cargo-leptos
cargo leptos new --git leptos-rs/start my-app
cd my-app
cargo leptos watch
```

```rust
// src/app.rs
use leptos::prelude::*;

#[component]
fn Counter() -> impl IntoView {
    let (count, set_count) = signal(0);

    view! {
        <div class="counter">
            <p>"Count: " {count}</p>
            <button on:click=move |_| set_count.update(|n| *n += 1)>
                "Increment"
            </button>
            <button on:click=move |_| set_count.update(|n| *n -= 1)>
                "Decrement"
            </button>
        </div>
    }
}

// Server function (runs on server, callable from client)
#[server(GetUsers, "/api")]
pub async fn get_users() -> Result<Vec<User>, ServerFnError> {
    let db = use_context::<DbPool>().ok_or(ServerFnError::ServerError("No db".into()))?;
    sqlx::query_as!(User, "SELECT * FROM users")
        .fetch_all(&db)
        .await
        .map_err(|e| ServerFnError::ServerError(e.to_string()))
}

#[component]
fn UserList() -> impl IntoView {
    let users = Resource::new(|| (), |_| get_users());

    view! {
        <Suspense fallback=|| view! { <p>"Loading..."</p> }>
            {move || users.get().map(|result| {
                match result {
                    Ok(users) => users.into_iter()
                        .map(|u| view! { <li>{u.name}</li> })
                        .collect_view(),
                    Err(e) => view! { <p>"Error: " {e.to_string()}</p> }.into_any(),
                }
            })}
        </Suspense>
    }
}
```

---

## Yew: Component-Based WASM UI

Yew is React-inspired and more familiar to JavaScript developers. It predates Leptos and has a larger community.

```rust
use yew::prelude::*;

#[derive(Properties, PartialEq)]
struct ButtonProps {
    label: String,
    on_click: Callback<MouseEvent>,
}

#[function_component(Button)]
fn button(props: &ButtonProps) -> Html {
    html! {
        <button onclick={props.on_click.clone()}>
            {&props.label}
        </button>
    }
}

#[function_component(App)]
fn app() -> Html {
    let count = use_state(|| 0i32);
    let increment = {
        let count = count.clone();
        Callback::from(move |_| count.set(*count + 1))
    };

    html! {
        <div>
            <p>{"Count: "}{*count}</p>
            <Button label="Click me" on_click={increment} />
        </div>
    }
}
```

---

## Bundle Size Optimization

```toml
# Cargo.toml
[profile.release]
opt-level = "s"        # optimize for size (vs "z" for minimum size)
lto = true             # link-time optimization
codegen-units = 1      # better optimization, slower compile
panic = "abort"        # smaller panic handler
strip = true           # strip debug symbols
```

```bash
# Install wasm-opt (Binaryen optimizer)
cargo install wasm-opt

# Optimize after wasm-pack build
wasm-opt -Os -o pkg/my_lib_bg_opt.wasm pkg/my_lib_bg.wasm

# Size comparison
du -sh pkg/*.wasm
# Before: 425KB
# After wasm-opt: 98KB
```

### Use wee_alloc for Smaller Allocator

```toml
[dependencies]
wee_alloc = "0.4"
```

```rust
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
```

`wee_alloc` reduces the allocator overhead from ~10KB to ~1KB.

---

## Deploying to Cloudflare Workers

Rust compiles to WASM for Cloudflare Workers via the `worker` crate.

```toml
[dependencies]
worker = "0.4"
worker-macros = "0.4"
```

```rust
use worker::*;

#[event(fetch)]
pub async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    Router::new()
        .get("/api/users", |_req, ctx| {
            let db = ctx.env.d1("USERS_DB")?;
            // query D1 database
            Response::ok("users list")
        })
        .get_async("/api/user/:id", |_req, ctx| async move {
            let id = ctx.param("id").unwrap();
            Response::ok(format!("user {id}"))
        })
        .run(req, env)
        .await
}
```

```bash
# Deploy
npm install -g wrangler
wrangler deploy
```

Cloudflare Workers with Rust WASM cold-start in under 1ms — dramatically faster than V8-isolated Node.js workers.

---

## Framework Comparison

| Framework | Type | Maturity | SSR | Bundle Size | Best For |
|-----------|------|---------|-----|------------|---------|
| Leptos | Full-stack SPA/SSR | Stable | Yes | ~70KB | Production apps |
| Yew | SPA | Stable | Limited | ~120KB | React-like teams |
| Dioxus | Cross-platform | Stable | Yes | ~80KB | Desktop + Web |
| Sycamore | SPA | Stable | Yes | ~60KB | Fine-grained reactivity |

Rust + WebAssembly has crossed the threshold from experimental to production-ready. For compute-intensive browser tasks, edge functions, and full-stack Rust shops, the toolchain in 2026 delivers on the performance promise with a developer experience that keeps improving.
