---
title: "OSQuery — OS Instrumentation & Security Monitoring Framework"
description: "OSQuery exposes your operating system as a relational database. Query processes, network connections, users, files, and security data using SQL across Linux, macOS, and Windows."
category: "Security"
pricing: "Free / Open Source"
pricingDetail: "OSQuery is 100% free and open-source (Apache 2.0). Created by Facebook, now maintained by the Linux Foundation."
website: "https://osquery.io"
github: "https://github.com/osquery/osquery"
tags: ["security", "monitoring", "linux", "macos", "incident-response", "compliance", "endpoint-security", "sysadmin"]
pros:
  - "SQL interface for OS data: query processes, files, users, network, hardware with SELECT statements"
  - "Cross-platform: same queries work on Linux, macOS, and Windows"
  - "Real-time event monitoring with continuous table subscriptions (file changes, process spawns)"
  - "Distributed queries: run ad-hoc queries across an entire fleet simultaneously"
  - "Excellent for threat hunting, incident response, and compliance auditing"
cons:
  - "Learning curve for understanding available tables and their columns"
  - "Disk and CPU overhead with high-frequency monitoring configurations"
  - "Fleet management (osctrl, Fleet) requires separate infrastructure"
  - "Real-time alerting requires integration with external SIEM or Fleet platform"
date: "2026-04-02"
---

## What is OSQuery?

OSQuery (originally created at Facebook, now a Linux Foundation project) exposes your entire operating system as a SQL database. Instead of digging through `/proc`, parsing log files, and running system commands, you write SQL queries to inspect processes, network connections, users, files, kernel modules, browser extensions, and hundreds of other aspects of system state.

This SQL interface makes OS interrogation approachable for security analysts, enables consistent cross-platform analysis, and enables powerful threat hunting with JOIN queries across multiple data sources.

## Quick Start

```bash
# Install OSQuery
# Ubuntu/Debian
apt-get install osquery

# macOS
brew install osquery

# Start interactive shell
osqueryi

# List all tables
.tables

# Query running processes
SELECT pid, name, path, cmdline FROM processes LIMIT 10;

# Running services
SELECT name, status, start_type FROM services;

# Network connections
SELECT pid, local_port, remote_address, remote_port, state
FROM process_open_sockets
WHERE state = 'ESTABLISHED';
```

## Key Tables

### Process Monitoring

```sql
-- All running processes with full command line
SELECT pid, parent, name, path, cmdline, username
FROM processes
ORDER BY start_time DESC;

-- Processes with unusual parent (detect process injection)
SELECT p.pid, p.name, p.cmdline, pp.name AS parent_name
FROM processes p
JOIN processes pp ON p.parent = pp.pid
WHERE p.name IN ('sh', 'bash', 'powershell', 'cmd')
  AND pp.name NOT IN ('sshd', 'bash', 'zsh', 'terminal');

-- Processes using deleted binaries (possible malware)
SELECT pid, name, path
FROM processes
WHERE on_disk = 0;
```

### Network Monitoring

```sql
-- All outbound network connections
SELECT p.name, p.pid, s.remote_address, s.remote_port, s.state
FROM process_open_sockets s
JOIN processes p ON s.pid = p.pid
WHERE s.remote_port NOT IN (80, 443, 22)
  AND s.remote_address NOT LIKE '127.%'
  AND s.remote_address != '0.0.0.0';

-- Listening ports
SELECT pid, port, protocol, address
FROM listening_ports
WHERE address != '127.0.0.1';

-- DNS resolvers configured
SELECT * FROM dns_resolvers;
```

### User and Authentication

```sql
-- All local users
SELECT username, uid, gid, directory, shell
FROM users;

-- Logged-in users
SELECT username, host, type, tty, time
FROM logged_in_users;

-- Sudoers configuration
SELECT * FROM sudoers;

-- SSH authorized keys
SELECT username, key, key_type
FROM user_ssh_keys;
```

### File System

```sql
-- Recently modified files in /etc
SELECT path, mtime, size
FROM file
WHERE path LIKE '/etc/%'
  AND mtime > (SELECT CAST(strftime('%s', 'now', '-1 hour') AS INTEGER));

-- SUID/SGID binaries (common privilege escalation vector)
SELECT path, username, permissions
FROM file
JOIN users ON file.uid = users.uid
WHERE (permissions LIKE '%s%' OR permissions LIKE '%S%')
  AND path NOT LIKE '/proc/%';

-- Cron jobs
SELECT * FROM crontab;
```

### System Integrity

```sql
-- Kernel modules (detect rootkits)
SELECT name, version, address, size FROM kernel_modules;

-- Startup programs (macOS)
SELECT * FROM launchd;

-- Windows startup items
SELECT name, path, status, source FROM startup_items;

-- Running Docker containers
SELECT id, name, image, status, created FROM docker_containers;
```

## OSQuery Daemon (osqueryd)

For continuous monitoring, run `osqueryd` with a configuration:

```json
// /etc/osquery/osquery.conf
{
  "options": {
    "logger_plugin": "filesystem",
    "log_result_events": true,
    "schedule_splay_percent": 10
  },
  "schedule": {
    "listening_ports": {
      "query": "SELECT pid, port, protocol FROM listening_ports;",
      "interval": 300,
      "description": "Check for new listening ports every 5 min"
    },
    "user_accounts": {
      "query": "SELECT username, uid, gid, shell FROM users;",
      "interval": 600,
      "description": "Monitor user accounts"
    },
    "ssh_keys": {
      "query": "SELECT * FROM user_ssh_keys;",
      "interval": 3600,
      "description": "Monitor SSH authorized keys"
    }
  },
  "decorators": {
    "load": [
      "SELECT hostname AS host FROM system_info;",
      "SELECT uuid AS machine_uuid FROM system_info;"
    ]
  }
}
```

## Event-Based Monitoring

OSQuery can subscribe to OS events for real-time detection:

```json
// Monitor file system events
{
  "file_paths": {
    "etc": ["/etc/%%"],
    "bin": ["/bin/%%", "/usr/bin/%%", "/sbin/%%"],
    "ssh_keys": ["/home/%/.ssh/%%"]
  },
  "schedule": {
    "file_events": {
      "query": "SELECT * FROM file_events;",
      "interval": 10
    }
  }
}
```

## Fleet Management

For fleet-wide queries across many machines, use:

- **Fleet** (fleetdm.com) — Open-source device management platform
- **Kolide** — SaaS fleet management
- **osctrl** — Open-source osquery TLS server

```bash
# Distributed query via Fleet CLI
fleetctl query --query "SELECT pid, name FROM processes WHERE name = 'cryptominer';" \
  --hosts all \
  --timeout 30
```

## Security Use Cases

### Threat Hunting
```sql
-- Detect cryptocurrency miners (unusual CPU-heavy processes)
SELECT pid, name, uid, cpu_type, start_time
FROM processes
WHERE name IN ('xmrig', 'minerd', 'cpuminer', 'cryptonight');

-- Check for common persistence mechanisms
SELECT name, path, source FROM startup_items
WHERE path LIKE '/tmp/%' OR path LIKE '/var/tmp/%';
```

### Incident Response
```sql
-- All processes that opened network connections in last hour
SELECT DISTINCT p.pid, p.name, p.cmdline, s.remote_address
FROM processes p
JOIN process_open_sockets s ON p.pid = s.pid
WHERE s.remote_address != '127.0.0.1'
  AND s.remote_address != '0.0.0.0'
  AND p.start_time > (strftime('%s', 'now', '-1 hour'));
```

OSQuery is the foundation of endpoint detection and response (EDR) for engineering organizations that want deep visibility into their Linux and macOS fleets.
