import { useState } from 'preact/hooks';

interface Pattern {
  name: string;
  description: string;
  keywords: string[];
  examples: string[];
  timeComplexity: string;
  spaceComplexity: string;
  template: string;
}

const PATTERNS: Pattern[] = [
  {
    name: 'Two Pointers',
    description: 'Use two indices moving toward each other or in the same direction to reduce O(n²) to O(n).',
    keywords: ['pair', 'sum', 'sorted array', 'target', 'palindrome', 'reverse', 'remove duplicates', 'container water', 'two sum sorted'],
    examples: ['Two Sum II (sorted)', 'Valid Palindrome', 'Container With Most Water', '3Sum', 'Remove Duplicates from Sorted Array'],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    template: `left, right = 0, len(arr) - 1
while left < right:
    if condition(arr[left], arr[right]):
        # process
        left += 1; right -= 1
    elif too_small:
        left += 1
    else:
        right -= 1`,
  },
  {
    name: 'Sliding Window',
    description: 'Maintain a window over a subarray/substring, expand or shrink from edges.',
    keywords: ['subarray', 'substring', 'contiguous', 'window', 'maximum sum', 'minimum length', 'longest', 'k elements', 'anagram', 'permutation'],
    examples: ['Longest Substring Without Repeating', 'Minimum Window Substring', 'Maximum Sum Subarray of Size K', 'Permutation in String', 'Longest Repeating Character Replacement'],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(k) — window size',
    template: `left = 0
for right in range(len(s)):
    # expand window: add s[right]
    window.add(s[right])
    while invalid_window():
        # shrink window
        window.remove(s[left])
        left += 1
    ans = max(ans, right - left + 1)`,
  },
  {
    name: 'Fast & Slow Pointers',
    description: 'Two pointers at different speeds to detect cycles or find the middle of a linked list.',
    keywords: ['cycle', 'loop', 'linked list', 'middle', 'circular', 'floyd', 'detect loop', 'happy number'],
    examples: ['Linked List Cycle', 'Find the Duplicate Number', 'Middle of the Linked List', 'Happy Number', 'Palindrome Linked List'],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    template: `slow = fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
    if slow == fast:
        return True  # cycle detected
return False`,
  },
  {
    name: 'Binary Search',
    description: 'Search sorted data in O(log n). Also works on answer space (binary search on result).',
    keywords: ['sorted', 'search', 'find position', 'rotated', 'minimum in rotated', 'log n', 'binary search', 'first bad version', 'peak element', 'search range'],
    examples: ['Search in Rotated Sorted Array', 'Find Minimum in Rotated Array', 'Koko Eating Bananas', 'First and Last Position', 'Peak Index in Mountain Array'],
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    template: `lo, hi = 0, len(arr) - 1
while lo <= hi:
    mid = (lo + hi) // 2
    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        lo = mid + 1
    else:
        hi = mid - 1
return -1`,
  },
  {
    name: 'DFS (Depth-First Search)',
    description: 'Explore as deep as possible before backtracking. Used for trees, graphs, and backtracking problems.',
    keywords: ['tree traversal', 'path', 'all paths', 'root to leaf', 'graph', 'connected', 'islands', 'backtrack', 'permutations', 'combinations', 'flood fill'],
    examples: ['Number of Islands', 'Path Sum', 'All Paths from Source to Target', 'Word Search', 'Generate Parentheses', 'Subsets', 'Permutations'],
    timeComplexity: 'O(V + E) graph / O(n) tree',
    spaceComplexity: 'O(h) — call stack depth',
    template: `def dfs(node, visited):
    if not node or node in visited:
        return
    visited.add(node)
    # process node
    for neighbor in node.neighbors:
        dfs(neighbor, visited)`,
  },
  {
    name: 'BFS (Breadth-First Search)',
    description: 'Explore level by level using a queue. Finds shortest path in unweighted graphs.',
    keywords: ['shortest path', 'level order', 'minimum steps', 'word ladder', 'knight moves', 'nearest', 'distance', 'binary tree level', 'zigzag'],
    examples: ['Binary Tree Level Order Traversal', 'Word Ladder', 'Rotting Oranges', 'Shortest Path in Binary Matrix', '01 Matrix'],
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V) — queue',
    template: `from collections import deque
queue = deque([start])
visited = {start}
steps = 0
while queue:
    for _ in range(len(queue)):
        node = queue.popleft()
        if node == target: return steps
        for neighbor in get_neighbors(node):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    steps += 1`,
  },
  {
    name: 'Dynamic Programming',
    description: 'Break problems into overlapping subproblems. Memoize or tabulate results.',
    keywords: ['maximum', 'minimum', 'count ways', 'can achieve', 'optimal', 'fibonacci', 'knapsack', 'coin change', 'edit distance', 'longest increasing subsequence', 'palindrome substring'],
    examples: ['Climbing Stairs', 'Coin Change', 'Longest Increasing Subsequence', 'Edit Distance', '0/1 Knapsack', 'House Robber', 'Unique Paths'],
    timeComplexity: 'O(n²) typical, varies',
    spaceComplexity: 'O(n) to O(n²)',
    template: `# Top-down (memoization)
from functools import lru_cache
@lru_cache(maxsize=None)
def dp(i, ...):
    if base_case: return base_value
    return op(dp(i-1, ...), dp(i-2, ...))

# Bottom-up (tabulation)
dp = [0] * (n + 1)
dp[0] = base
for i in range(1, n + 1):
    dp[i] = op(dp[i-1], dp[i-2])`,
  },
  {
    name: 'Heap / Priority Queue',
    description: 'Efficiently get the min/max element. Use for top-K problems and streaming medians.',
    keywords: ['top k', 'k largest', 'k smallest', 'kth', 'median', 'frequent', 'stream', 'priority', 'meeting rooms', 'task scheduler', 'heap'],
    examples: ['Kth Largest Element', 'Top K Frequent Elements', 'Find Median from Data Stream', 'Meeting Rooms II', 'Task Scheduler'],
    timeComplexity: 'O(n log k)',
    spaceComplexity: 'O(k)',
    template: `import heapq
# Min-heap (default)
heap = []
heapq.heappush(heap, val)
min_val = heapq.heappop(heap)

# Max-heap: negate values
heapq.heappush(heap, -val)
max_val = -heapq.heappop(heap)

# Top K largest
heap = []
for x in nums:
    heapq.heappush(heap, x)
    if len(heap) > k: heapq.heappop(heap)`,
  },
  {
    name: 'Merge Intervals',
    description: 'Sort by start time, then greedily merge overlapping intervals.',
    keywords: ['intervals', 'overlap', 'merge', 'insert interval', 'meeting', 'schedule', 'non-overlapping', 'free time'],
    examples: ['Merge Intervals', 'Insert Interval', 'Non-overlapping Intervals', 'Employee Free Time', 'Meeting Rooms'],
    timeComplexity: 'O(n log n) — sorting',
    spaceComplexity: 'O(n)',
    template: `intervals.sort(key=lambda x: x[0])
merged = [intervals[0]]
for start, end in intervals[1:]:
    if start <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], end)
    else:
        merged.append([start, end])`,
  },
  {
    name: 'Trie (Prefix Tree)',
    description: 'Tree for efficient prefix search and autocomplete over strings.',
    keywords: ['prefix', 'autocomplete', 'word search', 'dictionary', 'starts with', 'word break', 'search suggest'],
    examples: ['Implement Trie', 'Word Search II', 'Design Search Autocomplete', 'Word Break', 'Replace Words'],
    timeComplexity: 'O(m) per op — m = word length',
    spaceComplexity: 'O(alphabet × nodes)',
    template: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self): self.root = TrieNode()
    def insert(self, word):
        node = self.root
        for c in word:
            if c not in node.children:
                node.children[c] = TrieNode()
            node = node.children[c]
        node.is_end = True`,
  },
  {
    name: 'Union-Find (Disjoint Set)',
    description: 'Track connectivity in a graph. Efficient union and find with path compression.',
    keywords: ['connected components', 'union', 'find', 'disjoint', 'accounts merge', 'redundant connection', 'number of provinces', 'graph connectivity'],
    examples: ['Number of Connected Components', 'Accounts Merge', 'Redundant Connection', 'Graph Valid Tree', 'Longest Consecutive Sequence'],
    timeComplexity: 'O(α(n)) ≈ O(1) amortized',
    spaceComplexity: 'O(n)',
    template: `parent = list(range(n))
rank = [0] * n

def find(x):
    if parent[x] != x:
        parent[x] = find(parent[x])  # path compression
    return parent[x]

def union(x, y):
    px, py = find(x), find(y)
    if px == py: return False
    if rank[px] < rank[py]: px, py = py, px
    parent[py] = px
    if rank[px] == rank[py]: rank[px] += 1
    return True`,
  },
  {
    name: 'Monotonic Stack',
    description: 'Maintain a stack that is always increasing or decreasing. For next-greater/smaller problems.',
    keywords: ['next greater', 'next smaller', 'previous greater', 'daily temperatures', 'stock span', 'trapping rain', 'largest rectangle', 'buildings'],
    examples: ['Daily Temperatures', 'Next Greater Element', 'Largest Rectangle in Histogram', 'Trapping Rain Water', 'Stock Span Problem'],
    timeComplexity: 'O(n) — each element pushed/popped once',
    spaceComplexity: 'O(n)',
    template: `stack = []  # indices
result = [0] * len(arr)
for i in range(len(arr)):
    while stack and arr[stack[-1]] < arr[i]:
        idx = stack.pop()
        result[idx] = i - idx  # days until warmer
    stack.append(i)`,
  },
];

const DEVTOOLKIT_URL = 'https://vicnail.gumroad.com/l/devtoolkit-starter-kit';

export default function LeetcodePatternMatcher() {
  const [input, setInput] = useState('');
  const [showTemplate, setShowTemplate] = useState<string | null>(null);

  const words = input.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = PATTERNS.map(p => {
    const score = words.reduce((acc, w) => {
      return acc + p.keywords.filter(k => k.includes(w) || w.includes(k.split(' ')[0])).length;
    }, 0);
    return { ...p, score };
  }).filter(p => words.length === 0 || p.score > 0)
    .sort((a, b) => b.score - a.score);

  const displayed = words.length === 0 ? PATTERNS : scored;

  return (
    <div class="space-y-5">
      {/* Input */}
      <div>
        <label class="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Describe the problem</label>
        <textarea
          rows={3}
          placeholder="e.g. find the longest substring without repeating characters, or find cycle in linked list..."
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          class="w-full bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
        />
        <p class="text-xs text-text-muted mt-1">Tip: describe what you're looking for (e.g. "find pairs", "shortest path", "top k elements")</p>
      </div>

      {/* Results */}
      <div class="space-y-3">
        {displayed.map(pattern => (
          <div key={pattern.name} class="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div class="px-5 py-4">
              <div class="flex items-start justify-between gap-3 mb-2">
                <h3 class="font-semibold">{pattern.name}</h3>
                <div class="flex gap-2 shrink-0">
                  <span class="text-xs bg-bg border border-border px-2 py-0.5 rounded text-text-muted">{pattern.timeComplexity}</span>
                  <span class="text-xs bg-bg border border-border px-2 py-0.5 rounded text-text-muted">{pattern.spaceComplexity}</span>
                </div>
              </div>
              <p class="text-text-muted text-sm mb-3">{pattern.description}</p>
              <div class="mb-3">
                <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Classic Problems</p>
                <div class="flex flex-wrap gap-1.5">
                  {pattern.examples.map(ex => (
                    <span key={ex} class="text-xs bg-bg rounded px-2 py-0.5 border border-border">{ex}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowTemplate(showTemplate === pattern.name ? null : pattern.name)}
                class="text-xs text-primary hover:underline"
              >
                {showTemplate === pattern.name ? 'Hide template ↑' : 'Show code template ↓'}
              </button>
            </div>
            {showTemplate === pattern.name && (
              <div class="border-t border-border px-5 pb-4">
                <pre class="mt-3 bg-bg rounded-lg p-4 text-xs text-text overflow-x-auto leading-relaxed font-mono">{pattern.template}</pre>
              </div>
            )}
          </div>
        ))}
        {words.length > 0 && scored.filter(p => p.score > 0).length === 0 && (
          <p class="text-text-muted text-sm text-center py-8">No strong pattern match — try different keywords.</p>
        )}
      </div>

      {/* Gumroad CTA */}
      <div class="rounded-xl border border-primary/30 bg-gradient-to-br from-bg-card to-bg p-6 text-center mt-4">
        <p class="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Build your own dev tools site</p>
        <h3 class="text-xl font-bold mb-1">DevToolkit Starter Kit</h3>
        <p class="text-text-muted text-sm mb-4">Astro + Preact + Tailwind. 12 built-in tools. Deploy to Cloudflare Pages in minutes.</p>
        <a
          href={DEVTOOLKIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
        >
          Get DevToolkit Starter Kit — $19 →
        </a>
      </div>
    </div>
  );
}
