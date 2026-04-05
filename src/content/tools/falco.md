---
title: "Falco — Cloud-Native Runtime Security for Kubernetes"
description: "Falco is the open-source runtime security tool for Kubernetes — detects threats and anomalous behavior in real time via eBPF system call monitoring."
category: "Security"
pricing: "Free / Open Source"
pricingDetail: "Falco is 100% free and open-source (Apache 2.0). Sysdig offers enterprise features and managed deployment."
website: "https://falco.org"
github: "https://github.com/falcosecurity/falco"
tags: ["security", "kubernetes", "runtime-security", "ebpf", "threat-detection", "cloud-native", "cncf", "devsecops"]
pros:
  - "Real-time threat detection: catches attacks as they happen, not just in static analysis"
  - "eBPF-based (kernel module optional): low overhead, high visibility into system calls"
  - "Rich rule library: hundreds of pre-built rules for common attacks and compliance"
  - "CNCF incubating project with strong community and commercial support (Sysdig)"
  - "Cloud-agnostic: works on any Kubernetes cluster, EC2 instances, bare metal"
cons:
  - "High alert volume initially — requires significant tuning to reduce false positives"
  - "Complex rule language (Sysdig Filtering Syntax) has a learning curve"
  - "Kernel module or eBPF driver required — may conflict with some managed Kubernetes environments"
  - "Alert forwarding and SIEM integration requires additional configuration"
date: "2026-04-02"
---

## What is Falco?

Falco is the de facto open-source standard for cloud-native runtime security. Created by Sysdig and donated to the CNCF, Falco uses eBPF (extended Berkeley Packet Filter) to tap into the Linux kernel's system call interface, giving it deep visibility into what's actually happening inside containers and Kubernetes pods at runtime.

While tools like Trivy and Snyk catch vulnerabilities before deployment, Falco protects your running workloads. It detects:

- **Privilege escalation**: A process spawning a shell inside a container
- **Data exfiltration**: Unexpected network connections to external IPs
- **Credential theft**: Reads to `/etc/shadow` or `.aws/credentials`
- **Container escape**: Attempts to access the host filesystem
- **Cryptocurrency mining**: Unexpected CPU-intensive processes

## Quick Start

```bash
# Install Falco via Helm (recommended for Kubernetes)
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --set tty=true

# View alerts
kubectl logs -l app.kubernetes.io/name=falco -n falco

# Example alert:
# 10:23:45.123456789: Warning Shell spawned in a container
# (user=root user_loginuid=-1 container_id=abc123
# image=nginx:1.25 shell=sh parent=nginx cmdline=sh -i)
```

## Core Architecture

Falco runs as a DaemonSet on every node in your cluster. It uses:

1. **eBPF probe** (recommended): Loads a BPF program into the kernel to capture system calls. Low overhead, no kernel module required.
2. **Kernel module** (legacy): Direct kernel module for older environments.
3. **Modern eBPF** (preferred 2024+): Uses CO-RE (Compile Once, Run Everywhere) — no kernel headers required.

System calls flow through the Falco engine, which evaluates them against rules. Matching events trigger alerts sent to configured outputs (stdout, syslog, webhook, Slack, Falcosidekick).

## Writing Falco Rules

Falco rules are written in YAML with a Sysdig filter syntax:

```yaml
# Custom rule: detect curl/wget in containers
- rule: Unexpected outbound network tool execution
  desc: Detects network tools running inside containers that shouldn't need them
  condition: >
    spawned_process and container and
    proc.name in (curl, wget, nc, ncat, netcat) and
    not proc.pname in (known-network-tools)
  output: >
    Network tool execution in container
    (user=%user.name container=%container.name
    image=%container.image.repository proc=%proc.name
    cmdline=%proc.cmdline)
  priority: WARNING
  tags: [network, mitre_discovery]
```

### Built-in Rule Categories

Falco ships with rules covering:

- **Shell execution in containers** — `proc.name in (bash, sh, zsh)` inside a production container
- **Write to sensitive directories** — Writes to `/etc`, `/usr/bin`, `/proc`
- **Read sensitive files** — Access to `/etc/passwd`, `/etc/shadow`, SSH keys
- **Container privilege escalation** — Process gaining capabilities it shouldn't have
- **Unexpected Kubernetes API server calls** — Pods accessing the k8s API without expected service accounts
- **Outbound connections to unexpected destinations** — Detecting C2 (command-and-control) communication

## Falcosidekick: Alert Routing

Falcosidekick is a companion tool that routes Falco alerts to 50+ destinations:

```yaml
# falcosidekick helm values
falcosidekick:
  enabled: true
  config:
    slack:
      webhookurl: "https://hooks.slack.com/services/..."
      minimumpriority: WARNING
    pagerduty:
      routingkey: "your-pagerduty-routing-key"
      minimumpriority: CRITICAL
    elasticsearch:
      hostport: "http://elasticsearch:9200"
    prometheus:
      # Exposes metrics at /metrics for Grafana dashboards
```

## Kubernetes Audit Log Integration

Falco can also analyze Kubernetes audit logs for API-level threats:

```yaml
# Rules for Kubernetes audit events
- rule: Create Sensitive Mount Pod
  desc: Pod created with sensitive host path mount
  condition: >
    ka.verb=create and ka.target.resource=pods and
    ka.req.pod.volumes.hostpath intersects (/proc, /sys, /dev)
  output: >
    Sensitive mount pod created
    (user=%ka.user.name pod=%ka.resp.name
    ns=%ka.target.namespace mounts=%ka.req.pod.volumes.hostpath)
  priority: WARNING
```

## Common Tuning Patterns

Falco requires tuning to reduce noise. Common patterns:

```yaml
# Suppress alerts for known-good processes
- macro: known_network_tools
  condition: >
    proc.pname in (healthcheck.sh, monitoring-agent, curl-probe)

# Exclude system namespaces from certain rules
- macro: system_namespace
  condition: >
    k8s.ns.name in (kube-system, kube-public, falco, monitoring)

# Allow specific containers to use shell
- list: shell_spawning_containers
  items: [debug-tools, init-container]
```

## Integration with Security Stack

Falco fits into a layered security architecture:

```
Build time: Trivy/Snyk (vulnerability scanning)
       ↓
Deploy time: OPA/Kyverno (policy enforcement)
       ↓
Runtime: Falco (threat detection)
       ↓
Response: PagerDuty/Slack (alerting) → SIEM (forensics)
```

Falco covers the runtime layer that static analysis tools can't reach. A vulnerability scanner won't detect an attacker who exploits a zero-day; Falco will detect the shell they spawn afterward.

## Compliance Use Cases

Falco rules map to compliance frameworks:
- **PCI DSS**: Monitor access to cardholder data environments
- **SOC 2**: Detect unauthorized access to production systems
- **NIST**: System activity logging and anomaly detection
- **CIS Kubernetes Benchmark**: Monitor cluster configuration changes
