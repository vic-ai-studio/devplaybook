---
title: "Colima"
description: "Free, minimal container runtime for macOS and Linux — run Docker and containerd without Docker Desktop, using Lima VMs under the hood."
category: "Documentation & DX Tools"
pricing: "Free"
pricingDetail: "Open source (MIT)"
website: "https://github.com/abiosoft/colima"
github: "https://github.com/abiosoft/colima"
tags: ["docker", "containers", "macos", "developer-tools", "open-source", "devex", "container-runtime", "kubernetes"]
pros:
  - "Free alternative to Docker Desktop (which requires paid license for companies >250 employees)"
  - "Native Apple Silicon (M1/M2/M3) support with Rosetta x86 emulation"
  - "Multiple runtimes: Docker (default), containerd, Kubernetes"
  - "Configurable CPU/RAM/disk allocation per profile"
  - "Rootless containers supported for security"
cons:
  - "CLI-only — no GUI like Docker Desktop"
  - "Some Docker Desktop features not available (Dev Environments, Docker Extensions)"
  - "Occasional quirks with volume mounts vs Docker Desktop"
  - "Less polished DX for new Docker users"
date: "2026-04-02"
---

## Overview

Colima (Containers in Lima) is the most popular Docker Desktop replacement on macOS. When Docker Inc. changed their licensing to require paid subscriptions for companies with 250+ employees, many engineering teams switched to Colima. It runs Docker Engine (or containerd) inside a Lima VM, giving you a full Docker-compatible CLI experience for free.

## Installation

```bash
# Install Colima and Docker CLI (no Docker Desktop)
brew install colima docker docker-compose

# Start Colima with default settings
colima start

# Verify Docker works
docker run hello-world
```

## Configuration

```bash
# Start with custom resources
colima start --cpu 4 --memory 8 --disk 60

# Apple Silicon with x86 emulation (for amd64 images)
colima start --arch x86_64 --vm-type vz

# Apple Silicon native (faster, for arm64 images)
colima start --arch aarch64 --vm-type vz

# With Kubernetes included
colima start --with-kubernetes
```

## Multiple Profiles

Run different environments simultaneously:

```bash
# Create a high-resource profile for heavy workloads
colima start --profile heavy --cpu 8 --memory 16

# Switch Docker context to use it
docker context use colima-heavy

# Back to default
docker context use colima

# List all profiles
colima list
```

## Kubernetes Support

```bash
# Start Colima with built-in K3s (lightweight Kubernetes)
colima start --with-kubernetes

# kubectl works automatically
kubectl get nodes
# NAME       STATUS   ROLES                  AGE
# colima     Ready    control-plane,master   1m

# Deploy a pod
kubectl run nginx --image=nginx
```

## Config File

Persist settings in `~/.colima/default/colima.yaml`:

```yaml
# ~/.colima/default/colima.yaml
cpu: 4
memory: 8
disk: 60
arch: host
runtime: docker
kubernetes:
  enabled: false
vmType: vz  # Apple Virtualization Framework (faster on M-series)
rosetta: true  # x86 emulation via Rosetta
```

## Colima vs Docker Desktop

| | Colima | Docker Desktop |
|--|--------|----------------|
| Cost | Free | Free (personal) / Paid (business) |
| GUI | ❌ | ✅ |
| Apple Silicon | ✅ | ✅ |
| Kubernetes | ✅ (K3s) | ✅ (K3s) |
| Extensions | ❌ | ✅ |
| Dev Environments | ❌ | ✅ |
| Resource usage | Lower | Higher |

For most backend developers who only need `docker run` and `docker compose up`, Colima is a drop-in replacement that starts faster and uses less memory.
