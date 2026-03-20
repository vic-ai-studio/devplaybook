import { useState } from 'preact/hooks';

interface Question {
  q: string;
  hint: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'conceptual' | 'practical' | 'behavioral' | 'system-design';
}

const QUESTIONS: Record<string, Question[]> = {
  React: [
    { q: 'What is the difference between state and props in React?', hint: 'State is internal and mutable; props are external and read-only from the component perspective.', difficulty: 'easy', type: 'conceptual' },
    { q: 'Explain the React component lifecycle (for hooks).', hint: 'useEffect(() => {}, []) replaces componentDidMount. Cleanup function replaces componentWillUnmount.', difficulty: 'easy', type: 'conceptual' },
    { q: 'What is the virtual DOM and why does React use it?', hint: 'React diffing algorithm — reconciliation. Minimizes direct DOM manipulation which is expensive.', difficulty: 'easy', type: 'conceptual' },
    { q: 'When would you use useCallback vs useMemo?', hint: 'useCallback memoizes a function reference; useMemo memoizes a computed value. Both prevent unnecessary re-renders.', difficulty: 'medium', type: 'conceptual' },
    { q: 'How does React\'s Context API work, and when would you avoid it?', hint: 'Context re-renders all consumers on value change. Avoid for frequently changing state — use Zustand/Redux instead.', difficulty: 'medium', type: 'practical' },
    { q: 'What is the React reconciliation algorithm (Fiber)?', hint: 'Fiber is an incremental rendering algorithm that splits work into units and prioritizes by urgency (concurrent mode).', difficulty: 'hard', type: 'conceptual' },
    { q: 'How do you prevent unnecessary re-renders in a large React app?', hint: 'React.memo, useCallback, useMemo, state colocation, splitting context, lazy loading with Suspense.', difficulty: 'medium', type: 'practical' },
    { q: 'Build a custom hook that fetches data with loading/error states.', hint: 'Manage loading boolean, error, and data with useState. Trigger fetch in useEffect with dependency array. Cleanup with AbortController.', difficulty: 'medium', type: 'practical' },
    { q: 'What are React Server Components and how do they differ from client components?', hint: 'RSCs run on the server, can access DB directly, have no state/effects, reduce JS bundle. Use "use client" directive for client components.', difficulty: 'hard', type: 'conceptual' },
    { q: 'How would you architect state management for a large e-commerce app?', hint: 'Server state (React Query/SWR), URL state, local UI state (useState), global client state (Zustand). Avoid over-centralizing.', difficulty: 'hard', type: 'system-design' },
  ],
  'Node.js': [
    { q: 'Explain the Node.js event loop.', hint: 'Single-threaded, non-blocking I/O via libuv. Phases: timers, pending callbacks, poll, check (setImmediate), close callbacks.', difficulty: 'medium', type: 'conceptual' },
    { q: 'What is the difference between process.nextTick() and setImmediate()?', hint: 'nextTick runs before the next event loop iteration. setImmediate runs in the check phase — after I/O events.', difficulty: 'medium', type: 'conceptual' },
    { q: 'How do you handle uncaught exceptions in Node.js?', hint: 'process.on("uncaughtException"), process.on("unhandledRejection"), domain module (deprecated). Better: handle at source, use async wrappers.', difficulty: 'medium', type: 'practical' },
    { q: 'What are streams in Node.js and when would you use them?', hint: 'Readable, Writable, Duplex, Transform. Use for large files (don\'t buffer all in memory). pipe() chains streams.', difficulty: 'medium', type: 'practical' },
    { q: 'How does clustering work in Node.js?', hint: 'cluster module forks child processes sharing the same port. Each process runs on a CPU core. PM2 does this automatically.', difficulty: 'hard', type: 'conceptual' },
    { q: 'Explain the difference between async/await, Promises, and callbacks.', hint: 'Callbacks: callback hell, inversion of control. Promises: chainable, then/catch. async/await: syntactic sugar over Promises, linear-looking code.', difficulty: 'easy', type: 'conceptual' },
    { q: 'How would you design a rate limiter middleware in Express?', hint: 'Token bucket or sliding window with Redis for distributed limiting. Use express-rate-limit or a custom middleware.', difficulty: 'hard', type: 'practical' },
    { q: 'What is the difference between require() and import in Node.js?', hint: 'require is CJS — synchronous, can be conditional. import is ESM — static, tree-shakeable, top-level await.', difficulty: 'easy', type: 'conceptual' },
    { q: 'How do you scale a Node.js API to handle 10K concurrent connections?', hint: 'Cluster/PM2, horizontal scaling + load balancer, async I/O everywhere, connection pooling, Redis for shared state, CDN for static.', difficulty: 'hard', type: 'system-design' },
  ],
  Python: [
    { q: 'Explain Python\'s GIL (Global Interpreter Lock) and its implications.', hint: 'GIL allows only one thread to execute Python bytecode at a time. CPU-bound: use multiprocessing. I/O-bound: threads or async are fine.', difficulty: 'medium', type: 'conceptual' },
    { q: 'What is the difference between generators and iterators?', hint: 'Iterator implements __iter__ and __next__. Generator is a function with yield — creates an iterator lazily. Memory efficient.', difficulty: 'medium', type: 'conceptual' },
    { q: 'Explain list comprehensions vs generator expressions.', hint: 'List comprehension builds the full list in memory. Generator expression is lazy — one item at a time. Use () not [] for generator.', difficulty: 'easy', type: 'conceptual' },
    { q: 'What are Python decorators and how do they work?', hint: 'A decorator is a function that takes a function and returns a wrapped function. Uses @functools.wraps to preserve metadata.', difficulty: 'medium', type: 'conceptual' },
    { q: 'How does Python\'s asyncio work?', hint: 'Event loop + coroutines (async def). await suspends the coroutine and yields control. Single-threaded but handles thousands of concurrent I/O ops.', difficulty: 'hard', type: 'conceptual' },
    { q: 'What is the difference between deepcopy and shallow copy?', hint: 'Shallow copy: top-level copy, nested objects still shared. Deepcopy: fully independent copy. Use copy.deepcopy() or custom __deepcopy__.', difficulty: 'easy', type: 'conceptual' },
    { q: 'How would you optimize a slow Python function?', hint: 'Profile first (cProfile). Vectorize with NumPy. Use built-ins over loops. Caching with lru_cache. Move hot path to Cython/Rust extension.', difficulty: 'hard', type: 'practical' },
    { q: 'Explain *args and **kwargs.', hint: '*args: tuple of positional args. **kwargs: dict of keyword args. Useful for wrapper functions and variadic signatures.', difficulty: 'easy', type: 'conceptual' },
    { q: 'How does Python manage memory?', hint: 'Reference counting + cycle collector. Objects freed when refcount = 0. CPython reuses small int/string objects (interning).', difficulty: 'medium', type: 'conceptual' },
  ],
  Go: [
    { q: 'Explain goroutines and how they differ from OS threads.', hint: 'Goroutines are lightweight (2KB stack), multiplexed over OS threads by the Go scheduler (M:N). Context switching is user-space, very fast.', difficulty: 'medium', type: 'conceptual' },
    { q: 'What are channels in Go and when would you use buffered vs unbuffered?', hint: 'Channels communicate between goroutines. Unbuffered: synchronous handoff (sender blocks until receiver ready). Buffered: allows N items without blocking.', difficulty: 'medium', type: 'conceptual' },
    { q: 'How does Go handle error handling?', hint: 'Explicit return of error values. No exceptions. errors.New(), fmt.Errorf("%w"). Check with if err != nil. Wrap for context.', difficulty: 'easy', type: 'conceptual' },
    { q: 'What is the difference between a goroutine leak and how do you prevent it?', hint: 'A goroutine blocks forever waiting on a channel or context that never fires. Use context.WithCancel/Timeout and always drain channels.', difficulty: 'hard', type: 'practical' },
    { q: 'Explain interfaces in Go and how they are satisfied implicitly.', hint: 'Go uses structural typing — no "implements" keyword. If a type has the required methods, it satisfies the interface. Duck typing.', difficulty: 'medium', type: 'conceptual' },
    { q: 'What is sync.WaitGroup and sync.Mutex? When would you use each?', hint: 'WaitGroup: wait for N goroutines to finish. Mutex: protect shared data from concurrent access. Use channels over mutexes when possible.', difficulty: 'medium', type: 'practical' },
    { q: 'How does Go\'s garbage collector work?', hint: 'Tri-color concurrent mark-and-sweep. Targets sub-millisecond pauses. Use runtime/pprof to analyze heap allocation. Avoid excess allocs in hot paths.', difficulty: 'hard', type: 'conceptual' },
    { q: 'How would you structure a Go REST API for a team of 5 engineers?', hint: 'Layered: handlers → services → repositories. Use go-chi or stdlib. Dependency injection via constructor functions. Interface-driven for testability.', difficulty: 'hard', type: 'system-design' },
  ],
  TypeScript: [
    { q: 'What is the difference between type and interface in TypeScript?', hint: 'Interface is extendable (declaration merging), better for object shapes. Type alias is more flexible (unions, intersections, primitives).', difficulty: 'easy', type: 'conceptual' },
    { q: 'Explain generics in TypeScript with an example.', hint: 'Generics allow type-safe reusable functions/classes. function identity<T>(arg: T): T. Constrain with extends.', difficulty: 'medium', type: 'conceptual' },
    { q: 'What are conditional types and when are they useful?', hint: 'T extends U ? X : Y. Used for type utilities like Exclude, Extract, ReturnType, NonNullable. Very powerful for library authors.', difficulty: 'hard', type: 'conceptual' },
    { q: 'Explain the difference between unknown, any, and never.', hint: 'any: opt-out type checking. unknown: type-safe any — must narrow before use. never: unreachable code / exhaustive checks.', difficulty: 'medium', type: 'conceptual' },
    { q: 'How do mapped types work in TypeScript?', hint: '{ [K in keyof T]: T[K] }. Used for Partial, Required, Readonly, Record. Add modifiers with + or -.', difficulty: 'hard', type: 'conceptual' },
    { q: 'What is declaration merging and when does it happen?', hint: 'Interfaces with same name merge. Used by @types packages to augment third-party types. Doesn\'t work with type aliases.', difficulty: 'medium', type: 'conceptual' },
    { q: 'How would you type a deeply nested optional object safely?', hint: 'Optional chaining (?.),nullish coalescing (??), or use a utility type like DeepPartial<T>. Zod for runtime validation.', difficulty: 'medium', type: 'practical' },
  ],
  SQL: [
    { q: 'What is the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN?', hint: 'INNER: only matching rows. LEFT: all from left + matching from right (NULLs for no match). FULL OUTER: all from both tables.', difficulty: 'easy', type: 'conceptual' },
    { q: 'Explain ACID properties in databases.', hint: 'Atomicity (all-or-nothing), Consistency (valid state), Isolation (concurrent txns don\'t interfere), Durability (persisted after commit).', difficulty: 'medium', type: 'conceptual' },
    { q: 'What is the difference between WHERE and HAVING?', hint: 'WHERE filters rows before grouping. HAVING filters groups after GROUP BY. Can\'t use aggregate functions in WHERE.', difficulty: 'easy', type: 'conceptual' },
    { q: 'How does a B-tree index work and when would you not use one?', hint: 'Balanced tree for O(log n) search. Don\'t index: low-cardinality columns, columns rarely in WHERE, tables with frequent inserts.', difficulty: 'medium', type: 'conceptual' },
    { q: 'What are window functions and give a practical example?', hint: 'ROW_NUMBER(), RANK(), LAG(), LEAD(), SUM() OVER(). Compute values across related rows without collapsing them. Great for rankings and running totals.', difficulty: 'hard', type: 'practical' },
    { q: 'Explain the N+1 query problem and how to fix it.', hint: '1 query to get N records, then N queries for related data. Fix with JOIN, SELECT IN, or ORM eager loading (include/with).', difficulty: 'medium', type: 'practical' },
    { q: 'What is query plan analysis and how do you use EXPLAIN?', hint: 'EXPLAIN ANALYZE shows actual execution plan: seq scan vs index scan, rows, cost. Look for seq scans on large tables — add indexes.', difficulty: 'hard', type: 'practical' },
  ],
  'System Design': [
    { q: 'Design a URL shortener like bit.ly.', hint: 'Hash or base62 encode. DB with (shortCode → originalUrl). Cache top URLs. Handle redirects with 301/302. Analytics via async event stream.', difficulty: 'medium', type: 'system-design' },
    { q: 'Design a rate limiter for a public API.', hint: 'Token bucket or sliding window. Redis for distributed state. Return 429 + Retry-After. Tiered limits per API key.', difficulty: 'medium', type: 'system-design' },
    { q: 'Design a notification system for 100M users.', hint: 'Push/pull hybrid. Fan-out on write for small follower counts, fan-out on read for celebrities. Message queue (Kafka). Device token management.', difficulty: 'hard', type: 'system-design' },
    { q: 'Design a distributed file storage system (like S3).', hint: 'Chunk files, store replicas across nodes. Metadata service for file → chunk mapping. Consistent hashing for distribution. Checksum integrity.', difficulty: 'hard', type: 'system-design' },
    { q: 'Design a real-time chat application.', hint: 'WebSockets for real-time. Message queue for async delivery. DB (Cassandra) for message history. Presence tracking via Redis. Read receipts.', difficulty: 'hard', type: 'system-design' },
    { q: 'How would you design a search autocomplete system?', hint: 'Trie in memory for hot queries. Redis sorted sets for top-K suggestions. Debounce client-side. Offline aggregation of query logs.', difficulty: 'hard', type: 'system-design' },
  ],
  Behavioral: [
    { q: 'Tell me about a time you had to deliver a project with an impossible deadline.', hint: 'STAR format. Focus on: scope negotiation, prioritization, communication with stakeholders, what you shipped vs deferred.', difficulty: 'medium', type: 'behavioral' },
    { q: 'Describe a situation where you disagreed with a technical decision made by your team.', hint: 'Focus on: presenting data, raising concerns respectfully, aligning after decision, not having ego. Show psychological safety.', difficulty: 'medium', type: 'behavioral' },
    { q: 'Tell me about the most complex technical problem you\'ve solved.', hint: 'Structure: problem scope → your investigation → hypotheses → solution → result. Be specific about your individual contribution.', difficulty: 'medium', type: 'behavioral' },
    { q: 'How do you handle receiving critical feedback from a manager or peer?', hint: 'Show openness, curiosity, and follow-through. Give a specific example of integrating feedback that made you better.', difficulty: 'easy', type: 'behavioral' },
    { q: 'Describe a time you mentored or helped a junior engineer grow.', hint: 'STAR. Focus on: identifying the gap, your approach (pair programming, code review, 1:1s), measurable outcome for them.', difficulty: 'medium', type: 'behavioral' },
    { q: 'Tell me about a system you built that failed in production. What did you learn?', hint: 'Show ownership (no blame), clear timeline, root cause analysis, immediate fix, long-term prevention. Demonstrates engineering maturity.', difficulty: 'hard', type: 'behavioral' },
  ],
};

const STACKS = Object.keys(QUESTIONS);
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const TYPES = ['conceptual', 'practical', 'system-design', 'behavioral'] as const;

const DEVTOOLKIT_URL = 'https://vicnail.gumroad.com/l/devtoolkit-starter-kit';

const DIFF_COLOR: Record<string, string> = {
  easy: 'text-green-400 border-green-400/40 bg-green-400/10',
  medium: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  hard: 'text-red-400 border-red-400/40 bg-red-400/10',
};

export default function InterviewQuestionGenerator() {
  const [stack, setStack] = useState('React');
  const [diffFilter, setDiffFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(5);

  const allQ = QUESTIONS[stack] || [];
  const filtered = allQ.filter(q =>
    (!diffFilter || q.difficulty === diffFilter) &&
    (!typeFilter || q.type === typeFilter)
  );

  const displayed = filtered.slice(0, count);

  const toggleHint = (q: string) => {
    const next = new Set(revealed);
    if (next.has(q)) next.delete(q);
    else next.add(q);
    setRevealed(next);
  };

  const handleStackChange = (s: string) => {
    setStack(s);
    setRevealed(new Set());
    setCount(5);
  };

  return (
    <div class="space-y-5">
      {/* Stack selector */}
      <div>
        <label class="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Tech Stack</label>
        <div class="flex flex-wrap gap-2">
          {STACKS.map(s => (
            <button
              key={s}
              onClick={() => handleStackChange(s)}
              class={`px-4 py-2 rounded-lg text-sm border font-medium transition-colors ${stack === s ? 'bg-primary text-white border-primary' : 'bg-bg-card border-border hover:border-primary hover:text-primary'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div class="flex flex-wrap gap-3">
        <div>
          <span class="text-xs text-text-muted mr-2">Difficulty:</span>
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              onClick={() => setDiffFilter(diffFilter === d ? '' : d)}
              class={`mr-1.5 px-2.5 py-1 rounded text-xs border font-medium transition-colors capitalize ${diffFilter === d ? DIFF_COLOR[d] : 'border-border text-text-muted hover:border-primary'}`}
            >
              {d}
            </button>
          ))}
        </div>
        <div>
          <span class="text-xs text-text-muted mr-2">Type:</span>
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
              class={`mr-1.5 px-2.5 py-1 rounded text-xs border transition-colors capitalize ${typeFilter === t ? 'bg-primary/10 text-primary border-primary' : 'border-border text-text-muted hover:border-primary'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <p class="text-xs text-text-muted">{filtered.length} questions available for {stack} {diffFilter ? `· ${diffFilter}` : ''} {typeFilter ? `· ${typeFilter}` : ''}</p>

      {/* Questions */}
      <div class="space-y-3">
        {displayed.map(q => (
          <div key={q.q} class="bg-bg-card border border-border rounded-xl p-5">
            <div class="flex items-start justify-between gap-3 mb-3">
              <p class="font-medium text-sm leading-relaxed">{q.q}</p>
              <div class="flex gap-1.5 shrink-0">
                <span class={`text-xs px-2 py-0.5 rounded border capitalize ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</span>
                <span class="text-xs px-2 py-0.5 rounded border border-border text-text-muted capitalize">{q.type}</span>
              </div>
            </div>
            <button
              onClick={() => toggleHint(q.q)}
              class="text-xs text-primary hover:underline"
            >
              {revealed.has(q.q) ? 'Hide hint ↑' : 'Show hint ↓'}
            </button>
            {revealed.has(q.q) && (
              <div class="mt-2 p-3 bg-bg rounded-lg border border-border">
                <p class="text-xs text-text-muted leading-relaxed">💡 {q.hint}</p>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p class="text-text-muted text-sm text-center py-8">No questions match the current filters.</p>
        )}
      </div>

      {/* Load more */}
      {count < filtered.length && (
        <button
          onClick={() => setCount(c => c + 5)}
          class="w-full py-2.5 rounded-lg border border-border text-sm hover:border-primary hover:text-primary transition-colors"
        >
          Load 5 more ({filtered.length - count} remaining)
        </button>
      )}

      {/* Gumroad CTA */}
      <div class="rounded-xl border border-primary/30 bg-gradient-to-br from-bg-card to-bg p-6 text-center mt-4">
        <p class="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Build your own tools site</p>
        <h3 class="text-xl font-bold mb-1">DevToolkit Starter Kit</h3>
        <p class="text-text-muted text-sm mb-4">12 pre-built developer tools. Astro + Preact + Tailwind. Deploy to Cloudflare Pages in minutes.</p>
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
