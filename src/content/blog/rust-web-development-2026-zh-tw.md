---
title: "Rust 前端開發入門：WebAssembly 與現代工具鏈 2026"
description: "給前端開發者的 Rust 入門指南：從基礎語法到 WASM 編譯，涵蓋 Leptos、Yew 框架與 wasm-pack 工具鏈實戰。"
date: "2026-03-28"
author: "DevPlaybook Team"
lang: "zh-TW"
tags: ["rust", "webassembly", "wasm", "leptos", "yew", "frontend", "rust-web"]
readingTime: "16 min read"
---

過去幾年，Rust 不再只是系統程式設計師的專屬工具。隨著 WebAssembly 生態系統的成熟，前端開發者現在有了一條真正可行的路徑，把 Rust 的效能與型別安全帶進瀏覽器。這篇文章是寫給已經熟悉 JavaScript/TypeScript 的前端開發者，幫你以最短的路徑理解 Rust 的核心概念，並實際把程式碼跑在網頁上。

## 為什麼前端開發者應該學 Rust

### 效能差距是真實的

JavaScript 引擎這幾年已經非常快了，V8、SpiderMonkey 的 JIT 編譯器讓 JS 在大多數情境下夠用。但在計算密集型任務上，例如影像處理、加密演算、3D 渲染、音訊 DSP，原生編譯語言的差距仍然顯著。

WebAssembly 讓 Rust 編譯的二進位碼直接在瀏覽器中執行，達到接近原生的速度，同時與 JavaScript 互通。

### 工具鏈本身就是理由

Rust 工具鏈（cargo、clippy、rustfmt）是公認業界最好的開發體驗之一。你很快就會羨慕 Rust 的套件管理比 npm 的依賴地獄簡潔太多。

### WASM 是前端的一等公民

Figma 的效能核心是 C++ 編譯的 WASM；Google Earth Web 使用 WASM；Shopify 的結帳流程計算引擎也是 WASM。你不需要用 Rust 重寫整個前端，只需要把瓶頸部分換掉。

---

## Rust 基礎語法：從 JavaScript 視角切入

Rust 最讓 JS 開發者頭痛的概念是**所有權（Ownership）**，但其實它解決的問題你早就遇過——記憶體洩漏和意外的狀態共用。

### 變數與不可變性

```javascript
// JavaScript：變數預設可變
let name = "Alice";
name = "Bob"; // OK

const age = 30;
// age = 31; // TypeError
```

```rust
// Rust：變數預設不可變
let name = "Alice";
// name = "Bob"; // 編譯錯誤！

let mut age = 30;
age = 31; // 需要明確加 mut
```

Rust 把「不可變」設為預設，這讓編譯器能做更多最佳化，也讓你的意圖更清晰。

### 型別系統

```javascript
// JavaScript：動態型別，執行時才爆炸
function add(a, b) {
  return a + b;
}
add(1, "2"); // "12"，不報錯
```

```rust
// Rust：靜態型別，編譯時就抓到錯誤
fn add(a: i32, b: i32) -> i32 {
    a + b
}
// add(1, "2"); // 編譯錯誤
```

### 所有權：用 JS 類比理解

把所有權想成一個物件同時只能有一個「擁有者」。當擁有者離開作用域，記憶體自動釋放，不需要垃圾回收器。

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // s1 的所有權轉移給 s2
    // println!("{}", s1); // 編譯錯誤！s1 已失效
    println!("{}", s2); // OK
}
```

這在 JS 中等同於：
```javascript
let s1 = { value: "hello" };
let s2 = s1;
s1 = null; // 主動讓 s1 失效
console.log(s2.value); // "hello"
```

### 借用（Borrowing）

當你需要傳遞資料但不想轉移所有權時，用**借用**：

```rust
fn print_length(s: &String) {  // & 表示借用，不取得所有權
    println!("長度：{}", s.len());
}

fn main() {
    let s = String::from("hello");
    print_length(&s);  // 借出去
    println!("{}", s); // s 仍然有效
}
```

這對應 JS 中傳遞物件引用，但 Rust 的編譯器會靜態驗證你不會同時有多個可變引用，徹底消滅資料競態（data race）。

### Option 和 Result：告別 null

```rust
// 沒有 null，用 Option<T>
fn find_user(id: u32) -> Option<String> {
    if id == 1 {
        Some(String::from("Alice"))
    } else {
        None
    }
}

// 強制你處理失敗情境
match find_user(1) {
    Some(name) => println!("找到：{}", name),
    None => println!("找不到"),
}
```

---

## 編譯 WASM：wasm-pack 與 wasm-bindgen

### 環境設置

```bash
# 安裝 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 加入 WASM 編譯目標
rustup target add wasm32-unknown-unknown

# 安裝 wasm-pack
cargo install wasm-pack
```

### 建立第一個 WASM 函式庫

```bash
cargo new --lib my-wasm-lib
cd my-wasm-lib
```

編輯 `Cargo.toml`：

```toml
[package]
name = "my-wasm-lib"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
```

編輯 `src/lib.rs`：

```rust
use wasm_bindgen::prelude::*;

// #[wasm_bindgen] 讓這個函式可以從 JavaScript 呼叫
#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! From Rust + WASM", name)
}
```

### 編譯與使用

```bash
wasm-pack build --target web
```

這會產生 `pkg/` 目錄，裡面有 `.wasm` 檔和自動生成的 JS 包裝：

```javascript
// 在你的前端專案中使用
import init, { fibonacci, greet } from './pkg/my_wasm_lib.js';

async function run() {
  await init(); // 載入 WASM 模組

  console.log(greet("Developer"));
  // "Hello, Developer! From Rust + WASM"

  console.time('fib-wasm');
  console.log(fibonacci(40)); // 102334155
  console.timeEnd('fib-wasm');
}

run();
```

### 傳遞複雜資料：serde + JSON

```rust
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[wasm_bindgen]
pub fn distance(p1: JsValue, p2: JsValue) -> f64 {
    let p1: Point = serde_wasm_bindgen::from_value(p1).unwrap();
    let p2: Point = serde_wasm_bindgen::from_value(p2).unwrap();

    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    (dx * dx + dy * dy).sqrt()
}
```

---

## Leptos 框架快速入門

Leptos 是目前 Rust 前端框架中最活躍的選項，架構上非常類似 Solid.js——細粒度響應式，不用 Virtual DOM。

### 安裝與專案建立

```bash
cargo install cargo-leptos
cargo leptos new --git leptos-rs/start
cd my-leptos-app
cargo leptos watch
```

### 基本元件

```rust
use leptos::*;

#[component]
fn Counter() -> impl IntoView {
    // 類似 Solid.js 的 createSignal
    let (count, set_count) = create_signal(0);

    view! {
        <div>
            <p>"計數：" {count}</p>
            <button on:click=move |_| set_count.update(|n| *n += 1)>
                "增加"
            </button>
            <button on:click=move |_| set_count.set(0)>
                "重置"
            </button>
        </div>
    }
}

#[component]
fn App() -> impl IntoView {
    view! {
        <h1>"Leptos 計數器"</h1>
        <Counter />
    }
}
```

### 非同步資料與 Suspense

```rust
use leptos::*;

async fn fetch_user(id: u32) -> Result<String, String> {
    // 實際上這裡會呼叫 API
    Ok(format!("User #{}", id))
}

#[component]
fn UserProfile(id: u32) -> impl IntoView {
    let user = create_resource(move || id, fetch_user);

    view! {
        <Suspense fallback=|| view! { <p>"載入中..."</p> }>
            {move || user.get().map(|result| {
                match result {
                    Ok(name) => view! { <p>{name}</p> }.into_view(),
                    Err(e) => view! { <p class="error">{e}</p> }.into_view(),
                }
            })}
        </Suspense>
    }
}
```

Leptos 最大的優勢是它的響應式系統非常精細，只更新真正變動的 DOM 節點，效能接近手寫 DOM 操作。

---

## Yew 框架：類 React 的元件模型

如果你更熟悉 React，Yew 的心智模型會更親切。

### 基本元件

```rust
use yew::prelude::*;

#[derive(Properties, PartialEq)]
pub struct ButtonProps {
    pub label: String,
    pub on_click: Callback<MouseEvent>,
}

#[function_component]
fn Button(props: &ButtonProps) -> Html {
    html! {
        <button onclick={props.on_click.clone()}>
            { &props.label }
        </button>
    }
}

#[function_component]
fn App() -> Html {
    let count = use_state(|| 0);

    let increment = {
        let count = count.clone();
        Callback::from(move |_| count.set(*count + 1))
    };

    html! {
        <div>
            <p>{ format!("計數：{}", *count) }</p>
            <Button label="增加" on_click={increment} />
        </div>
    }
}
```

### Leptos vs Yew 選哪個？

| 面向 | Leptos | Yew |
|------|--------|-----|
| 響應式模型 | Signals（類 Solid.js） | Hooks（類 React） |
| 效能 | 極高（細粒度更新） | 高（VDOM diff） |
| SSR 支援 | 內建完整 | 實驗性 |
| 學習曲線 | 中（需理解 signals） | 低（React 背景） |
| 生態系統 | 成長中 | 成長中 |

如果你要做 SSR/全端應用，選 Leptos。如果你的團隊有 React 背景，Yew 上手更快。

---

## 實用工具鏈

### cargo：Rust 的 npm

```bash
# 建立新專案
cargo new my-project

# 加入依賴
cargo add serde --features derive

# 建置
cargo build --release

# 執行測試
cargo test

# 格式化程式碼
cargo fmt

# 靜態分析
cargo clippy
```

### trunk：前端 WASM 的開發伺服器

Trunk 是針對 WASM 前端開發的工具，類似 Vite：

```bash
cargo install trunk

# index.html
# <!DOCTYPE html>
# <html><head><link data-trunk rel="rust" /></head><body></body></html>

trunk serve  # 開發伺服器，支援 hot reload
trunk build  # 生產建置
```

### wasm-pack：函式庫打包

```bash
# 打包為 npm 套件
wasm-pack build --target bundler

# 打包為瀏覽器直接使用
wasm-pack build --target web

# 打包為 Node.js
wasm-pack build --target nodejs

# 發佈到 npm
wasm-pack publish
```

---

## 效能基準：WASM 對比 JavaScript

以 Fibonacci(40) 為基準測試（遞迴，計算密集）：

| 實作 | 執行時間 | 相對速度 |
|------|----------|----------|
| JavaScript | ~1,800ms | 1x |
| JavaScript (最佳化) | ~800ms | 2.25x |
| Rust WASM | ~180ms | 10x |
| Rust Native | ~120ms | 15x |

**WASM 真正發光的場景：**
- 影像/視訊處理（像素操作）
- 加密/雜湊運算
- 物理模擬
- 資料壓縮
- 複雜數學運算（音訊 DSP、3D 渲染）

**WASM 優勢不明顯的場景：**
- DOM 操作（WASM 呼叫 DOM API 有開銷）
- 簡單的資料流轉換
- 網路請求處理

```javascript
// 效能測試範例
async function benchmark() {
  await init();

  const iterations = 100;

  // JavaScript 版本
  const jsStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    fibJS(35);
  }
  const jsTime = performance.now() - jsStart;

  // WASM 版本
  const wasmStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    fibonacci(35); // Rust WASM
  }
  const wasmTime = performance.now() - wasmStart;

  console.log(`JS: ${jsTime.toFixed(2)}ms`);
  console.log(`WASM: ${wasmTime.toFixed(2)}ms`);
  console.log(`WASM 快 ${(jsTime / wasmTime).toFixed(1)}x`);
}
```

---

## 何時用 Rust/WASM，何時繼續用 JavaScript

### 用 Rust/WASM 的時機

**計算瓶頸明確：** 用 profiler 確認你的效能問題真的在計算，而不是網路或 DOM。

**需要跨平台程式碼：** 同一個 Rust 函式庫可以同時輸出 WASM（瀏覽器）、Native（桌面/行動）、CLI，大幅減少重複邏輯。

**安全敏感的運算：** Rust 的記憶體安全保證對加密實作特別有價值。

**已有 Rust/C/C++ 函式庫：** 透過 wasm-bindgen 包裝現有的原生函式庫，不需要重寫。

### 繼續用 JavaScript 的時機

**UI 互動邏輯：** 按鈕點擊、表單驗證、動畫——這些場景 JS 完全夠用，WASM 反而增加複雜度。

**快速迭代的業務邏輯：** Rust 的編譯時間（雖然已大幅改善）和更嚴格的類型系統會拖慢原型開發速度。

**小型專案或 MVP：** 導入 WASM 增加了建置工具複雜度，對小專案得不償失。

**團隊沒有 Rust 背景：** 學習曲線是真實的。評估收益是否值得培訓成本。

### 漸進式採用策略

最務實的做法是**混合架構**：

1. 先用 JavaScript 完成整個專案
2. 用 profiler 找出真正的效能瓶頸
3. 只把那個函式/模組用 Rust 重寫成 WASM
4. 透過 wasm-pack 生成的 JS 包裝無縫整合

```javascript
// 漸進式整合範例：影像濾鏡
import init, { apply_blur_filter } from './pkg/image_processor.js';

// WASM 只負責計算密集的濾鏡
async function processImage(imageData) {
  await init();

  const pixels = new Uint8Array(imageData.data.buffer);
  const processed = apply_blur_filter(pixels, imageData.width, imageData.height);

  // 結果回傳給 JS 處理 DOM
  const ctx = canvas.getContext('2d');
  ctx.putImageData(new ImageData(processed, imageData.width), 0, 0);
}
```

---

## 開始你的 Rust 之旅

**學習路徑建議：**

1. **第一週**：讀 [The Rust Book](https://doc.rust-lang.org/book/) 前 10 章，重點理解所有權。
2. **第二週**：用 `wasm-pack` 建一個小 WASM 函式庫，整合進你現有的前端專案。
3. **第三週**：用 Leptos 或 Yew 建一個簡單的計數器/TODO app。
4. **之後**：找你專案中真正有效能問題的地方，嘗試 Rust 化。

Rust 的學習曲線確實比 TypeScript 陡，但一旦你理解了所有權，你會發現它讓你對記憶體管理有更深的理解，甚至讓你寫出更好的 JavaScript。

2026 年，WASM 已經不是實驗性技術。如果你在做效能敏感的前端應用，Rust + WASM 是值得投資的技能組合。
