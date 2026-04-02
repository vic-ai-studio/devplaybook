---
title: "WABT (WebAssembly Binary Toolkit)"
description: "Suite of tools for working with WebAssembly binaries — convert between text (.wat) and binary (.wasm) formats, validate, inspect, and transform WebAssembly modules."
category: "WebAssembly & Edge Computing"
pricing: "Free"
pricingDetail: "Fully free and open source (Apache 2.0)"
website: "https://github.com/WebAssembly/wabt"
github: "https://github.com/WebAssembly/wabt"
tags: [webassembly, wasm, tooling, debugging, binary, text-format]
pros:
  - "Essential for WASM debugging — read and write .wat (text format)"
  - "wat2wasm: compile text format to binary for learning and testing"
  - "wasm-objdump: inspect WASM binary contents without decompiling"
  - "wasm-validate: verify WASM files are well-formed"
  - "wasm-decompile: generate readable pseudo-code from WASM"
cons:
  - "Low-level tool — not needed for most high-level WASM development"
  - "Text format (.wat) is verbose and not meant for large codebases"
  - "Limited compared to full debuggers (WASM debugging in Chrome DevTools preferred)"
date: "2026-04-02"
---

## Overview

WABT (pronounced "wabbit") is the reference toolkit for working directly with WebAssembly at the binary/text level. It's invaluable for understanding how WASM works, debugging compiled modules, and learning the WebAssembly specification.

## Installation

```bash
# macOS
brew install wabt

# Ubuntu
sudo apt-get install wabt

# Build from source
git clone https://github.com/WebAssembly/wabt.git
cd wabt && git submodule update --init
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . -j$(nproc)
```

## WAT: WebAssembly Text Format

Write WASM directly in text format for learning:

```wat
;; add.wat — WebAssembly text format
(module
  ;; Export a function named "add"
  (func $add (export "add") (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add
  )

  ;; Export memory
  (memory (export "memory") 1)  ;; 1 page = 64KB

  ;; More complex: factorial
  (func $factorial (export "factorial") (param $n i32) (result i32)
    (if (result i32)
      (i32.le_s (local.get $n) (i32.const 1))
      (then (i32.const 1))
      (else
        (i32.mul
          (local.get $n)
          (call $factorial
            (i32.sub (local.get $n) (i32.const 1))
          )
        )
      )
    )
  )
)
```

## Key Commands

```bash
# Compile .wat to .wasm binary
wat2wasm add.wat -o add.wasm

# Disassemble .wasm back to .wat
wasm2wat add.wasm -o add.wat

# Validate a .wasm file
wasm-validate add.wasm
# → add.wasm: OK

# Inspect binary structure
wasm-objdump -d add.wasm  # Disassemble
wasm-objdump -x add.wasm  # Show sections (type, import, export, function, etc.)

# Generate pseudo-code (easier to read than .wat)
wasm-decompile add.wasm
# → export function add(a:int, b:int):int { return a + b; }

# Strip debug info for smaller binaries
wasm-strip my-module.wasm

# Show stats
wasm-stats my-module.wasm
```

## Inspecting Compiled WASM

```bash
# See what an Emscripten or wasm-pack build actually contains
wasm-objdump -x output.wasm | head -50
# Type section: shows all function signatures
# Import section: shows what's imported from JS
# Export section: shows what's exported to JS
# Code section: number of functions

# Count how many functions are in a WASM binary
wasm-objdump -d output.wasm | grep "^func\[" | wc -l
```

## JavaScript WABT (Browser/Node.js)

```javascript
// wabt.js — run WABT tools in Node.js
import wabt from 'wabt';

const wabtInstance = await wabt();

const wat = `
(module
  (func $add (export "add") (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add))
`;

// Compile WAT to WASM in Node.js (no CLI needed)
const module = wabtInstance.parseWat('test.wat', wat);
const { buffer } = module.toBinary({});

const { instance } = await WebAssembly.instantiate(buffer);
console.log(instance.exports.add(2, 3));  // 5
```
