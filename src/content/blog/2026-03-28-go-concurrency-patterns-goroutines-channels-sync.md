---
title: "Go Concurrency Patterns: Goroutines, Channels, and Sync Primitives Explained"
description: "Master Go concurrency in 2026. Practical patterns for worker pools, fan-out/fan-in, pipelines, context cancellation, and when to use sync.Mutex vs channels. With real code examples you can use today."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["go", "golang", "concurrency", "goroutines", "channels", "sync", "backend", "performance"]
readingTime: "11 min read"
---

Go's concurrency model is one of its defining strengths. Goroutines are cheap (2KB initial stack), channels provide structured communication, and the `sync` package fills in the gaps for shared state. The problem is that concurrency primitives are easy to misuse — and the bugs are subtle.

This guide covers the patterns that actually appear in production Go code, with explanations of when to use each.

---

## Goroutines: The Basics

A goroutine is a lightweight thread managed by the Go runtime. You launch one with the `go` keyword:

```go
func main() {
    go doWork() // launches goroutine, doesn't block
    doOtherWork()
}
```

The Go scheduler multiplexes goroutines onto OS threads using an M:N model. You can run millions of goroutines on a machine with 8 threads — the scheduler handles parking and resuming them efficiently.

The cardinal rule: **don't launch goroutines without a way to know when they finish**.

---

## Pattern 1: WaitGroup for Fire-and-Forget Parallelism

`sync.WaitGroup` is the simplest coordination mechanism — increment before launching, decrement when done, wait for zero.

```go
func processAll(items []Item) {
    var wg sync.WaitGroup

    for _, item := range items {
        wg.Add(1)
        go func(item Item) {
            defer wg.Done()
            process(item)
        }(item) // pass item as arg to avoid closure capture bug
    }

    wg.Wait() // blocks until all goroutines call Done()
}
```

**Common mistake**: capturing loop variables in goroutine closures.

```go
// BUG: all goroutines may see the same item value
for _, item := range items {
    go func() {
        process(item) // item is the loop variable, not a copy
    }()
}

// Fix: pass as argument
for _, item := range items {
    go func(item Item) {
        process(item)
    }(item)
}
```

Note: Go 1.22+ fixed loop variable semantics — in newer versions, each loop iteration creates a new variable, eliminating this class of bug.

---

## Pattern 2: Worker Pool

Don't launch one goroutine per task when the number of tasks is unbounded. Use a fixed-size worker pool:

```go
func workerPool(jobs <-chan Job, results chan<- Result, numWorkers int) {
    var wg sync.WaitGroup

    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs { // range over channel blocks until closed
                results <- process(job)
            }
        }()
    }

    wg.Wait()
    close(results) // signal consumers that no more results are coming
}

func main() {
    jobs := make(chan Job, 100)    // buffered: producers don't block immediately
    results := make(chan Result, 100)

    go workerPool(jobs, results, runtime.NumCPU())

    // Feed jobs
    go func() {
        for _, j := range allJobs {
            jobs <- j
        }
        close(jobs) // close signals workers to exit their range loop
    }()

    // Collect results
    for result := range results {
        fmt.Println(result)
    }
}
```

The channel close is the coordination signal: `range jobs` exits when `jobs` is closed and drained.

---

## Pattern 3: Fan-Out / Fan-In

Fan-out: distribute work across multiple goroutines. Fan-in: merge results from multiple goroutines into one channel.

```go
// Fan-out: each URL fetched concurrently
func fanOut(urls []string) []<-chan Response {
    channels := make([]<-chan Response, len(urls))
    for i, url := range urls {
        ch := make(chan Response, 1)
        channels[i] = ch
        go func(url string, ch chan<- Response) {
            resp, err := http.Get(url)
            ch <- Response{URL: url, Resp: resp, Err: err}
            close(ch)
        }(url, ch)
    }
    return channels
}

// Fan-in: merge all channels into one
func fanIn(channels []<-chan Response) <-chan Response {
    merged := make(chan Response, len(channels))
    var wg sync.WaitGroup

    for _, ch := range channels {
        wg.Add(1)
        go func(ch <-chan Response) {
            defer wg.Done()
            for r := range ch {
                merged <- r
            }
        }(ch)
    }

    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}

func main() {
    urls := []string{
        "https://api1.example.com",
        "https://api2.example.com",
        "https://api3.example.com",
    }

    channels := fanOut(urls)
    results := fanIn(channels)

    for result := range results {
        if result.Err != nil {
            log.Printf("error fetching %s: %v", result.URL, result.Err)
            continue
        }
        fmt.Printf("got %s: %d\n", result.URL, result.Resp.StatusCode)
    }
}
```

---

## Pattern 4: Pipeline

Pipelines chain processing stages — each stage reads from an input channel and writes to an output channel:

```go
// Stage 1: generate numbers
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

// Stage 2: square numbers
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

// Stage 3: filter evens
func filterEven(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            if n%2 == 0 {
                out <- n
            }
        }
    }()
    return out
}

func main() {
    // Compose pipeline
    nums := generate(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
    squares := square(nums)
    evens := filterEven(squares)

    for n := range evens {
        fmt.Println(n) // 4, 16, 36, 64, 100
    }
}
```

Pipelines are composable and naturally backpressure-aware: if a downstream stage is slow, upstream stages block, which is usually the correct behavior.

---

## Pattern 5: Context Cancellation

`context.Context` is the standard Go mechanism for propagating cancellation and deadlines through a call chain. Always thread context through goroutines that do I/O:

```go
func fetchWithTimeout(ctx context.Context, url string) ([]byte, error) {
    // Create a child context with 5s deadline
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel() // always cancel to release resources

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, err
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}

// Worker that respects cancellation
func worker(ctx context.Context, jobs <-chan Job, results chan<- Result) {
    for {
        select {
        case <-ctx.Done():
            // Context cancelled — exit cleanly
            return
        case job, ok := <-jobs:
            if !ok {
                return // channel closed
            }
            result, err := processWithContext(ctx, job)
            if err != nil {
                // Check if error is from cancellation
                if ctx.Err() != nil {
                    return
                }
                log.Printf("job error: %v", err)
                continue
            }
            results <- result
        }
    }
}
```

The `select` with `ctx.Done()` is the standard idiom for cancellable goroutines. It prevents goroutine leaks when the parent operation is cancelled.

---

## Pattern 6: sync.Mutex vs Channels

The Go proverb is "share memory by communicating, don't communicate by sharing memory." In practice, this means: prefer channels for coordination, use mutexes for shared state.

**Use channels when**: passing ownership of data, signaling events, building pipelines.

**Use mutex when**: protecting shared state that multiple goroutines need to read/write in place.

```go
// Mutex pattern: thread-safe counter
type SafeCounter struct {
    mu    sync.Mutex
    count map[string]int
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count[key]++
}

func (c *SafeCounter) Value(key string) int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count[key]
}
```

For read-heavy workloads, use `sync.RWMutex` — allows concurrent reads, exclusive writes:

```go
type Cache struct {
    mu    sync.RWMutex
    store map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()         // multiple goroutines can RLock simultaneously
    defer c.mu.RUnlock()
    val, ok := c.store[key]
    return val, ok
}

func (c *Cache) Set(key, value string) {
    c.mu.Lock()          // exclusive write lock
    defer c.mu.Unlock()
    c.store[key] = value
}
```

---

## Pattern 7: errgroup for Concurrent Error Handling

`golang.org/x/sync/errgroup` handles the common pattern of running concurrent tasks and collecting the first error:

```go
import "golang.org/x/sync/errgroup"

func fetchAll(ctx context.Context, urls []string) ([][]byte, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([][]byte, len(urls))

    for i, url := range urls {
        i, url := i, url // capture for closure
        g.Go(func() error {
            data, err := fetchWithTimeout(ctx, url)
            if err != nil {
                return fmt.Errorf("fetching %s: %w", url, err)
            }
            results[i] = data
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

`errgroup.WithContext` cancels the context when any goroutine returns an error — other goroutines should check `ctx.Done()` to exit early.

---

## Common Mistakes

### Goroutine Leak

```go
// BAD: goroutine blocks forever if nothing reads from ch
func leak() <-chan int {
    ch := make(chan int)
    go func() {
        ch <- expensiveComputation() // blocks if caller abandons ch
    }()
    return ch
}

// Fix: use buffered channel or context
func noLeak(ctx context.Context) <-chan int {
    ch := make(chan int, 1) // buffer 1 so sender doesn't block
    go func() {
        select {
        case ch <- expensiveComputation():
        case <-ctx.Done():
        }
    }()
    return ch
}
```

### Sending on Closed Channel

```go
// Panics: send on closed channel
close(ch)
ch <- value // panic!
```

Rule: **only the sender should close a channel**. Never close from the receiver side, and never close a channel that might be sent to.

### Forgetting defer cancel()

```go
// BAD: context leak
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
// if you return early without cancel(), resources leak

// Good:
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
defer cancel() // always defer immediately after creation
```

---

## Choosing the Right Primitive

| Need | Use |
|------|-----|
| Run tasks concurrently, wait for all | `sync.WaitGroup` |
| Concurrent tasks with error collection | `errgroup` |
| Fixed-size worker pool | Buffered channel + WaitGroup |
| Pass data between goroutines | `chan T` |
| Cancel goroutines on timeout/signal | `context.Context` |
| Protect shared state | `sync.Mutex` / `sync.RWMutex` |
| One-time initialization | `sync.Once` |
| Atomic counter/flag | `sync/atomic` |

---

## Key Takeaways

- Goroutines are cheap but not free — always have a cleanup path
- Close channels from the sender side only; closing signals "no more data"
- Use `context.Context` for all I/O operations — it's the cancellation mechanism
- Prefer `errgroup` over manual WaitGroup + error channel for concurrent tasks
- Mutex protects shared state; channels communicate ownership
- In Go 1.22+, loop variable capture bugs are fixed — but know the pattern for codebases on older versions
- Run `go vet` and use the race detector (`go test -race`) — they catch the bugs that compile cleanly
