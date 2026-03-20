---
title: "LeetCode Patterns: 14 Templates That Cover 95% of Problems"
description: "Stop grinding 500 random LeetCode problems. These 14 patterns and code templates cover the vast majority of technical interview questions."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["interview", "algorithms", "leetcode", "data-structures", "career"]
readingTime: "16 min read"
ogDescription: "Stop grinding 500 random LeetCode problems. These 14 patterns and code templates cover the vast majority of technical interview questions."
---

Most engineers preparing for technical interviews make the same mistake: they grind problems randomly, hoping volume leads to pattern recognition. The better approach is to learn the patterns first, then use problems as practice for applying them.

Here are 14 patterns with reusable code templates that appear across the overwhelming majority of LeetCode-style interview questions.

---

## Pattern 1: Two Pointers

**When to use:** Arrays or strings where you need to find pairs, compare elements from both ends, or partition data.

**Classic problems:** Two Sum (sorted), Container With Most Water, Valid Palindrome, 3Sum

```python
def two_pointers(arr):
    left, right = 0, len(arr) - 1
    while left < right:
        current = arr[left] + arr[right]
        if current == target:
            return [left, right]
        elif current < target:
            left += 1
        else:
            right -= 1
    return []
```

**Key insight:** Two pointers eliminate the inner loop, reducing O(n²) brute force to O(n).

---

## Pattern 2: Sliding Window

**When to use:** Problems involving contiguous subarrays/substrings with a constraint (max sum, unique characters, etc.)

**Classic problems:** Maximum Sum Subarray of Size K, Longest Substring Without Repeating Characters, Minimum Window Substring

```python
def sliding_window_variable(s, k):
    window_start = 0
    max_length = 0
    window_state = {}  # track what's in the window

    for window_end in range(len(s)):
        char = s[window_end]
        window_state[char] = window_state.get(char, 0) + 1

        # Shrink window when constraint violated
        while len(window_state) > k:
            left_char = s[window_start]
            window_state[left_char] -= 1
            if window_state[left_char] == 0:
                del window_state[left_char]
            window_start += 1

        max_length = max(max_length, window_end - window_start + 1)

    return max_length
```

**Fixed vs variable window:** Fixed window size → just add right, remove left at interval. Variable window → shrink from left when constraint violated.

---

## Pattern 3: Fast and Slow Pointers

**When to use:** Linked list cycle detection, finding the middle of a list, detecting repeating sequences.

**Classic problems:** Linked List Cycle, Middle of Linked List, Happy Number

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False

def find_middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow  # slow is at middle when fast reaches end
```

---

## Pattern 4: Merge Intervals

**When to use:** Problems involving overlapping intervals — scheduling, calendar conflicts, range merging.

**Classic problems:** Merge Intervals, Insert Interval, Meeting Rooms II

```python
def merge_intervals(intervals):
    if not intervals:
        return []

    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]

    for start, end in intervals[1:]:
        if start <= merged[-1][1]:  # overlaps
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])

    return merged
```

**Pattern extension:** Count minimum rooms/platforms needed → use a min-heap to track end times.

---

## Pattern 5: Binary Search Variations

**When to use:** Sorted arrays, or "find the minimum X that satisfies condition Y" (binary search on the answer).

**Classic problems:** Search in Rotated Array, Find First and Last Position, Minimum in Rotated Array, Koko Eating Bananas

```python
# Standard binary search
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = left + (right - left) // 2  # avoid overflow
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# Binary search on answer (find minimum feasible value)
def binary_search_on_answer(lo, hi, feasible_fn):
    result = hi
    while lo <= hi:
        mid = (lo + hi) // 2
        if feasible_fn(mid):
            result = mid
            hi = mid - 1  # try smaller
        else:
            lo = mid + 1
    return result
```

**Key insight for BSoA:** Define `feasible(x)` as "is x a valid answer?" Then binary search for the minimum x where `feasible(x)` is True.

---

## Pattern 6: BFS (Breadth-First Search)

**When to use:** Shortest path in unweighted graph, level-order traversal, spreading problems (islands, fire, infection).

**Classic problems:** Binary Tree Level Order, Rotting Oranges, Word Ladder, Number of Islands

```python
from collections import deque

def bfs(graph, start):
    visited = {start}
    queue = deque([start])
    level = 0

    while queue:
        for _ in range(len(queue)):  # process entire level
            node = queue.popleft()
            # process node
            for neighbor in graph[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        level += 1

    return level
```

---

## Pattern 7: DFS (Depth-First Search)

**When to use:** Tree/graph traversal, path finding, cycle detection, topological sort, backtracking.

**Classic problems:** Path Sum, All Paths From Source to Target, Clone Graph

```python
def dfs(node, visited, result):
    if node in visited:
        return
    visited.add(node)
    result.append(node)

    for neighbor in graph[node]:
        dfs(neighbor, visited, result)

# Iterative DFS (avoids recursion limit)
def dfs_iterative(start):
    visited = set()
    stack = [start]
    while stack:
        node = stack.pop()
        if node not in visited:
            visited.add(node)
            stack.extend(graph[node])
```

---

## Pattern 8: Backtracking

**When to use:** Generating all permutations, combinations, subsets; solving constraint satisfaction problems (N-Queens, Sudoku).

**Classic problems:** Permutations, Subsets, Letter Combinations, N-Queens

```python
def backtrack(path, choices, result):
    # Base case: valid complete solution
    if is_complete(path):
        result.append(path[:])
        return

    for choice in choices:
        if is_valid(choice, path):
            path.append(choice)           # make choice
            backtrack(path, choices, result)  # recurse
            path.pop()                    # undo choice (backtrack)

# Template for subsets
def subsets(nums):
    result = []
    def backtrack(start, current):
        result.append(current[:])
        for i in range(start, len(nums)):
            current.append(nums[i])
            backtrack(i + 1, current)
            current.pop()
    backtrack(0, [])
    return result
```

---

## Pattern 9: Dynamic Programming — 1D

**When to use:** "Count the ways", "minimum cost to reach", optimal value problems with overlapping subproblems.

**Classic problems:** Climbing Stairs, Coin Change, House Robber, Word Break

```python
# Bottom-up DP template
def dp_1d(n):
    dp = [0] * (n + 1)
    dp[0] = base_case_value

    for i in range(1, n + 1):
        # Transition: dp[i] depends on previous states
        dp[i] = recurrence(dp, i)

    return dp[n]

# House Robber example
def rob(nums):
    if not nums:
        return 0
    dp = [0] * len(nums)
    dp[0] = nums[0]
    if len(nums) > 1:
        dp[1] = max(nums[0], nums[1])
    for i in range(2, len(nums)):
        dp[i] = max(dp[i-1], dp[i-2] + nums[i])
    return dp[-1]
```

---

## Pattern 10: Dynamic Programming — 2D

**When to use:** String comparison (edit distance, LCS), grid path problems, knapsack variants.

**Classic problems:** Longest Common Subsequence, Edit Distance, Unique Paths, Coin Change 2

```python
def dp_2d(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # Initialize base cases
    for i in range(m + 1):
        dp[i][0] = base_case(i)
    for j in range(n + 1):
        dp[0][j] = base_case(j)

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + match_bonus
            else:
                dp[i][j] = optimal_transition(dp, i, j)

    return dp[m][n]
```

---

## Pattern 11: Heap (Priority Queue)

**When to use:** "Top K" problems, median maintenance, scheduling, merging sorted lists.

**Classic problems:** Kth Largest Element, Top K Frequent Elements, Merge K Sorted Lists, Find Median from Data Stream

```python
import heapq

# Top K largest elements
def top_k_largest(nums, k):
    return heapq.nlargest(k, nums)  # O(n log k)

# Manual min-heap approach (more control)
def top_k_largest_manual(nums, k):
    heap = []
    for num in nums:
        heapq.heappush(heap, num)
        if len(heap) > k:
            heapq.heappop(heap)  # remove smallest
    return list(heap)  # contains k largest

# Python heaps are min-heaps; negate for max-heap
max_heap = []
heapq.heappush(max_heap, -value)
max_val = -heapq.heappop(max_heap)
```

---

## Pattern 12: Monotonic Stack

**When to use:** "Next greater element", "previous smaller element", histogram area problems.

**Classic problems:** Daily Temperatures, Largest Rectangle in Histogram, Next Greater Element

```python
def next_greater_element(nums):
    result = [-1] * len(nums)
    stack = []  # stores indices

    for i in range(len(nums)):
        # Pop elements smaller than current — current is their "next greater"
        while stack and nums[stack[-1]] < nums[i]:
            idx = stack.pop()
            result[idx] = nums[i]
        stack.append(i)

    return result
```

---

## Pattern 13: Trie

**When to use:** String prefix problems, autocomplete, word search in a grid.

**Classic problems:** Implement Trie, Word Search II, Design Search Autocomplete

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
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True

    def search(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                return False
            node = node.children[char]
        return node.is_end

    def starts_with(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return False
            node = node.children[char]
        return True
```

---

## Pattern 14: Union-Find (Disjoint Sets)

**When to use:** Connected components, cycle detection in undirected graphs, Kruskal's MST.

**Classic problems:** Number of Connected Components, Redundant Connection, Accounts Merge

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
            return False  # already connected — cycle detected
        # Union by rank
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True
```

---

## Pattern Recognition Cheatsheet

| Problem Signal | Pattern to Try |
|----------------|----------------|
| Sorted array, find pair/triplet | Two Pointers |
| Contiguous subarray with constraint | Sliding Window |
| Linked list cycle / middle | Fast & Slow Pointers |
| Overlapping intervals | Merge Intervals |
| Sorted search, "minimum X that satisfies Y" | Binary Search |
| Shortest path, level-by-level | BFS |
| All paths, tree traversal | DFS |
| All permutations/combinations/subsets | Backtracking |
| Count ways, min cost (1 parameter) | DP 1D |
| String comparison, grid paths | DP 2D |
| Top K, median, scheduling | Heap |
| Next greater/smaller element | Monotonic Stack |
| Prefix matching, word search | Trie |
| Connected components, cycles | Union-Find |

---

## How to Practice Effectively

1. **Learn one pattern per day** — Don't mix patterns in early practice. Do 5–8 problems with the same pattern until you can write the template from memory.

2. **Recognize before you solve** — Before writing code, identify: "This is a sliding window problem with a character count constraint." Naming the pattern is 50% of the work.

3. **Time yourself after recognition** — Aim for 20–25 minutes per medium problem after you've learned the pattern. Hard problems should take 30–40 minutes.

4. **Review wrong answers for pattern mistakes** — Most wrong answers on LeetCode aren't logic errors, they're wrong pattern selection. Review why a different pattern would work.

---

## Practice Tools

For a structured LeetCode study plan organized by pattern, the **[DevToolkit Pro Plan](https://devplaybook.gumroad.com)** includes a 6-week interview prep calendar with problems mapped to each pattern.

For a broader interview strategy, see our [System Design Interview Cheatsheet](/blog/how-to-ace-system-design-interviews-cheatsheet) and [Senior Developer Interview Checklist](/blog/senior-developer-interview-checklist).
