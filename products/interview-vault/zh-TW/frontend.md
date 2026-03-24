# 前端面試題目

**55 道題目**，涵蓋 HTML/CSS、JavaScript、React、TypeScript、效能與無障礙設計。

---

## HTML & CSS（10 題）

### 1. `display: none` 和 `visibility: hidden` 有什麼差別？`[初級]`

**答：**
- `display: none` 將元素從文件流中移除——它不佔空間，也不會被渲染。
- `visibility: hidden` 隱藏元素，但保留其在文件流中的位置——它仍然佔用空間。

**關鍵點：** `display: none` 同樣影響子元素。`visibility: hidden` 可以在子元素上用 `visibility: visible` 個別覆蓋。

**延伸問題：** `opacity: 0` 呢？→ 元素不可見，但仍然佔用空間，並且仍然接收滑鼠事件（除非同時設定 `pointer-events: none`）。

---

### 2. 請說明 CSS 盒模型。`[初級]`

**答：**
每個元素都是一個矩形盒子，由內到外包含：
1. **Content（內容）** — 實際內容區域
2. **Padding（內距）** — 內容與邊框之間的空間
3. **Border（邊框）** — 可見的邊框線
4. **Margin（外距）** — 邊框外側的空間

預設情況下，`width` 和 `height` 只套用於內容盒。設定 `box-sizing: border-box` 後，`width` 和 `height` 會包含 padding 和 border。

**延伸問題：** 為什麼要全域使用 `box-sizing: border-box`？→ 它讓版面計算變得可預期。設定 `width: 200px` 意味著整個可見寬度就是 200px，不論 padding 為何。

---

### 3. `em`、`rem`、`%`、`vw` 和 `vh` 有什麼差別？`[初級]`

**答：**
- `em` — 相對於**父元素**的 font-size
- `rem` — 相對於**根元素**（`html`）的 font-size，比 `em` 更可預期
- `%` — 相對於**父元素**對應的屬性（例如 `width: 50%` = 父元素寬度的 50%）
- `vw` — 視窗寬度的 1%
- `vh` — 視窗高度的 1%

**主要使用情境：** 字體大小用 `rem`（尊重使用者瀏覽器設定），全螢幕版面用 `vw`/`vh`。

---

### 4. 什麼是 CSS 優先順序（Specificity），如何計算？`[中級]`

**答：**
優先順序決定當多個規則套用到同一個元素時，哪條 CSS 規則獲勝。它以四元組計算：`(行內, ID, class/屬性/偽類, 元素/偽元素)`。

| 選擇器 | 分數 |
|--------|------|
| `*` | 0,0,0,0 |
| `p` | 0,0,0,1 |
| `.class` | 0,0,1,0 |
| `#id` | 0,1,0,0 |
| `style=""` | 1,0,0,0 |
| `!important` | 覆蓋所有 |

**延伸問題：** 如何避免優先順序戰爭？→ 使用 BEM 命名、避免 `!important`、保持選擇器扁平、使用 CSS 自訂屬性。

---

### 5. Flexbox 和 CSS Grid 有什麼差別？`[中級]`

**答：**
- **Flexbox** 是一維的——沿單一軸（橫列或縱行）排列元素。最適合元件層級的版面（導覽列、卡片列、置中）。
- **CSS Grid** 是二維的——同時處理橫列和縱行。最適合頁面層級的版面和複雜的格狀佈局。

**使用時機：**
- 導覽列 → Flexbox
- 相片圖廊 → Grid
- 卡片版面 → 兩者皆可；若需要一致的列高則用 Grid
- 置中一個 div → Flexbox（`display: flex; align-items: center; justify-content: center`）

---

### 6. 什麼是 CSS 堆疊上下文（Stacking Context）？`[中級]`

**答：**
堆疊上下文是子元素沿 z 軸堆疊的三維環境。當元素具有以下條件時，會建立新的堆疊上下文：
- `position: relative/absolute/fixed/sticky` 且 `z-index` 不為 `auto`
- `opacity` 小於 1
- `transform`、`filter`、`clip-path`、`will-change` 或 `isolation: isolate`

**關鍵觀察：** `z-index` 只在同一個堆疊上下文內有效。一個 `z-index: 9999` 的子元素，無法顯示在 `z-index` 較低的兄弟堆疊上下文之上。

---

### 7. 請說明 `position: relative`、`absolute`、`fixed` 和 `sticky` 的差別。`[初級]`

**答：**
- `relative` — 相對於其**正常流**位置定位。`top/left` 從它自然所在的位置偏移，仍佔用原始空間。
- `absolute` — 從正常流中移除。相對於最近的**已定位祖先**（非 `static`）定位。若無，則相對於初始包含塊。
- `fixed` — 相對於**視窗**定位，捲動時保持固定位置。
- `sticky` — 混合型：在捲動門檻前表現如 `relative`，之後在其父容器內表現如 `fixed`。

---

### 8. 什麼是 CSS 自訂屬性（變數），它們如何運作？`[中級]`

**答：**
自訂屬性（以 `--` 定義）允許你在 CSS 中儲存可重複使用的值：

```css
:root {
  --primary-color: #3b82f6;
  --font-size-base: 16px;
}

.button {
  background: var(--primary-color);
  font-size: var(--font-size-base);
}
```

**關鍵特性：** 它們會串聯與繼承。你可以在任何範疇覆蓋它們。JavaScript 可以讀取/寫入（`element.style.setProperty('--color', 'red')`）。與預處理器變數不同，它們是動態的，可在執行期間變更。

---

### 9. 什麼是 `@media` 查詢，如何用於響應式設計？`[初級]`

**答：**
媒體查詢只在特定條件滿足時（例如視窗寬度、裝置類型、色彩方案）才套用 CSS 規則：

```css
/* 行動優先方式 */
.container { padding: 16px; }

@media (min-width: 768px) {
  .container { padding: 32px; }
}

@media (prefers-color-scheme: dark) {
  body { background: #111; }
}
```

**延伸問題：** 行動優先 vs. 桌面優先？行動優先使用 `min-width`（從小開始，逐步增加複雜度）。桌面優先使用 `max-width`。行動優先在效能上通常更佳。

---

### 10. 什麼是 `will-change` CSS 屬性？`[高級]`

**答：**
`will-change` 提示瀏覽器某個元素將以特定方式改變，讓瀏覽器可以預先最佳化渲染（例如將元素提升到其自身的合成器層）：

```css
.animated {
  will-change: transform;
}
```

**使用時機：** 只用於確定會做動畫的元素。過度使用會浪費記憶體（每個層佔用 GPU 記憶體）。應在動畫前後透過 JavaScript 動態加入/移除，而非一直保持設定。

---

## JavaScript（20 題）

### 11. `var`、`let` 和 `const` 有什麼差別？`[初級]`

**答：**
| | `var` | `let` | `const` |
|---|---|---|---|
| 範疇 | 函式 | 區塊 | 區塊 |
| 提升 | 是（undefined） | 是（TDZ 錯誤） | 是（TDZ 錯誤） |
| 重複宣告 | 可以 | 不可以 | 不可以 |
| 重新賦值 | 可以 | 可以 | 不可以 |
| 全域屬性 | 是 | 否 | 否 |

**TDZ（暫時性死區）：** `let`/`const` 雖然被提升，但未初始化——在宣告之前存取會拋出 `ReferenceError`。

---

### 12. 請說明 JavaScript 中的閉包（Closure）。`[中級]`

**答：**
閉包是一個函式，即使在外部函式已回傳後，仍能保留對其外部範疇的存取。

```javascript
function makeCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}

const counter = makeCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.value();     // 2
```

**為什麼有效：** `count` 在閉包範疇中，不會被垃圾回收，因為回傳的物件持有對參考 `count` 的函式的引用。

**實際應用：** 資料封裝、工廠函式、事件處理器、記憶化（Memoization）。

---

### 13. 什麼是 JavaScript 中的事件迴圈（Event Loop）？`[中級]`

**答：**
JavaScript 是單執行緒的。事件迴圈允許非阻塞的非同步操作：

1. **呼叫堆疊（Call Stack）** — 同步程式碼在此執行（後進先出）
2. **Web APIs** — 處理非同步操作（setTimeout、fetch、DOM 事件）
3. **回呼佇列（Macrotask）** — 來自 Web APIs 的回呼在此排隊
4. **微任務佇列（Microtask）** — Promise 回呼（`.then`、`async/await`）、`queueMicrotask`

**順序：** 每個巨任務（Macrotask）結束後，所有微任務（Microtask）會全部清空，然後才進行下一個巨任務。

```javascript
console.log('1');
setTimeout(() => console.log('4'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('2');
// 輸出：1, 2, 3, 4
```

---

### 14. 什麼是 JavaScript 中的原型繼承（Prototypal Inheritance）？`[中級]`

**答：**
每個 JavaScript 物件都有一個內部 `[[Prototype]]` 連結指向另一個物件。存取屬性時，JS 沿著原型鏈向上查找，直到找到或到達 `null`。

```javascript
const animal = { breathe() { return 'breathing'; } };
const dog = Object.create(animal);
dog.bark = function() { return 'woof'; };

dog.bark();    // 'woof'（自身屬性）
dog.breathe(); // 'breathing'（繼承自 animal）
```

**`class` 語法**是原型繼承的語法糖——`extends` 建立原型鏈。

---

### 15. 請說明 JavaScript 中的 `this`。`[中級]`

**答：**
`this` 指向執行上下文，並根據函式的呼叫方式而改變：

| 上下文 | `this` 值 |
|--------|-----------|
| 全域（非嚴格模式） | `window`（瀏覽器） |
| 全域（嚴格模式） | `undefined` |
| 物件方法 | 該物件 |
| 箭頭函式 | 詞法 `this`（繼承自外層範疇） |
| `new` 呼叫 | 新建的實例 |
| `call`/`apply`/`bind` | 第一個引數 |

**關鍵觀察：** 箭頭函式**沒有**自己的 `this`——這就是為什麼它們作為 class 方法內的回呼很有用。

---

### 16. 什麼是 `async/await`，它如何運作？`[初級]`

**答：**
`async/await` 是 Promise 的語法糖，讓非同步程式碼讀起來像同步程式碼：

```javascript
// Promise 鏈
fetch('/api/user')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// async/await 等效寫法
async function getUser() {
  try {
    const res = await fetch('/api/user');
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
```

`await` 暫停 `async` 函式的執行，直到 Promise 完成/拒絕。它**不會**阻塞執行緒。

**延伸問題：** 如何並行執行多個非同步呼叫？→ 使用 `Promise.all([fetch1, fetch2])`，而非依序的 `await`。

---

### 17. `==` 和 `===` 有什麼差別？`[初級]`

**答：**
- `===`（嚴格相等）— 比較值**和**型別，不做型別轉換。**請一律使用這個。**
- `==`（寬鬆相等）— 比較前先執行型別轉換，導致令人意外的結果：

```javascript
0 == false     // true
'' == false    // true
null == undefined // true
1 == '1'       // true
[] == 0        // true
```

**準則：** 在任何地方都使用 `===`。`==` 唯一合理的使用情境是 `x == null`（同時匹配 `null` 和 `undefined`）。

---

### 18. 什麼是 JavaScript 的生成器（Generator）？`[高級]`

**答：**
生成器是可以暫停和恢復的函式，按需產出多個值：

```javascript
function* range(start, end) {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}

const gen = range(1, 3);
gen.next(); // { value: 1, done: false }
gen.next(); // { value: 2, done: false }
gen.next(); // { value: 3, done: false }
gen.next(); // { value: undefined, done: true }
```

**使用情境：** 懶序列、無限串流、自訂迭代器、`async` 流程控制（redux-saga）。

---

### 19. 什麼是記憶化（Memoization），何時使用它？`[中級]`

**答：**
記憶化快取耗費資源的函式呼叫結果，使相同輸入的重複呼叫立即回傳快取結果：

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

const expensiveFn = memoize((n) => {
  // 複雜計算
  return n * 2;
});
```

**使用時機：** 純函式（相同輸入 → 相同輸出）、昂貴的計算、遞迴演算法（費波那契、動態規劃）。React 的 `useMemo` 和 `useCallback` 都是記憶化的形式。

---

### 20. `null`、`undefined` 和 `NaN` 有什麼差別？`[初級]`

**答：**
- `undefined` — 變數已宣告但未賦值，或函式沒有回傳值，或缺少屬性
- `null` — 明確賦予的「無值」。`typeof null === 'object'`（JS 的歷史遺留 bug）
- `NaN` — 「非數字」。無效數學運算的結果。`typeof NaN === 'number'`。值得注意的是 `NaN !== NaN`——使用 `Number.isNaN()` 來檢查。

```javascript
let x;
console.log(x);         // undefined
console.log(null == undefined); // true（寬鬆）
console.log(null === undefined); // false（嚴格）
console.log(0 / 0);    // NaN
console.log(Number.isNaN(NaN)); // true
```

---

### 21. JavaScript 中的垃圾回收如何運作？`[中級]`

**答：**
現代引擎使用**標記清除（Mark-and-Sweep）**演算法：
1. 從「根」（全域物件、呼叫堆疊變數）開始
2. 標記所有從根可達的物件
3. 清除（釋放）所有未標記的物件

**造成記憶體洩漏的原因：**
- 持有引用的未清除計時器/間隔
- 意外的全域變數
- 閉包不必要地保留大型物件
- 已從 DOM 移除但在 JS 中仍被引用的 DOM 節點
- `WeakMap`/`WeakSet` 的存在就是為了避免這些問題——它們持有不阻止垃圾回收的弱引用。

---

### 22. 什麼是事件委派（Event Delegation）？`[中級]`

**答：**
不在每個子元素上附加事件監聽器，而是在父元素上附加一個監聽器，並使用 `event.target` 判斷哪個子元素被點擊：

```javascript
// 未使用委派（1000 個項目時效能差）
document.querySelectorAll('.item').forEach(item => {
  item.addEventListener('click', handleClick);
});

// 使用委派（所有項目只用一個監聽器）
document.querySelector('.list').addEventListener('click', (e) => {
  if (e.target.matches('.item')) {
    handleClick(e);
  }
});
```

**優點：** 效能（一個監聽器 vs. N 個）、適用於動態新增的元素。

---

### 23. `call`、`apply` 和 `bind` 有什麼差別？`[中級]`

**答：**
三者都明確設定 `this`：
- `call(context, arg1, arg2)` — 立即用個別引數呼叫
- `apply(context, [arg1, arg2])` — 立即用陣列形式的引數呼叫
- `bind(context, arg1)` — 回傳一個**新函式**，`this` 已綁定，不立即呼叫

```javascript
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const user = { name: 'Alice' };
greet.call(user, 'Hello', '!');      // "Hello, Alice!"
greet.apply(user, ['Hi', '?']);      // "Hi, Alice?"
const boundGreet = greet.bind(user);
boundGreet('Hey', '.');              // "Hey, Alice."
```

---

### 24. 請說明 JavaScript 中的不可變性（Immutability）概念。`[中級]`

**答：**
不可變性意味著不修改現有資料，而是建立新資料：

```javascript
// 可變（修改原始陣列）
const arr = [1, 2, 3];
arr.push(4); // arr 現在是 [1,2,3,4]

// 不可變模式
const newArr = [...arr, 4];          // 展開運算子
const newObj = { ...obj, key: 'val' }; // 物件展開
const updated = arr.map(x => x * 2); // 回傳新陣列
```

**為什麼重要：** 可預測的狀態、更容易除錯、透過引用比較啟用變更偵測（React、Redux）、啟用時間旅行除錯。

---

### 25. JavaScript 的模組系統（ESM vs CJS）是什麼？`[中級]`

**答：**
- **CommonJS (CJS)：** `require()` / `module.exports`。用於 Node.js。同步，在執行期間載入。
- **ES Modules (ESM)：** `import` / `export`。原生 JS 標準。非同步、靜態分析、可搖樹（Tree-shakeable）。

```javascript
// CJS
const fs = require('fs');
module.exports = { fn };

// ESM
import { readFile } from 'fs/promises';
export { fn };
export default class MyClass {}
```

**延伸問題：** 為什麼 ESM 能啟用搖樹？→ 靜態 import 可在建置時分析；打包工具可以消除未使用的匯出。

---

### 26. JavaScript 中的 `Symbol` 是什麼？`[高級]`

**答：**
`Symbol` 建立唯一的、不可變的原始值。每次呼叫 `Symbol()` 都回傳唯一值：

```javascript
const id1 = Symbol('id');
const id2 = Symbol('id');
console.log(id1 === id2); // false — 永遠唯一

// 用作物件鍵
const obj = { [id1]: 'value' };
// Symbol 在 for...in 或 Object.keys() 中不可列舉
```

**使用情境：** 類私有的物件屬性、知名 Symbol（`Symbol.iterator`、`Symbol.toPrimitive`）、避免共享物件中的鍵衝突。

---

### 27. 什麼是 WeakMap 和 WeakSet？`[高級]`

**答：**
- **WeakMap** — 鍵值對，鍵必須是物件。鍵被弱持有（不阻止垃圾回收）。鍵不可列舉。
- **WeakSet** — 物件的集合。物件被弱持有。

```javascript
const cache = new WeakMap();
function process(element) {
  if (cache.has(element)) return cache.get(element);
  const result = expensiveComputation(element);
  cache.set(element, result);
  return result;
}
// 當 `element` 從 DOM 移除時，快取條目會自動被垃圾回收
```

**使用情境：** 為 DOM 元素快取計算值而不造成記憶體洩漏。

---

### 28. 什麼是 Proxy 物件？`[高級]`

**答：**
`Proxy` 包裝一個物件，並攔截對其的操作（get、set、delete 等）：

```javascript
const validator = new Proxy({}, {
  set(target, key, value) {
    if (typeof value !== 'number') throw new TypeError('Must be a number');
    target[key] = value;
    return true;
  }
});

validator.age = 25;   // OK
validator.age = 'old'; // TypeError
```

**實際應用：** Vue 3 的響應式系統、表單驗證、日誌記錄、存取控制。`Reflect` 是提供預設行為的配套 API。

---

### 29. 如何在 JavaScript 中處理錯誤？`[中級]`

**答：**
```javascript
// 同步
try {
  riskyOperation();
} catch (error) {
  if (error instanceof TypeError) {
    // 處理特定錯誤
  } else {
    throw error; // 重新拋出未知錯誤
  }
} finally {
  cleanup(); // 永遠執行
}

// 非同步
async function load() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    // Promise 拒絕在這裡被捕獲
    logger.error(error);
    throw error; // 不要吞掉錯誤
  }
}

// 全域處理器（最後手段）
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
});
```

---

### 30. 什麼是可選鏈（`?.`）和空值合併（`??`）？`[初級]`

**答：**
- `?.` — 若左側為 `null`/`undefined`，短路並回傳 `undefined`，而非拋出錯誤
- `??` — 只有當左側為 `null`/`undefined` 時（非 `0`、`''`、`false`），才回傳右側值

```javascript
const user = { address: { city: 'Taipei' } };
user?.address?.city;    // 'Taipei'
user?.phone?.number;    // undefined（不拋出錯誤）
user?.greet?.();        // undefined（方法也不拋出錯誤）

const count = 0;
count ?? 'default';     // 0（0 不是 null/undefined）
count || 'default';     // 'default'（0 是 falsy — 常見的 bug）
```

---

## React（15 題）

### 31. 什麼是虛擬 DOM，React 如何使用它？`[初級]`

**答：**
虛擬 DOM（vDOM）是真實 DOM 的輕量 JavaScript 表示。React 在記憶體中保存 vDOM。當狀態改變時：
1. React 建立新的 vDOM 樹
2. **Diffing（差異比對）：** 與前一個 vDOM 比較（O(n) 演算法）
3. **Reconciliation（協調）：** 計算所需的最小變更
4. **只提交**真實 DOM 的變更

**為什麼快：** 真實 DOM 操作代價昂貴。批次處理變更並計算最小差異，減少了 DOM 操作。

**延伸問題：** React 一定使用 vDOM 嗎？→ React Native 使用相同的協調器，但目標是原生行動元件。React Server Components 完全繞過 vDOM。

---

### 32. 請說明 `useMemo` 和 `useCallback` 的差別。`[中級]`

**答：**
- `useMemo` — 記憶化一個**計算值**。只在相依項改變時重新計算。
- `useCallback` — 記憶化一個**函式引用**。若相依項未改變，回傳相同的函式實例。

```javascript
// useMemo：昂貴的計算
const sortedList = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// useCallback：穩定的函式引用給子元件
const handleClick = useCallback((id) => {
  dispatch({ type: 'SELECT', id });
}, [dispatch]);
```

**使用時機：** 只在記憶化的成本低於重新計算/重新渲染的成本時使用。過早最佳化是有害的。

---

### 33. 什麼是 React 的協調（Reconciliation）和 `key` 屬性？`[中級]`

**答：**
在協調過程中，React 比較元素樹。`key` 屬性幫助 React 識別清單中哪些項目已變更/新增/移除：

```jsx
// 錯誤 — 使用索引作為 key，在重新排序/插入時破壞協調
{items.map((item, i) => <Item key={i} {...item} />)}

// 正確 — 穩定、唯一的 ID
{items.map(item => <Item key={item.id} {...item} />)}
```

**錯誤的 key 會發生什麼：** React 錯誤地重用 DOM 節點，導致輸入焦點、動畫和非受控元件狀態出現 bug。

---

### 34. 什麼是 React Hooks，為什麼引入它們？`[初級]`

**答：**
Hooks（React 16.8 引入）是讓你在函式元件中使用狀態和生命週期功能的函式。

**引入原因：**
1. Class 元件有複雜的生命週期方法，難以理解
2. 邏輯無法輕易在元件之間共享（HOC 和 render props 導致包裝器地獄）
3. `this` 綁定令人困惑

**常用 Hooks：**
- `useState` — 元件狀態
- `useEffect` — 副作用（資料取得、訂閱、DOM 更新）
- `useContext` — 不需要 Consumer 元件即可消費 context
- `useRef` — 在渲染之間持久的可變 ref
- `useReducer` — 複雜的狀態邏輯（類似 Redux 模式）
- `useMemo` / `useCallback` — 效能最佳化

---

### 35. 請說明 `useEffect` 的清除函式。`[中級]`

**答：**
從 `useEffect` 回傳的函式會在效果再次執行前（相依項變更時）以及元件卸載時執行：

```javascript
useEffect(() => {
  const subscription = subscribe(userId);

  // 清除：在重新訂閱或卸載前執行
  return () => {
    subscription.unsubscribe();
  };
}, [userId]);
```

**未清除的後果：** 訂閱造成記憶體洩漏、陳舊的事件監聽器、嘗試在已卸載的元件上更新狀態。

**延伸問題：** 不提供相依陣列會怎樣？→ 效果在每次渲染後執行。空的 `[]` 只執行一次（僅在掛載/卸載時）。

---

### 36. 什麼是 React Context，何時應使用它？`[中級]`

**答：**
Context 提供了一種在不透過 props 逐層傳遞的情況下，在元件樹中傳遞資料的方式：

```jsx
const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <DeepChild />
    </ThemeContext.Provider>
  );
}

function DeepChild() {
  const theme = useContext(ThemeContext); // 'dark'
  return <div className={theme}>...</div>;
}
```

**使用時機：** 許多元件需要的全域資料（主題、語言、當前使用者、認證狀態）。

**不適用時機：** 頻繁更新（造成所有消費者重新渲染）。伺服器狀態使用 React Query/SWR。複雜的客戶端狀態使用 Zustand/Redux。

---

### 37. 受控元件和非受控元件有什麼差別？`[中級]`

**答：**
- **受控（Controlled）：** React 是唯一資料來源。輸入值由狀態驅動。每次變更都更新狀態。
- **非受控（Uncontrolled）：** DOM 是資料來源。需要時透過 `ref` 存取值。

```jsx
// 受控
const [value, setValue] = useState('');
<input value={value} onChange={e => setValue(e.target.value)} />

// 非受控
const inputRef = useRef();
<input ref={inputRef} defaultValue="initial" />
// 存取：inputRef.current.value
```

**何時使用非受控：** 簡單表單、檔案輸入、與非 React 函式庫整合、效能敏感的表單。

---

### 38. 什麼是 `React.memo`，何時應使用它？`[中級]`

**答：**
`React.memo` 是一個高階元件，可以記憶化一個元件——只有在 props 改變時（淺比較）才重新渲染：

```jsx
const ExpensiveComponent = React.memo(({ data, onAction }) => {
  return <div>{/* 昂貴的渲染 */}</div>;
});
```

**使用時機：**
- 元件以未改變的 props 頻繁渲染
- 元件渲染代價昂貴（大型列表、複雜圖表）
- 父元件頻繁重新渲染

**不使用時機：**
- Props 在每次渲染時都會改變
- 元件渲染代價低廉（最佳化開銷超過效益）

**注意事項：** 物件/函式 props 會破壞 memo，除非同時對它們使用 `useMemo`/`useCallback`。

---

### 39. 請說明函式元件的 React 渲染生命週期。`[中級]`

**答：**
```
1. 渲染階段（純粹，無副作用）：
   - 函式執行，回傳 JSX
   - 協調器與前一個 vDOM 進行差異比對

2. 提交階段：
   - React 更新真實 DOM
   - 版面效果執行（useLayoutEffect）— 同步
   - 瀏覽器繪製

3. 被動效果：
   - useEffect 執行 — 非同步，在繪製後
```

**渲染內的順序：**
```
父元件渲染 → 子元件渲染 → ...
→ 子元件 useLayoutEffect → 父元件 useLayoutEffect
→ 瀏覽器繪製
→ 子元件 useEffect → 父元件 useEffect
```

---

### 40. 什麼是 React Server Components？`[高級]`

**答：**
RSC（隨 Next.js App Router 引入）允許元件**只在伺服器端**執行：

```jsx
// Server Component（App Router 中的預設）
async function ProductPage({ id }) {
  const product = await db.products.findById(id); // 直接存取資料庫！
  return <ProductDetail product={product} />;
}

// Client Component（用 'use client' 選擇加入）
'use client';
function AddToCart({ productId }) {
  const [loading, setLoading] = useState(false);
  // ...
}
```

**優點：** 伺服器元件的 JS bundle 為零、直接存取後端、自動串流。

**限制：** 伺服器元件中沒有狀態、沒有 hooks、沒有瀏覽器 API。

---

### 41. React 如何處理效能最佳化？`[高級]`

**答：**
**防止不必要的重新渲染：**
- 元件使用 `React.memo`
- 昂貴的計算使用 `useMemo`
- 穩定的函式引用使用 `useCallback`
- 狀態共置（將狀態保持在靠近使用位置的地方）

**程式碼分割：**
```jsx
const LazyComponent = React.lazy(() => import('./HeavyComponent'));
<Suspense fallback={<Spinner />}>
  <LazyComponent />
</Suspense>
```

**虛擬列表：** 使用 `react-window` 或 `react-virtual` 只渲染大型列表中可見的行。

**並發功能：** 使用 `useTransition` 標記非緊急更新，使用 `useDeferredValue` 延遲更新緩慢的部分。

---

### 42. 什麼是 React 的 `useReducer` Hook？`[中級]`

**答：**
`useReducer` 是複雜狀態邏輯的 `useState` 替代方案，遵循 Redux 模式：

```javascript
const initialState = { count: 0, loading: false };

function reducer(state, action) {
  switch (action.type) {
    case 'INCREMENT': return { ...state, count: state.count + 1 };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    default: throw new Error(`Unknown action: ${action.type}`);
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <button onClick={() => dispatch({ type: 'INCREMENT' })}>
      {state.count}
    </button>
  );
}
```

**使用時機：** 狀態有多個子值、下一個狀態依賴前一個狀態、狀態轉換複雜時。

---

### 43. 什麼是 `useRef` Hook？`[中級]`

**答：**
`useRef` 回傳一個可變的 ref 物件，其 `.current` 屬性在元件的整個生命週期中持久存在。改變它**不會**觸發重新渲染。

**兩種使用情境：**

1. 直接存取 DOM 元素：
```javascript
const inputRef = useRef(null);
<input ref={inputRef} />
// 命令式：inputRef.current.focus()
```

2. 儲存不應造成重新渲染的可變值：
```javascript
const renderCount = useRef(0);
renderCount.current++; // 不會重新渲染
```

---

### 44. 什麼是自訂 Hook，如何建立？`[中級]`

**答：**
自訂 Hook 是以 `use` 開頭並可呼叫其他 Hook 的函式。它們提取可重複使用的狀態邏輯：

```javascript
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => { if (!cancelled) setData(data); })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}
```

---

### 45. 什麼是 React 的 `Suspense`？`[高級]`

**答：**
`Suspense` 允許元件在渲染之前「等待」某些事情，同時顯示備用 UI：

```jsx
// 程式碼分割
<Suspense fallback={<Spinner />}>
  <LazyComponent />
</Suspense>

// 資料取得（搭配 Next.js、Relay 等框架）
<Suspense fallback={<Skeleton />}>
  <UserProfile userId={id} /> {/* 內部拋出 Promise */}
</Suspense>
```

**如何運作：** 元件透過拋出一個 Promise 來「暫停」。React 捕獲它，顯示備用 UI，並在 Promise 解析後重新渲染元件。

**React 18+ 新增：** 使用 `Suspense` 的串流式 SSR——元件在資料載入時逐步渲染。

---

## TypeScript（10 題）

### 46. TypeScript 中的 `interface` 和 `type` 有什麼差別？`[中級]`

**答：**
兩者都定義形狀，但有關鍵差異：

| 功能 | `interface` | `type` |
|------|-------------|--------|
| 宣告合併 | ✅ | ❌ |
| 繼承 | `extends` 關鍵字 | 交叉型別 `&` |
| 實作 | ✅ | ✅ |
| 聯合型別 | ❌ | ✅ |
| 計算屬性 | ❌ | ✅ |
| 基本型別別名 | ❌ | ✅ |

**準則：** 公開 API 形狀使用 `interface`（允許擴充）。其他所有情況使用 `type`。

---

### 47. 什麼是 TypeScript 的泛型（Generics）？`[中級]`

**答：**
泛型允許你編寫可與多種型別搭配使用的可重複使用程式碼，同時保持型別安全：

```typescript
function identity<T>(arg: T): T {
  return arg;
}

identity<string>('hello'); // T = string
identity(42);              // T 推斷為 number

// 有約束的泛型
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// 泛型類別
class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}
```

---

### 48. TypeScript 中的 `keyof` 和 `typeof` 是什麼？`[中級]`

**答：**
- `keyof T` — 建立 `T` 所有鍵的聯合型別
- `typeof x` — 取得 `x` 的 TypeScript 型別（在型別位置使用）

```typescript
interface User { id: number; name: string; email: string; }
type UserKey = keyof User; // 'id' | 'name' | 'email'

const config = { port: 3000, host: 'localhost' };
type Config = typeof config; // { port: number; host: string }

// 組合使用
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {} as Pick<T, K>);
}
```

---

### 49. TypeScript 中的工具型別（Utility Types）是什麼？`[中級]`

**答：**
內建的泛型型別，用於轉換其他型別：

```typescript
interface User { id: number; name: string; email: string; age?: number; }

Partial<User>        // 所有屬性變為可選
Required<User>       // 所有屬性變為必填
Readonly<User>       // 所有屬性變為唯讀
Pick<User, 'id' | 'name'>   // { id: number; name: string }
Omit<User, 'age'>           // User 去掉 'age'
Record<string, User>        // { [key: string]: User }
Exclude<'a' | 'b' | 'c', 'b'> // 'a' | 'c'
Extract<'a' | 'b', 'a' | 'd'>  // 'a'
NonNullable<string | null | undefined> // string
ReturnType<typeof fn>  // 函式的回傳型別
```

---

### 50. 什麼是可辨識聯合（Discriminated Union）？`[高級]`

**答：**
可辨識聯合是一種聯合型別，具有共同的字面型別屬性（辨識符），TypeScript 用它來進行型別縮窄：

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rectangle'; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':    return Math.PI * shape.radius ** 2;
    case 'square':    return shape.side ** 2;
    case 'rectangle': return shape.width * shape.height;
    // 若未處理所有情況，TypeScript 會發出警告
  }
}
```

**使用情境：** 建模狀態機、具有不同 payload 形狀的 API 回應、Reducer 中的 action 型別。

---

### 51. 什麼是 TypeScript 的型別縮窄（Type Narrowing）？`[中級]`

**答：**
TypeScript 根據控制流分析縮窄型別：

```typescript
function process(input: string | number | null) {
  if (input === null) {
    return; // input 在這裡是 null
  }
  if (typeof input === 'string') {
    input.toUpperCase(); // input 在這裡是 string
  } else {
    input.toFixed(2); // input 在這裡是 number
  }
}

// 自訂型別守衛
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'id' in x;
}
```

**縮窄機制：** `typeof`、`instanceof`、`in`、等號比較、型別謂詞（`x is T`）、斷言函式。

---

### 52. TypeScript 中的 `unknown` 和 `any` 有什麼差別？`[中級]`

**答：**
- `any` — 完全關閉型別檢查。對 `any` 的操作不受檢查。應避免使用。
- `unknown` — `any` 的型別安全替代。在執行操作之前必須縮窄/斷言。

```typescript
function processAny(x: any) {
  x.foo.bar(); // 無錯誤 — TypeScript 盲目信任你
}

function processUnknown(x: unknown) {
  x.foo.bar(); // 錯誤 — 必須先縮窄
  if (typeof x === 'string') {
    x.toUpperCase(); // 縮窄後 OK
  }
}
```

**準則：** 對來自不受信任來源的值使用 `unknown`（API 回應、`JSON.parse`、使用者輸入）。除非在遷移舊有程式碼，否則絕不使用 `any`。

---

### 53. 什麼是 TypeScript 的條件型別（Conditional Types）？`[高級]`

**答：**
條件型別根據條件選擇型別：

```typescript
type IsArray<T> = T extends any[] ? true : false;
type IsString = IsArray<string>; // false
type IsNumbers = IsArray<number[]>; // true

// infer 關鍵字
type UnpackArray<T> = T extends (infer Item)[] ? Item : T;
type Str = UnpackArray<string[]>; // string
type Num = UnpackArray<number>;   // number（非陣列）

// 實際應用
type Awaited<T> = T extends Promise<infer R> ? R : T;
type Result = Awaited<Promise<string>>; // string
```

---

### 54. 什麼是 TypeScript 的宣告合併（Declaration Merging）？`[高級]`

**答：**
TypeScript 將同名的多個宣告合併為一個：

```typescript
// Interface 合併
interface Window {
  myCustomProp: string;
}
// 現在 window.myCustomProp 有型別（適合擴充全域）

// 模組擴充
declare module 'express' {
  interface Request {
    user?: User;
  }
}
// 現在 req.user 在整個 Express 應用程式中都有型別
```

**使用情境：** 擴充第三方型別、polyfill、環境特定的全域擴充。

---

### 55. 如何在 TypeScript 中為 React 元件定義型別？`[中級]`

**答：**
```typescript
// 函式元件
interface Props {
  name: string;
  age?: number;
  children?: React.ReactNode;
  onClick: (id: string) => void;
}

const MyComponent: React.FC<Props> = ({ name, age = 18, children, onClick }) => {
  return <div onClick={() => onClick(name)}>{children}</div>;
};

// 泛型元件
function List<T extends { id: string }>({ items, renderItem }: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return <ul>{items.map(item => <li key={item.id}>{renderItem(item)}</li>)}</ul>;
}

// 事件處理
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};
```
