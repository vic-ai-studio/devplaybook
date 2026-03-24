# 演算法與資料結構面試題

**50 道題目**，涵蓋陣列、字串、樹、圖、動態規劃與核心演算法。

---

## 核心概念與複雜度（5 題）

### 1. 什麼是 Big O 表示法？說明常見複雜度。 `[初級]`

**解答：**
Big O 描述演算法的時間或空間複雜度隨輸入規模增長的上界。

| 複雜度 | 名稱 | 範例 |
|--------|------|------|
| O(1) | 常數 | 陣列索引、雜湊表查詢 |
| O(log n) | 對數 | 二元搜尋、BST 操作 |
| O(n) | 線性 | 線性搜尋、單迴圈 |
| O(n log n) | 線性對數 | 合併排序、堆積排序 |
| O(n²) | 平方 | 氣泡排序、巢狀迴圈 |
| O(2ⁿ) | 指數 | 遞迴枚舉子集合 |
| O(n!) | 階乘 | 暴力排列組合 |

**規則：** 省略常數（O(2n) = O(n)）；省略低次項（O(n² + n) = O(n²)）。預設分析最壞情況。

---

### 2. 何時用陣列，何時用鏈結串列？ `[初級]`

**解答：**
| | 陣列（Array） | 鏈結串列（Linked List） |
|---|---|---|
| 按索引存取 | O(1) | O(n) |
| 搜尋 | O(n) / O(log n)（已排序） | O(n) |
| 頭部插入 | O(n)（需位移） | O(1) |
| 尾部插入 | O(1) 平攤 | O(1)（有尾指標時） |
| 中間插入 | O(n) | O(1)（已知節點位置） |
| 記憶體 | 連續（快取友好） | 分散（指標開銷） |

**用陣列：** 需要隨機存取、快取效能重要、大小事先已知。
**用鏈結串列：** 頻繁在已知位置插入/刪除、大小未知且變化大。

---

### 3. Stack 和 Queue 的差別？ `[初級]`

**解答：**
- **Stack（堆疊）**：LIFO（後進先出），在同一端推入/取出
  - 操作：push O(1)、pop O(1)、peek O(1)
  - 應用：函式呼叫堆疊、Undo/Redo、DFS、括號匹配、瀏覽器歷史
- **Queue（佇列）**：FIFO（先進先出），尾端進、頭端出
  - 操作：enqueue O(1)、dequeue O(1)
  - 應用：BFS、任務排程、生產者/消費者、印表機佇列

**實作：** 陣列（循環緩衝區適合 Queue）、鏈結串列，或語言內建（Python `deque`、JS `[]`）。

---

### 4. 什麼是雜湊表？如何處理碰撞？ `[中級]`

**解答：**
雜湊表用雜湊函式將鍵映射到陣列索引，提供平均 O(1) 的插入/查詢/刪除。

**碰撞處理：**
- **鏈結（Chaining）**：每個桶是鏈結串列，碰撞項目串在一起
  - 最壞情況 O(n)，平均 O(1)（低負載因子時）
- **開放定址（Open Addressing）**：碰撞時找下一個可用槽
  - 線性探測（Linear Probing）：`(hash + i) % size`
  - 二次探測（Quadratic Probing）：`(hash + i²) % size`
  - 雙重雜湊（Double Hashing）：用第二個雜湊函式決定步長

**負載因子（Load Factor）** = 已存項目數 / 桶數。超過 0.75 通常需要 rehash（擴容）。

---

### 5. 什麼是遞迴？何時用迭代替代？ `[初級]`

**解答：**
遞迴是函式呼叫自身解決子問題，每次呼叫有更小的問題規模，直到達到基底案例（Base Case）。

```javascript
// 遞迴
function factorial(n) {
  if (n <= 1) return 1;    // Base case
  return n * factorial(n - 1);
}

// 迭代（避免堆疊溢位）
function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}
```

**用迭代替代遞迴的時機：**
- 遞迴深度很大（風險：Stack Overflow）
- 效能敏感（函式呼叫開銷）
- 無法做尾遞迴最佳化的語言

**尾遞迴（Tail Recursion）：** 遞迴呼叫是最後一個操作，可被編譯器最佳化為迭代（JavaScript 僅部分支援）。

---

## 陣列與字串（10 題）

### 6. 如何找到陣列中的最大子陣列和（Kadane's Algorithm）？ `[中級]`

**解答：**
Kadane's Algorithm 在 O(n) 時間和 O(1) 空間內解決最大子陣列和問題。

```javascript
function maxSubArray(nums) {
  let maxSum = nums[0];
  let currentSum = nums[0];

  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}
// [-2, 1, -3, 4, -1, 2, 1, -5, 4] → 6 ([4,-1,2,1])
```

**關鍵思路：** 在每個位置，決定「重新開始」還是「繼續累加」：若累加後比自身小，就從當前元素重新開始。

---

### 7. 如何在 O(n) 時間找到陣列中的兩數之和（Two Sum）？ `[初級]`

**解答：**
```javascript
function twoSum(nums, target) {
  const seen = new Map();  // value → index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}
```

**時間：** O(n)，**空間：** O(n)。核心思路：用雜湊表記錄「已見過的數字」，以空間換時間。

---

### 8. 如何判斷字串是否為迴文（Palindrome）？ `[初級]`

**解答：**
```javascript
// 方法一：雙指標（O(n) 時間，O(1) 空間）
function isPalindrome(s) {
  // 只保留英數字母並轉小寫
  s = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let left = 0, right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left++;
    right--;
  }
  return true;
}

// 方法二：反轉比較（O(n) 時間，O(n) 空間）
function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}
```

---

### 9. 如何找到字串中最長不重複字元的子字串？ `[中級]`

**解答：**
滑動視窗（Sliding Window）＋雜湊集合：

```javascript
function lengthOfLongestSubstring(s) {
  const charSet = new Set();
  let left = 0, maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    while (charSet.has(s[right])) {
      charSet.delete(s[left]);
      left++;
    }
    charSet.add(s[right]);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}
// "abcabcbb" → 3 ("abc")
```

**時間：** O(n)，**空間：** O(min(n, m))（m 為字元集大小）。

---

### 10. 如何合併兩個已排序的陣列？ `[初級]`

**解答：**
```javascript
function mergeSortedArrays(arr1, arr2) {
  const result = [];
  let i = 0, j = 0;

  while (i < arr1.length && j < arr2.length) {
    if (arr1[i] <= arr2[j]) {
      result.push(arr1[i++]);
    } else {
      result.push(arr2[j++]);
    }
  }

  // 處理剩餘元素
  while (i < arr1.length) result.push(arr1[i++]);
  while (j < arr2.length) result.push(arr2[j++]);

  return result;
}
```

**時間：** O(n + m)，**空間：** O(n + m)。這是合併排序（Merge Sort）的核心步驟。

---

### 11. 如何在原地旋轉矩陣 90 度？ `[中級]`

**解答：**
先沿對角線轉置（Transpose），再水平翻轉（Reverse Rows）：

```javascript
function rotate(matrix) {
  const n = matrix.length;

  // 步驟 1：轉置（交換 matrix[i][j] 和 matrix[j][i]）
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    }
  }

  // 步驟 2：每行反轉
  for (let i = 0; i < n; i++) {
    matrix[i].reverse();
  }
}
```

**時間：** O(n²)，**空間：** O(1)（原地操作）。

---

### 12. 如何找到陣列中缺少的數字？ `[初級]`

**解答：**
```javascript
// 方法一：數學公式（最優）
function missingNumber(nums) {
  const n = nums.length;
  const expectedSum = n * (n + 1) / 2;
  const actualSum = nums.reduce((sum, n) => sum + n, 0);
  return expectedSum - actualSum;
}

// 方法二：XOR（防止整數溢位）
function missingNumber(nums) {
  let xor = nums.length;
  for (let i = 0; i < nums.length; i++) {
    xor ^= i ^ nums[i];
  }
  return xor;
}
```

---

### 13. 如何實作滑動視窗最大值（Sliding Window Maximum）？ `[高級]`

**解答：**
使用 Deque（雙端佇列）維護視窗內的候選最大值，確保 O(n) 時間：

```javascript
function maxSlidingWindow(nums, k) {
  const deque = [];  // 存索引，保持遞減順序
  const result = [];

  for (let i = 0; i < nums.length; i++) {
    // 移除超出視窗的元素
    while (deque.length && deque[0] < i - k + 1) deque.shift();

    // 移除比當前元素小的元素（它們不可能成為最大值）
    while (deque.length && nums[deque[deque.length - 1]] < nums[i]) {
      deque.pop();
    }

    deque.push(i);

    if (i >= k - 1) result.push(nums[deque[0]]);
  }
  return result;
}
```

---

### 14. 如何找到陣列中的多數元素（Moore's Voting Algorithm）？ `[中級]`

**解答：**
Boyer-Moore 投票演算法在 O(n) 時間和 O(1) 空間內找到出現超過 n/2 次的元素：

```javascript
function majorityElement(nums) {
  let candidate = null, count = 0;

  for (const num of nums) {
    if (count === 0) candidate = num;
    count += num === candidate ? 1 : -1;
  }
  return candidate;  // 題目保證存在多數元素
}
```

**思路：** 不同元素互相抵消，最終剩下的必是多數元素。

---

### 15. 如何用 O(n) 空間找到所有子陣列的積（除了自身）？ `[中級]`

**解答：**
```javascript
function productExceptSelf(nums) {
  const n = nums.length;
  const result = new Array(n).fill(1);

  // result[i] = nums[0..i-1] 的積（前綴積）
  let prefix = 1;
  for (let i = 0; i < n; i++) {
    result[i] = prefix;
    prefix *= nums[i];
  }

  // 乘以 nums[i+1..n-1] 的積（後綴積）
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    result[i] *= suffix;
    suffix *= nums[i];
  }
  return result;
}
// [1,2,3,4] → [24,12,8,6]
```

---

## 樹與圖（15 題）

### 16. 解釋二元樹的三種 DFS 遍歷（Pre/In/Post-order）。 `[初級]`

**解答：**
```javascript
function preorder(node) {  // 根 → 左 → 右
  if (!node) return;
  visit(node);
  preorder(node.left);
  preorder(node.right);
}

function inorder(node) {   // 左 → 根 → 右（BST 遍歷結果為排序）
  if (!node) return;
  inorder(node.left);
  visit(node);
  inorder(node.right);
}

function postorder(node) { // 左 → 右 → 根（刪除節點用）
  if (!node) return;
  postorder(node.left);
  postorder(node.right);
  visit(node);
}
```

**記憶技巧：** Pre（根在前）、In（根在中）、Post（根在後）。

---

### 17. 如何進行二元樹的 BFS（層序遍歷）？ `[初級]`

**解答：**
```javascript
function levelOrder(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];

  while (queue.length) {
    const levelSize = queue.length;
    const level = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}
```

**時間：** O(n)，**空間：** O(n)（Queue 最多存一層的節點）。

---

### 18. 什麼是 BST（二元搜尋樹）？如何驗證一棵樹是否是有效的 BST？ `[中級]`

**解答：**
BST 特性：左子樹所有節點 < 根節點 < 右子樹所有節點。

```javascript
function isValidBST(root, min = -Infinity, max = Infinity) {
  if (!root) return true;

  if (root.val <= min || root.val >= max) return false;

  return isValidBST(root.left, min, root.val) &&
         isValidBST(root.right, root.val, max);
}
```

**關鍵：** 不只檢查直接子節點，要傳遞允許的值範圍給整個子樹（許多人犯的錯誤）。

---

### 19. 如何找到二元樹中兩個節點的最低公共祖先（LCA）？ `[中級]`

**解答：**
```javascript
// 一般二元樹
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;

  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);

  // 兩側都找到 → 當前節點是 LCA
  if (left && right) return root;
  return left || right;
}
```

**BST 優化：** 利用 BST 特性（p.val 和 q.val 都在同側則繼續向下，否則當前節點是 LCA）。

---

### 20. 如何判斷二元樹是否平衡？ `[中級]`

**解答：**
平衡二元樹：每個節點的左右子樹高度差 ≤ 1。

```javascript
function isBalanced(root) {
  function height(node) {
    if (!node) return 0;
    const left = height(node.left);
    if (left === -1) return -1;  // 已不平衡，提前退出
    const right = height(node.right);
    if (right === -1) return -1;
    if (Math.abs(left - right) > 1) return -1;  // 當前節點不平衡
    return Math.max(left, right) + 1;
  }
  return height(root) !== -1;
}
```

**時間：** O(n)（一次遍歷），比 O(n log n) 的樸素做法更優。

---

### 21. 如何用 DFS 和 BFS 解決圖的問題？ `[中級]`

**解答：**
```javascript
// DFS（遞迴）
function dfs(graph, start, visited = new Set()) {
  visited.add(start);
  console.log(start);
  for (const neighbor of graph[start]) {
    if (!visited.has(neighbor)) dfs(graph, neighbor, visited);
  }
}

// BFS（迭代）
function bfs(graph, start) {
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const node = queue.shift();
    console.log(node);
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
}
```

**BFS vs DFS：** BFS 找最短路徑（無權圖）；DFS 適合拓撲排序、連通分量、路徑存在性。

---

### 22. 如何偵測圖中是否有環（Cycle Detection）？ `[中級]`

**解答：**
**無向圖（使用 DFS + Parent 追蹤）：**
```javascript
function hasCycleUndirected(graph) {
  const visited = new Set();
  function dfs(node, parent) {
    visited.add(node);
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, node)) return true;
      } else if (neighbor !== parent) return true;  // 有環
    }
    return false;
  }
  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      if (dfs(node, null)) return true;
    }
  }
  return false;
}
```

**有向圖：** 使用三色標記（白=未訪問、灰=訪問中、黑=已完成），遇到灰色節點即有環。

---

### 23. 解釋 Dijkstra 最短路徑演算法。 `[高級]`

**解答：**
Dijkstra 求單源到所有節點的最短路徑（不適用負權邊）。

```javascript
function dijkstra(graph, start) {
  const dist = {};
  const visited = new Set();
  const pq = new MinHeap();  // [distance, node]

  for (const node of Object.keys(graph)) dist[node] = Infinity;
  dist[start] = 0;
  pq.push([0, start]);

  while (!pq.isEmpty()) {
    const [d, node] = pq.pop();
    if (visited.has(node)) continue;
    visited.add(node);

    for (const [neighbor, weight] of graph[node]) {
      const newDist = d + weight;
      if (newDist < dist[neighbor]) {
        dist[neighbor] = newDist;
        pq.push([newDist, neighbor]);
      }
    }
  }
  return dist;
}
```

**時間：** O((V + E) log V)（使用優先佇列）。

---

### 24. 什麼是拓撲排序（Topological Sort）？ `[中級]`

**解答：**
拓撲排序將有向無環圖（DAG）的節點排成線性順序，使所有邊從前指向後。

**應用：** 課程先修順序、建構系統（Make/Webpack）、任務依賴。

**Kahn's Algorithm（BFS）：**
```javascript
function topologicalSort(numNodes, edges) {
  const inDegree = new Array(numNodes).fill(0);
  const adj = Array.from({length: numNodes}, () => []);

  for (const [u, v] of edges) { adj[u].push(v); inDegree[v]++; }

  const queue = [];
  for (let i = 0; i < numNodes; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  const result = [];
  while (queue.length) {
    const node = queue.shift();
    result.push(node);
    for (const neighbor of adj[node]) {
      if (--inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return result.length === numNodes ? result : [];  // 空陣列表示有環
}
```

---

### 25. 如何解決島嶼問題（Number of Islands）？ `[中級]`

**解答：**
```javascript
function numIslands(grid) {
  let count = 0;
  const rows = grid.length, cols = grid[0].length;

  function dfs(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === '0') return;
    grid[r][c] = '0';  // 標記已訪問（原地修改，O(1) 空間）
    dfs(r+1, c); dfs(r-1, c);
    dfs(r, c+1); dfs(r, c-1);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        count++;
        dfs(r, c);
      }
    }
  }
  return count;
}
```

**時間/空間：** O(m×n)。也可用 BFS 或 Union-Find 解。

---

### 26. 什麼是 Trie（前綴樹）？如何實作？ `[中級]`

**解答：**
Trie 是用於高效字串搜尋和前綴匹配的樹狀資料結構。

```javascript
class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

class Trie {
  constructor() { this.root = new TrieNode(); }

  insert(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) node.children[char] = new TrieNode();
      node = node.children[char];
    }
    node.isEnd = true;
  }

  search(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) return false;
      node = node.children[char];
    }
    return node.isEnd;
  }

  startsWith(prefix) {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children[char]) return false;
      node = node.children[char];
    }
    return true;
  }
}
```

**時間：** insert/search/startsWith 皆 O(m)，m 為字串長度。

---

### 27. 什麼是最小生成樹（MST）？Kruskal vs Prim 的差別？ `[高級]`

**解答：**
MST 是包含所有節點且邊總權重最小的生成樹（無環連通子圖）。

**Kruskal's Algorithm：**
- 按邊權排序，用 Union-Find 貪心加入不成環的邊
- 時間：O(E log E)
- 適合：稀疏圖（邊少）

**Prim's Algorithm：**
- 從任意節點開始，每次加入最小權重的新節點
- 時間：O((V + E) log V)（優先佇列）
- 適合：稠密圖（邊多）

---

### 28. 什麼是 Union-Find（並查集）？ `[中級]`

**解答：**
Union-Find 高效維護節點的連通性，支援合併（Union）和查詢（Find）操作。

```javascript
class UnionFind {
  constructor(n) {
    this.parent = Array.from({length: n}, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x) {  // 路徑壓縮
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(x, y) {  // 按秩合併
    const px = this.find(x), py = this.find(y);
    if (px === py) return false;  // 已在同一集合（有環）
    if (this.rank[px] < this.rank[py]) this.parent[px] = py;
    else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
    else { this.parent[py] = px; this.rank[px]++; }
    return true;
  }
}
```

**時間：** 每次操作接近 O(1)（α(n) 阿克曼函式反函式）。

---

### 29. 如何找到二元樹的最大路徑和？ `[高級]`

**解答：**
```javascript
function maxPathSum(root) {
  let maxSum = -Infinity;

  function dfs(node) {
    if (!node) return 0;

    // 負貢獻直接捨棄（取 0）
    const left = Math.max(dfs(node.left), 0);
    const right = Math.max(dfs(node.right), 0);

    // 以當前節點為路徑頂點的最大值
    maxSum = Math.max(maxSum, node.val + left + right);

    // 回傳給父節點的最大單邊貢獻
    return node.val + Math.max(left, right);
  }

  dfs(root);
  return maxSum;
}
```

---

### 30. 什麼是紅黑樹？基本特性是什麼？ `[高級]`

**解答：**
紅黑樹是自平衡的 BST，保證 O(log n) 的插入/刪除/搜尋。

**五個特性：**
1. 每個節點是紅色或黑色
2. 根節點是黑色
3. 所有葉節點（NIL 節點）是黑色
4. 紅色節點的兩個子節點都是黑色（不能連續兩個紅色）
5. 從任一節點到其每個葉子的路徑，包含相同數量的黑色節點

**應用：** Java `TreeMap/TreeSet`、Linux Kernel CFS Scheduler、C++ `map/set`。

---

## 排序與搜尋（10 題）

### 31. 解釋合併排序（Merge Sort）的原理。 `[中級]`

**解答：**
分治策略：遞迴地將陣列分成兩半，排序後再合併。

```javascript
function mergeSort(arr) {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return [...result, ...left.slice(i), ...right.slice(j)];
}
```

**時間：** O(n log n)，最壞也是 O(n log n)（穩定）。**空間：** O(n)。

---

### 32. 解釋快速排序（Quick Sort）的原理。 `[中級]`

**解答：**
選定 Pivot，將小於 Pivot 的元素放左側，大於放右側，遞迴排序兩側。

```javascript
function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    const pivot = partition(arr, low, high);
    quickSort(arr, low, pivot - 1);
    quickSort(arr, pivot + 1, high);
  }
}

function partition(arr, low, high) {
  const pivot = arr[high];
  let i = low - 1;
  for (let j = low; j < high; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i+1], arr[high]] = [arr[high], arr[i+1]];
  return i + 1;
}
```

**時間：** 平均 O(n log n)；最壞 O(n²)（已排序陣列 + 選最後元素為 Pivot）。**空間：** O(log n)。

---

### 33. 什麼是二元搜尋？如何處理邊界條件？ `[初級]`

**解答：**
```javascript
function binarySearch(nums, target) {
  let left = 0, right = nums.length - 1;

  while (left <= right) {  // ≤ 確保只剩一個元素時還會進入
    const mid = left + Math.floor((right - left) / 2);  // 防止溢位
    if (nums[mid] === target) return mid;
    else if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
```

**找第一個/最後一個目標值：**
```javascript
// 找第一個 >= target 的位置（Lower Bound）
function lowerBound(nums, target) {
  let left = 0, right = nums.length;
  while (left < right) {
    const mid = (left + right) >> 1;
    if (nums[mid] < target) left = mid + 1;
    else right = mid;
  }
  return left;
}
```

---

### 34. 如何在旋轉排序陣列中搜尋？ `[中級]`

**解答：**
```javascript
function search(nums, target) {
  let left = 0, right = nums.length - 1;

  while (left <= right) {
    const mid = (left + right) >> 1;
    if (nums[mid] === target) return mid;

    // 判斷左半段是否有序
    if (nums[left] <= nums[mid]) {
      if (nums[left] <= target && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else {  // 右半段有序
      if (nums[mid] < target && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }
  return -1;
}
```

---

### 35. 解釋堆積排序（Heap Sort）的原理。 `[高級]`

**解答：**
1. 將陣列建成最大堆（Max Heap），O(n)
2. 反覆將堆頂（最大值）與末尾交換，然後對縮小的堆 heapify，O(n log n)

```javascript
function heapSort(arr) {
  const n = arr.length;

  // 建立 Max Heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(arr, n, i);

  // 逐一取出最大值
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    heapify(arr, i, 0);
  }
}

function heapify(arr, n, i) {
  let largest = i;
  const left = 2 * i + 1, right = 2 * i + 2;
  if (left < n && arr[left] > arr[largest]) largest = left;
  if (right < n && arr[right] > arr[largest]) largest = right;
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    heapify(arr, n, largest);
  }
}
```

**時間：** O(n log n)（穩定），**空間：** O(1)（原地排序）。

---

## 動態規劃（10 題）

### 36. 什麼是動態規劃？如何識別 DP 問題？ `[中級]`

**解答：**
動態規劃（DP）透過儲存子問題結果避免重複計算，適用於具備：
1. **最優子結構**：整體最優解可由子問題最優解組成
2. **重疊子問題**：相同子問題被多次求解

**識別 DP 問題的信號：**
- 「最多/最少/最大/最小」
- 「有多少種方式」
- 「是否可能」
- 字串/陣列的子序列/子字串問題

**解題框架：**
1. 定義 `dp[i]` 的語意
2. 找出遞迴關係（State Transition）
3. 初始化基底案例
4. 確定計算順序

---

### 37. 求最長遞增子序列（LIS）的長度。 `[中級]`

**解答：**
```javascript
// O(n²) DP
function lengthOfLIS(nums) {
  const dp = new Array(nums.length).fill(1);  // dp[i] = 以 nums[i] 結尾的 LIS 長度
  let maxLen = 1;

  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
    maxLen = Math.max(maxLen, dp[i]);
  }
  return maxLen;
}

// O(n log n)：Patience Sorting + 二元搜尋
function lengthOfLIS(nums) {
  const tails = [];  // tails[i] = 長度 i+1 的 IS 的最小結尾值
  for (const num of nums) {
    const pos = lowerBound(tails, num);
    tails[pos] = num;
  }
  return tails.length;
}
```

---

### 38. 求背包問題（0/1 Knapsack）。 `[中級]`

**解答：**
```javascript
// dp[j] = 容量 j 時可獲得的最大價值
function knapsack(weights, values, capacity) {
  const dp = new Array(capacity + 1).fill(0);

  for (let i = 0; i < weights.length; i++) {
    // 從後往前遍歷（確保每個物品只取一次）
    for (let j = capacity; j >= weights[i]; j--) {
      dp[j] = Math.max(dp[j], dp[j - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
}
```

**時間：** O(n × W)，**空間：** O(W)（一維 DP 空間壓縮）。

---

### 39. 求最長公共子序列（LCS）。 `[中級]`

**解答：**
```javascript
function longestCommonSubsequence(text1, text2) {
  const m = text1.length, n = text2.length;
  const dp = Array.from({length: m + 1}, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i-1] === text2[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;  // 字元相等，LCS +1
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);  // 取兩個方向最大值
      }
    }
  }
  return dp[m][n];
}
// "abcde", "ace" → 3 ("ace")
```

---

### 40. 求編輯距離（Edit Distance / Levenshtein）。 `[高級]`

**解答：**
```javascript
function minDistance(word1, word2) {
  const m = word1.length, n = word2.length;
  // dp[i][j] = word1[0..i-1] 轉成 word2[0..j-1] 需要的最少操作數
  const dp = Array.from({length: m + 1}, (_, i) =>
    Array.from({length: n + 1}, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i-1] === word2[j-1]) {
        dp[i][j] = dp[i-1][j-1];  // 字元相同，不需操作
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i-1][j],    // 刪除
          dp[i][j-1],    // 插入
          dp[i-1][j-1]   // 替換
        );
      }
    }
  }
  return dp[m][n];
}
```

---

### 41. 求最長迴文子字串。 `[中級]`

**解答：**
```javascript
// 中心擴展法，O(n²) 時間，O(1) 空間
function longestPalindrome(s) {
  let start = 0, maxLen = 0;

  function expand(left, right) {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      if (right - left + 1 > maxLen) {
        maxLen = right - left + 1;
        start = left;
      }
      left--;
      right++;
    }
  }

  for (let i = 0; i < s.length; i++) {
    expand(i, i);      // 奇數長度迴文
    expand(i, i + 1);  // 偶數長度迴文
  }
  return s.substring(start, start + maxLen);
}
```

---

### 42. 求爬樓梯問題（Climbing Stairs）。 `[初級]`

**解答：**
每次可爬 1 或 2 階，n 階共有幾種爬法？本質是費波那契數列。

```javascript
function climbStairs(n) {
  if (n <= 2) return n;
  let prev1 = 1, prev2 = 2;
  for (let i = 3; i <= n; i++) {
    [prev1, prev2] = [prev2, prev1 + prev2];
  }
  return prev2;
}
```

**時間：** O(n)，**空間：** O(1)。

---

### 43. 求換零錢最少硬幣數（Coin Change）。 `[中級]`

**解答：**
```javascript
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
// coins=[1,5,11], amount=15 → 3 ([5,5,5] 不對; 答案是 [1,1,1,1,11]? 不，是 [5,5,5]=3)
```

---

### 44. 如何解決矩陣中的最長路徑問題（Matrix DP）？ `[中級]`

**解答：**
```javascript
// 矩陣最大路徑和（只能向右或向下）
function maxPathSum(grid) {
  const m = grid.length, n = grid[0].length;
  const dp = Array.from({length: m}, (_, i) =>
    Array.from({length: n}, (_, j) => grid[i][j])
  );

  // 初始化第一行和第一列
  for (let i = 1; i < m; i++) dp[i][0] += dp[i-1][0];
  for (let j = 1; j < n; j++) dp[0][j] += dp[0][j-1];

  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[i][j] += Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m-1][n-1];
}
```

---

### 45. 解釋記憶化（Memoization）和表格化（Tabulation）的差別。 `[中級]`

**解答：**
| | 記憶化（Top-Down） | 表格化（Bottom-Up） |
|---|---|---|
| 方向 | 由大問題拆解到小問題 | 由最小子問題累積到大問題 |
| 實作 | 遞迴 + 快取 | 迭代 + DP 表格 |
| 空間 | 呼叫堆疊 + 快取 | 只有 DP 表格（通常更省） |
| 不計算不需要的子問題 | ✅ | ❌ |
| 容易理解 | 通常更直觀 | 需要確定計算順序 |

**記憶化範例：**
```javascript
const memo = new Map();
function fib(n) {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n);
  const result = fib(n-1) + fib(n-2);
  memo.set(n, result);
  return result;
}
```

---

## 進階主題（5 題）

### 46. 什麼是優先佇列（Priority Queue）和堆積（Heap）？ `[中級]`

**解答：**
堆積是一種完整二元樹，滿足堆積性質：
- **最大堆（Max Heap）**：父節點 ≥ 子節點（堆頂是最大值）
- **最小堆（Min Heap）**：父節點 ≤ 子節點（堆頂是最小值）

**操作複雜度：**
- 插入（push）：O(log n)
- 取最大/最小（pop）：O(log n)
- 查看堆頂（peek）：O(1)
- 建堆（build heap from array）：O(n)

**應用：** Dijkstra 最短路徑、堆積排序、找第 K 大元素、合併 K 個有序串列。

---

### 47. 如何找到串流中的第 K 大元素？ `[中級]`

**解答：**
使用容量為 K 的最小堆：堆頂就是第 K 大元素。

```javascript
class KthLargest {
  constructor(k, nums) {
    this.k = k;
    this.heap = new MinHeap(k);  // 最小堆
    for (const n of nums) this.add(n);
  }

  add(val) {
    if (this.heap.size() < this.k) {
      this.heap.push(val);
    } else if (val > this.heap.peek()) {
      this.heap.pop();
      this.heap.push(val);
    }
    return this.heap.peek();
  }
}
```

**時間：** 每次 add O(log k)，**空間：** O(k)。

---

### 48. 解釋位元操作（Bit Manipulation）的常見技巧。 `[中級]`

**解答：**
```javascript
// 常用位元運算
x & (x - 1)     // 消去最低位的 1（判斷是否是 2 的冪：x & (x-1) === 0）
x & (-x)        // 取最低位的 1（Lowbit）
x ^ x           // = 0（自己異或自己）
x ^ 0           // = x
a ^ b ^ b       // = a（異或消去 b）

// 判斷第 i 位是否為 1
(x >> i) & 1

// 設定第 i 位為 1
x | (1 << i)

// 清除第 i 位
x & ~(1 << i)

// 翻轉第 i 位
x ^ (1 << i)

// 計算 n 的二進位中 1 的個數（Brian Kernighan's）
function countBits(n) {
  let count = 0;
  while (n) { n &= n - 1; count++; }
  return count;
}
```

---

### 49. 什麼是回溯法（Backtracking）？解決排列/組合問題。 `[中級]`

**解答：**
回溯是系統性地搜尋所有可能解，發現死路時「撤銷」選擇，嘗試其他路徑。

```javascript
// 全排列（Permutations）
function permute(nums) {
  const result = [];
  function backtrack(current, remaining) {
    if (remaining.length === 0) {
      result.push([...current]);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      current.push(remaining[i]);
      backtrack(current, [...remaining.slice(0,i), ...remaining.slice(i+1)]);
      current.pop();  // 撤銷選擇
    }
  }
  backtrack([], nums);
  return result;
}

// 組合總和（Combination Sum）
function combinationSum(candidates, target) {
  const result = [];
  function backtrack(start, current, remaining) {
    if (remaining === 0) { result.push([...current]); return; }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break;  // 剪枝（需先排序）
      current.push(candidates[i]);
      backtrack(i, current, remaining - candidates[i]);  // 允許重複使用
      current.pop();
    }
  }
  candidates.sort((a, b) => a - b);
  backtrack(0, [], target);
  return result;
}
```

---

### 50. 如何設計一個 LRU Cache（最近最少使用快取）？ `[高級]`

**解答：**
使用雙向鏈結串列 + 雜湊表，實現 O(1) 的 get 和 put。

```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();  // key → node
    // 哨兵節點（Dummy head/tail）
    this.head = { key: 0, val: 0, prev: null, next: null };
    this.tail = { key: 0, val: 0, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const node = this.cache.get(key);
    this._moveToFront(node);
    return node.val;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.val = value;
      this._moveToFront(node);
    } else {
      if (this.cache.size === this.capacity) {
        const lru = this.tail.prev;
        this._remove(lru);
        this.cache.delete(lru.key);
      }
      const node = { key, val: value };
      this._addToFront(node);
      this.cache.set(key, node);
    }
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addToFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _moveToFront(node) {
    this._remove(node);
    this._addToFront(node);
  }
}
```

**時間：** get/put 皆 O(1)。**空間：** O(capacity)。
