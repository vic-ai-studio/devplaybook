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

## Quick Start

Port a C library to the browser in four steps:

```bash
# 1. Install the Emscripten SDK
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk && ./emsdk install latest && ./emsdk activate latest
source ./emsdk_env.sh   # adds emcc/em++ to PATH

# 2. Write your C function
cat > image_utils.c << 'EOF'
#include <stdlib.h>
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
void grayscale(unsigned char* pixels, int width, int height) {
    for (int i = 0; i < width * height * 4; i += 4) {
        unsigned char avg = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
        pixels[i] = pixels[i+1] = pixels[i+2] = avg;
    }
}
EOF

# 3. Compile to WASM
emcc image_utils.c -o image_utils.js \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_grayscale","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAPU8"]' \
  -O2

# 4. Use in the browser
```

```html
<script src="image_utils.js"></script>
<script>
Module.onRuntimeInitialized = function() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Copy pixel data into WASM memory
  const nBytes = imageData.data.length;
  const ptr = Module._malloc(nBytes);
  Module.HEAPU8.set(imageData.data, ptr);

  // Run C function on the pixel buffer
  Module._grayscale(ptr, canvas.width, canvas.height);

  // Copy result back and render
  imageData.data.set(Module.HEAPU8.subarray(ptr, ptr + nBytes));
  Module._free(ptr);
  ctx.putImageData(imageData, 0, 0);
};
</script>
```

For production builds, add `-s ENVIRONMENT=web` to strip Node.js support from the glue code, reducing output size. Use `--closure 1` for additional minification if your build pipeline supports it. Output `.wasm` files should be served with `Content-Type: application/wasm` for browsers to stream-compile them efficiently.
