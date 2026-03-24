# Data Structures & Algorithms Interview Questions

**50 questions** covering arrays, strings, trees, graphs, dynamic programming, and core algorithms.

---

## Core Concepts & Complexity (5 questions)

### 1. What is Big O notation? Explain common complexities. `[Junior]`

**Answer:**
Big O describes the upper bound of an algorithm's time or space complexity as input grows.

| Complexity | Name | Example |
|-----------|------|---------|
| O(1) | Constant | Array index, hash map lookup |
| O(log n) | Logarithmic | Binary search, BST operations |
| O(n) | Linear | Linear search, single loop |
| O(n log n) | Linearithmic | Merge sort, heap sort |
| O(n²) | Quadratic | Bubble sort, nested loops |
| O(2^n) | Exponential | Recursive subset generation |
| O(n!) | Factorial | Brute-force permutations |

**Rules:** Drop constants (`O(2n) = O(n)`), drop lower terms (`O(n² + n) = O(n²)`). Analyze worst case unless specified.

---

### 2. When should you use an array vs a linked list? `[Junior]`

**Answer:**
| | Array | Linked List |
|---|---|---|
| Access by index | O(1) | O(n) |
| Search | O(n) / O(log n) sorted | O(n) |
| Insert at beginning | O(n) (shift) | O(1) |
| Insert at end | O(1) amortized | O(1) with tail pointer |
| Insert in middle | O(n) | O(1) with pointer |
| Memory | Contiguous (cache-friendly) | Scattered (pointer overhead) |

**Use array:** Random access needed, cache performance matters, size known upfront.
**Use linked list:** Frequent insertions/deletions at known positions, size unknown/varies widely.

---

### 3. What is the difference between a stack and a queue? `[Junior]`

**Answer:**
- **Stack** — LIFO (Last In, First Out). Push/pop at the same end.
  - Operations: push O(1), pop O(1), peek O(1)
  - Uses: Function call stack, undo/redo, DFS, balanced parentheses, browser history
- **Queue** — FIFO (First In, First Out). Enqueue at back, dequeue from front.
  - Operations: enqueue O(1), dequeue O(1)
  - Uses: BFS, task scheduling, producer-consumer, printer queue

**Implementations:** Arrays (circular buffer for queue), linked lists, or language built-ins (Python `deque`, JS `[]`).

---

### 4. What is a hash table and how does it handle collisions? `[Mid]`

**Answer:**
A hash table maps keys to values via a hash function. Hash function computes an index (bucket) for each key.

**Collision resolution:**
- **Chaining:** Each bucket holds a linked list of entries. O(1) average, O(n) worst case.
- **Open addressing (linear probing):** On collision, probe next empty slot. Cache-friendly but clusters.
- **Double hashing:** Use second hash function for probe sequence. Reduces clustering.

**Load factor:** `n/m` (entries/buckets). Rehash (resize to 2x) when load factor exceeds threshold (~0.75).

**Average case:** O(1) for insert, delete, lookup. Worst case: O(n) (all keys hash to same bucket).

---

### 5. Explain the difference between BFS and DFS. `[Mid]`

**Answer:**
- **BFS (Breadth-First Search):** Explore all neighbors before going deeper. Uses a **queue**. Finds shortest path in unweighted graphs.
- **DFS (Depth-First Search):** Go as deep as possible before backtracking. Uses a **stack** (or recursion). Memory-efficient for deep trees.

| | BFS | DFS |
|---|---|---|
| Data structure | Queue | Stack/Recursion |
| Space | O(width) — wide graphs use lots | O(depth) — deep graphs use lots |
| Shortest path | ✅ (unweighted) | ❌ |
| Cycle detection | ✅ | ✅ |
| Topological sort | ❌ | ✅ |
| Connected components | ✅ | ✅ |

---

## Arrays & Strings (10 questions)

### 6. Find the maximum subarray sum (Kadane's Algorithm). `[Mid]`

**Answer:**
```python
def max_subarray(nums):
    max_sum = current_sum = nums[0]
    for num in nums[1:]:
        current_sum = max(num, current_sum + num)
        max_sum = max(max_sum, current_sum)
    return max_sum
```
**Time:** O(n), **Space:** O(1)

**Key insight:** At each position, decide whether to extend the current subarray or start fresh. If `current_sum + num < num`, start fresh.

---

### 7. Two Sum: find indices of two numbers that add to a target. `[Junior]`

**Answer:**
```python
def two_sum(nums, target):
    seen = {}  # value → index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
```
**Time:** O(n), **Space:** O(n)

**Pattern:** Use a hash map to store complement while iterating. Classic "one-pass hash map" pattern.

---

### 8. How do you detect a cycle in a linked list? `[Mid]`

**Answer:**
**Floyd's Cycle Detection (Tortoise and Hare):**
```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False
```
**Time:** O(n), **Space:** O(1)

**Intuition:** Fast pointer moves 2 steps, slow 1 step. If there's a cycle, fast will "lap" slow and they'll meet.

**Extension:** Find the start of the cycle — after they meet, move one pointer to head, advance both one step at a time; they meet at cycle start.

---

### 9. Reverse a string or an array in place. `[Junior]`

**Answer:**
```python
def reverse(s):
    # Convert to list if string (strings are immutable in Python)
    arr = list(s)
    left, right = 0, len(arr) - 1
    while left < right:
        arr[left], arr[right] = arr[right], arr[left]
        left += 1
        right -= 1
    return ''.join(arr)
```
**Time:** O(n), **Space:** O(1) for arrays, O(n) for strings

**Two-pointer pattern** — one of the most common patterns in array/string problems.

---

### 10. Find all duplicates in an array. `[Mid]`

**Answer:**
```python
# O(n) time, O(n) space using hash set
def find_duplicates(nums):
    seen = set()
    return [x for x in nums if x in seen or seen.add(x) is None and False]

# Better:
def find_duplicates(nums):
    seen, duplicates = set(), []
    for num in nums:
        if num in seen:
            duplicates.append(num)
        else:
            seen.add(num)
    return duplicates

# O(n) time, O(1) space (if nums in range [1,n]):
def find_duplicates_inplace(nums):
    result = []
    for num in nums:
        idx = abs(num) - 1
        if nums[idx] < 0:
            result.append(abs(num))
        else:
            nums[idx] = -nums[idx]
    return result
```

---

### 11. Sliding window: longest substring without repeating characters. `[Mid]`

**Answer:**
```python
def length_of_longest_substring(s):
    char_index = {}
    left = max_len = 0

    for right, char in enumerate(s):
        if char in char_index and char_index[char] >= left:
            left = char_index[char] + 1  # shrink window
        char_index[char] = right
        max_len = max(max_len, right - left + 1)

    return max_len
```
**Time:** O(n), **Space:** O(min(n, alphabet_size))

**Sliding window pattern:** Maintain a valid window with two pointers. Expand right, shrink left when condition violated.

---

### 12. Binary search and its variants. `[Mid]`

**Answer:**
```python
def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2  # avoid overflow
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# Find leftmost position (first occurrence)
def lower_bound(nums, target):
    left, right = 0, len(nums)
    while left < right:
        mid = (left + right) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid  # don't exclude right
    return left  # first position where nums[i] >= target
```
**Time:** O(log n)

---

### 13. Merge two sorted arrays. `[Junior]`

**Answer:**
```python
def merge_sorted(a, b):
    result = []
    i = j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            result.append(a[i]); i += 1
        else:
            result.append(b[j]); j += 1
    return result + a[i:] + b[j:]
```
**Time:** O(m+n), **Space:** O(m+n)

**In-place variant (merge into array with extra space):** Used in merge sort and LeetCode #88. Work backwards from end to avoid shifting.

---

### 14. Product of array except self. `[Mid]`

**Answer:**
```python
def product_except_self(nums):
    n = len(nums)
    result = [1] * n

    # Left pass: result[i] = product of all elements to the left
    prefix = 1
    for i in range(n):
        result[i] = prefix
        prefix *= nums[i]

    # Right pass: multiply by product of all elements to the right
    suffix = 1
    for i in range(n - 1, -1, -1):
        result[i] *= suffix
        suffix *= nums[i]

    return result
```
**Time:** O(n), **Space:** O(1) extra (output array doesn't count)

---

### 15. Longest common subsequence. `[Senior]`

**Answer:**
```python
def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])

    return dp[m][n]
```
**Time:** O(m×n), **Space:** O(m×n), optimizable to O(min(m,n))

---

## Trees (10 questions)

### 16. Implement tree traversals (in-order, pre-order, post-order). `[Mid]`

**Answer:**
```python
class Node:
    def __init__(self, val):
        self.val = val
        self.left = self.right = None

# Recursive
def inorder(root):    # Left → Root → Right (sorted for BST)
    return inorder(root.left) + [root.val] + inorder(root.right) if root else []

def preorder(root):   # Root → Left → Right (copy tree)
    return [root.val] + preorder(root.left) + preorder(root.right) if root else []

def postorder(root):  # Left → Right → Root (delete tree)
    return postorder(root.left) + postorder(root.right) + [root.val] if root else []

# Iterative inorder (using stack)
def inorder_iterative(root):
    result, stack, curr = [], [], root
    while curr or stack:
        while curr:
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()
        result.append(curr.val)
        curr = curr.right
    return result
```

---

### 17. Find the height of a binary tree. `[Junior]`

**Answer:**
```python
def height(root):
    if not root:
        return 0
    return 1 + max(height(root.left), height(root.right))
```
**Time:** O(n), **Space:** O(h) where h is height (O(n) worst case for skewed tree, O(log n) balanced)

---

### 18. Check if a binary tree is balanced. `[Mid]`

**Answer:**
```python
def is_balanced(root):
    def check(node):
        if not node:
            return 0  # height 0
        left = check(node.left)
        if left == -1:
            return -1  # left subtree unbalanced
        right = check(node.right)
        if right == -1:
            return -1  # right subtree unbalanced
        if abs(left - right) > 1:
            return -1  # this node unbalanced
        return 1 + max(left, right)

    return check(root) != -1
```
**Time:** O(n), **Space:** O(h)

**Optimization:** Returns -1 on first unbalanced detection (early termination).

---

### 19. Lowest Common Ancestor of a binary tree. `[Mid]`

**Answer:**
```python
def lca(root, p, q):
    if not root or root == p or root == q:
        return root

    left = lca(root.left, p, q)
    right = lca(root.right, p, q)

    # If both sides found a node, current root is LCA
    if left and right:
        return root
    # Otherwise, LCA is on the side that found a node
    return left or right
```
**Time:** O(n), **Space:** O(h)

---

### 20. Serialize and deserialize a binary tree. `[Senior]`

**Answer:**
```python
def serialize(root):
    if not root:
        return 'null'
    return f'{root.val},{serialize(root.left)},{serialize(root.right)}'

def deserialize(data):
    queue = deque(data.split(','))

    def build():
        val = queue.popleft()
        if val == 'null':
            return None
        node = Node(int(val))
        node.left = build()
        node.right = build()
        return node

    return build()
```

---

### 21. Level-order traversal (BFS on a tree). `[Mid]`

**Answer:**
```python
from collections import deque

def level_order(root):
    if not root:
        return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):  # process all nodes at current level
            node = queue.popleft()
            level.append(node.val)
            if node.left:  queue.append(node.left)
            if node.right: queue.append(node.right)
        result.append(level)
    return result
```
**Time:** O(n), **Space:** O(w) where w is max width

---

### 22. Validate a binary search tree. `[Mid]`

**Answer:**
```python
def is_valid_bst(root, min_val=float('-inf'), max_val=float('inf')):
    if not root:
        return True
    if root.val <= min_val or root.val >= max_val:
        return False
    return (is_valid_bst(root.left, min_val, root.val) and
            is_valid_bst(root.right, root.val, max_val))
```

**Common mistake:** Just checking `node.left.val < node.val` is wrong — the entire left subtree must be less than node.val.

---

### 23. Find the kth smallest element in a BST. `[Mid]`

**Answer:**
```python
def kth_smallest(root, k):
    # In-order traversal of BST is sorted
    stack, curr = [], root
    while curr or stack:
        while curr:
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()
        k -= 1
        if k == 0:
            return curr.val
        curr = curr.right
```
**Time:** O(H + k), **Space:** O(H)

---

### 24. Implement a trie (prefix tree). `[Senior]`

**Answer:**
```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return node.is_end

    def starts_with(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return True
```

---

### 25. Convert binary search tree to sorted doubly linked list. `[Senior]`

**Answer:**
```python
def bst_to_dll(root):
    if not root:
        return None
    head = prev = None

    def inorder(node):
        nonlocal head, prev
        if not node:
            return
        inorder(node.left)
        if prev:
            prev.right = node
            node.left = prev
        else:
            head = node  # leftmost is head
        prev = node
        inorder(node.right)

    inorder(root)
    return head
```

---

## Graphs (10 questions)

### 26. Implement DFS and BFS for a graph. `[Mid]`

**Answer:**
```python
from collections import deque

def dfs(graph, start, visited=None):
    if visited is None:
        visited = set()
    visited.add(start)
    result = [start]
    for neighbor in graph[start]:
        if neighbor not in visited:
            result.extend(dfs(graph, neighbor, visited))
    return result

def bfs(graph, start):
    visited = {start}
    queue = deque([start])
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return result
```

---

### 27. Detect a cycle in a directed graph. `[Mid]`

**Answer:**
```python
def has_cycle(graph):
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {node: WHITE for node in graph}

    def dfs(node):
        color[node] = GRAY  # in current DFS path
        for neighbor in graph.get(node, []):
            if color[neighbor] == GRAY:
                return True  # back edge = cycle
            if color[neighbor] == WHITE and dfs(neighbor):
                return True
        color[node] = BLACK  # fully processed
        return False

    return any(dfs(node) for node in graph if color[node] == WHITE)
```

---

### 28. Topological sort. `[Mid]`

**Answer:**
```python
from collections import deque

def topological_sort(graph):
    in_degree = {u: 0 for u in graph}
    for u in graph:
        for v in graph[u]:
            in_degree[v] = in_degree.get(v, 0) + 1

    queue = deque([u for u in in_degree if in_degree[u] == 0])
    result = []

    while queue:
        node = queue.popleft()
        result.append(node)
        for neighbor in graph.get(node, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return result if len(result) == len(graph) else []  # [] if cycle exists
```
**Use cases:** Task scheduling, build systems, course prerequisites.

---

### 29. Number of islands (connected components). `[Mid]`

**Answer:**
```python
def num_islands(grid):
    if not grid:
        return 0

    def dfs(r, c):
        if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]) or grid[r][c] != '1':
            return
        grid[r][c] = '0'  # mark visited
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
            dfs(r + dr, c + dc)

    count = 0
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1
    return count
```
**Time:** O(m×n), **Space:** O(m×n) recursion stack

---

### 30. Dijkstra's shortest path algorithm. `[Senior]`

**Answer:**
```python
import heapq

def dijkstra(graph, start):
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    heap = [(0, start)]  # (distance, node)

    while heap:
        dist, node = heapq.heappop(heap)
        if dist > distances[node]:
            continue  # stale entry
        for neighbor, weight in graph[node]:
            new_dist = dist + weight
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                heapq.heappush(heap, (new_dist, neighbor))

    return distances
```
**Time:** O((V + E) log V), **Space:** O(V)

**Limitation:** Doesn't work with negative edge weights (use Bellman-Ford instead).

---

### 31. Course Schedule (detect if course order is possible). `[Mid]`

**Answer:**
```python
def can_finish(num_courses, prerequisites):
    graph = [[] for _ in range(num_courses)]
    for course, prereq in prerequisites:
        graph[prereq].append(course)

    # 0=unvisited, 1=in-progress (current path), 2=completed
    state = [0] * num_courses

    def has_cycle(course):
        if state[course] == 1: return True   # cycle
        if state[course] == 2: return False  # already done
        state[course] = 1
        for next_course in graph[course]:
            if has_cycle(next_course):
                return True
        state[course] = 2
        return False

    return not any(has_cycle(c) for c in range(num_courses))
```

---

### 32. Word ladder (shortest transformation sequence). `[Senior]`

**Answer:**
```python
from collections import deque

def ladder_length(begin_word, end_word, word_list):
    word_set = set(word_list)
    if end_word not in word_set:
        return 0

    queue = deque([(begin_word, 1)])
    visited = {begin_word}

    while queue:
        word, length = queue.popleft()
        for i in range(len(word)):
            for c in 'abcdefghijklmnopqrstuvwxyz':
                new_word = word[:i] + c + word[i+1:]
                if new_word == end_word:
                    return length + 1
                if new_word in word_set and new_word not in visited:
                    visited.add(new_word)
                    queue.append((new_word, length + 1))
    return 0
```

---

### 33. Clone a graph. `[Mid]`

**Answer:**
```python
def clone_graph(node):
    if not node:
        return None
    cloned = {}  # original → clone mapping

    def dfs(n):
        if n in cloned:
            return cloned[n]
        clone = Node(n.val)
        cloned[n] = clone
        for neighbor in n.neighbors:
            clone.neighbors.append(dfs(neighbor))
        return clone

    return dfs(node)
```

---

### 34. Find bridges in a graph. `[Senior]`

**Answer:**
A bridge is an edge whose removal disconnects the graph. Tarjan's algorithm:
```python
def find_bridges(n, edges):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)

    discovery = [-1] * n
    low = [0] * n
    timer = [0]
    bridges = []

    def dfs(u, parent):
        discovery[u] = low[u] = timer[0]
        timer[0] += 1
        for v in graph[u]:
            if discovery[v] == -1:  # tree edge
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > discovery[u]:
                    bridges.append((u, v))
            elif v != parent:  # back edge
                low[u] = min(low[u], discovery[v])

    for i in range(n):
        if discovery[i] == -1:
            dfs(i, -1)
    return bridges
```

---

### 35. Minimum spanning tree (Kruskal's algorithm). `[Senior]`

**Answer:**
```python
def min_spanning_tree(n, edges):
    edges.sort(key=lambda x: x[2])  # sort by weight
    parent = list(range(n))

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])  # path compression
        return parent[x]

    def union(x, y):
        px, py = find(x), find(y)
        if px == py: return False
        parent[px] = py
        return True

    mst_weight = 0
    for u, v, w in edges:
        if union(u, v):
            mst_weight += w
    return mst_weight
```
**Time:** O(E log E), **Space:** O(V)

---

## Dynamic Programming (10 questions)

### 36. What is dynamic programming and when do you use it? `[Mid]`

**Answer:**
DP solves problems by breaking them into overlapping subproblems and storing results (memoization/tabulation) to avoid recomputation.

**When to use:** Problem has **optimal substructure** (optimal solution built from optimal subproblems) AND **overlapping subproblems** (same subproblems solved multiple times).

**Approaches:**
- **Top-down (memoization):** Recursion + cache. Natural, but recursive overhead.
- **Bottom-up (tabulation):** Iterative, build from base cases. More memory-efficient, avoids stack overflow.

**Common patterns:** 1D DP (fibonacci, climbing stairs), 2D DP (LCS, edit distance), interval DP, knapsack variants.

---

### 37. Fibonacci with memoization. `[Junior]`

**Answer:**
```python
# Top-down (memoization)
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)

# Bottom-up (tabulation)
def fib_dp(n):
    if n <= 1: return n
    a, b = 0, 1
    for _ in range(2, n+1):
        a, b = b, a + b
    return b
```
**Time:** O(n), **Space:** O(1) bottom-up, O(n) memoization

---

### 38. 0/1 Knapsack problem. `[Mid]`

**Answer:**
```python
def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        for w in range(capacity + 1):
            dp[i][w] = dp[i-1][w]  # don't take item i
            if weights[i-1] <= w:
                dp[i][w] = max(dp[i][w], dp[i-1][w - weights[i-1]] + values[i-1])

    return dp[n][capacity]
```
**Time:** O(n×W), **Space:** O(n×W), optimizable to O(W)

---

### 39. Coin change (minimum coins). `[Mid]`

**Answer:**
```python
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0  # base case: 0 coins to make amount 0

    for a in range(1, amount + 1):
        for coin in coins:
            if coin <= a:
                dp[a] = min(dp[a], dp[a - coin] + 1)

    return dp[amount] if dp[amount] != float('inf') else -1
```
**Time:** O(amount × len(coins)), **Space:** O(amount)

---

### 40. Longest increasing subsequence. `[Mid]`

**Answer:**
```python
# O(n²) DP
def lis(nums):
    dp = [1] * len(nums)
    for i in range(1, len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)

# O(n log n) with binary search (patience sorting)
import bisect

def lis_fast(nums):
    tails = []
    for num in nums:
        pos = bisect.bisect_left(tails, num)
        if pos == len(tails):
            tails.append(num)
        else:
            tails[pos] = num
    return len(tails)
```

---

### 41. Edit distance (Levenshtein distance). `[Senior]`

**Answer:**
```python
def edit_distance(word1, word2):
    m, n = len(word1), len(word2)
    dp = list(range(n + 1))  # base case: delete all chars of word2

    for i in range(1, m + 1):
        prev, dp[0] = dp[0], i  # dp[0] = delete all chars of word1
        for j in range(1, n + 1):
            temp = dp[j]
            if word1[i-1] == word2[j-1]:
                dp[j] = prev
            else:
                dp[j] = 1 + min(prev, dp[j], dp[j-1])
                # substitute, delete, insert
            prev = temp

    return dp[n]
```
**Time:** O(m×n), **Space:** O(min(m,n))

---

### 42. Word break problem. `[Mid]`

**Answer:**
```python
def word_break(s, word_dict):
    word_set = set(word_dict)
    dp = [False] * (len(s) + 1)
    dp[0] = True  # empty string

    for i in range(1, len(s) + 1):
        for j in range(i):
            if dp[j] and s[j:i] in word_set:
                dp[i] = True
                break

    return dp[len(s)]
```
**Time:** O(n²), **Space:** O(n)

---

### 43. Regular expression matching. `[Senior]`

**Answer:**
```python
def is_match(s, p):
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True

    # Handle patterns like a*, a*b*, etc. matching empty string
    for j in range(2, n + 1):
        if p[j-1] == '*':
            dp[0][j] = dp[0][j-2]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j-1] == '*':
                dp[i][j] = dp[i][j-2]  # zero occurrences
                if p[j-2] == '.' or p[j-2] == s[i-1]:
                    dp[i][j] |= dp[i-1][j]  # one or more
            elif p[j-1] == '.' or p[j-1] == s[i-1]:
                dp[i][j] = dp[i-1][j-1]

    return dp[m][n]
```

---

### 44. Burst balloons (interval DP). `[Senior]`

**Answer:**
```python
def max_coins(nums):
    # Add boundary balloons
    balloons = [1] + nums + [1]
    n = len(balloons)
    dp = [[0] * n for _ in range(n)]

    # dp[i][j] = max coins from bursting all balloons between i and j (exclusive)
    for length in range(2, n):
        for left in range(0, n - length):
            right = left + length
            for k in range(left + 1, right):
                dp[left][right] = max(
                    dp[left][right],
                    balloons[left] * balloons[k] * balloons[right] +
                    dp[left][k] + dp[k][right]
                )

    return dp[0][n-1]
```

---

### 45. House robber (cannot rob adjacent houses). `[Mid]`

**Answer:**
```python
def rob(nums):
    if not nums: return 0
    if len(nums) == 1: return nums[0]

    prev2, prev1 = 0, 0
    for num in nums:
        curr = max(prev1, prev2 + num)
        prev2, prev1 = prev1, curr

    return prev1
```
**Time:** O(n), **Space:** O(1)

---

## Sorting & Other Algorithms (5 questions)

### 46. Implement merge sort. `[Mid]`

**Answer:**
```python
def merge_sort(arr):
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])

    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    return result + left[i:] + right[j:]
```
**Time:** O(n log n), **Space:** O(n)

---

### 47. Implement quick sort. `[Mid]`

**Answer:**
```python
def quick_sort(arr, low=0, high=None):
    if high is None:
        high = len(arr) - 1

    if low < high:
        pivot_idx = partition(arr, low, high)
        quick_sort(arr, low, pivot_idx - 1)
        quick_sort(arr, pivot_idx + 1, high)

def partition(arr, low, high):
    pivot = arr[high]
    i = low - 1  # pointer for smaller elements
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i+1], arr[high] = arr[high], arr[i+1]
    return i + 1
```
**Time:** O(n log n) average, O(n²) worst case, **Space:** O(log n) recursion

---

### 48. Find the kth largest element. `[Mid]`

**Answer:**
```python
import heapq

# O(n log k) — min-heap of size k
def kth_largest(nums, k):
    heap = []
    for num in nums:
        heapq.heappush(heap, num)
        if len(heap) > k:
            heapq.heappop(heap)  # pop smallest
    return heap[0]  # root is kth largest

# O(n) average — QuickSelect
def kth_largest_quickselect(nums, k):
    target = len(nums) - k  # target index in sorted order

    def partition(left, right):
        pivot, store = nums[right], left
        for i in range(left, right):
            if nums[i] <= pivot:
                nums[i], nums[store] = nums[store], nums[i]
                store += 1
        nums[store], nums[right] = nums[right], nums[store]
        return store

    left, right = 0, len(nums) - 1
    while left <= right:
        pivot_idx = partition(left, right)
        if pivot_idx == target: return nums[pivot_idx]
        elif pivot_idx < target: left = pivot_idx + 1
        else: right = pivot_idx - 1
```

---

### 49. Design a LRU cache. `[Senior]`

**Answer:**
```python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)  # mark as recently used
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)  # remove LRU (first item)
```
**All operations:** O(1)

**Without OrderedDict:** Use doubly linked list + hash map. LinkedList maintains order; hash map provides O(1) lookup.

---

### 50. Implement a min-heap. `[Senior]`

**Answer:**
```python
class MinHeap:
    def __init__(self):
        self.heap = []

    def push(self, val):
        self.heap.append(val)
        self._sift_up(len(self.heap) - 1)

    def pop(self):
        if len(self.heap) == 1:
            return self.heap.pop()
        min_val = self.heap[0]
        self.heap[0] = self.heap.pop()  # move last to root
        self._sift_down(0)
        return min_val

    def _sift_up(self, i):
        parent = (i - 1) // 2
        while i > 0 and self.heap[i] < self.heap[parent]:
            self.heap[i], self.heap[parent] = self.heap[parent], self.heap[i]
            i, parent = parent, (parent - 1) // 2

    def _sift_down(self, i):
        n = len(self.heap)
        while True:
            smallest = i
            for child in [2*i+1, 2*i+2]:
                if child < n and self.heap[child] < self.heap[smallest]:
                    smallest = child
            if smallest == i: break
            self.heap[i], self.heap[smallest] = self.heap[smallest], self.heap[i]
            i = smallest
```
**Push/Pop:** O(log n), **Peek:** O(1)
