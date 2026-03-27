---
title: "eBPF and Linux Observability 2026: Cilium, Tetragon, Falco, and Production Tracing"
description: "Complete guide to eBPF-powered Linux observability in 2026. Learn eBPF fundamentals, Cilium networking, Tetragon security, Falco threat detection, Pixie profiling, network policies, and bpftrace for production tracing."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["ebpf", "linux", "observability", "cilium", "tetragon", "falco", "pixie", "bpftrace", "kubernetes", "security", "tracing"]
readingTime: "13 min read"
---

eBPF is the most significant Linux kernel technology in decades. It's changing how we do networking, security, and observability — and in 2026, it's the foundation of the best tools in the Kubernetes ecosystem.

This guide explains what eBPF actually is, why it's so transformative, and how to use the major eBPF-based tools: Cilium for networking, Tetragon for security observability, Falco for threat detection, Pixie for profiling, and bpftrace for hands-on kernel tracing.

---

## What Is eBPF?

eBPF (extended Berkeley Packet Filter) lets you run sandboxed programs inside the Linux kernel without modifying kernel source code or loading kernel modules.

Before eBPF, extending kernel behavior required:
- Writing a kernel module (dangerous, complex, requires kernel version compatibility)
- Patching the kernel (even more complex, requires recompilation)
- Using slow userspace hooks via `/proc` or netfilter

eBPF changes this. You write a small program in C (or Rust, or a higher-level eBPF-aware DSL), compile it to eBPF bytecode, and load it into the kernel at runtime. The kernel verifier checks that the program is safe (no infinite loops, no out-of-bounds memory access, no crashing the kernel), then a JIT compiler converts it to native machine code.

**eBPF programs can hook into:**
- Network packet processing (XDP, traffic control)
- System calls (tracepoints, kprobes)
- File system operations
- Process/thread lifecycle events
- Hardware performance counters
- User-space function calls (uprobes)

The result: you can observe and control almost any kernel behavior with near-zero overhead (often <1% CPU impact vs 5-20% for traditional tools).

---

## eBPF Architecture

```
User Space
┌────────────────────────────────────────────┐
│  eBPF Program (C/Rust) → LLVM → bytecode   │
│  User-space controller (libbpf/cilium-ebpf) │
│  Maps: shared memory between user/kernel    │
└──────────────────────┬─────────────────────┘
                       │ bpf() syscall
Kernel Space           ▼
┌────────────────────────────────────────────┐
│  Verifier → JIT Compiler → Native Code     │
│                                            │
│  Hook points:                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   XDP    │  │ kprobes  │  │tracepoint│ │
│  │ (NIC RX) │  │ (kernel  │  │ (sched,  │ │
│  │          │  │  funcs)  │  │ syscalls)│ │
│  └──────────┘  └──────────┘  └──────────┘ │
└────────────────────────────────────────────┘
```

**eBPF Maps** are the data structure for sharing state between eBPF programs and user space:

```c
// eBPF map definition in a kernel program
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key, u32);     // PID
    __type(value, u64);   // syscall count
} pid_syscall_count SEC(".maps");
```

From user space, you read these maps to get real-time data from the kernel.

---

## Writing an eBPF Program

Here's a minimal eBPF program that counts syscalls per PID:

```c
// count_syscalls.bpf.c
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 10240);
    __type(key, u32);
    __type(value, u64);
} syscall_count SEC(".maps");

SEC("tracepoint/raw_syscalls/sys_enter")
int count_syscall(struct trace_event_raw_sys_enter *ctx) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    u64 *count = bpf_map_lookup_elem(&syscall_count, &pid);

    if (count) {
        __sync_fetch_and_add(count, 1);
    } else {
        u64 initial = 1;
        bpf_map_update_elem(&syscall_count, &pid, &initial, BPF_ANY);
    }
    return 0;
}

char LICENSE[] SEC("license") = "GPL";
```

```c
// user-space controller (simplified)
#include <bpf/libbpf.h>

int main() {
    struct bpf_object *obj = bpf_object__open("count_syscalls.bpf.o");
    bpf_object__load(obj);

    int map_fd = bpf_object__find_map_fd_by_name(obj, "syscall_count");

    // Read the map periodically
    u32 pid;
    u64 count;
    while (bpf_map_get_next_key(map_fd, &prev_key, &pid) == 0) {
        bpf_map_lookup_elem(map_fd, &pid, &count);
        printf("PID %u: %llu syscalls\n", pid, count);
    }
}
```

Most teams don't write eBPF programs directly — they use higher-level tools built on eBPF. But understanding the architecture helps you understand what those tools are actually doing.

---

## Cilium: eBPF-Native Kubernetes Networking

Cilium is the leading Kubernetes CNI (Container Network Interface) plugin, built entirely on eBPF. It replaces iptables (which doesn't scale) with eBPF-based packet processing.

### Why Cilium Outperforms iptables-Based CNIs

Traditional Kubernetes networking (kube-proxy + iptables) processes every packet through a chain of iptables rules. At 10,000+ services and 50,000+ pods, iptables rule processing becomes a bottleneck. Adding a new service rule triggers a full iptables update, taking seconds and causing network hiccups.

Cilium's eBPF data plane:
- Uses BPF hash maps (O(1) lookup) instead of iptables chains (O(n) scan)
- Processes packets at XDP (eXpress Data Path) — before they enter the kernel network stack
- Can bypass kube-proxy entirely (Cilium kube-proxy replacement)
- Maintains consistent ~10μs per-packet latency regardless of cluster size

**Performance comparison (10,000 services):**
- iptables: ~500μs per packet, rule updates take 3-5s
- Cilium eBPF: ~10μs per packet, rule updates take milliseconds

### Installing Cilium

```bash
# Install cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
tar xzvfC cilium-linux-amd64.tar.gz /usr/local/bin

# Install Cilium (assumes Kubernetes cluster with no existing CNI)
cilium install --version 1.15.3

# Verify
cilium status
```

### Cilium Network Policies

Cilium extends Kubernetes NetworkPolicy with L7-aware policies:

```yaml
# Standard K8s NetworkPolicy — L3/L4 only (IP + port)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

```yaml
# CiliumNetworkPolicy — L7 aware (HTTP method + path)
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: http-policy
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - method: "GET"
          path: "/api/public/.*"
        - method: "POST"
          path: "/api/data"
          headers:
          - "X-Auth-Token: .*"
```

This policy allows only GET requests to `/api/public/*` and POST to `/api/data` with an auth header. All other HTTP methods and paths are dropped — at the kernel level, before they reach your application.

### Hubble: eBPF-Powered Network Observability

Hubble is Cilium's built-in observability layer. It provides:
- Real-time HTTP, gRPC, DNS, and TCP flow visibility
- Network topology maps
- Dropped packet debugging with exact drop reasons
- Golden signals (latency, error rates, throughput) per service

```bash
# Enable Hubble
cilium hubble enable --ui

# Real-time flow monitoring
hubble observe --follow

# Filter to specific namespace
hubble observe --namespace production --follow

# Filter to HTTP errors
hubble observe \
  --type l7 \
  --verdict DROPPED \
  --follow

# Example output:
# Mar 28 10:15:23.456 [FORWARDED] frontend → backend:8080
#   HTTP GET /api/users -> 200 (2ms)
# Mar 28 10:15:24.123 [DROPPED] unknown → backend:8080
#   HTTP POST /api/admin -> Policy denied
```

---

## Tetragon: Security Observability

Tetragon (also by Isovalent/Cilium) provides process-level security observability with eBPF. It answers: what is every process doing on my cluster, right now?

Tetragon can trace:
- Process execution (every exec() call, with full argument list)
- File access (opens, writes, reads on sensitive paths)
- Network connections (with process identity)
- Privilege escalation (capability changes, namespace transitions)

### Installing Tetragon

```bash
helm repo add cilium https://helm.cilium.io
helm repo update

helm install tetragon cilium/tetragon \
  -n kube-system
```

### TracingPolicy: Define What to Observe

```yaml
# Watch for sensitive file reads
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: file-access-policy
spec:
  kprobes:
  - call: "security_file_open"
    syscall: false
    args:
    - index: 0
      type: "file"
    selectors:
    - matchArgs:
      - index: 0
        operator: "Prefix"
        values:
        - "/etc/passwd"
        - "/etc/shadow"
        - "/etc/kubernetes/pki/"
        - "/var/run/secrets/"
      matchActions:
      - action: Sigkill  # Kill the process immediately
```

```yaml
# Detect privilege escalation
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: privesc-detect
spec:
  kprobes:
  - call: "commit_creds"
    syscall: false
    args:
    - index: 0
      type: "cred"
    selectors:
    - matchCapabilitySet:
        type: Effective
        operator: "In"
        values:
        - "CAP_SYS_ADMIN"
      matchActions:
      - action: Post  # Generate event (for SIEM)
```

### Tetragon CLI Output

```bash
# Watch process events in real time
kubectl exec -n kube-system ds/tetragon -c tetragon -- \
  tetra getevents -o compact --pods my-pod

# Example output:
# 🚀 process  default/my-pod  /bin/sh -c "ls /etc/passwd"
# 📋 open     default/my-pod  /bin/sh  /etc/passwd
# 💥 exit     default/my-pod  /bin/sh  0
```

---

## Falco: Runtime Threat Detection

Falco (CNCF project) is a runtime security tool that detects threats using rules. In 2026, Falco uses an eBPF driver by default (replacing the kernel module driver).

Falco continuously evaluates events against a rule set and alerts when suspicious behavior is detected.

### Installing Falco

```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

helm install falco falcosecurity/falco \
  --namespace falco --create-namespace \
  --set driver.kind=ebpf \
  --set falcosidekick.enabled=true \
  --set falcosidekick.config.slack.webhookurl="https://hooks.slack.com/..."
```

### Falco Rules

```yaml
# Custom rule: detect crypto mining
- rule: Cryptominer Execution
  desc: Detect execution of known crypto mining tools
  condition: >
    spawned_process and
    (proc.name in (xmrig, minerd, cpuminer, t-rex, nbminer) or
     proc.cmdline contains "--stratum" or
     proc.cmdline contains "mining.pool")
  output: >
    Possible crypto mining detected
    (user=%user.name command=%proc.cmdline
     container=%container.name image=%container.image.repository)
  priority: CRITICAL
  tags: [cryptomining, malware]

# Detect container escape attempt
- rule: Container Escape via Mounted Docker Socket
  desc: Detect process accessing host Docker socket from container
  condition: >
    open_read and
    container and
    fd.name = "/var/run/docker.sock"
  output: >
    Docker socket accessed from container
    (user=%user.name pid=%proc.pid
     container=%container.name)
  priority: WARNING
  tags: [container, escape]

# Detect kubectl exec into pods
- rule: Terminal Shell in Container
  desc: Detect interactive shell in container via kubectl exec
  condition: >
    spawned_process and
    container and
    shell_procs and
    proc.pname in (runc, containerd-shim, docker, kubectl)
  output: >
    Shell spawned in container via exec
    (user=%user.name shell=%proc.name
     container=%container.name pod=%k8s.pod.name)
  priority: NOTICE
```

### Falco Output to SIEM

Falco events can be forwarded to SIEM systems via falcosidekick:

```yaml
# falcosidekick config
falcosidekick:
  config:
    slack:
      webhookurl: "https://hooks.slack.com/services/..."
      minimumpriority: warning
    datadog:
      apikey: "your-dd-api-key"
      minimumpriority: notice
    elasticsearch:
      hostport: "https://elasticsearch:9200"
      index: "falco"
      minimumpriority: debug
```

---

## Pixie: Continuous Profiling and Auto-Instrumentation

Pixie provides instant profiling and debugging without code changes. It uses eBPF to capture:
- HTTP/gRPC/Kafka/MySQL/PostgreSQL traffic (with full request/response bodies)
- CPU flame graphs (continuous profiling)
- Memory allocation traces
- JVM/Python/Go runtime metrics

**The key advantage**: Zero instrumentation. No code changes, no SDK integration, no restart required.

```bash
# Install Pixie CLI
bash -c "$(curl -fsSL https://withpixie.ai/install.sh)"

# Deploy Pixie to your cluster
px deploy

# Run a live debugging script
px run px/http_data -- \
  --start_time -5m \
  --namespace production

# Output shows all HTTP traffic in the last 5 minutes:
# Time        Src IP        Dst IP        Method  Path              Status  Latency
# 10:15:23    10.0.1.5      10.0.2.3      GET     /api/users        200     15ms
# 10:15:24    10.0.1.5      10.0.2.3      POST    /api/orders       201     45ms
# 10:15:25    10.0.1.6      10.0.2.4      GET     /api/products     500     1200ms
```

### Pixie PxL Scripts

Pixie's query language (PxL) is Python-based and lets you write custom analyses:

```python
# Find the slowest gRPC endpoints in the last 10 minutes
import px

df = px.DataFrame(table='grpc_data', start_time='-10m')
df = df[df.latency > 0]
df.service = df.ctx['service']

# Group by endpoint and compute percentiles
df = df.groupby(['service', 'req_method', 'req_path']).agg(
    count=('latency', px.count),
    p50=('latency', px.percentile(50)),
    p99=('latency', px.percentile(99)),
)

df = df[df.count > 10]  # Filter low-traffic endpoints
df = df.sort(by='p99', ascending=False)
px.display(df, 'Slow gRPC Endpoints')
```

---

## bpftrace: The eBPF Power Tool

bpftrace is the scripting language for eBPF tracing. If you've used DTrace (Solaris/macOS), bpftrace is the Linux equivalent — and it's often the fastest way to answer "what is the kernel doing right now?"

### bpftrace Basics

```bash
# Install
apt install bpftrace

# Count syscalls by process name
bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# Trace all file opens
bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s: %s\n", comm, str(args->filename)); }'

# Histogram of write() sizes
bpftrace -e 'tracepoint:syscalls:sys_enter_write { @size = hist(args->count); }'

# Trace TCP connections (source + destination)
bpftrace -e '
kprobe:tcp_connect {
    $sk = (struct sock *)arg0;
    printf("%s -> %s:%d\n",
        comm,
        ntop($sk->__sk_common.skc_daddr),
        $sk->__sk_common.skc_dport >> 8 | ($sk->__sk_common.skc_dport << 8) & 0xffff
    );
}'
```

### Practical bpftrace Scripts for Production Debugging

**Identify slow disk I/O:**

```bash
bpftrace -e '
kprobe:blk_account_io_start { @start[arg0] = nsecs; }
kprobe:blk_account_io_done
/@start[arg0]/
{
    @usecs = hist((nsecs - @start[arg0]) / 1000);
    delete(@start[arg0]);
}
END { clear(@start); }'
```

**Find memory allocations by size:**

```bash
bpftrace -e '
uprobe:/lib/x86_64-linux-gnu/libc.so.6:malloc { @bytes = hist(arg0); }
END { clear(@bytes); }'
```

**Trace database queries (PostgreSQL):**

```bash
bpftrace -e '
usdt:/usr/lib/postgresql/16/bin/postgres:query__start {
    printf("%s\n", str(arg0));
}'
```

---

## eBPF Security Best Practices

eBPF programs run in the kernel — they're powerful, and they need to be managed carefully.

**Access control:**
- Only grant `CAP_BPF` capability (or `CAP_SYS_ADMIN` on older kernels) to processes that need to load eBPF programs
- Use Kubernetes RBAC to limit which pods can run privileged containers with eBPF access
- Audit eBPF program loading with Tetragon

**Falco rule for unauthorized eBPF loading:**

```yaml
- rule: Unauthorized eBPF Program Load
  desc: Detect eBPF program loading from unexpected processes
  condition: >
    syscall.type = bpf and
    evt.arg[0] in (BPF_PROG_LOAD, BPF_MAP_CREATE) and
    not proc.name in (cilium-agent, tetragon, falco, bpftrace)
  output: >
    Unauthorized eBPF operation
    (user=%user.name proc=%proc.name pid=%proc.pid)
  priority: WARNING
```

---

## Building a Complete eBPF Observability Stack

A production-ready eBPF observability stack for Kubernetes:

```
┌─────────────────────────────────────────────────────────┐
│                    Grafana Dashboards                    │
├────────────────┬────────────────┬───────────────────────┤
│   Prometheus   │   Elasticsearch │     Slack/PagerDuty  │
│  (metrics)     │    (events)     │      (alerting)       │
├────────────────┴────────────────┴───────────────────────┤
│                  Hubble  │  Falcosidekick                │
├─────────────────────────┴───────────────────────────────┤
│  Cilium (networking)  │  Tetragon (security)             │
│  Hubble (flows)       │  Falco (threat detection)        │
│                       │  Pixie (profiling)               │
├───────────────────────┴─────────────────────────────────┤
│                    eBPF Kernel Layer                     │
└─────────────────────────────────────────────────────────┘
```

Each tool occupies a distinct role:
- **Cilium**: Networking, network policy, load balancing
- **Hubble**: Network flow visibility, L7 observability
- **Tetragon**: Process and file security observability
- **Falco**: Rule-based threat detection and alerting
- **Pixie**: Application-level profiling without code changes
- **bpftrace**: Ad-hoc investigative tracing by operators

---

## Summary

eBPF has fundamentally changed what's possible for Linux observability and security. The tooling in 2026 — Cilium, Tetragon, Falco, Pixie — provides capabilities that were simply impossible with userspace instrumentation: zero-overhead packet filtering, process-level security visibility, and automatic application tracing without SDK integration.

The entry point for most teams is Cilium. Replace your existing CNI, get eBPF-based networking and L7 policy, and enable Hubble for network observability. From there, add Tetragon for process security visibility and Falco for threat detection. Use Pixie for debugging sessions when you need deep application insight without deploying additional instrumentation.

**Key takeaways:**
- eBPF programs run in the kernel with <1% overhead vs 5-20% for traditional userspace tools
- Cilium replaces iptables with O(1) BPF hash maps — critical at 10,000+ services
- CiliumNetworkPolicy enables L7-aware policies (HTTP method + path) that iptables can't do
- Tetragon can kill processes accessing sensitive files at the kernel level before syscalls complete
- Falco rules detect container escapes, crypto miners, and privilege escalation in real time
- Pixie provides full HTTP/gRPC/SQL tracing without any code instrumentation
- bpftrace is the power tool for one-off kernel tracing investigations
