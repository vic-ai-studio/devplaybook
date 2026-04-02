---
title: "Emscripten"
description: "Compiler toolchain for converting C and C++ code to WebAssembly and JavaScript — powers many high-performance web applications including games, image editors, and scientific tools."
category: "WebAssembly & Edge Computing"
pricing: "Free"
pricingDetail: "Fully free and open source (MIT/University of Illinois)"
website: "https://emscripten.org"
github: "https://github.com/emscripten-core/emscripten"
tags: [webassembly, wasm, c, cpp, compiler, performance, web]
pros:
  - "Mature toolchain — powers WebAssembly for Figma, AutoCAD, Unity WebGL"
  - "Complete C/C++ standard library support in the browser"
  - "Emscripten SDK (emsdk) manages compiler versions easily"
  - "Automatic JavaScript glue code generation for browser APIs"
  - "Supports pthreads (multi-threading) via SharedArrayBuffer"
cons:
  - "Large output size — C++ with STL can produce 1MB+ WASM files"
  - "Debugging WASM is harder than JavaScript"
  - "Build times are significantly longer than native compilation"
  - "Browser restrictions (CORS, COOP/COEP headers) needed for shared memory"
date: "2026-04-02"
---

## Overview

Emscripten is the original and most complete C/C++ to WebAssembly compiler. It translates LLVM bitcode (the output of Clang) into WebAssembly, generating JavaScript bindings that bridge native code to browser APIs.

## Installation

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

## Compiling C to WebAssembly

```c
// hello.c
#include <stdio.h>
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int a, int b) {
    return a + b;
}

EMSCRIPTEN_KEEPALIVE
double calculate_distance(double x1, double y1, double x2, double y2) {
    return sqrt(pow(x2-x1, 2) + pow(y2-y1, 2));
}
```

```bash
# Compile to WASM + JS glue
emcc hello.c -o hello.js \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_add","_calculate_distance"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -O2

# Output: hello.wasm + hello.js
```

## Using in JavaScript

```html
<script src="hello.js"></script>
<script>
Module.onRuntimeInitialized = function() {
  // Using cwrap (returns a reusable function)
  const add = Module.cwrap('add', 'number', ['number', 'number']);
  console.log(add(5, 3));  // 8

  const distance = Module.cwrap('calculate_distance', 'number',
    ['number', 'number', 'number', 'number']);
  console.log(distance(0, 0, 3, 4));  // 5
};
</script>
```

## When to Use

Emscripten is ideal for porting existing C/C++ codebases to the web: game engines (Unity, Godot), scientific computing libraries (OpenCV, FFTW), multimedia codecs (FFmpeg), and physics engines (Bullet). For new WASM projects, consider wasm-pack (Rust) for better ergonomics.
