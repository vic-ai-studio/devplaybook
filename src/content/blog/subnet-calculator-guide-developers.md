---
title: "Subnet Calculator for Developers: CIDR, IP Ranges, and Network Planning"
description: "Use a subnet calculator to compute CIDR ranges, usable hosts, network/broadcast addresses instantly. Practical guide for developers working with AWS VPCs, Docker networks, and bare metal."
date: "2026-03-24"
tags: ["networking", "devops", "aws", "cidr", "developer-tools"]
readingTime: "8 min read"
---

# Subnet Calculator for Developers: CIDR, IP Ranges, and Network Planning

Subnetting is one of those networking skills you don't use daily but need to get right when you do. Miscalculated CIDR ranges cause VPC conflicts, Docker network collisions, and firewall rules that block the wrong traffic. A subnet calculator eliminates the manual math.

## What Does a Subnet Calculator Tell You?

The [DevPlaybook Subnet Calculator](/tools/subnet-calculator) takes any IP address in CIDR notation and returns:

- Network address (first address in the range)
- Broadcast address (last address)
- First and last usable host IPs
- Total number of hosts
- Subnet mask in dotted decimal
- Binary representation

Enter `192.168.1.0/24` and you get: 254 usable hosts, range 192.168.1.1 – 192.168.1.254.

## Understanding CIDR Notation

CIDR (Classless Inter-Domain Routing) notation specifies an IP range with a prefix length: `10.0.0.0/16`.

The prefix length (after the `/`) tells you how many bits are fixed:
- `/8` = 255.0.0.0 mask = 16,777,216 addresses
- `/16` = 255.255.0.0 mask = 65,536 addresses
- `/24` = 255.255.255.0 mask = 256 addresses (254 usable)
- `/28` = 255.255.255.240 mask = 16 addresses (14 usable)
- `/32` = single host

The formula for usable hosts: `2^(32 - prefix) - 2` (subtract network and broadcast addresses).

## Common Subnets at a Glance

| CIDR | Usable Hosts | Subnet Mask | Common Use |
|------|-------------|-------------|------------|
| /8 | 16,777,214 | 255.0.0.0 | Large enterprise |
| /16 | 65,534 | 255.255.0.0 | VPC main range |
| /20 | 4,094 | 255.255.240.0 | AWS default VPC subnet |
| /24 | 254 | 255.255.255.0 | Standard office/subnet |
| /26 | 62 | 255.255.255.192 | Small service subnet |
| /27 | 30 | 255.255.255.224 | DMZ or management |
| /28 | 14 | 255.255.255.240 | Small team or single service |
| /29 | 6 | 255.255.255.248 | Point-to-point links |
| /30 | 2 | 255.255.255.252 | Router-to-router |
| /32 | 1 | 255.255.255.255 | Single host |

## AWS VPC Subnetting

AWS VPCs require CIDR planning upfront. AWS reserves 5 IPs in every subnet (first 4 and last 1), so factor that in.

### Typical VPC Layout

```
VPC: 10.0.0.0/16 (65,534 addresses)

Public subnets (one per AZ):
  10.0.0.0/24   - us-east-1a (251 usable after AWS reserves)
  10.0.1.0/24   - us-east-1b
  10.0.2.0/24   - us-east-1c

Private subnets:
  10.0.10.0/24  - us-east-1a
  10.0.11.0/24  - us-east-1b
  10.0.12.0/24  - us-east-1c

Database subnets:
  10.0.20.0/28  - us-east-1a (11 usable)
  10.0.20.16/28 - us-east-1b
  10.0.20.32/28 - us-east-1c
```

**Tip:** Leave gaps between subnets for future expansion. Using /24 blocks and numbering them in tens (0, 10, 20) is a common pattern.

### VPC Peering and CIDR Conflicts

When peering VPCs, their CIDR ranges cannot overlap. If VPC A is `10.0.0.0/16` and VPC B is `10.0.0.0/16`, you can't peer them.

Plan VPC CIDRs per environment:
- Production: `10.0.0.0/16`
- Staging: `10.1.0.0/16`
- Development: `10.2.0.0/16`

## Docker Network Subnets

Docker creates networks with default subnets. `docker network create` uses `172.17.0.0/16` by default, but this can conflict with existing networks.

```bash
# Create a network with explicit CIDR
docker network create --subnet 10.20.0.0/24 my-app-network

# Docker Compose
networks:
  backend:
    ipam:
      config:
        - subnet: 10.20.0.0/24
```

When running Docker on cloud VMs, check that Docker's default `172.17.0.0/16` doesn't conflict with your VPC CIDR or on-premise networks.

## Private IP Ranges

IPv4 private address ranges (RFC 1918) — these are the ranges you use for internal networks:

| Range | CIDR | Addresses |
|-------|------|-----------|
| 10.0.0.0 – 10.255.255.255 | 10.0.0.0/8 | 16.7 million |
| 172.16.0.0 – 172.31.255.255 | 172.16.0.0/12 | 1 million |
| 192.168.0.0 – 192.168.255.255 | 192.168.0.0/16 | 65,536 |

These addresses are not routed on the public internet. NAT translates them to public IPs at the gateway.

## Checking If Two Subnets Overlap

Use the subnet calculator to check for overlaps:

1. Calculate the range of the first subnet (network + broadcast address)
2. Calculate the range of the second subnet
3. If either range contains addresses from the other, they overlap

Example: Does `10.0.0.0/24` overlap with `10.0.0.128/26`?
- `/24` range: 10.0.0.0 – 10.0.0.255
- `/26` range: 10.0.0.128 – 10.0.0.191

Yes — the `/26` is entirely inside the `/24`. They overlap.

## Splitting Subnets (Supernetting and Subnetting)

### Splitting a /24 into smaller subnets

`192.168.1.0/24` split into four /26 subnets:
- `192.168.1.0/26` (0–63)
- `192.168.1.64/26` (64–127)
- `192.168.1.128/26` (128–191)
- `192.168.1.192/26` (192–255)

Each /26 gives 62 usable hosts. The calculator shows this visually.

### Combining subnets (summarization)

Four /26 subnets can be summarized back to a /24 when advertising routes. This matters for BGP route summarization and firewall rules.

## Firewall Rules and Subnet Ranges

When writing firewall rules, CIDR notation is the standard:

```bash
# Allow traffic from the entire 10.0.0.0/8 private range
ufw allow from 10.0.0.0/8

# Allow only from a specific subnet
ufw allow from 10.0.10.0/24 to any port 5432

# iptables
iptables -A INPUT -s 192.168.1.0/24 -p tcp --dport 22 -j ACCEPT
```

Knowing the exact CIDR notation for your subnets prevents overly permissive rules.

## IPv6 Subnetting Basics

IPv6 uses the same CIDR notation but with 128-bit addresses. Common IPv6 subnets:

- `/32` — ISP allocation (4 billion /64 networks)
- `/48` — typical organization prefix
- `/64` — single subnet (standard; required for SLAAC)
- `/128` — single host

AWS VPCs support IPv6 with /56 VPC CIDR and /64 subnets.

## Quick Reference: Common Conversions

Subnet mask to CIDR:
- 255.255.255.0 → /24
- 255.255.0.0 → /16
- 255.0.0.0 → /8
- 255.255.255.128 → /25
- 255.255.255.192 → /26
- 255.255.255.224 → /27
- 255.255.255.240 → /28

## Using the Calculator in Your Workflow

1. Go to [Subnet Calculator](/tools/subnet-calculator)
2. Enter your IP and prefix length (e.g., `10.0.0.0/24`)
3. See the full range, usable hosts, and binary representation
4. Use the split function to divide into smaller subnets
5. Export the results for documentation

For DNS and network debugging, pair with [DNS Lookup](/tools/dns-lookup) and [IP Geolocation](/tools/ip-geolocation).

## Summary

Subnetting math is straightforward but tedious to do manually. Use a calculator for VPC planning, Docker network configuration, firewall rules, and any time you need to know the exact range of a CIDR block. The key numbers to remember: /24 gives ~250 hosts, /16 gives ~65K hosts, each additional prefix bit halves the range.
