---
title: "Cilium"
description: "eBPF-powered networking, observability, and security for Kubernetes with high performance and deep kernel-level visibility"
category: "cloud-native"
tags: ["kubernetes", "devops", "networking", "security", "ebpf", "cloud"]
pricing: "Open Source"
website: "https://cilium.io"
github: "https://github.com/cilium/cilium"
date: "2026-04-03"
pros:
  - "eBPF dataplane delivers significantly lower latency and higher throughput than iptables-based CNIs"
  - "Hubble provides deep L3/L4/L7 network observability without additional tooling"
  - "Can replace kube-proxy, service mesh sidecars, and CNI plugin in a single solution"
  - "CNCF graduated with backing from major cloud providers including AWS, Google, and Azure"
cons:
  - "Requires Linux kernel 4.19+ with eBPF support, limiting compatibility with older systems"
  - "Steep learning curve due to the breadth of features (CNI, service mesh, observability)"
  - "Migrating from an existing CNI plugin to Cilium requires careful planning and cluster downtime"
---

## Cilium: eBPF-Based Networking and Security

Cilium is an open source CNCF graduated project that provides networking, observability, and security for Kubernetes workloads using eBPF (extended Berkeley Packet Filter). By executing programs directly in the Linux kernel, Cilium achieves significantly higher performance and deeper visibility than traditional network plugins based on iptables.

## Key Features

- **eBPF dataplane**: Bypasses iptables entirely for packet forwarding, delivering lower latency and higher throughput at scale
- **Network policies**: Kubernetes NetworkPolicy support plus Cilium's own CiliumNetworkPolicy for Layer 7 (HTTP, gRPC, Kafka) policy enforcement
- **Hubble observability**: Built-in distributed networking observability with a UI and CLI for real-time flow visibility across the entire cluster
- **Service mesh replacement**: Cilium Service Mesh eliminates Envoy sidecars by offloading mTLS and L7 policy to the kernel via eBPF
- **BGP support**: Native BGP peering for advertising service IPs and load balancer addresses to upstream routers
- **kube-proxy replacement**: Replace kube-proxy entirely for faster service load balancing using eBPF maps
- **Cluster mesh**: Connect multiple Kubernetes clusters at the network level with shared service discovery and policies
- **Transparent encryption**: WireGuard or IPsec-based node-to-node encryption without sidecar proxies

## Use Cases

- **High-performance networking**: Replace iptables-based CNI plugins in large clusters where iptables rule explosion causes performance degradation
- **Deep network visibility**: Use Hubble to trace every L3/L4/L7 flow, identify misconfigurations, and debug connectivity issues
- **Zero-trust microsegmentation**: Enforce fine-grained Layer 7 policies (allow only GET /api/v1/health between specific services)
- **Sidecar-less service mesh**: Achieve mTLS and observability without injecting Envoy proxies into every pod
- **Multi-cluster networking**: Federate services across clusters with shared DNS and network policies using Cluster Mesh

## Quick Start

Install Cilium as the CNI plugin using Helm:

```bash
# Install the Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
sudo tar xzvfC cilium-linux-amd64.tar.gz /usr/local/bin

# Install Cilium in your cluster (e.g., on kubeadm)
cilium install --version 1.15.0

# Enable Hubble for observability
cilium hubble enable --ui

# Check status
cilium status --wait
```

Define a Layer 7 network policy (HTTP-aware):

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-api-get-only
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: my-api
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
              - method: GET
                path: /api/v1/.*
```

Enable kube-proxy replacement and WireGuard encryption:

```yaml
# values.yaml for Helm install
kubeProxyReplacement: strict
encryption:
  enabled: true
  type: wireguard
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true
```

Use Hubble CLI to observe flows in real time:

```bash
# Watch all flows in the production namespace
hubble observe --namespace production --follow

# Filter by pod and protocol
hubble observe \
  --from-pod production/frontend \
  --to-pod production/my-api \
  --protocol http

# View the Hubble UI
cilium hubble ui
```

## Comparison with Alternatives

| Feature | Cilium | Calico | Flannel | WeaveNet |
|---|---|---|---|---|
| Dataplane | eBPF | iptables/eBPF | iptables | iptables |
| L7 policy | Yes | Limited | No | No |
| Observability | Hubble (built-in) | Limited | None | None |
| Service mesh | Yes (sidecar-free) | No | No | No |
| BGP support | Yes | Yes | No | No |
| Performance at scale | Excellent | Good | Moderate | Moderate |

**vs Calico**: Calico is the most widely deployed CNI and offers excellent network policy support. Cilium surpasses it with eBPF performance at scale, native L7 policy, and Hubble observability. Calico has added eBPF support but Cilium's eBPF implementation is more mature and feature-rich.

**vs Flannel**: Flannel is simple and reliable but provides only basic Layer 3 networking with no network policy support. Cilium is strictly superior for any production cluster needing security policies or observability.

Cilium is the leading CNI for performance-sensitive, security-conscious Kubernetes deployments, and has become the default CNI for major managed Kubernetes platforms including Google GKE and AWS EKS-A.
