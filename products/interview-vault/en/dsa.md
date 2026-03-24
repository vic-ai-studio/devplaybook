# Data Structures & Algorithms Interview Questions

50 questions covering arrays, strings, trees, graphs, dynamic programming, and core algorithms.

---

## Arrays & Strings

### 1. Two Sum — find two indices that add up to a target. `[Junior]`

**Answer:**
Use a hash map to store each number's complement as you iterate. O(N) vs O(N²) brute force.

```python
def two_sum(nums, target):
    seen = {}  # value -> index
    for i, n in enumerate(nums):
        complement = target - n
        if complement in seen:
            return [seen[complement], i]
        seen[n] = i
    return []
```

**Time Complexity:** O(N)
**Space Complexity:** O(N)

**Key points:** Edge cases: duplicate values (hash map stores latest index, but since we check before inserting, duplicates are handled correctly), empty array, negative numbers.

**Follow-up:** What if the array is sorted? → Use two pointers (left, right); move left forward if sum < target, move right backward if sum > target. O(N) time, O(1) space.

---

### 2. Longest Substring Without Repeating Characters. `[Junior]`

**Answer:**
Sliding window with a hash map tracking the last seen index of each character. Shrink the left pointer when a duplicate is found.

```python
def length_of_longest_substring(s):
    last_seen = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best
```

**Time Complexity:** O(N)
**Space Complexity:** O(min(N, Σ)) where Σ is the alphabet size

**Key points:** The condition `last_seen[ch] >= left` avoids shrinking the window past the left pointer due to a stale entry in the map.

**Follow-up:** How does this change if you need the actual substring, not just the length? → Track the start index of the best window and slice `s[best_left:best_right+1]`.

---

### 3. Container With Most Water (two-pointer approach). `[Junior]`

**Answer:**
Place pointers at both ends. The area is `min(height[l], height[r]) * (r - l)`. Always move the shorter side inward, since moving the taller side can only decrease or maintain the width without increasing the height.

```python
def max_area(height):
    l, r = 0, len(height) - 1
    best = 0
    while l < r:
        area = min(height[l], height[r]) * (r - l)
        best = max(best, area)
        if height[l] <= height[r]:
            l += 1
        else:
            r -= 1
    return best
```

**Time Complexity:** O(N)
**Space Complexity:** O(1)

**Key points:** The greedy choice to move the shorter side is correct because the current area is limited by the shorter side; moving it is the only way to potentially find a taller boundary.

**Follow-up:** What is the brute-force complexity? → O(N²); enumerate all pairs. The two-pointer approach exploits the monotonic structure.

---

### 4. Maximum Subarray (Kadane's Algorithm). `[Junior]`

**Answer:**
Track the running subarray sum and reset to the current element whenever continuing the previous subarray makes it worse. Track the global maximum.

```python
def max_subarray(nums):
    cur = best = nums[0]
    for n in nums[1:]:
        cur = max(n, cur + n)
        best = max(best, cur)
    return best
```

**Time Complexity:** O(N)
**Space Complexity:** O(1)

**Key points:** Edge cases: all-negative array (answer is the largest single element, handled correctly), single element, array with zeros.

**Follow-up:** How do you return the actual subarray indices, not just the sum? → Track `start`, `end`, and a `temp_start` variable; update them when you reset `cur` or find a new best.

---

### 5. Find the Majority Element (Boyer-Moore Voting). `[Mid]`

**Answer:**
Boyer-Moore: maintain a candidate and a count. Increment count when you see the candidate, decrement otherwise. When count hits 0, the next element becomes the new candidate. The true majority element (if one exists) always survives.

```python
def majority_element(nums):
    candidate, count = nums[0], 1
    for n in nums[1:]:
        if count == 0:
            candidate = n
        count += 1 if n == candidate else -1
    return candidate
```

**Time Complexity:** O(N)
**Space Complexity:** O(1)

**Key points:** This only works if a majority element (appearing >N/2 times) is guaranteed. If it is not guaranteed, add a second pass to verify the count.

**Follow-up:** How do you find all elements appearing more than N/3 times? → There can be at most 2 such elements; use the same Boyer-Moore logic with two candidates and two counts.

---

### 6. Binary Search on a sorted array. `[Junior]`

**Answer:**
Standard binary search halves the search space each iteration by comparing the middle element with the target.

```python
def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2  # avoids integer overflow
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

**Time Complexity:** O(log N)
**Space Complexity:** O(1)

**Key points:** `mid = lo + (hi - lo) // 2` avoids integer overflow (critical in languages with fixed-width integers). The loop invariant: target is in `[lo, hi]` if it exists.

**Follow-up:** How do you find the leftmost (first) occurrence of a target? → When `nums[mid] == target`, set `hi = mid - 1` instead of returning, and track the last match.

---

### 7. Prefix Sums — Range Sum Query. `[Junior]`

**Answer:**
Precompute prefix sums so any range sum `[l, r]` is answered in O(1) using `prefix[r+1] - prefix[l]`.

```python
class RangeSum:
    def __init__(self, nums):
        self.prefix = [0] * (len(nums) + 1)
        for i, n in enumerate(nums):
            self.prefix[i + 1] = self.prefix[i] + n

    def query(self, l, r):  # inclusive [l, r]
        return self.prefix[r + 1] - self.prefix[l]
```

**Time Complexity:** O(N) build, O(1) query
**Space Complexity:** O(N)

**Key points:** The extra leading zero in the prefix array simplifies the boundary condition at index 0. Extend to 2D prefix sums for matrix range queries.

**Follow-up:** How do you handle range updates (add a value to every element in a range)? → Use a difference array: `diff[l] += v`, `diff[r+1] -= v`; reconstruct by prefix-summing the difference array.

---

### 8. Sliding Window Maximum. `[Mid]`

**Answer:**
Use a monotonic deque (decreasing) that stores indices. The front of the deque is always the maximum of the current window. Pop from the front when the index falls out of the window; pop from the back when a new element is larger than the back.

```python
from collections import deque

def sliding_window_max(nums, k):
    dq = deque()  # stores indices, front is max
    result = []
    for i, n in enumerate(nums):
        # remove indices outside the window
        while dq and dq[0] < i - k + 1:
            dq.popleft()
        # maintain decreasing order
        while dq and nums[dq[-1]] < n:
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result
```

**Time Complexity:** O(N) — each element is added and removed from the deque at most once
**Space Complexity:** O(k)

**Key points:** Each element enters and leaves the deque exactly once, giving O(N) amortized. The window size constraint is enforced by checking the front index.

**Follow-up:** How do you find the sliding window minimum? → Maintain a monotonically increasing deque instead.

---

### 9. Check if a String is a Valid Anagram. `[Junior]`

**Answer:**
Two strings are anagrams if they contain the same characters with the same frequencies. Count character frequencies and compare.

```python
def is_anagram(s, t):
    if len(s) != len(t):
        return False
    count = {}
    for ch in s:
        count[ch] = count.get(ch, 0) + 1
    for ch in t:
        if ch not in count or count[ch] == 0:
            return False
        count[ch] -= 1
    return True
```

**Time Complexity:** O(N)
**Space Complexity:** O(Σ) where Σ is the alphabet size (26 for lowercase ASCII)

**Key points:** Early exit on length mismatch. For Unicode strings, use a generic hash map (the alphabet may not be bounded at 26).

**Follow-up:** How do you group a list of strings by anagram? → Use `tuple(sorted(s))` or `tuple(Counter(s).items())` as a hash map key; group strings with the same key.

---

### 10. Check if a String is a Palindrome. `[Junior]`

**Answer:**
Compare characters from both ends moving inward. Skip non-alphanumeric characters if needed.

```python
def is_palindrome(s):
    # Clean: keep only alphanumeric, lowercase
    filtered = [ch.lower() for ch in s if ch.isalnum()]
    l, r = 0, len(filtered) - 1
    while l < r:
        if filtered[l] != filtered[r]:
            return False
        l += 1
        r -= 1
    return True
```

**Time Complexity:** O(N)
**Space Complexity:** O(N) for filtered; O(1) if done in-place with two pointers on the original string

**Key points:** Edge cases: empty string (palindrome by definition), single character, string with only spaces or special characters.

**Follow-up:** How do you check if any permutation of a string is a palindrome? → Count character frequencies; at most one character may have an odd count (the middle character for odd-length palindromes).

---

### 11. In-place Array Rotation (rotate array by k steps). `[Mid]`

**Answer:**
Rotating right by k is equivalent to three reversals: reverse the whole array, then the first k elements, then the remaining.

```python
def rotate(nums, k):
    n = len(nums)
    k = k % n  # handle k >= n

    def reverse(l, r):
        while l < r:
            nums[l], nums[r] = nums[r], nums[l]
            l += 1
            r -= 1

    reverse(0, n - 1)
    reverse(0, k - 1)
    reverse(k, n - 1)
```

**Time Complexity:** O(N)
**Space Complexity:** O(1)

**Key points:** `k % n` handles the case where k ≥ n. Three-reversal trick is the canonical O(1)-space solution.

**Follow-up:** How do you rotate a matrix 90 degrees clockwise in-place? → First transpose (swap `matrix[i][j]` and `matrix[j][i]`), then reverse each row.

---

### 12. Frequency Map — Top K Frequent Elements. `[Mid]`

**Answer:**
Count frequencies with a hash map, then use a min-heap of size K to track the top K elements. Alternatively, use bucket sort for O(N) time.

```python
import heapq
from collections import Counter

def top_k_frequent(nums, k):
    count = Counter(nums)
    # Min-heap: push (freq, num); pop when heap > k
    heap = []
    for num, freq in count.items():
        heapq.heappush(heap, (freq, num))
        if len(heap) > k:
            heapq.heappop(heap)
    return [num for freq, num in heap]
```

**Time Complexity:** O(N log K)
**Space Complexity:** O(N)

**Key points:** A min-heap of size K is more efficient than sorting all unique elements when K << N. The bucket sort approach achieves O(N) by using frequency as the bucket index.

**Follow-up:** How does the bucket sort approach work? → Create N+1 buckets indexed by frequency; put each number in its frequency bucket; scan from the highest bucket down, collecting until K elements are gathered.

---

## Trees & Graphs

### 13. Binary Tree Level-Order Traversal (BFS). `[Junior]`

**Answer:**
Use a queue. Process all nodes at the current level before moving to the next. Track level boundaries by recording the queue length at the start of each level.

```python
from collections import deque

def level_order(root):
    if not root:
        return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):  # process exactly this level
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result
```

**Time Complexity:** O(N)
**Space Complexity:** O(W) where W is the maximum tree width (up to N/2 for a complete tree)

**Key points:** Snapshotting `len(queue)` at the start of each level is the key to separating levels without a sentinel node.

**Follow-up:** How do you do a zigzag level-order traversal? → Alternate the direction of appending: left-to-right for even levels, right-to-left for odd levels (deque with appendleft/append).

---

### 14. DFS — In-order, Pre-order, Post-order Traversals. `[Junior]`

**Answer:**
Recursive DFS is concise; iterative uses an explicit stack.

```python
# Recursive (in-order example)
def inorder(root):
    result = []
    def dfs(node):
        if not node:
            return
        dfs(node.left)
        result.append(node.val)
        dfs(node.right)
    dfs(root)
    return result

# Iterative in-order
def inorder_iterative(root):
    result, stack, cur = [], [], root
    while cur or stack:
        while cur:
            stack.append(cur)
            cur = cur.left
        cur = stack.pop()
        result.append(cur.val)
        cur = cur.right
    return result
```

**Time Complexity:** O(N)
**Space Complexity:** O(H) where H is tree height; O(N) worst case (skewed tree)

**Key points:** In-order traversal of a BST yields sorted order. Pre-order is useful for serializing a tree. Post-order is useful for bottom-up computations (e.g., tree height).

**Follow-up:** How do you do an iterative post-order traversal? → Use two stacks, or push to a result list in reverse order (pre-order but with right and left swapped, then reverse the output).

---

### 15. Lowest Common Ancestor (LCA) of a Binary Tree. `[Mid]`

**Answer:**
Post-order DFS: if both left and right subtrees return a non-null node, the current node is the LCA. Otherwise, return whichever side found a target node.

```python
def lca(root, p, q):
    if not root or root == p or root == q:
        return root
    left = lca(root.left, p, q)
    right = lca(root.right, p, q)
    if left and right:
        return root  # p and q are in different subtrees
    return left or right
```

**Time Complexity:** O(N)
**Space Complexity:** O(H) — recursion stack

**Key points:** This works even when p or q may not exist in the tree (verify by checking if both are found). For a BST, use the BST property to navigate without visiting every node.

**Follow-up:** How do you find LCA in a BST more efficiently? → If both p.val and q.val are less than root.val, recurse left; if both are greater, recurse right; otherwise, root is the LCA. O(H) time, no extra space needed beyond the recursion.

---

### 16. Check if a Binary Tree is Balanced. `[Mid]`

**Answer:**
DFS that returns the height of each subtree. Return -1 as a sentinel value if any subtree is unbalanced; propagate the sentinel up.

```python
def is_balanced(root):
    def height(node):
        if not node:
            return 0
        lh = height(node.left)
        if lh == -1:
            return -1
        rh = height(node.right)
        if rh == -1:
            return -1
        if abs(lh - rh) > 1:
            return -1
        return 1 + max(lh, rh)
    return height(root) != -1
```

**Time Complexity:** O(N)
**Space Complexity:** O(H)

**Key points:** The naive approach (compute height separately for every node) is O(N²). The sentinel-value trick achieves O(N) by computing balance and height simultaneously in a single pass.

**Follow-up:** What is the difference between a balanced BST and a balanced binary tree? → A balanced binary tree requires |height(left) - height(right)| ≤ 1 at every node. A BST also enforces the left-less-than-root-less-than-right ordering property.

---

### 17. Trie — Insert and Search. `[Mid]`

**Answer:**
A Trie stores strings character-by-character. Each node has a map of children and an `is_end` flag.

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

**Time Complexity:** O(L) for insert/search where L is the word length
**Space Complexity:** O(N × L) for N words of average length L

**Key points:** Tries are better than hash sets when you need prefix matching, autocomplete, or longest-prefix lookup. The alphabet size (branching factor) determines memory usage.

**Follow-up:** How do you implement wildcard search (e.g., `.` matches any character)? → At each `.` character, recursively try all children; return true if any path leads to a match.

---

### 18. Cycle Detection in a Directed Graph. `[Mid]`

**Answer:**
DFS with three states: unvisited (0), in current DFS path (1), fully processed (2). A back edge to a node in state 1 means a cycle.

```python
def has_cycle(num_nodes, edges):
    adj = [[] for _ in range(num_nodes)]
    for u, v in edges:
        adj[u].append(v)

    state = [0] * num_nodes  # 0=unvisited, 1=in-stack, 2=done

    def dfs(node):
        state[node] = 1
        for nei in adj[node]:
            if state[nei] == 1:
                return True  # back edge = cycle
            if state[nei] == 0 and dfs(nei):
                return True
        state[node] = 2
        return False

    return any(dfs(i) for i in range(num_nodes) if state[i] == 0)
```

**Time Complexity:** O(V + E)
**Space Complexity:** O(V)

**Key points:** The three-state approach (vs a simple visited boolean) correctly distinguishes back edges (cycles) from cross edges and forward edges in a DFS forest.

**Follow-up:** How do you detect a cycle in an undirected graph? → Use a visited set and pass the parent node; if you encounter a visited node that is not the parent, a cycle exists. Alternatively, use Union-Find.

---

### 19. Topological Sort (Kahn's Algorithm / BFS). `[Mid]`

**Answer:**
Compute in-degrees for all nodes. Start with all nodes of in-degree 0. Process each, decrement neighbors' in-degrees, and add newly zero-in-degree nodes to the queue.

```python
from collections import deque

def topo_sort(num_nodes, edges):
    adj = [[] for _ in range(num_nodes)]
    in_degree = [0] * num_nodes
    for u, v in edges:
        adj[u].append(v)
        in_degree[v] += 1

    queue = deque(i for i in range(num_nodes) if in_degree[i] == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nei in adj[node]:
            in_degree[nei] -= 1
            if in_degree[nei] == 0:
                queue.append(nei)

    return order if len(order) == num_nodes else []  # empty = cycle detected
```

**Time Complexity:** O(V + E)
**Space Complexity:** O(V)

**Key points:** If the output order contains fewer nodes than the graph, a cycle exists (course schedule validation). DFS-based topological sort adds nodes to the result in post-order, then reverses.

**Follow-up:** How do you find all valid topological orderings? → Use backtracking: at each step, pick any node with in-degree 0, add it to the current order, remove it, then recurse; undo on backtrack.

---

### 20. Dijkstra's Shortest Path Algorithm. `[Mid]`

**Answer:**
Use a min-heap (priority queue) keyed by distance. Greedily expand the closest unvisited node.

```python
import heapq

def dijkstra(graph, start):
    # graph: {node: [(neighbor, weight), ...]}
    dist = {node: float('inf') for node in graph}
    dist[start] = 0
    heap = [(0, start)]  # (distance, node)

    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue  # stale entry
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(heap, (dist[v], v))

    return dist
```

**Time Complexity:** O((V + E) log V) with a binary heap
**Space Complexity:** O(V)

**Key points:** Dijkstra does not work with negative edge weights (use Bellman-Ford instead). The `d > dist[u]` guard skips stale heap entries instead of using a "visited" set.

**Follow-up:** When do you use Bellman-Ford instead of Dijkstra? → When the graph has negative edge weights (but no negative cycles), or when you need to detect negative cycles.

---

### 21. Bellman-Ford Algorithm. `[Senior]`

**Answer:**
Relax all edges V-1 times. Any further relaxation in the V-th pass indicates a negative cycle.

```python
def bellman_ford(num_nodes, edges, start):
    # edges: [(u, v, weight), ...]
    dist = [float('inf')] * num_nodes
    dist[start] = 0

    for _ in range(num_nodes - 1):
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w

    # Check for negative cycles
    for u, v, w in edges:
        if dist[u] != float('inf') and dist[u] + w < dist[v]:
            return None  # negative cycle detected

    return dist
```

**Time Complexity:** O(V × E)
**Space Complexity:** O(V)

**Key points:** V-1 relaxation passes are sufficient for the longest possible shortest path in a graph with no negative cycles. The V-th pass serves as the negative cycle detector.

**Follow-up:** How does SPFA (Shortest Path Faster Algorithm) improve on Bellman-Ford? → SPFA uses a queue to only relax edges of nodes whose distance was recently updated; average O(E) but worst case still O(VE).

---

### 22. Union-Find (Disjoint Set Union). `[Mid]`

**Answer:**
Track the parent of each node. `find` returns the root (with path compression). `union` merges two components (by rank to keep the tree shallow).

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # path compression
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False  # already in same component
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px  # union by rank
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True
```

**Time Complexity:** O(α(N)) amortized per operation (α = inverse Ackermann, effectively O(1))
**Space Complexity:** O(N)

**Key points:** Path compression and union by rank together achieve near-constant amortized time. Union-Find is ideal for dynamic connectivity, Kruskal's MST, and cycle detection in undirected graphs.

**Follow-up:** How do you count the number of connected components? → Maintain a component count initialized to N; decrement by 1 each time `union` returns True.

---

### 23. Minimum Spanning Tree — Kruskal's Algorithm. `[Mid]`

**Answer:**
Sort all edges by weight. Use Union-Find to greedily add the smallest edge that connects two different components.

```python
def kruskal(num_nodes, edges):
    # edges: [(weight, u, v)]
    edges.sort()
    uf = UnionFind(num_nodes)
    mst_weight = 0
    mst_edges = []
    for w, u, v in edges:
        if uf.union(u, v):
            mst_weight += w
            mst_edges.append((u, v, w))
            if len(mst_edges) == num_nodes - 1:
                break  # MST complete
    return mst_weight, mst_edges
```

**Time Complexity:** O(E log E) for sorting + O(E α(V)) for Union-Find ≈ O(E log E)
**Space Complexity:** O(V + E)

**Key points:** An MST has exactly V-1 edges. Early termination once V-1 edges are added. If the graph is disconnected, a full spanning tree does not exist.

**Follow-up:** When do you use Prim's algorithm instead of Kruskal's? → Prim's is better on dense graphs (E ≈ V²) because it runs in O(E + V log V) with a Fibonacci heap; Kruskal's is better on sparse graphs.

---

### 24. Number of Islands (BFS/DFS grid traversal). `[Junior]`

**Answer:**
Iterate over the grid. When a '1' is found, increment the island count and flood-fill (BFS or DFS) to mark all connected '1's as visited.

```python
from collections import deque

def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    count = 0

    def bfs(r, c):
        queue = deque([(r, c)])
        grid[r][c] = '0'  # mark visited in-place
        while queue:
            row, col = queue.popleft()
            for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
                nr, nc = row + dr, col + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == '1':
                    grid[nr][nc] = '0'
                    queue.append((nr, nc))

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                bfs(r, c)
    return count
```

**Time Complexity:** O(M × N)
**Space Complexity:** O(min(M, N)) for BFS queue in the worst case

**Key points:** Mutating the grid in-place avoids a separate visited matrix (acceptable if mutation is allowed). Edge cases: empty grid, all water, single cell.

**Follow-up:** How do you find the area of the largest island? → Track the count of cells BFS visits during each flood-fill; return the maximum count across all islands.

---

## Dynamic Programming

### 25. Coin Change — minimum coins to make a target amount. `[Mid]`

**Answer:**
Classic unbounded knapsack DP. `dp[i]` = minimum coins needed for amount `i`. For each coin, update all reachable amounts.

```python
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for coin in coins:
            if coin <= a:
                dp[a] = min(dp[a], dp[a - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1
```

**Time Complexity:** O(amount × len(coins))
**Space Complexity:** O(amount)

**Key points:** Initialize `dp[0] = 0` and all others to infinity. Return -1 if the amount is unreachable. This is the "minimum count" variant; the "number of ways" variant uses addition instead of min.

**Follow-up:** How do you count the number of ways to make the amount? → Change `dp[a] = min(...)` to `dp[a] += dp[a - coin]`; initialize `dp[0] = 1`.

---

### 26. Longest Common Subsequence (LCS). `[Mid]`

**Answer:**
2D DP where `dp[i][j]` = LCS length of `s1[:i]` and `s2[:j]`. Characters match → extend; otherwise → take the best of skipping either character.

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

**Time Complexity:** O(M × N)
**Space Complexity:** O(M × N); reducible to O(min(M, N)) with row rolling

**Key points:** LCS is the foundation for diff algorithms (GNU diff uses Myers' algorithm, a variant). To reconstruct the actual subsequence, backtrack through the DP table.

**Follow-up:** How does edit distance relate to LCS? → Edit distance = M + N - 2 × LCS(s1, s2) when only insertions and deletions are allowed (not substitutions).

---

### 27. Longest Increasing Subsequence (LIS). `[Mid]`

**Answer:**
O(N²) DP: `dp[i]` = LIS ending at index i. O(N log N) with binary search: maintain a `tails` array where `tails[k]` is the smallest tail element of all increasing subsequences of length k+1.

```python
import bisect

def lis(nums):
    tails = []
    for n in nums:
        pos = bisect.bisect_left(tails, n)
        if pos == len(tails):
            tails.append(n)
        else:
            tails[pos] = n  # replace with smaller value
    return len(tails)
```

**Time Complexity:** O(N log N)
**Space Complexity:** O(N)

**Key points:** `tails` is always sorted but does not represent an actual LIS. To reconstruct the actual subsequence, record each element's predecessor in the O(N²) version.

**Follow-up:** How do you find the number of longest increasing subsequences? → Use two DP arrays: `length[i]` and `count[i]`; when a new maximum length is found, copy the count; when the same length is matched, add the count.

---

### 28. Edit Distance (Levenshtein Distance). `[Mid]`

**Answer:**
`dp[i][j]` = minimum edits (insert, delete, replace) to convert `word1[:i]` to `word2[:j]`.

```python
def edit_distance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i  # delete all
    for j in range(n + 1):
        dp[0][j] = j  # insert all
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i-1] == word2[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(
                    dp[i-1][j],    # delete
                    dp[i][j-1],    # insert
                    dp[i-1][j-1]   # replace
                )
    return dp[m][n]
```

**Time Complexity:** O(M × N)
**Space Complexity:** O(M × N); reducible to O(min(M, N))

**Key points:** Base cases: converting any string to an empty string costs its length. Applications: spell checkers, DNA sequence alignment, fuzzy string matching.

**Follow-up:** How do you reconstruct the actual sequence of edits? → Backtrack through the DP table: if characters match, move diagonally; otherwise, choose the direction with the minimum cost and record the corresponding edit.

---

### 29. 0/1 Knapsack Problem. `[Mid]`

**Answer:**
`dp[i][w]` = maximum value using items `0..i` with capacity `w`. Each item can be taken or left; taking it transitions from `dp[i-1][w-weight[i]]`.

```python
def knapsack(weights, values, capacity):
    n = len(weights)
    # 1D rolling array
    dp = [0] * (capacity + 1)
    for i in range(n):
        # iterate right-to-left to avoid using item i twice
        for w in range(capacity, weights[i] - 1, -1):
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]
```

**Time Complexity:** O(N × W)
**Space Complexity:** O(W) with the rolling array optimization

**Key points:** Iterating right-to-left in the 1D version prevents using the same item twice (0/1 constraint). Iterating left-to-right would give the unbounded knapsack (coin change).

**Follow-up:** How do you reconstruct which items were selected? → Use the 2D DP table; backtrack from `dp[n][W]`: if `dp[i][w] != dp[i-1][w]`, item i was included; subtract its weight and continue.

---

### 30. Unique Paths in a Grid. `[Junior]`

**Answer:**
`dp[i][j]` = number of unique paths from (0,0) to (i,j). Each cell is reached from the cell above or the cell to the left.

```python
def unique_paths(m, n):
    dp = [[1] * n for _ in range(m)]
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i-1][j] + dp[i][j-1]
    return dp[m-1][n-1]
```

**Time Complexity:** O(M × N)
**Space Complexity:** O(M × N); reducible to O(N)

**Key points:** Base cases: all cells in the first row and first column have exactly 1 path (can only go right or down respectively). The answer is also the binomial coefficient C(m+n-2, m-1).

**Follow-up:** How do you handle obstacles (blocked cells)? → If `grid[i][j] == 1`, set `dp[i][j] = 0`; otherwise compute as normal.

---

### 31. Word Break. `[Mid]`

**Answer:**
`dp[i]` = True if `s[:i]` can be segmented using the word dictionary. For each position, check all possible last words.

```python
def word_break(s, word_dict):
    word_set = set(word_dict)
    n = len(s)
    dp = [False] * (n + 1)
    dp[0] = True  # empty string is always segmentable
    for i in range(1, n + 1):
        for j in range(i):
            if dp[j] and s[j:i] in word_set:
                dp[i] = True
                break
    return dp[n]
```

**Time Complexity:** O(N² × L) where L is the average word length for the substring check
**Space Complexity:** O(N)

**Key points:** The break statement is an important optimization — once `dp[i]` is True, stop checking earlier split points. Using a set for dictionary lookup reduces word-check time.

**Follow-up:** How do you return all possible segmentations? → Use DFS with memoization: at each position, try all words that match the current prefix and recursively segment the remainder; memoize positions that lead to no solution.

---

### 32. Count Palindromic Substrings. `[Mid]`

**Answer:**
Expand-around-center: for each center (a character or gap between characters), expand outward while characters match. Count each valid palindrome.

```python
def count_substrings(s):
    n = len(s)
    count = 0

    def expand(l, r):
        nonlocal count
        while l >= 0 and r < n and s[l] == s[r]:
            count += 1
            l -= 1
            r += 1

    for i in range(n):
        expand(i, i)      # odd-length palindromes
        expand(i, i + 1)  # even-length palindromes
    return count
```

**Time Complexity:** O(N²)
**Space Complexity:** O(1)

**Key points:** There are 2N-1 possible centers (N characters + N-1 gaps). Manacher's algorithm solves this in O(N) but is complex to implement in interviews.

**Follow-up:** How do you find the longest palindromic substring? → Modify `expand` to track the longest expansion's start and end indices instead of counting.

---

### 33. House Robber. `[Junior]`

**Answer:**
`dp[i]` = maximum money robbing from houses `0..i`. For each house: either rob it (add its value to `dp[i-2]`) or skip it (`dp[i-1]`).

```python
def rob(nums):
    if not nums:
        return 0
    if len(nums) == 1:
        return nums[0]
    prev2, prev1 = 0, 0
    for n in nums:
        cur = max(prev1, prev2 + n)
        prev2, prev1 = prev1, cur
    return prev1
```

**Time Complexity:** O(N)
**Space Complexity:** O(1)

**Key points:** Only the last two DP values are needed at any point — use two variables instead of a full array. Edge cases: empty array, single house, two houses.

**Follow-up:** House Robber II — houses arranged in a circle (first and last house are adjacent)? → Run the linear house robber twice: once on `nums[0:-1]` and once on `nums[1:]`; return the maximum.

---

### 34. Best Time to Buy and Sell Stock (Maximum Profit). `[Junior]`

**Answer:**
Track the minimum price seen so far. At each day, compute profit if selling today; update the global maximum.

```python
def max_profit(prices):
    min_price = float('inf')
    max_profit = 0
    for price in prices:
        min_price = min(min_price, price)
        max_profit = max(max_profit, price - min_price)
    return max_profit
```

**Time Complexity:** O(N)
**Space Complexity:** O(1)

**Key points:** You must buy before you sell (min_price tracked before computing profit on the current day). If prices are strictly decreasing, profit = 0.

**Follow-up:** Best Time to Buy and Sell Stock II — unlimited transactions? → Sum all positive day-over-day differences: `sum(max(prices[i] - prices[i-1], 0) for i in range(1, len(prices)))`.

---

### 35. Matrix Chain Multiplication (Interval DP). `[Senior]`

**Answer:**
`dp[i][j]` = minimum multiplications to compute the product of matrices `i..j`. Try all split points `k` in `[i, j-1]`.

```python
def matrix_chain(dims):
    # dims[i] and dims[i+1] are the dimensions of matrix i
    n = len(dims) - 1  # number of matrices
    dp = [[0] * n for _ in range(n)]

    for length in range(2, n + 1):  # subproblem length
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float('inf')
            for k in range(i, j):
                cost = dp[i][k] + dp[k+1][j] + dims[i] * dims[k+1] * dims[j+1]
                dp[i][j] = min(dp[i][j], cost)
    return dp[0][n-1]
```

**Time Complexity:** O(N³)
**Space Complexity:** O(N²)

**Key points:** Interval DP is filled by increasing subproblem length. The split point k determines where to split the matrix chain and accounts for the cost of the final multiplication.

**Follow-up:** What other problems use interval DP? → Burst Balloons, Minimum Cost to Merge Stones, Optimal BST construction, Palindrome Partitioning II.

---

### 36. Palindrome Partitioning — minimum cuts to partition into palindromes. `[Senior]`

**Answer:**
Two DP tables: `is_pal[i][j]` (whether `s[i..j]` is a palindrome), and `cuts[i]` (minimum cuts for `s[0..i]`).

```python
def min_cut(s):
    n = len(s)
    is_pal = [[False] * n for _ in range(n)]
    for i in range(n):
        is_pal[i][i] = True
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                is_pal[i][j] = (length == 2) or is_pal[i+1][j-1]

    cuts = list(range(-1, n - 1))  # cuts[i] = min cuts for s[0..i]
    for i in range(n):
        for j in range(i + 1):
            if is_pal[j][i]:
                cuts[i] = min(cuts[i], cuts[j-1] + 1 if j > 0 else 0)
    return cuts[n-1]
```

**Time Complexity:** O(N²)
**Space Complexity:** O(N²)

**Key points:** Precomputing the palindrome table avoids recomputing palindrome checks inside the cut DP loop, reducing the overall time from O(N³) to O(N²).

**Follow-up:** How does Palindrome Partitioning I (return all partitions) differ? → Use backtracking DFS with the `is_pal` table to prune; time is exponential in the worst case.

---

## Stack, Queue & Heap

### 37. Next Greater Element (Monotonic Stack). `[Mid]`

**Answer:**
Use a decreasing monotonic stack. When a new element is larger than the stack top, pop and record it as the "next greater element" for the popped index.

```python
def next_greater_element(nums):
    n = len(nums)
    result = [-1] * n
    stack = []  # stores indices
    for i in range(n):
        while stack and nums[stack[-1]] < nums[i]:
            idx = stack.pop()
            result[idx] = nums[i]
        stack.append(i)
    return result
```

**Time Complexity:** O(N) — each element pushed and popped at most once
**Space Complexity:** O(N)

**Key points:** Storing indices (not values) in the stack allows writing to the correct position in the result array. The stack contains elements in decreasing order.

**Follow-up:** How do you find the next greater element in a circular array? → Iterate twice (indices 0 to 2N-1) using `i % n`; only append to the stack in the first pass.

---

### 38. K-th Largest Element (Min-Heap). `[Mid]`

**Answer:**
Maintain a min-heap of size K. Push each element; if the heap exceeds K, pop the minimum. The heap top is the K-th largest.

```python
import heapq

def kth_largest(nums, k):
    heap = []
    for n in nums:
        heapq.heappush(heap, n)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]
```

**Time Complexity:** O(N log K)
**Space Complexity:** O(K)

**Key points:** A min-heap of size K stores the K largest elements seen so far; the top is the K-th largest. Quickselect achieves O(N) average time but O(N²) worst case without median-of-medians.

**Follow-up:** How do you find the K-th largest in a stream? → Maintain the same min-heap of size K; for each new element, push it and pop if size exceeds K; `heap[0]` is always the K-th largest seen so far.

---

### 39. Valid Parentheses. `[Junior]`

**Answer:**
Use a stack. Push open brackets; on a closing bracket, check if the stack top is the matching opener.

```python
def is_valid(s):
    stack = []
    matching = {')': '(', ']': '[', '}': '{'}
    for ch in s:
        if ch in matching:
            if not stack or stack[-1] != matching[ch]:
                return False
            stack.pop()
        else:
            stack.append(ch)
    return len(stack) == 0
```

**Time Complexity:** O(N)
**Space Complexity:** O(N)

**Key points:** Edge cases: empty string (True), odd-length string (always False — short-circuit possible), string starting with a closing bracket.

**Follow-up:** How do you find the minimum number of bracket removals to make a string valid? → Count unmatched open brackets (stack size at the end) and unmatched close brackets (count incremented when the stack is empty on a close bracket); sum the two counts.

---

### 40. LRU Cache. `[Mid]`

**Answer:**
Use a hash map (O(1) lookup) combined with a doubly linked list (O(1) move-to-front and remove-from-tail). Python's `OrderedDict` implements this natively.

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
            self.cache.popitem(last=False)  # evict LRU (front)
```

**Time Complexity:** O(1) for both get and put
**Space Complexity:** O(capacity)

**Key points:** Without `OrderedDict`, implement a doubly linked list manually: head = most recently used, tail = least recently used; maintain a dict mapping key → list node.

**Follow-up:** How would you design an LFU cache (Least Frequently Used eviction)? → Maintain two hash maps: `key → (value, freq)` and `freq → OrderedDict of keys`; track the current minimum frequency; update both maps on access and insertion.

---

### 41. Merge K Sorted Lists. `[Senior]`

**Answer:**
Use a min-heap to efficiently find the smallest element among all list heads. Push the next node from the same list when popping.

```python
import heapq

def merge_k_lists(lists):
    dummy = ListNode(0)
    cur = dummy
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))

    while heap:
        val, i, node = heapq.heappop(heap)
        cur.next = node
        cur = cur.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))

    return dummy.next
```

**Time Complexity:** O(N log K) where N is total nodes and K is number of lists
**Space Complexity:** O(K) for the heap

**Key points:** The index `i` is included in the heap tuple as a tiebreaker to avoid comparing ListNode objects. Merge sort divide-and-conquer is an alternative: O(N log K) time, O(log K) space.

**Follow-up:** What is the time complexity of the naive approach (merge lists one by one)? → O(NK) — each merge of two lists is O(N), done K-1 times; the heap approach reduces this to O(N log K).

---

### 42. Task Scheduler (CPU scheduling with cooldown). `[Mid]`

**Answer:**
The optimal strategy is to schedule the most frequent remaining task first. The number of idle intervals needed is determined by the most frequent task.

```python
from collections import Counter
import heapq
from collections import deque

def least_interval(tasks, n):
    freq = Counter(tasks)
    max_heap = [-f for f in freq.values()]
    heapq.heapify(max_heap)

    time = 0
    cooldown_queue = deque()  # (available_time, neg_freq)

    while max_heap or cooldown_queue:
        time += 1
        if max_heap:
            neg_freq = heapq.heappop(max_heap) + 1  # use one instance
            if neg_freq:  # still has remaining instances
                cooldown_queue.append((time + n, neg_freq))
        if cooldown_queue and cooldown_queue[0][0] == time:
            heapq.heappush(max_heap, cooldown_queue.popleft()[1])

    return time
```

**Time Complexity:** O(T log T) where T is the number of unique tasks
**Space Complexity:** O(T)

**Key points:** The mathematical formula approach: `result = max(len(tasks), (max_freq - 1) * (n + 1) + count_of_max_freq_tasks)` is O(N) but the heap simulation shows the reasoning.

**Follow-up:** How do you reconstruct the actual task order? → Extend the heap simulation to record the task name instead of just frequency.

---

## Sorting & Searching

### 43. Merge Sort. `[Junior]`

**Answer:**
Divide the array in half recursively, sort each half, then merge the two sorted halves.

```python
def merge_sort(nums):
    if len(nums) <= 1:
        return nums
    mid = len(nums) // 2
    left = merge_sort(nums[:mid])
    right = merge_sort(nums[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
```

**Time Complexity:** O(N log N) guaranteed
**Space Complexity:** O(N)

**Key points:** Merge sort is stable (preserves relative order of equal elements) and has guaranteed O(N log N) performance, unlike quicksort. It is the preferred sort for linked lists.

**Follow-up:** How do you count inversions in an array? → During the merge step, when a right-side element is merged before a left-side element, add `len(left) - i` to the inversion count (all remaining left elements form inversions with this right element).

---

### 44. Quicksort and Quickselect. `[Mid]`

**Answer:**
Quicksort uses a partition step (Lomuto or Hoare) to place the pivot in its final position, then recursively sorts both sides.

```python
def quicksort(nums, lo, hi):
    if lo < hi:
        p = partition(nums, lo, hi)
        quicksort(nums, lo, p - 1)
        quicksort(nums, p + 1, hi)

def partition(nums, lo, hi):
    pivot = nums[hi]
    i = lo - 1
    for j in range(lo, hi):
        if nums[j] <= pivot:
            i += 1
            nums[i], nums[j] = nums[j], nums[i]
    nums[i+1], nums[hi] = nums[hi], nums[i+1]
    return i + 1

# Quickselect: find k-th smallest in O(N) average
def quickselect(nums, lo, hi, k):
    if lo == hi:
        return nums[lo]
    p = partition(nums, lo, hi)
    if k == p:
        return nums[p]
    elif k < p:
        return quickselect(nums, lo, p - 1, k)
    else:
        return quickselect(nums, p + 1, hi, k)
```

**Time Complexity:** O(N log N) average, O(N²) worst case; Quickselect O(N) average
**Space Complexity:** O(log N) average (recursion stack)

**Key points:** Randomizing the pivot avoids the O(N²) worst case. Quicksort is not stable. Quickselect is the foundation of the "K-th largest element" problem without extra space.

**Follow-up:** How does introsort (used in most standard libraries) improve on quicksort? → Introsort starts with quicksort but switches to heapsort after log N levels of recursion, guaranteeing O(N log N) worst case.

---

### 45. Binary Search Variants — find first/last occurrence. `[Mid]`

**Answer:**
Modify the standard binary search to continue searching after finding the target to find the leftmost or rightmost occurrence.

```python
def first_occurrence(nums, target):
    lo, hi, result = 0, len(nums) - 1, -1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            result = mid
            hi = mid - 1  # keep searching left
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return result

def last_occurrence(nums, target):
    lo, hi, result = 0, len(nums) - 1, -1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            result = mid
            lo = mid + 1  # keep searching right
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return result
```

**Time Complexity:** O(log N)
**Space Complexity:** O(1)

**Key points:** The key insight is to not return immediately on match — instead, record the match and continue searching in the relevant direction.

**Follow-up:** How do you count the total occurrences of a target? → `last_occurrence(target) - first_occurrence(target) + 1` if target exists, else 0.

---

### 46. Search in a Rotated Sorted Array. `[Mid]`

**Answer:**
One half of the rotated array is always sorted. Determine which half is sorted, check if the target lies in it, and narrow accordingly.

```python
def search_rotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        # Left half is sorted
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        # Right half is sorted
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
```

**Time Complexity:** O(log N)
**Space Complexity:** O(1)

**Key points:** The condition `nums[lo] <= nums[mid]` identifies the sorted half. Careful with `<=` on the left boundary to handle duplicate values (a separate problem variant).

**Follow-up:** How do you handle duplicates in a rotated sorted array? → When `nums[lo] == nums[mid]`, you cannot determine which half is sorted; fall back to `lo += 1` (worst case O(N)).

---

### 47. Find the K-th Smallest Element (using two binary searches). `[Senior]`

**Answer:**
In a matrix where each row and column is sorted, binary search on the value range. For a given mid value, count how many elements are ≤ mid by walking from the top-right corner.

```python
def kth_smallest_matrix(matrix, k):
    n = len(matrix)
    lo, hi = matrix[0][0], matrix[n-1][n-1]

    def count_le(mid):
        count, row, col = 0, n - 1, 0
        while row >= 0 and col < n:
            if matrix[row][col] <= mid:
                count += row + 1
                col += 1
            else:
                row -= 1
        return count

    while lo < hi:
        mid = lo + (hi - lo) // 2
        if count_le(mid) < k:
            lo = mid + 1
        else:
            hi = mid
    return lo
```

**Time Complexity:** O(N log(max-min))
**Space Complexity:** O(1)

**Key points:** Binary search on the value range (not indices); the result is always a value that exists in the matrix (the loop invariant ensures this). The counting step uses the sorted structure of the matrix.

**Follow-up:** How does this compare to using a min-heap approach? → Min-heap: O(K log N); binary search: O(N log(max-min)); for small K the heap is better; for large K or a large value range the binary search is better.

---

### 48. Find Minimum in a Rotated Sorted Array. `[Mid]`

**Answer:**
The minimum is the point of inflection. Binary search: if the mid element is greater than the rightmost, the minimum is in the right half; otherwise it is in the left half (including mid).

```python
def find_min_rotated(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1  # min is in right half
        else:
            hi = mid  # min is in left half (including mid)
    return nums[lo]
```

**Time Complexity:** O(log N)
**Space Complexity:** O(1)

**Key points:** Compare mid with `hi` (not `lo`) to avoid ambiguity. When there is no rotation, `nums[mid] <= nums[hi]` always, and `hi` converges to 0 correctly.

**Follow-up:** How do you find the rotation index (the index of the minimum element)? → The same algorithm returns `lo` which is the index of the minimum element, which is also the number of positions the array was rotated.

---

### 49. Merge Intervals. `[Mid]`

**Answer:**
Sort intervals by start time. Iterate: if the current interval overlaps the last merged interval, extend it; otherwise, add it as a new interval.

```python
def merge_intervals(intervals):
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)  # extend
        else:
            merged.append([start, end])
    return merged
```

**Time Complexity:** O(N log N) — dominated by sorting
**Space Complexity:** O(N)

**Key points:** Sort by start time first; the condition `start <= merged[-1][1]` detects overlap; use `max` for the end to handle containment (one interval fully inside another).

**Follow-up:** How do you insert a new interval into an already sorted, non-overlapping list of intervals? → Iterate through: add all intervals ending before the new one, merge overlapping ones into the new interval, then add all intervals starting after it. O(N).

---

### 50. Matrix Search — Search a 2D Matrix. `[Mid]`

**Answer:**
Treat the 2D matrix as a virtual 1D sorted array and apply binary search. Index `mid` maps to `matrix[mid // cols][mid % cols]`.

```python
def search_matrix(matrix, target):
    if not matrix or not matrix[0]:
        return False
    rows, cols = len(matrix), len(matrix[0])
    lo, hi = 0, rows * cols - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        val = matrix[mid // cols][mid % cols]
        if val == target:
            return True
        elif val < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False
```

**Time Complexity:** O(log(M × N))
**Space Complexity:** O(1)

**Key points:** This works only when each row is sorted and the first element of each row is greater than the last element of the previous row (strict row ordering). For a matrix where only rows and columns are individually sorted, use the top-right corner walk approach.

**Follow-up:** How do you search a matrix where only rows and columns are sorted (but rows are not globally ordered)? → Start at the top-right corner: if the current value equals target return true; if greater, move left; if less, move down. O(M + N) time.

---
