---
title: "Go Microservices: Best Practices & Patterns 2026"
description: "Go microservices best practices 2026: service structure, gRPC vs REST, graceful shutdown, health checks, distributed tracing with OpenTelemetry, circuit breakers, and Kubernetes deployment."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Go", "microservices", "gRPC", "OpenTelemetry", "distributed systems", "Kubernetes"]
readingTime: "12 min read"
category: "golang"
---

Go has become the dominant language for microservices. Its fast startup time, small binary footprint, excellent concurrency primitives, and comprehensive standard library make it ideal for distributed systems. This guide covers production-grade patterns for Go microservices in 2026.

## Service Structure

A well-organized Go microservice uses a clear separation between transport, business logic, and data access layers.

```
myservice/
├── cmd/
│   └── server/
│       └── main.go          # entry point
├── internal/
│   ├── handler/             # HTTP/gRPC handlers
│   │   ├── http.go
│   │   └── grpc.go
│   ├── service/             # business logic
│   │   └── user_service.go
│   ├── repository/          # data access
│   │   └── user_repo.go
│   └── domain/              # models and interfaces
│       └── user.go
├── pkg/                     # shared public packages
│   └── middleware/
├── api/
│   └── proto/               # protobuf definitions
├── migrations/
├── Dockerfile
├── go.mod
└── go.sum
```

### Domain Layer

```go
// internal/domain/user.go
package domain

import (
    "context"
    "time"
    "errors"
)

var (
    ErrUserNotFound  = errors.New("user not found")
    ErrEmailTaken    = errors.New("email already taken")
)

type User struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
}

type CreateUserRequest struct {
    Name  string `json:"name" validate:"required,min=2"`
    Email string `json:"email" validate:"required,email"`
}

// Repository interface — business logic depends on this, not the DB
type UserRepository interface {
    Create(ctx context.Context, req CreateUserRequest) (*User, error)
    GetByID(ctx context.Context, id string) (*User, error)
    List(ctx context.Context, limit, offset int) ([]*User, error)
    Delete(ctx context.Context, id string) error
}

// Service interface
type UserService interface {
    CreateUser(ctx context.Context, req CreateUserRequest) (*User, error)
    GetUser(ctx context.Context, id string) (*User, error)
    ListUsers(ctx context.Context, page, pageSize int) ([]*User, error)
}
```

---

## gRPC for Internal Communication

gRPC is the standard for internal service-to-service communication in Go microservices — typed, efficient, and auto-generated client/server code.

### Proto Definition

```protobuf
// api/proto/user/v1/user.proto
syntax = "proto3";
package user.v1;
option go_package = "github.com/myorg/myservice/api/proto/user/v1;userv1";

import "google/protobuf/timestamp.proto";

service UserService {
    rpc CreateUser(CreateUserRequest) returns (User);
    rpc GetUser(GetUserRequest) returns (User);
    rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
}

message User {
    string id = 1;
    string name = 2;
    string email = 3;
    google.protobuf.Timestamp created_at = 4;
}

message CreateUserRequest {
    string name = 1;
    string email = 2;
}

message GetUserRequest {
    string id = 1;
}

message ListUsersRequest {
    int32 page = 1;
    int32 page_size = 2;
}

message ListUsersResponse {
    repeated User users = 1;
    int32 total = 2;
}
```

```bash
# Generate Go code with buf (recommended over protoc directly)
buf generate
```

### gRPC Server Implementation

```go
// internal/handler/grpc.go
package handler

import (
    "context"
    userv1 "github.com/myorg/myservice/api/proto/user/v1"
    "github.com/myorg/myservice/internal/domain"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    "google.golang.org/protobuf/types/known/timestamppb"
)

type UserGRPCHandler struct {
    userv1.UnimplementedUserServiceServer
    svc domain.UserService
}

func NewUserGRPCHandler(svc domain.UserService) *UserGRPCHandler {
    return &UserGRPCHandler{svc: svc}
}

func (h *UserGRPCHandler) CreateUser(ctx context.Context, req *userv1.CreateUserRequest) (*userv1.User, error) {
    user, err := h.svc.CreateUser(ctx, domain.CreateUserRequest{
        Name:  req.Name,
        Email: req.Email,
    })
    if err != nil {
        if errors.Is(err, domain.ErrEmailTaken) {
            return nil, status.Errorf(codes.AlreadyExists, "email already taken")
        }
        return nil, status.Errorf(codes.Internal, "failed to create user: %v", err)
    }
    return domainUserToProto(user), nil
}

func domainUserToProto(u *domain.User) *userv1.User {
    return &userv1.User{
        Id:        u.ID,
        Name:      u.Name,
        Email:     u.Email,
        CreatedAt: timestamppb.New(u.CreatedAt),
    }
}
```

---

## Graceful Shutdown

Every production Go service needs graceful shutdown to drain in-flight requests before exiting.

```go
// cmd/server/main.go
package main

import (
    "context"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

    srv := &http.Server{
        Addr:         ":8080",
        Handler:      buildRouter(),
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 30 * time.Second,
        IdleTimeout:  120 * time.Second,
    }

    // Start server in goroutine
    go func() {
        logger.Info("Server starting", "addr", srv.Addr)
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            logger.Error("Server failed", "error", err)
            os.Exit(1)
        }
    }()

    // Wait for signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
    <-quit

    logger.Info("Shutting down server...")

    // Allow 30 seconds for in-flight requests to complete
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        logger.Error("Server shutdown failed", "error", err)
    }

    logger.Info("Server stopped")
}
```

---

## Health Check Endpoints

Kubernetes requires `/healthz` (liveness) and `/readyz` (readiness) endpoints.

```go
package handler

import (
    "database/sql"
    "encoding/json"
    "net/http"
)

type HealthHandler struct {
    db *sql.DB
}

type HealthStatus struct {
    Status   string            `json:"status"`
    Checks   map[string]string `json:"checks,omitempty"`
    Version  string            `json:"version"`
}

// Liveness: is the process alive? (simple — just return 200)
func (h *HealthHandler) Liveness(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(HealthStatus{Status: "ok"})
}

// Readiness: is the service ready to serve traffic?
func (h *HealthHandler) Readiness(w http.ResponseWriter, r *http.Request) {
    checks := make(map[string]string)
    status := "ok"
    httpStatus := http.StatusOK

    // Check database
    if err := h.db.PingContext(r.Context()); err != nil {
        checks["database"] = "unhealthy: " + err.Error()
        status = "degraded"
        httpStatus = http.StatusServiceUnavailable
    } else {
        checks["database"] = "healthy"
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(httpStatus)
    json.NewEncoder(w).Encode(HealthStatus{
        Status:  status,
        Checks:  checks,
        Version: os.Getenv("APP_VERSION"),
    })
}
```

---

## Distributed Tracing with OpenTelemetry

```bash
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
```

```go
package observability

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func InitTracer(ctx context.Context, serviceName string) (*sdktrace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion(os.Getenv("APP_VERSION")),
        )),
        sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))),
    )
    otel.SetTracerProvider(tp)
    return tp, nil
}

// Use in handlers
tracer := otel.Tracer("myservice")

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    ctx, span := tracer.Start(r.Context(), "GetUser")
    defer span.End()

    span.SetAttributes(attribute.String("user.id", chi.URLParam(r, "id")))

    user, err := h.svc.GetUser(ctx, chi.URLParam(r, "id"))
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        http.Error(w, err.Error(), 500)
        return
    }
    json.NewEncoder(w).Encode(user)
}
```

---

## Circuit Breaker Pattern

```bash
go get github.com/sony/gobreaker
```

```go
package client

import (
    "github.com/sony/gobreaker"
    "time"
)

type UserClient struct {
    cb *gobreaker.CircuitBreaker
}

func NewUserClient() *UserClient {
    settings := gobreaker.Settings{
        Name:        "user-service",
        MaxRequests: 5,                     // allowed in half-open state
        Interval:    10 * time.Second,      // reset interval
        Timeout:     30 * time.Second,      // open → half-open timeout
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests >= 3 && failureRatio >= 0.6
        },
        OnStateChange: func(name string, from, to gobreaker.State) {
            slog.Info("Circuit breaker state change",
                "breaker", name,
                "from", from.String(),
                "to", to.String(),
            )
        },
    }
    return &UserClient{cb: gobreaker.NewCircuitBreaker(settings)}
}

func (c *UserClient) GetUser(ctx context.Context, id string) (*User, error) {
    result, err := c.cb.Execute(func() (interface{}, error) {
        return callUserService(ctx, id)
    })
    if err != nil {
        return nil, fmt.Errorf("user service call failed: %w", err)
    }
    return result.(*User), nil
}
```

---

## Structured Logging with slog

Go 1.21 introduced `log/slog` as the standard structured logger.

```go
import "log/slog"

// Setup in main
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
    AddSource: true,
}))
slog.SetDefault(logger)

// Usage
slog.Info("User created", "user_id", user.ID, "email", user.Email)
slog.Error("Database error", "error", err, "query", query)

// With context (request-scoped logger)
func loggerMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestLogger := slog.With(
            "request_id", r.Header.Get("X-Request-ID"),
            "method", r.Method,
            "path", r.URL.Path,
        )
        ctx := context.WithValue(r.Context(), loggerKey, requestLogger)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

---

## Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
        - name: user-service
          image: myorg/user-service:latest
          ports:
            - containerPort: 8080
            - containerPort: 9090  # gRPC
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: user-service-secrets
                  key: database-url
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              cpu: 100m
              memory: 64Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server ./cmd/server

FROM scratch
COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
EXPOSE 8080 9090
ENTRYPOINT ["/server"]
```

The `scratch` base image produces the smallest possible Docker image — typically 8-15MB for a Go microservice.

Go's ecosystem in 2026 makes building production microservices straightforward. The combination of gRPC, OpenTelemetry, gobreaker, and slog covers observability, reliability, and inter-service communication with minimal boilerplate.
