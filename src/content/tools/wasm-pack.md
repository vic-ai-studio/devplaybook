---
title: "wasm-pack — Build & Publish Rust-Generated WebAssembly Packages"
description: "Build Rust packages targeting WebAssembly — generates npm packages with TypeScript bindings, enabling seamless integration between Rust performance and JavaScript ecosystems."
category: "WebAssembly & Edge Computing"
pricing: "Free"
pricingDetail: "Fully free and open source"
website: "https://rustwasm.github.io/wasm-pack"
github: "https://github.com/rustwasm/wasm-pack"
tags: ["webassembly", "wasm", "rust", "npm", "performance", "tooling", "build-tool"]
pros:
  - "Generates TypeScript type definitions automatically from Rust code"
  - "Publishes directly to npm — works with standard JS bundlers (Webpack, Vite)"
  - "wasm-bindgen integration for seamless JS/Rust interop"
  - "Smaller output than Emscripten for pure computational tasks"
  - "Excellent Vite and Next.js integration via vite-plugin-wasm"
cons:
  - "Requires learning Rust (significant learning curve)"
  - "Rust compile times are slow even for small changes"
  - "Complex data types require manual wasm-bindgen attribute annotations"
  - "Browser async WASM loading requires handling asynchronous module init"
date: "2026-04-02"
---

## Overview

wasm-pack is the standard toolchain for building Rust-powered npm packages. It compiles Rust to WebAssembly and generates JavaScript/TypeScript wrappers that make the WASM module feel like a native npm package. Used by major projects like Parcel, Figma's plugin runtime, and various cryptographic libraries.

## Setup

```bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Create a new Rust + WASM project
cargo new --lib my-wasm-lib
cd my-wasm-lib
```

```toml
# Cargo.toml
[package]
name = "my-wasm-lib"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]  # Required for WASM

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"
```

## Writing Rust for the Web

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

// Export a simple function to JavaScript
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// Export a struct with methods
#[wasm_bindgen]
pub struct Matrix {
    data: Vec<f64>,
    rows: usize,
    cols: usize,
}

#[wasm_bindgen]
impl Matrix {
    #[wasm_bindgen(constructor)]
    pub fn new(rows: usize, cols: usize) -> Matrix {
        Matrix {
            data: vec![0.0; rows * cols],
            rows,
            cols,
        }
    }

    pub fn multiply(&self, other: &Matrix) -> Matrix {
        // High-performance matrix multiplication
        // This code runs at near-native speed
        let mut result = Matrix::new(self.rows, other.cols);
        for i in 0..self.rows {
            for j in 0..other.cols {
                let mut sum = 0.0;
                for k in 0..self.cols {
                    sum += self.data[i * self.cols + k] * other.data[k * other.cols + j];
                }
                result.data[i * other.cols + j] = sum;
            }
        }
        result
    }

    pub fn get(&self, row: usize, col: usize) -> f64 {
        self.data[row * self.cols + col]
    }
}

// Work with JSON via serde
#[derive(Serialize, Deserialize)]
pub struct Stats {
    pub mean: f64,
    pub std_dev: f64,
    pub min: f64,
    pub max: f64,
}

#[wasm_bindgen]
pub fn compute_stats(values: &[f64]) -> JsValue {
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / values.len() as f64;

    let stats = Stats {
        mean,
        std_dev: variance.sqrt(),
        min: values.iter().cloned().fold(f64::INFINITY, f64::min),
        max: values.iter().cloned().fold(f64::NEG_INFINITY, f64::max),
    };

    serde_wasm_bindgen::to_value(&stats).unwrap()
}
```

## Building and Publishing

```bash
# Build for web (Vite/webpack)
wasm-pack build --target web

# Build as npm package
wasm-pack build --target bundler

# Publish to npm
wasm-pack publish

# Output structure:
# pkg/
#   ├── my_wasm_lib_bg.wasm   (the WASM binary)
#   ├── my_wasm_lib.js        (JS glue)
#   ├── my_wasm_lib.d.ts      (TypeScript types!)
#   └── package.json
```

## Using in a Vite Project

```typescript
// vite.config.ts
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default { plugins: [wasm(), topLevelAwait()] };

// app.ts
import init, { Matrix, compute_stats } from './pkg/my_wasm_lib.js';

await init();  // Initialize the WASM module

const a = new Matrix(3, 3);
const stats = compute_stats(new Float64Array([1, 2, 3, 4, 5]));
console.log(stats.mean);  // 3
```
