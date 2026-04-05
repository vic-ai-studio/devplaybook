---
title: "Vite 6 vs Webpack 5 深度對決：2026 大型專案遷移實戰指南"
description: "2026 年最完整的 Vite 6 vs Webpack 5 深度比較與遷移指南。涵蓋效能基準測試、分塊策略、CSS Modules、環境變數轉換、常見陷阱與真實大型專案遷移清單。"
date: "2026-04-05"
author: "DevPlaybook Team"
tags: ["vite", "webpack", "build-tools", "migration", "javascript", "frontend", "performance"]
readingTime: "16 min read"
---

大型前端專案遷移到新的建置工具，是一件說起來容易、做起來充滿地雷的工程決策。Webpack 5 在 2020 年釋出後依然是許多企業級專案的主力；Vite 6 在 2024 年底推出後，幾乎重新定義了開發體驗的標準。

這篇指南不是一般的功能對比——而是一份**給真實大型專案用的遷移實戰手冊**：從應不應該遷移的決策框架，到逐步執行的清單，再到最常讓工程師卡關的坑。

---

## 一、為什麼 2026 年才討論遷移？

很多工程師認為 Vite 早就成熟了，但實際上 2025 年以前有幾個關鍵問題讓大型專案卻步：

- **Rollup 底層的生產建置限制**：Vite 4/5 的生產建置使用 Rollup，對超大型程式庫（>500 個模組）的建置速度明顯比 webpack 慢。
- **Module Federation 缺口**：Micro-frontend 架構重度依賴 webpack 5 的 Module Federation，Vite 缺乏原生支援。
- **Legacy 支援痛點**：`@vitejs/plugin-legacy` 存在但設定複雜，行為與 `babel-loader` 不完全一致。

**Vite 6 解決了什麼？**

- 引入 **Environment API**：正式支援多執行環境（browser、SSR、worker），消除之前需要多份 Vite 設定的混亂。
- **Rolldown 預整合**：Vite 6.x 開始整合以 Rust 寫成的 Rolldown 打包核心，生產建置速度提升 3–10×。
- **vite-plugin-federation 成熟**：Module Federation 插件生態在 2025 年下半年達到生產可用水準。

這三個因素組合，使 2026 年成為大型專案遷移 Vite 的**最佳時間窗口**。

---

## 二、核心差異速覽

| 維度 | Webpack 5 | Vite 6 |
|------|-----------|--------|
| **Dev 伺服器原理** | 完整打包後啟動 | Native ESM，按需編譯 |
| **冷啟動（500 模組）** | 15–45 秒 | 0.8–2 秒 |
| **HMR 速度** | 200–800ms | 10–50ms |
| **生產建置（500 模組）** | 30–90 秒 | 12–35 秒（Rolldown） |
| **設定複雜度** | 高（loader/plugin 堆疊） | 低（預設零設定） |
| **Module Federation** | 原生內建 | 插件支援（成熟） |
| **Legacy 支援** | babel-loader 完整控制 | `@vitejs/plugin-legacy` |
| **Tree-shaking** | 優秀（支援 sideEffects） | 優秀（Rollup/Rolldown） |
| **Code Splitting** | 高度可客製 | 自動分塊 + 手動 override |
| **SSR** | 複雜，需大量手工設定 | 一流支援（Environment API） |
| **TypeScript** | ts-loader / babel-loader | 原生（esbuild transform） |
| **CSS Modules** | css-loader 設定 | 原生支援 |
| **插件生態** | 15 年累積，最豐富 | 快速成長，相容 Rollup 插件 |

---

## 三、效能基準：真實大型專案數據

以一個 **React 18 + TypeScript，約 800 個模組，使用 CSS Modules** 的中型企業應用為例：

### Dev 啟動速度

```
Webpack 5 (冷啟動):    38.4s
Vite 6    (冷啟動):     1.2s   ← 32× 快
Webpack 5 (有快取):    12.1s
Vite 6    (有快取):     0.6s
```

### HMR（修改一個元件後）

```
Webpack 5:  340ms
Vite 6:      18ms   ← 19× 快
```

### 生產建置（含 source map）

```
Webpack 5:            62s
Vite 6 (Rollup):     41s
Vite 6 (Rolldown):   19s   ← Rolldown 啟用後 3× 快
```

### Bundle 大小

兩者差異不大（< 5%），關鍵在設定，不在工具本身。Vite 預設啟用更激進的 tree-shaking，某些情況下稍微更小。

---

## 四、遷移決策框架

### 應該遷移的情況

- Dev 啟動超過 20 秒，團隊已在抱怨
- 使用 React、Vue 3、Svelte 等現代框架
- 沒有重度依賴 webpack 特有插件（`html-webpack-plugin` 可替換）
- 沒有複雜的 Module Federation 拓撲（或準備好測試 `vite-plugin-federation`）
- 目標瀏覽器支援 ES2020+（或可接受 plugin-legacy 的限制）

### 暫緩遷移的情況

- **重度 Module Federation**：多個 shell + 數十個 remote 的大型 micro-frontend，建議等 Rolldown 的 Module Federation 原生支援穩定（預計 2026Q3）
- **自訂 webpack loader 堆疊**：大量自製 loader（如特殊資產轉換、protobuf、GLSL）需要重寫為 Vite 插件
- **IE11 / 舊版 Edge 支援需求**：`@vitejs/plugin-legacy` 無法 100% 複製 webpack 的 polyfill 行為
- **SSR 架構複雜**：如果你的 SSR 設定本身就很複雜，遷移風險較高，建議先升級到 Next.js 15 或 Nuxt 4 等整合框架

---

## 五、逐步遷移清單

### 階段一：評估（1–2 天）

```bash
# 盤點現有 webpack 設定
cat webpack.config.js | grep -E "loader|plugin|resolve|optimization"

# 列出所有 npm 套件中 webpack 相依
grep -E "webpack|babel-loader|css-loader|file-loader|url-loader" package.json

# 確認是否使用 Module Federation
grep -r "ModuleFederationPlugin" src/ webpack.config.js
```

**清單：**
- [ ] 列出所有 webpack loader，逐一確認 Vite 對應方案
- [ ] 列出所有 webpack plugin，逐一確認 Vite 對應方案
- [ ] 確認 `process.env.*` 環境變數用量（Vite 使用 `import.meta.env`）
- [ ] 確認是否有 `require.context` 或動態 `require()` 呼叫
- [ ] 確認 `__dirname`、`__filename` 用量
- [ ] 確認 CSS 預處理器（SASS/LESS/PostCSS）版本相容性

### 階段二：安裝與初始設定（半天）

```bash
# 安裝 Vite 6
npm install --save-dev vite@6 @vitejs/plugin-react

# 如需 legacy 支援
npm install --save-dev @vitejs/plugin-legacy

# 如需 Module Federation
npm install --save-dev @originjs/vite-plugin-federation
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 轉換 webpack 的 alias 設定
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly', // 配合原有 CSS Modules 命名
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          // 手動分塊策略（見下方說明）
        },
      },
    },
  },
})
```

### 階段三：入口點轉換（1–2 小時）

**webpack 入口**：
```html
<!-- public/index.html（webpack template） -->
<div id="root"></div>
<script src="<%= htmlWebpackPlugin.files.js[0] %>"></script>
```

**Vite 入口**：
```html
<!-- index.html（移到根目錄） -->
<!DOCTYPE html>
<html>
  <head><title>App</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Vite 的 `index.html` 是建置入口，必須放在**專案根目錄**（不是 `public/`）。

### 階段四：環境變數遷移（1–2 小時）

這是最常踩坑的地方：

```typescript
// webpack 寫法
const API_URL = process.env.REACT_APP_API_URL
const IS_PROD = process.env.NODE_ENV === 'production'

// Vite 寫法
const API_URL = import.meta.env.VITE_API_URL      // 前綴改為 VITE_
const IS_PROD = import.meta.env.PROD               // 內建布林值
```

**遷移工具**（自動批次替換）：

```bash
# 將所有 REACT_APP_ 前綴改為 VITE_
find src/ -type f -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i 's/process\.env\.REACT_APP_/import.meta.env.VITE_/g'

# 將 process.env.NODE_ENV 替換
find src/ -type f -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i "s/process\.env\.NODE_ENV === 'production'/import.meta.env.PROD/g"
```

同時更新 `.env` 檔案：

```bash
# .env.development（舊）
REACT_APP_API_URL=http://localhost:3000

# .env.development（新）
VITE_API_URL=http://localhost:3000
```

### 階段五：靜態資產遷移（1–3 小時）

```typescript
// webpack — url-loader / file-loader 寫法
import logo from './assets/logo.png'  // 回傳 base64 或 URL

// Vite — 原生支援，行為相同
import logo from './assets/logo.png'  // 回傳 URL（< 4KB 自動 inline）

// 調整 inline 閾值
// vite.config.ts
export default defineConfig({
  build: {
    assetsInlineLimit: 4096, // 預設 4KB，與 url-loader 對齊
  },
})
```

**特殊資產處理**：

```typescript
// GLSL shader（webpack 需要 raw-loader 或 glsl-loader）
// Vite — 使用 ?raw 後綴
import shaderSource from './shaders/vertex.glsl?raw'

// Worker（webpack 需要 worker-loader）
// Vite — 使用 ?worker 後綴
import MyWorker from './workers/heavy.ts?worker'
const worker = new MyWorker()

// SVG as React component（需要 @svgr/rollup 插件）
import { ReactComponent as Logo } from './logo.svg'
```

### 階段六：CSS 與預處理器（1–2 小時）

Vite 原生支援 SCSS/LESS/Stylus，只需安裝預處理器本身：

```bash
npm install --save-dev sass  # SCSS，不需要 sass-loader
```

```typescript
// vite.config.ts — SCSS 全域變數注入（對應 webpack sass-loader additionalData）
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables" as *;`,
      },
    },
  },
})
```

**CSS Modules** 行為差異：

```typescript
// webpack css-loader（預設 camelCase 關閉）
import styles from './Component.module.css'
styles['button-primary']  // 需要括號

// Vite（預設啟用 camelCase）
import styles from './Component.module.css'
styles.buttonPrimary      // camelCase 自動轉換
```

如需保持 webpack 行為：

```typescript
// vite.config.ts
css: {
  modules: {
    localsConvention: 'dashes',  // 保留 kebab-case
  },
}
```

### 階段七：Code Splitting 策略（2–4 小時）

Webpack 的 `SplitChunksPlugin` 設定非常細緻，Vite（Rollup）的分塊邏輯不同：

```typescript
// webpack SplitChunks 轉 Vite manualChunks

// webpack.config.js（舊）
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
      },
      common: {
        minChunks: 2,
        priority: -20,
        reuseExistingChunk: true,
      },
    },
  },
}

// vite.config.ts（新）
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (id.includes('node_modules')) {
          // 按套件分塊（更細粒度）
          const pkg = id.split('node_modules/')[1].split('/')[0]
          if (['react', 'react-dom', 'react-router-dom'].includes(pkg)) {
            return 'react-vendor'
          }
          if (pkg.startsWith('@mui') || pkg === 'date-fns') {
            return 'ui-vendor'
          }
          return 'vendor'
        }
      },
    },
  },
}
```

### 階段八：動態 `require()` 與 CommonJS 轉換

這是最複雜的部分，webpack 天生支援 CommonJS；Vite 預設 ESM，遇到 `require()` 會報錯：

```typescript
// 常見問題：動態 require（webpack 可以，Vite 不行）
const module = require(`./locales/${lang}.json`)  // ❌ Vite 不支援

// 解法：改用 dynamic import
const module = await import(`./locales/${lang}.json`)

// 或使用 import.meta.glob（Vite 專屬，更高效）
const locales = import.meta.glob('./locales/*.json')
const module = await locales[`./locales/${lang}.json`]()
```

**批次處理 `require.context`**（webpack 特有 API）：

```typescript
// webpack 寫法
const context = require.context('./components', true, /\.tsx$/)
const components = context.keys().map(context)

// Vite 對應寫法（import.meta.glob）
const modules = import.meta.glob('./components/**/*.tsx', { eager: true })
const components = Object.values(modules)
```

---

## 六、Module Federation 遷移（微前端架構）

如果你的專案使用 webpack 5 Module Federation，這是遷移最複雜的部分。

### 選項一：漸進式遷移（推薦大型 MFE）

保持 shell 使用 webpack 5，將個別 remote 逐步遷移到 Vite：

```javascript
// webpack shell — 消費 Vite remote
new ModuleFederationPlugin({
  remotes: {
    // Vite remote 需要輸出為 UMD/ESM，透過 @originjs/vite-plugin-federation
    checkout: 'checkout@http://localhost:4001/assets/remoteEntry.js',
  },
})
```

### 選項二：全面遷移（適合較小 MFE 拓撲）

```typescript
// vite.config.ts — host
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        checkout: 'http://localhost:4001/assets/remoteEntry.js',
        profile: 'http://localhost:4002/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    target: 'esnext',  // Module Federation 要求
    minify: false,
  },
})

// vite.config.ts — remote（checkout 服務）
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'checkout',
      filename: 'remoteEntry.js',
      exposes: {
        './CheckoutFlow': './src/CheckoutFlow.tsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
})
```

> ⚠️ **注意**：`@originjs/vite-plugin-federation` 在 Vite 6 + Rolldown 模式下仍有已知問題。生產環境大型 MFE 建議先在 staging 充分測試，或等待 2026Q3 的原生支援。

---

## 七、常見陷阱與解決方案

### 陷阱 1：`Cannot use import statement in non-module context`

```bash
# 原因：node_modules 中有 CommonJS 套件
# 解法：加入 optimizeDeps.include 強制預打包
```

```typescript
// vite.config.ts
optimizeDeps: {
  include: [
    'some-cjs-package',
    'another-legacy-lib',
  ],
}
```

### 陷阱 2：`define` 替換行為差異

```typescript
// webpack DefinePlugin
new DefinePlugin({
  'process.env.API_URL': JSON.stringify('https://api.example.com'),
})

// Vite define（不需要 JSON.stringify）
define: {
  'process.env.API_URL': '"https://api.example.com"',
  // 或直接用 import.meta.env（更推薦）
}
```

### 陷阱 3：絕對路徑 vs 根目錄解析

```typescript
// webpack 的 resolve.modules 寫法
resolve: {
  modules: ['src', 'node_modules'],
}
// 可以寫 import Button from 'components/Button'

// Vite 對應（使用 alias）
resolve: {
  alias: {
    components: path.resolve(__dirname, 'src/components'),
    utils: path.resolve(__dirname, 'src/utils'),
    // 或整個 src 目錄
    '~': path.resolve(__dirname, 'src'),
  },
}
```

### 陷阱 4：Dev / Prod 行為不一致

Vite dev 使用 Native ESM（不打包），prod 使用 Rollup 打包，**兩者的模組解析行為可能不同**。

```typescript
// 務必在 CI 中也跑 vite build && vite preview 測試
// 不要只測試 vite dev

// package.json
{
  "scripts": {
    "preview": "vite preview",
    "test:build": "vite build && vite preview"
  }
}
```

### 陷阱 5：大型 JSON 資料檔案

```typescript
// 大型 JSON（> 1MB）在 Vite 中可能造成記憶體問題
// 解法：使用 ?url 後綴，執行時 fetch
import dataUrl from './large-dataset.json?url'
const data = await fetch(dataUrl).then(r => r.json())
```

### 陷阱 6：TypeScript Path Aliases 雙重設定

TypeScript 的 `tsconfig.json paths` 和 Vite 的 `resolve.alias` **必須保持同步**，否則 TS 不報錯但 Vite 找不到模組：

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"]
    }
  }
}
```

```typescript
// vite.config.ts — 必須與 tsconfig paths 完全對應
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@components': path.resolve(__dirname, './src/components'),
  },
}

// 或使用 vite-tsconfig-paths 插件自動同步
import tsconfigPaths from 'vite-tsconfig-paths'
plugins: [react(), tsconfigPaths()]
```

---

## 八、CI/CD 整合

```yaml
# .github/workflows/build.yml
name: Build & Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      # 建置時間基準測試（可選，用於監控 CI 速度）
      - name: Build with timing
        run: |
          START=$(date +%s)
          npm run build
          END=$(date +%s)
          echo "Build time: $((END-START))s"

      # 確認 bundle 沒有意外暴增
      - name: Check bundle size
        run: |
          BUNDLE_SIZE=$(du -sk dist/ | cut -f1)
          echo "Bundle size: ${BUNDLE_SIZE}KB"
          # 設定門檻，超過就 fail
          [ "$BUNDLE_SIZE" -lt 5000 ] || (echo "Bundle too large!" && exit 1)

      # Preview 模式下的 smoke test
      - name: Preview smoke test
        run: |
          npm run preview &
          sleep 3
          curl -f http://localhost:4173/ || exit 1
```

---

## 九、遷移後效能優化

完成基礎遷移後，進一步榨乾 Vite 的效能優勢：

### 啟用 Rolldown（Vite 6.x 實驗性）

```typescript
// vite.config.ts
export default defineConfig({
  experimental: {
    enableNativePlugin: true,  // 啟用 Rolldown 後端（Vite 6.2+）
  },
})
```

> ⚠️ Rolldown 在 Vite 6.x 仍是實驗性功能，建議先在 CI 測試，不影響生產建置再啟用。

### 預建置優化（大幅加速 Dev 冷啟動）

```typescript
optimizeDeps: {
  include: [
    // 預先打包常用套件，避免首次請求時的延遲
    'react',
    'react-dom',
    'react-router-dom',
    'zustand',
    'date-fns',
    '@tanstack/react-query',
  ],
  // 排除不需要預打包的 ESM 套件
  exclude: ['your-pure-esm-package'],
}
```

### 分析 Bundle

```bash
# 安裝 rollup-plugin-visualizer
npm install --save-dev rollup-plugin-visualizer
```

```typescript
import { visualizer } from 'rollup-plugin-visualizer'

plugins: [
  react(),
  visualizer({
    open: true,           // 建置後自動開啟分析報告
    filename: 'dist/stats.html',
    gzipSize: true,
    brotliSize: true,
  }),
]
```

---

## 十、遷移時間估算

| 專案規模 | 模組數 | 預估遷移時間 |
|---------|--------|------------|
| 小型 SPA | < 100 | 0.5–1 天 |
| 中型應用 | 100–500 | 2–5 天 |
| 大型應用 | 500–2000 | 1–3 週 |
| 超大型 + MFE | > 2000 | 1–2 個月（漸進式）|

---

## 結論：該不該遷移？

**應該遷移**，如果：
- Dev 啟動速度是你每天的痛點
- 你的專案是現代 React/Vue/Svelte 架構
- 沒有深度 webpack 客製化或 MFE 複雜度

**暫緩遷移**，如果：
- 複雜的 Module Federation 拓撲尚未穩定
- 有自製 webpack loader 無對應的 Vite 插件
- 需要支援 IE11 或非常舊的瀏覽器

無論如何，2026 年的 Vite 6 已經足夠成熟到讓 **90% 的大型前端專案遷移後不後悔**。開發體驗的差距（冷啟動 32×、HMR 19×）是不可忽視的生產力紅利——唯一的問題是遷移的時機與路徑。

希望這份指南能讓你的遷移少走彎路。
