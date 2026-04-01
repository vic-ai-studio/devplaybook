---
title: "Best Go Developer Tools 2026: golangci-lint, delve, air & More"
description: "Best Go developer tools 2026: golangci-lint for linting, delve debugger, air for live reload, gopls LSP, pprof profiling, govulncheck, and essential Go toolchain commands."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Go", "Golang", "developer tools", "golangci-lint", "delve", "air", "pprof"]
readingTime: "9 min read"
category: "golang"
---

Go's tooling philosophy is "batteries included" — the standard toolchain ships with testing, formatting, benchmarking, and profiling built in. The community has built on top of this foundation with excellent tools for linting, live reload, debugging, and release automation. Here's the complete toolkit for productive Go development in 2026.

## Core Go Toolchain Commands

The `go` command is your primary interface for everything from building to module management.

```bash
# Build and run
go build ./...              # build all packages
go build -o myapp ./cmd/server  # build to specific output
go run ./cmd/server         # build and run
go run -race ./cmd/server   # run with race detector

# Testing
go test ./...               # run all tests
go test -v ./...            # verbose output
go test -run TestUserCreate ./...   # run specific test
go test -count=1 ./...      # disable test caching
go test -race ./...         # test with race detector
go test -cover ./...        # show coverage
go test -coverprofile=coverage.out ./...  # coverage report
go tool cover -html=coverage.out          # view in browser

# Benchmarking
go test -bench=. ./...
go test -bench=BenchmarkHash -benchmem ./...  # include memory stats
go test -bench=. -benchtime=10s ./...         # longer benchmark

# Code quality
go vet ./...                # static analysis (built-in)
go fmt ./...                # format all files
gofmt -l .                  # list files needing formatting

# Module management
go mod init github.com/user/project
go mod tidy                 # add missing, remove unused deps
go mod download             # download all deps
go mod verify               # verify deps haven't changed
go list -m all              # list all dependencies
go mod graph | grep mylib   # visualize dep graph

# Documentation
go doc fmt.Println
go doc -all net/http        # all docs for package
```

---

## golangci-lint: The Meta-Linter

`golangci-lint` runs 50+ linters in parallel with a single command. It's the standard for Go linting in production projects.

```bash
# Install (use binary install, not go install)
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh \
  | sh -s -- -b $(go env GOPATH)/bin v1.62.0

golangci-lint run                  # lint with default config
golangci-lint run --fix            # auto-fix where possible
golangci-lint run ./...            # explicit all packages
golangci-lint run --timeout 5m     # for large repos
```

### .golangci.yml Configuration

```yaml
# .golangci.yml
linters-settings:
  errcheck:
    check-type-assertions: true
    check-blank: true
  govet:
    enable-all: true
  gocyclo:
    min-complexity: 15
  goimports:
    local-prefixes: github.com/yourorg/yourproject
  gosec:
    severity: medium
  revive:
    rules:
      - name: exported
      - name: error-return
      - name: error-naming

linters:
  enable:
    - errcheck        # check error returns
    - govet           # go vet checks
    - staticcheck     # advanced static analysis
    - gosimple        # simplification suggestions
    - unused          # unused code detection
    - goimports       # import organization
    - gofmt           # formatting
    - gocyclo         # cyclomatic complexity
    - gosec           # security issues
    - revive          # opinionated linter
    - bodyclose       # HTTP response body close check
    - noctx           # HTTP requests without context
    - prealloc        # slice preallocation suggestions

issues:
  exclude-rules:
    - path: _test\.go
      linters:
        - gosec       # less strict in tests
  max-issues-per-linter: 0
  max-same-issues: 0

run:
  timeout: 5m
  go: "1.23"
```

**CI integration:**

```yaml
- name: Lint
  uses: golangci/golangci-lint-action@v6
  with:
    version: v1.62
    args: --timeout=5m
```

---

## delve: The Go Debugger

`dlv` (delve) is the standard Go debugger, integrated into VS Code, GoLand, and Neovim via DAP.

```bash
go install github.com/go-delve/delve/cmd/dlv@latest

# Debug a binary
dlv debug ./cmd/server

# Debug with arguments
dlv debug ./cmd/server -- --port 8080

# Debug a specific test
dlv test ./pkg/auth -- -test.run TestLogin

# Attach to a running process
dlv attach <pid>

# Remote debugging (for Docker/Kubernetes)
dlv debug --headless --listen=:2345 --api-version=2 ./cmd/server
```

**dlv commands (inside the debugger):**

```
(dlv) break main.main          # set breakpoint
(dlv) break auth.go:45         # break at file:line
(dlv) continue                 # run to next breakpoint
(dlv) next                     # step over
(dlv) step                     # step into
(dlv) stepout                  # step out of function
(dlv) print variableName       # inspect variable
(dlv) locals                   # show all local variables
(dlv) goroutines               # list all goroutines
(dlv) goroutine 5              # switch to goroutine 5
(dlv) stack                    # show call stack
(dlv) watch variableName       # watch variable changes
```

**VS Code launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Server",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/cmd/server",
      "env": {"GIN_MODE": "debug"},
      "args": ["--port", "8080"]
    }
  ]
}
```

---

## air: Live Reload for Go

`air` watches your files and rebuilds/restarts your server automatically. Essential for web development.

```bash
go install github.com/air-verse/air@latest
air init          # generate .air.toml
air               # start with live reload
```

### .air.toml Configuration

```toml
root = "."
testdata_dir = "testdata"
tmp_dir = "tmp"

[build]
args_bin = []
bin = "./tmp/main"
cmd = "go build -o ./tmp/main ./cmd/server"
delay = 1000                # delay before rebuild (ms)
exclude_dir = ["assets", "tmp", "vendor", "testdata"]
exclude_file = []
exclude_regex = ["_test.go"]
exclude_unchanged = false
follow_symlink = false
include_dir = []
include_ext = ["go", "tpl", "tmpl", "html", "env"]
include_file = []
kill_delay = "0s"
log = "build-errors.log"
poll = false
poll_interval = 0
rerun = false
send_interrupt = false
stop_on_error = false

[color]
app = ""
build = "yellow"
main = "magenta"
runner = "green"
watcher = "cyan"

[log]
main_only = false
time = false

[misc]
clean_on_exit = false
```

---

## gopls: The Language Server

`gopls` is the official Go language server powering autocomplete, hover docs, and refactoring in all major editors.

```bash
go install golang.org/x/tools/gopls@latest
```

**VS Code settings.json:**

```json
{
  "go.useLanguageServer": true,
  "gopls": {
    "ui.semanticTokens": true,
    "ui.completion.usePlaceholders": true,
    "ui.documentation.hoverKind": "FullDocumentation",
    "analyses": {
      "unusedparams": true,
      "shadow": true,
      "fieldalignment": true
    },
    "staticcheck": true,
    "hints": {
      "parameterNames": true,
      "assignVariableTypes": true,
      "compositeLiteralFields": true,
      "compositeLiteralTypes": true,
      "constantValues": true,
      "functionTypeParameters": true,
      "rangeVariableTypes": true
    }
  }
}
```

---

## pprof: CPU and Memory Profiling

Go's built-in `pprof` is one of the best profiling tools in any language ecosystem.

```go
// Add to any HTTP server for live profiling:
import _ "net/http/pprof"

// In main:
go func() {
    log.Println(http.ListenAndServe("localhost:6060", nil))
}()
```

```bash
# Capture CPU profile (30 seconds)
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Capture heap profile
go tool pprof http://localhost:6060/debug/pprof/heap

# Capture goroutine profile
go tool pprof http://localhost:6060/debug/pprof/goroutine

# Interactive pprof shell
(pprof) top10          # top 10 functions by CPU
(pprof) web            # open flame graph in browser
(pprof) list FuncName  # source with annotation
(pprof) traces         # show call traces
```

**For test-based profiling:**

```bash
go test -cpuprofile=cpu.prof -memprofile=mem.prof -bench=BenchmarkFoo ./...
go tool pprof cpu.prof
go tool pprof mem.prof
```

---

## govulncheck: Security Vulnerability Scanning

```bash
go install golang.org/x/vuln/cmd/govulncheck@latest

govulncheck ./...          # scan your codebase
govulncheck -json ./...    # machine-readable output
```

Unlike `go list -m all`, govulncheck only reports vulnerabilities in code paths that are actually reachable — far fewer false positives.

---

## goreleaser: Release Automation

```bash
go install github.com/goreleaser/goreleaser/v2@latest

goreleaser init       # generate .goreleaser.yml
goreleaser build --snapshot --clean  # test build
goreleaser release --clean           # release to GitHub
```

```yaml
# .goreleaser.yml
builds:
  - main: ./cmd/server
    binary: myapp
    goos: [linux, darwin, windows]
    goarch: [amd64, arm64]
    ldflags:
      - -s -w
      - -X main.version={{.Version}}

archives:
  - format: tar.gz
    format_overrides:
      - goos: windows
        format: zip

checksum:
  name_template: "checksums.txt"

release:
  github:
    owner: yourorg
    name: yourrepo
```

---

## staticcheck: Advanced Static Analysis

```bash
go install honnef.co/go/tools/cmd/staticcheck@latest
staticcheck ./...
```

staticcheck catches bugs that `go vet` misses: incorrect usage of `sync.Mutex`, redundant code, deprecated API usage, and more.

---

## Tool Reference Card

| Tool | Install | Use Case |
|------|---------|---------|
| `go vet` | Built-in | Basic static analysis |
| `golangci-lint` | Binary install | Meta-linter (50+ linters) |
| `delve` | `go install` | Debugging |
| `air` | `go install` | Live reload |
| `gopls` | `go install` | Language server |
| `pprof` | Built-in | CPU/memory profiling |
| `govulncheck` | `go install` | Security scanning |
| `goreleaser` | Binary install | Release automation |
| `staticcheck` | `go install` | Advanced static analysis |

Go's toolchain philosophy — fast, opinionated, built-in — means you spend less time configuring tools and more time writing code. The additions like golangci-lint and air fill the remaining gaps for a complete developer workflow.
