# 前端面試題

**55 道題目**，涵蓋 HTML/CSS、JavaScript、React、TypeScript、效能與無障礙設計。

---

## HTML & CSS（10 題）

### 1. `display: none` 和 `visibility: hidden` 有什麼差別？ `[初級]`

**解答：**
- `display: none`：元素從文件流移除，完全不占空間、不渲染。
- `visibility: hidden`：元素隱藏但**保留原本空間**，仍占位。

**延伸問題：** `opacity: 0` 呢？元素不可見但仍占空間，且仍能接收滑鼠事件（除非同時設 `pointer-events: none`）。

---

### 2. 說明 CSS 盒模型（Box Model）。 `[初級]`

**解答：**
每個元素都是一個矩形盒子，由內到外依序為：
1. **Content**（內容）
2. **Padding**（內距）
3. **Border**（邊框）
4. **Margin**（外距）

預設 `width`/`height` 只計算 content。設定 `box-sizing: border-box` 後，`width`/`height` 會包含 padding 和 border，讓版面計算更直觀。

---

### 3. `em`、`rem`、`%`、`vw`、`vh` 的差別？ `[初級]`

**解答：**
- `em`：相對於**父元素**字體大小
- `rem`：相對於**根元素（html）**字體大小，更可預測
- `%`：相對於父元素對應屬性（如 `width: 50%` = 父寬的 50%）
- `vw`：視窗寬度的 1%
- `vh`：視窗高度的 1%

**最佳實踐：** 字體用 `rem`（尊重使用者瀏覽器設定），全螢幕版面用 `vw`/`vh`。

---

### 4. 什麼是 CSS 選擇器優先級（Specificity）？如何計算？ `[中級]`

**解答：**
優先級決定多條規則衝突時哪條生效，以 `(行內, ID, class/屬性/偽類, 元素/偽元素)` 四位數表示：

| 選擇器 | 分數 |
|--------|------|
| `*` | 0,0,0,0 |
| `p` | 0,0,0,1 |
| `.class` | 0,0,1,0 |
| `#id` | 0,1,0,0 |
| `style=""` | 1,0,0,0 |
| `!important` | 覆蓋全部 |

**避免優先級戰爭：** 使用 BEM 命名、避免 `!important`、保持選擇器扁平。

---

### 5. Flexbox 和 CSS Grid 有什麼差別？ `[中級]`

**解答：**
- **Flexbox**：一維排版（橫向**或**縱向）。適合元件層級排版（導覽列、卡片行、置中）。
- **Grid**：二維排版（同時處理列**和**欄）。適合頁面級版面、複雜格線。

**選擇時機：**
- 導覽列 → Flexbox
- 相片圖庫 → Grid
- 將 div 置中 → Flexbox（`display:flex; align-items:center; justify-content:center`）

---

### 6. 什麼是 CSS 疊加上下文（Stacking Context）？ `[中級]`

**解答：**
疊加上下文是一個三維空間，子元素在此沿 z 軸疊加。以下情況會建立新的疊加上下文：
- `position: relative/absolute/fixed/sticky` + `z-index` 非 `auto`
- `opacity < 1`
- `transform`、`filter`、`will-change`、`isolation: isolate`

**關鍵：** `z-index` 只在同一疊加上下文內有效。子元素設再高的 `z-index` 也無法超越不同疊加上下文的兄弟元素。

---

### 7. 說明 `position` 的各個值。 `[初級]`

**解答：**
- `relative`：相對**自身原始位置**偏移，仍佔原來空間
- `absolute`：脫離文件流，相對最近**已定位**的祖先元素
- `fixed`：相對**視窗**定位，滾動時固定不動
- `sticky`：混合型，滾動到閾值前像 `relative`，之後像 `fixed`

---

### 8. 什麼是 CSS 自訂屬性（Custom Properties / CSS 變數）？ `[中級]`

**解答：**
```css
:root {
  --primary-color: #3b82f6;
  --base-font-size: 16px;
}
.button {
  background: var(--primary-color);
  font-size: var(--base-font-size);
}
```
**特點：** 支援繼承與串聯、可在任何作用域覆蓋、可透過 JS 動態修改（`element.style.setProperty('--color', 'red')`）。與預處理器變數不同，CSS 變數是**動態的**，可在執行期改變。

---

### 9. 什麼是 `@media` 查詢？如何實作響應式設計？ `[初級]`

**解答：**
```css
/* Mobile-first 方式 */
.container { padding: 16px; }

@media (min-width: 768px) {
  .container { padding: 32px; }
}

@media (prefers-color-scheme: dark) {
  body { background: #111; }
}
```
**Mobile-first vs Desktop-first：** Mobile-first 用 `min-width`（從小加複雜性），效能較佳，是主流做法。

---

### 10. `will-change` 有什麼用途？ `[高級]`

**解答：**
提示瀏覽器某元素即將發生特定變化，讓瀏覽器預先優化（如提升至獨立合成層）：
```css
.animated { will-change: transform; }
```
**注意：** 只對確定會動畫的元素使用。過度使用會消耗大量 GPU 記憶體。最好動態加入，動畫結束後移除。

---

## JavaScript（20 題）

### 11. `var`、`let`、`const` 有什麼差別？ `[初級]`

**解答：**
| | `var` | `let` | `const` |
|---|---|---|---|
| 作用域 | 函式 | 區塊 | 區塊 |
| 提升 | 是（undefined） | 是（TDZ 錯誤） | 是（TDZ 錯誤） |
| 重複宣告 | 可以 | 不行 | 不行 |
| 重新賦值 | 可以 | 可以 | 不行 |

**TDZ（暫時性死區）：** `let`/`const` 被提升但未初始化，宣告前存取會拋出 `ReferenceError`。

---

### 12. 說明 JavaScript 的閉包（Closure）。 `[中級]`

**解答：**
閉包是一個函式，能記住並存取其外部作用域的變數，即使外部函式已執行完畢。

```javascript
function makeCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    value: () => count,
  };
}
const counter = makeCounter();
counter.increment(); // 1
counter.increment(); // 2
```

**實際應用：** 資料封裝、工廠函式、事件處理器、記憶化。

---

### 13. 什麼是 JavaScript 的事件迴圈（Event Loop）？ `[中級]`

**解答：**
JavaScript 是單執行緒的。事件迴圈讓非阻塞的非同步操作成為可能：

1. **呼叫堆疊（Call Stack）**：同步程式碼在此執行
2. **Web APIs**：處理非同步操作（setTimeout、fetch、DOM 事件）
3. **回呼佇列（Macrotask Queue）**：Web API 的回呼排隊等候
4. **微任務佇列（Microtask Queue）**：Promise 的 `.then`、`async/await`

**執行順序：** 每個 macrotask 後，**所有** microtask 都會先清空，才執行下一個 macrotask。

```javascript
console.log('1');
setTimeout(() => console.log('4'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('2');
// 輸出：1, 2, 3, 4
```

---

### 14. 什麼是 JavaScript 的原型繼承？ `[中級]`

**解答：**
每個 JavaScript 物件都有一個內部 `[[Prototype]]` 連結到另一個物件。存取屬性時，JS 會沿著原型鏈查找，直到找到或到達 `null`。

```javascript
const animal = { breathe() { return '呼吸中'; } };
const dog = Object.create(animal);
dog.bark = () => '汪汪';
dog.breathe(); // '呼吸中'（繼承自 animal）
```

`class` 語法是原型繼承的語法糖，`extends` 設定原型鏈。

---

### 15. 說明 JavaScript 的 `this`。 `[中級]`

**解答：**
`this` 指向執行上下文，根據呼叫方式而改變：

| 上下文 | `this` 值 |
|--------|----------|
| 全域（非嚴格） | `window`（瀏覽器） |
| 物件方法 | 該物件 |
| 箭頭函式 | 詞法 `this`（繼承外部作用域） |
| `new` 呼叫 | 新建立的實例 |
| `call`/`apply`/`bind` | 第一個參數 |

**關鍵：** 箭頭函式**沒有自己的 `this`**，這正是在類別方法中用它作為回呼的原因。

---

### 16. `async/await` 是什麼，如何運作？ `[初級]`

**解答：**
`async/await` 是 Promise 的語法糖，讓非同步程式碼看起來像同步的：

```javascript
async function getUser() {
  try {
    const res = await fetch('/api/user');
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(err);
  }
}
```

`await` 暫停 `async` 函式執行直到 Promise 解決，**不會阻塞執行緒**。

**延伸問題：** 如何並行執行多個非同步請求？用 `Promise.all([fetch1, fetch2])`，而非連續的 `await`。

---

### 17. `==` 和 `===` 有什麼差別？ `[初級]`

**解答：**
- `===`（嚴格相等）：同時比較值**和型別**，不做型別轉換。**永遠使用這個。**
- `==`（寬鬆相等）：比較前進行型別強制轉換，導致意外結果：

```javascript
0 == false     // true
'' == false    // true
null == undefined // true（這是 == 少數合理使用場景）
```

---

### 18. 什麼是 JavaScript 的生成器（Generator）？ `[高級]`

**解答：**
生成器是可以暫停和恢復的函式，按需產生多個值：

```javascript
function* range(start, end) {
  for (let i = start; i <= end; i++) yield i;
}
const gen = range(1, 3);
gen.next(); // { value: 1, done: false }
gen.next(); // { value: 2, done: false }
gen.next(); // { value: 3, done: false }
```

**應用：** 惰性序列、無限串流、自訂迭代器、redux-saga。

---

### 19. 什麼是記憶化（Memoization）？何時使用？ `[中級]`

**解答：**
記憶化快取昂貴函式呼叫的結果，相同輸入直接返回快取值：

```javascript
function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
```

**使用時機：** 純函式（同輸入同輸出）、計算昂貴的函式、遞迴演算法。React 的 `useMemo` 和 `useCallback` 都是記憶化的形式。

---

### 20. `null`、`undefined`、`NaN` 的差別？ `[初級]`

**解答：**
- `undefined`：變數宣告但未賦值、函式無回傳值、不存在的屬性
- `null`：明確賦值的「無值」，`typeof null === 'object'`（歷史遺留 bug）
- `NaN`：「非數字」，無效數學運算的結果。`typeof NaN === 'number'`。`NaN !== NaN`，需用 `Number.isNaN()` 判斷。

---

### 21. JavaScript 的垃圾回收如何運作？ `[中級]`

**解答：**
現代引擎使用**標記清除（mark-and-sweep）**演算法：
1. 從「根」（全域物件、呼叫堆疊的變數）開始
2. 標記所有可從根到達的物件
3. 清除（釋放）所有未標記的物件

**記憶體洩漏的常見原因：**
- 未清除的計時器/定時器保持引用
- 意外的全域變數
- 閉包不必要地保留大物件
- 從 DOM 移除但 JS 仍引用的節點

---

### 22. 什麼是事件委派（Event Delegation）？ `[中級]`

**解答：**
不為每個子元素綁定事件監聽器，而是在父元素上綁定一個，利用 `event.target` 判斷觸發元素：

```javascript
document.querySelector('.list').addEventListener('click', (e) => {
  if (e.target.matches('.item')) handleClick(e);
});
```

**優點：** 效能好（一個監聽器 vs N 個）、動態新增的元素也有效。

---

### 23. `call`、`apply`、`bind` 的差別？ `[中級]`

**解答：**
三者都能明確設定 `this`：
- `call(context, arg1, arg2)`：立即呼叫，參數逐一傳入
- `apply(context, [arg1, arg2])`：立即呼叫，參數以陣列傳入
- `bind(context, arg1)`：回傳一個**新函式**（不立即執行），`this` 已綁定

---

### 24. JavaScript 中的不可變性（Immutability）概念。 `[中級]`

**解答：**
不修改現有資料，而是創建新資料：

```javascript
// 不可變模式
const newArr = [...arr, 4];                    // 展開運算子
const newObj = { ...obj, key: 'newValue' };    // 物件展開
const updated = arr.map(x => x * 2);          // 回傳新陣列
```

**為何重要：** 可預測的狀態、更易於除錯、啟用引用比較的變更偵測（React、Redux）。

---

### 25. JavaScript 的模組系統（ESM vs CJS）。 `[中級]`

**解答：**
- **CommonJS (CJS)：** `require()` / `module.exports`，用於 Node.js，同步載入
- **ES Modules (ESM)：** `import` / `export`，原生 JS 標準，非同步、靜態分析、支援 tree-shaking

```javascript
// CJS
const fs = require('fs');
module.exports = { fn };

// ESM
import { readFile } from 'fs/promises';
export { fn };
```

**為何 ESM 支援 tree-shaking？** 靜態 import 在編譯時可分析，打包工具能移除未使用的 export。

---

### 26. `Symbol` 是什麼？ `[高級]`

每次呼叫 `Symbol()` 都會返回唯一的不可變原始值，常用於：物件的「私有」屬性、知名符號（`Symbol.iterator`）、避免 key 衝突。

---

### 27. `WeakMap` 和 `WeakSet` 是什麼？ `[高級]`

弱引用集合，key/值為物件，不阻止垃圾回收。適合為 DOM 元素快取計算結果，不造成記憶體洩漏。

---

### 28. `Proxy` 物件是什麼？ `[高級]`

攔截並自訂物件操作（get、set、delete 等）。Vue 3 的響應式系統基於此實作。

---

### 29. JavaScript 的錯誤處理方式？ `[中級]`

使用 `try/catch/finally` 處理同步錯誤，`async/await` 配合 `try/catch` 處理非同步錯誤。使用 `window.addEventListener('unhandledrejection')` 作為最後防線。永遠不要吞掉未知的錯誤（`catch (e) {}`）。

---

### 30. 選擇性鏈（`?.`）和空值合併（`??`）？ `[初級]`

```javascript
user?.address?.city;   // undefined（不拋錯）
count ?? 'default';    // 0（0 不是 null/undefined）
count || 'default';    // 'default'（0 是假值—常見 bug）
```

---

## React（15 題）

### 31. 什麼是虛擬 DOM，React 如何使用它？ `[初級]`

**解答：**
虛擬 DOM 是真實 DOM 的輕量 JavaScript 表示。狀態改變時：
1. React 建立新的虛擬 DOM 樹
2. **Diffing**：與前一個比較（O(n) 演算法）
3. **調和（Reconciliation）**：計算最小變更
4. **提交**：只更新必要的真實 DOM 節點

---

### 32. `useMemo` 和 `useCallback` 的差別？ `[中級]`

- `useMemo`：記憶化**計算值**，依賴改變才重算
- `useCallback`：記憶化**函式參考**，依賴改變才回傳新函式

```javascript
const sortedList = useMemo(() => items.sort(...), [items]);
const handleClick = useCallback((id) => dispatch({ type: 'SELECT', id }), [dispatch]);
```

**使用時機：** 只在記憶化成本低於重新計算/重新渲染成本時才使用。

---

### 33. React 的調和（Reconciliation）和 `key` prop？ `[中級]`

`key` 幫助 React 識別列表中哪些項目改變/新增/移除。使用穩定、唯一的 ID（不要用 index），否則 React 會錯誤地複用 DOM 節點，導致輸入焦點、動畫等問題。

---

### 34. 什麼是 React Hooks？為什麼引入？ `[初級]`

React 16.8 引入 Hooks，讓函式元件能使用狀態和生命週期功能。解決了：類別元件的複雜生命週期、邏輯難以在元件間共享（HOC 和 render props 的 wrapper hell）、令人困惑的 `this` 綁定。

常用 Hook：`useState`、`useEffect`、`useContext`、`useRef`、`useReducer`、`useMemo`、`useCallback`

---

### 35. `useEffect` 的清理函式（cleanup function）？ `[中級]`

```javascript
useEffect(() => {
  const subscription = subscribe(userId);
  return () => subscription.unsubscribe(); // 清理：依賴改變或卸載前執行
}, [userId]);
```

沒有清理函式會導致：記憶體洩漏、已卸載元件的狀態更新警告。

---

### 36. React Context 的用途和限制？ `[中級]`

用於跨元件樹傳遞全域資料（主題、語系、當前使用者）而不需逐層傳遞 props。不適合頻繁更新（每次更新都導致所有消費者重新渲染）。

---

### 37. 受控元件和非受控元件的差別？ `[中級]`

- **受控：** React 是唯一資料來源，input 的值由 state 驅動
- **非受控：** DOM 是資料來源，透過 `ref` 在需要時取值

```jsx
// 受控
<input value={value} onChange={e => setValue(e.target.value)} />
// 非受控
<input ref={inputRef} defaultValue="initial" />
```

---

### 38. `React.memo` 的用途？ `[中級]`

高階元件，讓元件只在 props 改變時（淺比較）才重新渲染。適用於渲染頻繁但 props 常不變的昂貴元件。配合 `useMemo`/`useCallback` 確保物件/函式 props 的穩定性。

---

### 39. 函式元件的 React 渲染生命週期？ `[中級]`

```
渲染階段（純粹，無副作用）→ 提交階段 → useLayoutEffect（同步）→ 瀏覽器繪製 → useEffect（非同步）
```

---

### 40. 什麼是 React Server Components？ `[高級]`

RSC 讓元件只在**伺服器端**執行，可直接存取資料庫，不包含在 JS bundle 中。Client Components 需明確加上 `'use client'`。

---

### 41. React 的效能優化策略？ `[高級]`

- `React.memo`、`useMemo`、`useCallback` 防止不必要渲染
- 狀態同置（state co-location）
- `React.lazy` + `Suspense` 做程式碼分割
- `react-window`/`react-virtual` 處理大型列表（虛擬捲動）
- `useTransition` 標記非緊急更新

---

### 42. `useReducer` Hook 是什麼？ `[中級]`

處理複雜狀態的替代方案，遵循 Redux 模式：

```javascript
const [state, dispatch] = useReducer(reducer, initialState);
dispatch({ type: 'INCREMENT' });
```

適合：有多個子值的狀態、下一個狀態依賴前一個、狀態轉換邏輯複雜。

---

### 43. `useRef` Hook 的兩種用途？ `[中級]`

1. 直接存取 DOM 元素（如 `inputRef.current.focus()`）
2. 儲存不需觸發重新渲染的可變值（如渲染計數器）

---

### 44. 什麼是自訂 Hook？如何建立？ `[中級]`

以 `use` 開頭、可呼叫其他 Hook 的函式，用於提取可重用的狀態邏輯：

```javascript
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => { /* fetch logic */ }, [url]);
  return { data, loading, error };
}
```

---

### 45. React `Suspense` 是什麼？ `[高級]`

讓元件在「等待某事」時顯示後備 UI（fallback）。用於程式碼分割（`React.lazy`）和資料取得。React 18+ 支援 Streaming SSR，元件資料就緒後逐步渲染。

---

## TypeScript（10 題）

### 46. `interface` 和 `type` 的差別？ `[中級]`

**主要差異：**
- `interface` 支援宣告合併（declaration merging），適合公開 API 型別
- `type` 支援聯合型別、交叉型別、計算屬性、原始型別別名
- **建議：** 公開 API 用 `interface`，其他用 `type`

---

### 47. TypeScript 泛型（Generics）是什麼？ `[中級]`

```typescript
function identity<T>(arg: T): T { return arg; }

// 帶約束
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

讓程式碼在保持型別安全的前提下能處理多種型別。

---

### 48. TypeScript 的 `keyof` 和 `typeof`？ `[中級]`

```typescript
type UserKey = keyof User;        // 'id' | 'name' | 'email'
type Config = typeof configObj;   // 從值推導型別
```

---

### 49. TypeScript 的工具型別（Utility Types）？ `[中級]`

```typescript
Partial<T>       // 全部可選
Required<T>      // 全部必填
Readonly<T>      // 全部唯讀
Pick<T, 'a'|'b'> // 挑選屬性
Omit<T, 'c'>     // 排除屬性
Record<K, V>     // 鍵值對型別
ReturnType<typeof fn>  // 函式回傳值型別
```

---

### 50. 什麼是判別聯合（Discriminated Union）？ `[高級]`

有共同字面量屬性（判別子）的聯合型別，TypeScript 利用它做型別收窄：

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number };

function area(s: Shape) {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
  }
}
```

---

### 51. TypeScript 的型別收窄（Type Narrowing）？ `[中級]`

透過 `typeof`、`instanceof`、`in`、等值比較、型別謂語（`x is T`）等縮小型別範圍。TypeScript 的控制流分析會自動追蹤型別變化。

---

### 52. `unknown` 和 `any` 的差別？ `[中級]`

- `any`：完全停用型別檢查，操作不受限制。**避免使用。**
- `unknown`：型別安全的替代品，操作前必須先收窄型別。

對不信任的資料來源（API 回應、`JSON.parse`、使用者輸入）使用 `unknown`。

---

### 53. TypeScript 的條件型別（Conditional Types）？ `[高級]`

```typescript
type IsArray<T> = T extends any[] ? true : false;

// infer 關鍵字
type Awaited<T> = T extends Promise<infer R> ? R : T;
type Result = Awaited<Promise<string>>; // string
```

---

### 54. TypeScript 的宣告合併（Declaration Merging）？ `[高級]`

多個同名宣告會被合併，常用於擴充第三方型別：

```typescript
// 擴充 Express 的 Request 型別
declare module 'express' {
  interface Request { user?: User; }
}
```

---

### 55. 如何在 TypeScript 中型別化 React 元件？ `[中級]`

```typescript
interface Props {
  name: string;
  age?: number;
  children?: React.ReactNode;
  onClick: (id: string) => void;
}

const MyComponent: React.FC<Props> = ({ name, age = 18, onClick }) => (
  <div onClick={() => onClick(name)}>{name}</div>
);

// 事件型別
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {};
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); };
```
