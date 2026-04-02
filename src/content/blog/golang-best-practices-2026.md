---
title: "Go Best Practices 2026: Code Patterns, Error Handling & Project Structure"
description: "Go best practices 2026: project structure, error handling patterns, context propagation, logging, testing strategies, code review checklist, and writing idiomatic Go that scales across teams."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Go", "Golang", "best practices", "error handling", "project structure", "testing", "code review"]
readingTime: "13 min read
category: "golang"
---

Writing Go well means understanding the choices the language designers made and following the conventions that make Go codebases maintainable at scale. This guide covers the best practices that separate production-grade Go from toy scripts.

## Project Structure

A well-organized Go project is easy to navigate, test, and scale.

### Standard Layout

```
myproject/
├── cmd/
│   ├── myapp/          # main.go for the application
│   │   └── main.go
│   └── myapp-cli/      # main.go for a CLI tool
│       └── main.go
├── internal/
│   ├── api/            # HTTP handlers, routes, middleware
│   ├── service/        # Business logic layer
│   ├── repository/     # Data access layer (DB, cache)
│   ├── model/           # Domain models and DTOs
│   └── pkg/            # Private packages (not importable externally)
├── pkg/                # Public packages (importable by other projects)
│   ├── uuid/           # e.g., github.com/yourname/myproject/pkg/uuid
│   └── retry/
├── api/                # OpenAPI/Swagger specs, protobuf definitions
├── migrations/         # Database migrations
├── scripts/            # Build, lint, database scripts
├── testdata/           # Test fixtures
├── Makefile
├── go.mod
├── go.sum
└── README.md
```

**Key principles**:
- `cmd/` contains entry points. Each binary gets its own subdirectory.
- `internal/` is a Go feature — packages there cannot be imported outside the module.
- `pkg/` contains public packages that other projects can import.
- Never put business logic in `main.go`. Keep `cmd/myapp/main.go` thin.

### Layered Architecture

```
HTTP Request
    ↓
Handler (internal/api/handlers/)
    ↓
Service (internal/service/)  — Business logic, orchestration
    ↓
Repository (internal/repository/)  — Data access
    ↓
Database / Cache / External API
```

---

## Error Handling

Error handling in Go is explicit and verbose by design. This is a feature, not a bug.

### The Fundamentals

```go
// Every function that can fail returns an error
result, err := doSomething()
if err != nil {
    return err  // Propagate upward
}

// Never ignore errors with _:
result, _ = doSomething()  // BAD: silently ignoring errors
```

### Sentinel Errors

Define package-level error variables for conditions callers may want to check:

```go
// package repository
var (
    ErrNotFound     = errors.New("repository: record not found")
    ErrDuplicateKey = errors.New("repository: duplicate key violation")
    ErrOptimisticLock = errors.New("repository: optimistic lock failed")
)

func GetUser(ctx context.Context, id string) (*User, error) {
    user, err := db.QueryContext(ctx, "SELECT * FROM users WHERE id=$1", id)
    if errors.Is(err, sql.ErrNoRows) {
        return nil, ErrNotFound
    }
    if err != nil {
        return nil, fmt.Errorf("get user: %w", err)
    }
    return user, nil
}
```

### Wrapping Errors

Use `fmt.Errorf` with `%w` to preserve the error chain for debugging:

```go
// Bad: loses the underlying error
return errors.New("get user: " + err.Error())

// Good: preserves the error chain
return fmt.Errorf("get user: %w", err)
```

With wrapped errors, callers can use `errors.Is()` and `errors.As()` to check error types and unwrap.

### Error Types for Granular Handling

```go
// Define a custom error type
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// Check with errors.As
var validationErr *ValidationError
if errors.As(err, &validationErr) {
    fmt.Printf("field %s is invalid: %s\n", validationErr.Field, validationErr.Message)
}
```

### Panics and Recover

Reserve panic for truly unrecoverable situations (programming bugs, not runtime errors):

```go
// Good use of panic: invalid configuration that must be fixed at startup
func loadConfig() *Config {
    cfg := readConfig()
    if cfg.DatabaseURL == "" {
        panic("DATABASE_URL must be set")
    }
    return cfg
}

// Recover from panics in HTTP handlers (graceful degradation)
func handlePanic(w http.ResponseWriter, r *http.Request) {
    if p := recover(); p != nil {
        log.Printf("panic: %v", p)
        http.Error(w, "Internal Server Error", 500)
    }
}

func myHandler(w http.ResponseWriter, r *http.Request) {
    defer handlePanic(w, r)
    // handler code
}
```

---

## Context Propagation

Every function that does I/O should accept a `context.Context` as its first argument. This enables cancellation, timeouts, and tracing.

### Pass Context Through the Call Chain

```go
func main() {
    ctx := context.Background()
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    result, err := fetchUser(ctx, "user-123")
}

func fetchUser(ctx context.Context, userID string) (*User, error) {
    ctx, span := tracer.Start(ctx, "fetchUser")
    defer span.End()

    req, _ := http.NewRequestWithContext(ctx, "GET", "/users/"+userID, nil)
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("fetch user: %w", err)
    }
    defer resp.Body.Close()

    // The context is automatically passed to the HTTP request
    return decodeUser(resp.Body)
}
```

### Context Rules

1. Pass `ctx` as the first parameter of functions doing I/O
2. Never store `ctx` in a struct
3. Use `context.TODO()` when you need a placeholder
4. Derive timeouts and deadlines from the incoming context
5. Check `ctx.Err()` after long-running operations

```go
// Wrong: creating a new context instead of using the incoming one
func badHandler(ctx context.Context, req Request) {
    // This ignores the caller's context (tracing, cancellation, etc.)
    ctx = context.Background()
    doIO(ctx, req)
}

// Right: use the incoming context
func goodHandler(ctx context.Context, req Request) {
    doIO(ctx, req)  // Tracing, cancellation, and deadlines flow through
}
```

---

## Logging Best Practices

### Structured Logging

Use structured logging in production. This makes logs queryable and integrable with log aggregation systems.

```go
import "github.com/rs/zerolog"

var log = zerolog.New(os.Stdout).With().Timestamp().Logger()

// Correlate with request context
func withRequestLogger(ctx context.Context) zerolog.Logger {
    reqID := middleware.GetReqID(ctx)  // e.g., OpenTelemetry span ID
    return log.With().
        Str("request_id", reqID).
        Str("method", r.Method).
        Logger()
}

logger := withRequestLogger(ctx)
logger.Info().
    Str("user_id", userID).
    Str("order_id", orderID).
    Msg("order created")
```

**Output**:

```json
{"level":"info","request_id":"abc123","method":"POST","user_id":"usr-456","order_id":"ord-789","time":1712000000,"message":"order created"}
```

### Log Levels

- **Error** (`log.Error()`): A operation failed, but the service can continue
- **Warn** (`log.Warn()`): Unexpected situation, but not a failure (e.g., retry succeeded)
- **Info** (`log.Info()`): Normal operational events (server started, request completed)
- **Debug** (`log.Debug()`): Detailed diagnostic information (query parameters, intermediate values)

**Never log passwords, tokens, API keys, or PII.**

---

## Testing Best Practices

### Table-Driven Tests

Table-driven tests are Go's idiomatic way of testing multiple cases with shared logic:

```go
func TestAddUser(t *testing.T) {
    tests := []struct {
        name    string
        input   AddUserInput
        want    *User
        wantErr error
    }{
        {
            name:  "valid user",
            input: AddUserInput{Email: "alice@example.com", Name: "Alice"},
            want:  &User{ID: "usr-1", Email: "alice@example.com", Name: "Alice"},
            wantErr: nil,
        },
        {
            name:    "missing email",
            input:   AddUserInput{Name: "Bob"},
            want:    nil,
            wantErr: ErrInvalidEmail,
        },
        {
            name:    "duplicate email",
            input:   AddUserInput{Email: "alice@example.com", Name: "Alicia"},
            want:    nil,
            wantErr: ErrDuplicateEmail,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := AddUser(context.Background(), tt.input)

            if tt.wantErr != nil {
                if err == nil {
                    t.Fatalf("expected error %v, got nil", tt.wantErr)
                }
                if !errors.Is(err, tt.wantErr) {
                    t.Fatalf("expected error %v, got %v", tt.wantErr, err)
                }
                return
            }

            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if got.ID != tt.want.ID || got.Email != tt.want.Email {
                t.Errorf("AddUser() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### Internal and External Tests

Go allows placing tests in the same package as the code (`_test.go`) or in a separate `xxx_test` package:

- **Internal tests** (`package foo`): Access unexported identifiers. Use for deeply testing internals.
- **External tests** (`package foo_test`): Test the public API as external consumers would. Prefer this for package APIs.

```go
// internal_test.go — same package, can access unexported things
package foo

func TesthelperFunction(t *testing.T) { ... }
```

```go
// external_test.go — exported package, tests the public API
package foo_test

func TestPublicAPI(t *testing.T) { ... }
```

### Mocking

Use interfaces for dependencies to enable mocking in tests:

```go
// Define an interface for the dependency
type UserRepository interface {
    GetByID(ctx context.Context, id string) (*User, error)
    Create(ctx context.Context, user *User) error
}

// The service depends on the interface, not the concrete type
type UserService struct {
    repo UserRepository  // Concrete DBRepo or MockRepo
}

func NewUserService(repo UserRepository) *UserService {
    return &UserService{repo: repo}
}

// In tests, use a mock:
type mockUserRepo struct {
    users map[string]*User
}

func (m *mockUserRepo) GetByID(ctx context.Context, id string) (*User, error) {
    if u, ok := m.users[id]; ok {
        return u, nil
    }
    return nil, ErrNotFound
}
```

---

## Interface Design

### Keep Interfaces Small

Prefer small, focused interfaces. The most common ones in the standard library are single-method:

```go
io.Reader
io.Writer
io.Closer
context.Context
```

### Define Interfaces Where They Are Used

In Go, interfaces are usually defined at the consumer site, not the producer:

```go
// consumer.go — defines the interface it needs
type Store interface {
    Put(ctx context.Context, key string, value []byte) error
    Get(ctx context.Context, key string) ([]byte, error)
}

func process(s Store) error {
    return s.Put(ctx, "key", data)
}
```

This way, the producer does not need to know about the interface.

### Interface Pollution

Do not create interfaces for everything. If there is only one implementation, a concrete type is fine:

```go
// Unnecessary: extra indirection for no good reason
func processUsers(users []User, w Writer) { ... }

// Better: concrete type when there is only one implementation
func processUsers(users []User, w *bufio.Writer) { ... }
```

---

## Dependency Injection

Go does not need a DI framework. Constructor functions with plain Go work well:

```go
// Define dependencies as interfaces in the service package
type UserRepository interface { GetByID(ctx context.Context, id string) (*User, error) }
type EmailSender interface { Send(ctx context.Context, to, subject string) error }

// Constructor creates and wires everything
func NewUserService(repo UserRepository, mail EmailSender) *UserService {
    return &UserService{repo: repo, mail: mail}
}

// main.go — wire everything at the top level
func main() {
    db, _ := NewPostgresDB()
    mail := NewSendGridMailer()

    userSvc := NewUserService(db, mail)
    orderSvc := NewOrderService(db, userSvc)

    srv := NewAPIServer(userSvc, orderSvc)
    srv.ListenAndServe()
}
```

This pattern is explicit, testable, and requires no reflection or magic.

---

## Code Review Checklist

Use this checklist when reviewing Go code:

### Error Handling
- [ ] All errors are handled (no `_` ignoring)
- [ ] Errors are wrapped with `%w` where context matters
- [ ] Sentinel errors used for conditions callers check
- [ ] No `panic` for runtime errors (only for programming bugs)

### Context
- [ ] All I/O functions accept `context.Context`
- [ ] Context is passed through call chains, not stored in structs
- [ ] Timeouts are used for external calls

### Concurrency
- [ ] No shared variables across goroutines without synchronization
- [ ] Channels used for communication, mutexes for state
- [ ] WaitGroups or errgroup used to wait for goroutines
- [ ] No goroutine leaks (goroutines always have an exit path)

### Performance
- [ ] `strings.Builder` used for concatenation in loops
- [ ] Maps and slices preallocated with known capacity
- [ ] sync.Pool used for frequently allocated objects in hot paths

### Testing
- [ ] Table-driven tests used for multiple cases
- [ ] Test names describe behavior, not implementation
- [ ] Tests use interfaces to mock dependencies
- [ ] Error cases are tested explicitly

### Style
- [ ] Package names are short, lowercase, no underscores
- [ ] Exported names documented with doc comments
- [ ] No unused imports or variables
- [ ] Error strings are lowercase and do not end with punctuation

---

## Common Go Idioms to Follow

**Single function return values for simple cases**:

```go
// Clear and idiomatic
func (u *User) FullName() string {
    return u.FirstName + " " + u.LastName
}
```

**nil slices are valid and empty**:

```go
var users []User  // nil slice — zero value, no allocation
users = append(users, u)  // append works on nil slices
```

**Zero value initialization**:

```go
var mu sync.Mutex{}  // Zero value is ready to use
var ch chan int       // nil channel — blocks forever (safe sentinel)
var bm sync.Map       // Zero value is ready to use
```

**Defer for cleanup**:

```go
f, err := os.Open("file")
if err != nil {
    return err
}
defer f.Close()  // Always runs when the function returns
```

---

## Go 2026: What Has Changed

**Go 1.22+**: Added `range-over-func` iterators, improved `math/rand/v2`, and introduced version-specific build constraints with `//go:build go1.23`.

**Generics maturity**: Generics have stabilized and the community has converged on idiomatic patterns. Use generics for collection types and algorithms, but do not force them everywhere.

**Context propagation as default**: The ecosystem has fully embraced context propagation. Libraries that do not accept context are considered poorly designed in 2026.

**Structured logging as standard**: `log/slog` (added in Go 1.21) is now the standard for structured logging. Third-party libraries like zerolog and zap are still popular but slog is the zero-dependency choice.

---

## Conclusion

Writing great Go is about discipline and convention. Use the project layout to keep code organized, handle errors explicitly with wrapping, propagate context through all I/O operations, write table-driven tests with interfaces for mocking, and review code against a checklist. Go's simplicity is a strength — resist the temptation to add unnecessary abstraction layers. The idioms exist for good reasons: they make code readable, testable, and maintainable at scale.
