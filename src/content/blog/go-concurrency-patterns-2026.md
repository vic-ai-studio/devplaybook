---
title: "Go Concurrency Patterns 2026: Goroutines, Channels & Context"
description: "Go concurrency patterns 2026: goroutines, channel patterns (fan-out/fan-in/pipeline), WaitGroup, errgroup, context cancellation, mutex vs channels, worker pools, and common mistakes."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Go", "concurrency", "goroutines", "channels", "context", "WaitGroup", "errgroup"]
readingTime: "11 min read"
category: "golang"
---

Go's concurrency model is one of its most distinctive features. Goroutines are lightweight (starting at ~2KB stack), and channels provide safe communication between them. The standard library and `golang.org/x/sync` give you all the primitives you need. This guide covers practical patterns you'll use in production systems.

## Goroutine Fundamentals

Goroutines are multiplexed onto OS threads by the Go runtime scheduler. You can spawn hundreds of thousands without issue.

```go
// Basic goroutine
go func() {
    doWork()
}()

// With a named function
go processItem(item)

// The Go runtime:
// - Starts goroutines with 2KB-8KB stack (grows dynamically)
// - Multiplexes M goroutines onto N OS threads (M:N scheduling)
// - Goroutines yield at blocking operations (I/O, channel ops, runtime.Gosched)
// - Default: GOMAXPROCS = number of CPU cores
```

**Key rule:** Never start a goroutine without a way to stop it and know when it's done.

---

## Channels: Communication Between Goroutines

```go
// Unbuffered channel: synchronous — sender blocks until receiver ready
ch := make(chan int)

// Buffered channel: sender blocks only when buffer is full
ch := make(chan int, 10)

// Send and receive
ch <- 42        // send
val := <-ch     // receive
val, ok := <-ch // receive with closed check (ok=false means closed)

// Channel direction (type safety in function signatures)
func producer(out chan<- int) { out <- 1 }  // send-only
func consumer(in <-chan int) { v := <-in }  // receive-only

// Range over channel (until closed)
for val := range ch {
    process(val)
}
// Loop exits when ch is closed

// Close convention: only the sender should close
close(ch)
```

---

## Pipeline Pattern

Pipelines chain processing stages, each reading from upstream and writing to downstream.

```go
package main

import (
    "fmt"
    "context"
)

// Stage 1: generate numbers
func generate(ctx context.Context, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case out <- n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}

// Stage 2: square numbers
func square(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case out <- n * n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}

// Stage 3: filter even numbers
func filterEven(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            if n%2 == 0 {
                select {
                case out <- n:
                case <-ctx.Done():
                    return
                }
            }
        }
    }()
    return out
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Compose pipeline
    nums := generate(ctx, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
    squared := square(ctx, nums)
    evens := filterEven(ctx, squared)

    for n := range evens {
        fmt.Println(n)  // 4, 16, 36, 64, 100
    }
}
```

---

## Fan-Out Pattern

Fan-out distributes work from one input channel to multiple worker goroutines.

```go
func fanOut(ctx context.Context, input <-chan Task, workers int) []<-chan Result {
    outputs := make([]<-chan Result, workers)

    for i := 0; i < workers; i++ {
        outputs[i] = worker(ctx, input)
    }
    return outputs
}

func worker(ctx context.Context, input <-chan Task) <-chan Result {
    output := make(chan Result)
    go func() {
        defer close(output)
        for task := range input {
            select {
            case <-ctx.Done():
                return
            default:
            }
            result := process(task)
            select {
            case output <- result:
            case <-ctx.Done():
                return
            }
        }
    }()
    return output
}
```

---

## Fan-In Pattern

Fan-in merges multiple channels into one.

```go
func fanIn(ctx context.Context, channels ...<-chan Result) <-chan Result {
    merged := make(chan Result)
    var wg sync.WaitGroup

    output := func(ch <-chan Result) {
        defer wg.Done()
        for val := range ch {
            select {
            case merged <- val:
            case <-ctx.Done():
                return
            }
        }
    }

    wg.Add(len(channels))
    for _, ch := range channels {
        go output(ch)
    }

    // Close merged channel when all inputs are done
    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}

// Usage: fan-out then fan-in
func processParallel(ctx context.Context, tasks []Task) []Result {
    input := make(chan Task, len(tasks))
    for _, t := range tasks {
        input <- t
    }
    close(input)

    workerOutputs := fanOut(ctx, input, runtime.NumCPU())
    combined := fanIn(ctx, workerOutputs...)

    var results []Result
    for r := range combined {
        results = append(results, r)
    }
    return results
}
```

---

## WaitGroup: Synchronize Goroutines

```go
func processAll(items []string) {
    var wg sync.WaitGroup

    for _, item := range items {
        wg.Add(1)
        go func(item string) {
            defer wg.Done()  // ALWAYS defer
            process(item)
        }(item)  // pass item as argument to avoid closure capture bug
    }

    wg.Wait()  // block until all goroutines call Done()
}

// Common mistake — DO NOT do this:
for _, item := range items {
    go func() {
        process(item)  // BUG: all goroutines may see the last value of item
    }()
}
```

---

## errgroup: Concurrent Error Handling

`errgroup` is `WaitGroup` + error propagation. It's the idiomatic way to run concurrent operations where any failure should stop the group.

```bash
go get golang.org/x/sync/errgroup
```

```go
import "golang.org/x/sync/errgroup"

func fetchUserData(ctx context.Context, userID string) (*UserData, error) {
    g, ctx := errgroup.WithContext(ctx)

    var profile *Profile
    var orders []*Order
    var preferences *Preferences

    g.Go(func() error {
        var err error
        profile, err = fetchProfile(ctx, userID)
        return err
    })

    g.Go(func() error {
        var err error
        orders, err = fetchOrders(ctx, userID)
        return err
    })

    g.Go(func() error {
        var err error
        preferences, err = fetchPreferences(ctx, userID)
        return err
    })

    // Wait for all goroutines; cancel context if any fail
    if err := g.Wait(); err != nil {
        return nil, fmt.Errorf("fetching user data: %w", err)
    }

    return &UserData{Profile: profile, Orders: orders, Preferences: preferences}, nil
}

// With concurrency limiting
func processWithLimit(ctx context.Context, items []string) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10)  // max 10 concurrent goroutines

    for _, item := range items {
        item := item
        g.Go(func() error {
            return processItem(ctx, item)
        })
    }
    return g.Wait()
}
```

---

## Context: Cancellation and Deadlines

```go
// Timeout context
ctx, cancel := context.WithTimeout(parentCtx, 5*time.Second)
defer cancel()  // ALWAYS defer, even if timeout fires

// Deadline context (absolute time)
deadline := time.Now().Add(30 * time.Second)
ctx, cancel := context.WithDeadline(parentCtx, deadline)
defer cancel()

// Manual cancellation
ctx, cancel := context.WithCancel(parentCtx)
// cancel() elsewhere to stop all goroutines using this context

// Check cancellation in long-running work
func longWork(ctx context.Context) error {
    for i := 0; i < 1000000; i++ {
        // Check periodically
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
        }
        doStep(i)
    }
    return nil
}

// Pass values through context (use sparingly — prefer explicit params)
type contextKey string
const requestIDKey contextKey = "requestID"

ctx = context.WithValue(ctx, requestIDKey, "req-123")
reqID := ctx.Value(requestIDKey).(string)
```

---

## Mutex vs Channels: When to Use Each

This is one of the most common Go design decisions.

```go
// USE MUTEX when:
// - Protecting shared state (caches, counters, maps)
// - Multiple readers, few writers (sync.RWMutex)
// - Simple critical sections

type Cache struct {
    mu    sync.RWMutex
    items map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()         // multiple readers allowed
    defer c.mu.RUnlock()
    v, ok := c.items[key]
    return v, ok
}

func (c *Cache) Set(key, value string) {
    c.mu.Lock()          // exclusive write lock
    defer c.mu.Unlock()
    c.items[key] = value
}

// USE CHANNELS when:
// - Transferring ownership of data
// - Signaling events between goroutines
// - Building pipelines and workflows
// - Coordinating work distribution

func signalDone() {
    done := make(chan struct{})
    go func() {
        doWork()
        close(done)
    }()
    <-done  // wait for signal
}
```

**Decision table:**

| Scenario | Use |
|---------|-----|
| Shared counter/map | `sync.Mutex` or `sync.RWMutex` |
| One-time signal | `chan struct{}`, `sync.Once` |
| Worker pool distribution | Channel |
| Coordinating multiple goroutines | `WaitGroup` or `errgroup` |
| Rate limiting | Buffered channel (semaphore) |

---

## Worker Pool Pattern

```go
func workerPool(ctx context.Context, numWorkers int, jobs <-chan Job) <-chan Result {
    results := make(chan Result, numWorkers*2)

    var wg sync.WaitGroup
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                select {
                case <-ctx.Done():
                    return
                default:
                }
                result := processJob(job)
                results <- result
            }
        }()
    }

    // Close results when all workers are done
    go func() {
        wg.Wait()
        close(results)
    }()

    return results
}

// Channel as semaphore (limit concurrency)
sem := make(chan struct{}, 10)  // max 10 concurrent

for _, task := range tasks {
    sem <- struct{}{}  // acquire
    go func(t Task) {
        defer func() { <-sem }()  // release
        process(t)
    }(task)
}
// Drain semaphore to wait for all
for i := 0; i < cap(sem); i++ {
    sem <- struct{}{}
}
```

---

## Common Mistakes

### 1. Goroutine Leak via Unbuffered Channel

```go
// BUG: goroutine leaks if caller stops reading
func getResults() <-chan int {
    ch := make(chan int)  // unbuffered
    go func() {
        for i := 0; i < 100; i++ {
            ch <- i  // blocks if nobody reads
        }
        close(ch)
    }()
    return ch
}

// Fix: use buffered channel or context
func getResults(ctx context.Context) <-chan int {
    ch := make(chan int, 100)
    go func() {
        defer close(ch)
        for i := 0; i < 100; i++ {
            select {
            case ch <- i:
            case <-ctx.Done():
                return
            }
        }
    }()
    return ch
}
```

### 2. Closure Variable Capture in Loops

```go
// BUG: all goroutines see the final value of i
for i := 0; i < 5; i++ {
    go func() {
        fmt.Println(i)  // likely prints 5,5,5,5,5
    }()
}

// Fix 1: pass as argument
for i := 0; i < 5; i++ {
    go func(n int) {
        fmt.Println(n)
    }(i)
}

// Fix 2: shadow the variable (Go 1.22+, loop vars are per-iteration)
// In Go 1.22+, loop variable capture works correctly by default
```

### 3. Deadlock from Forgetting to Close

```go
// BUG: goroutine leaks, range never ends
ch := make(chan int)
go func() {
    for _, n := range data {
        ch <- n
    }
    // forgot: close(ch)
}()

for v := range ch {  // blocks forever after last element
    process(v)
}
```

### 4. Data Race on Map

```go
// BUG: concurrent map read/write is a panic in Go
m := make(map[string]int)
go func() { m["key"] = 1 }()
go func() { _ = m["key"] }()

// Fix: use sync.Map or protect with mutex
var mu sync.RWMutex
// or:
var sm sync.Map
sm.Store("key", 1)
v, _ := sm.Load("key")
```

Go's concurrency model rewards understanding over fighting. Channel-based patterns produce clean, testable code. Mutex patterns are appropriate for simple shared state. The combination of `errgroup`, `context`, and well-designed channels covers the majority of real concurrent workloads.
