---
title: "Redis CLI — Command-Line Interface for Redis"
description: "The Redis CLI is the essential tool for interacting with Redis databases. Learn essential commands for data structures, pub/sub, streams, Lua scripting, cluster management, and performance analysis."
category: "Database"
pricing: "Free / Open Source"
pricingDetail: "Redis CLI comes bundled with Redis (BSD-3). Redis Cloud free tier available with 30MB storage."
website: "https://redis.io/docs/latest/develop/tools/cli/"
github: "https://github.com/redis/redis"
tags: ["database", "redis", "cache", "cli", "key-value", "pub-sub", "streams", "devops"]
pros:
  - "Included with Redis: no separate installation needed"
  - "Interactive REPL with tab completion for all Redis commands"
  - "Pipeline mode: batch commands for high-throughput testing"
  - "Monitoring: latency, memory usage, slow log analysis"
  - "Cluster support: interact with Redis Cluster nodes"
cons:
  - "Text-only output — use RedisInsight GUI for visual exploration"
  - "No query language (it's a CLI, not SQL)"
  - "Some cluster operations require --cluster subcommands"
date: "2026-04-02"
---

## What is Redis CLI?

`redis-cli` is the command-line interface for Redis, the in-memory data structure store used as a cache, message broker, and database. Mastering redis-cli is essential for debugging cache issues, performance analysis, and Redis administration.

## Connection

```bash
# Connect to local Redis
redis-cli

# Connect to remote Redis
redis-cli -h redis.example.com -p 6379 -a your_password

# Connect with TLS
redis-cli -h redis.example.com -p 6380 --tls --cacert /path/to/ca.crt

# Connect to specific database (0-15)
redis-cli -n 3

# Run a single command
redis-cli GET mykey
redis-cli HGETALL user:123
```

## Essential Data Structure Commands

### Strings (Caching)
```bash
# Set with expiry (TTL in seconds)
SET user:token:abc123 "user_data_here" EX 3600

# Get value
GET user:token:abc123

# Set only if not exists (distributed locks)
SET lock:resource "worker-1" NX EX 30

# Atomic increment
INCR page:views:2026-04-02
INCRBY user:credits:123 100

# Bulk operations
MSET key1 val1 key2 val2 key3 val3
MGET key1 key2 key3
```

### Hashes (Objects)
```bash
# Store user object
HSET user:123 name "Alice" email "alice@example.com" active 1

# Get all fields
HGETALL user:123

# Get specific field
HGET user:123 email

# Check field exists
HEXISTS user:123 email

# Get all keys/values
HKEYS user:123
HVALS user:123
```

### Lists (Queues)
```bash
# Push to queue (FIFO)
LPUSH jobs:pending job1 job2 job3
RPOP jobs:pending  # Process next job

# Blocking pop (wait up to 5 seconds)
BRPOP jobs:pending 5

# List range
LRANGE jobs:pending 0 -1  # All items
LLEN jobs:pending
```

### Sets (Unique Collections)
```bash
# Session management
SADD user:123:sessions "session_abc"
SISMEMBER user:123:sessions "session_abc"  # Check membership
SMEMBERS user:123:sessions                  # All sessions
SREM user:123:sessions "session_abc"

# Set operations
SUNION set1 set2  # Union
SINTER set1 set2  # Intersection
SDIFF set1 set2   # Difference
```

### Sorted Sets (Leaderboards)
```bash
# Add scores
ZADD leaderboard 1500 "alice"
ZADD leaderboard 2000 "bob"
ZADD leaderboard 1750 "charlie"

# Get ranked list (ascending)
ZRANGE leaderboard 0 -1 WITHSCORES

# Top 3 (descending)
ZREVRANGE leaderboard 0 2 WITHSCORES

# Get rank
ZREVRANK leaderboard "alice"  # 0-indexed rank

# Score for member
ZSCORE leaderboard "alice"
```

### Streams (Event Log)
```bash
# Append to stream
XADD events:purchases * user_id 123 amount 99.99 item "laptop"

# Read from stream
XREAD COUNT 10 STREAMS events:purchases 0

# Consumer groups (distributed processing)
XGROUP CREATE events:purchases workers $ MKSTREAM
XREADGROUP GROUP workers consumer1 COUNT 1 STREAMS events:purchases >
XACK events:purchases workers <message-id>
```

## Monitoring and Performance

```bash
# Real-time monitoring of commands
redis-cli MONITOR

# Latency histogram
redis-cli --latency-history -i 1  # Every 1 second

# Memory usage
redis-cli MEMORY USAGE user:123  # Bytes used by a key
redis-cli INFO memory             # Full memory stats

# Slow log
redis-cli SLOWLOG GET 10    # Last 10 slow commands
redis-cli SLOWLOG LEN       # Number of slow log entries

# Server info
redis-cli INFO all
redis-cli INFO keyspace

# Find keys matching pattern (use SCAN, not KEYS in production!)
redis-cli SCAN 0 MATCH "user:*" COUNT 100

# Count keys
redis-cli DBSIZE
```

## Key Management

```bash
# TTL
redis-cli TTL key            # Remaining TTL in seconds (-1 = no expiry, -2 = doesn't exist)
redis-cli PTTL key           # TTL in milliseconds
redis-cli EXPIRE key 3600   # Set expiry
redis-cli PERSIST key        # Remove expiry

# Key type
redis-cli TYPE key

# Delete
redis-cli DEL key1 key2
redis-cli UNLINK key1 key2  # Async delete (non-blocking for large keys)

# Rename
redis-cli RENAME oldkey newkey

# Check exists
redis-cli EXISTS key
```

## Pipeline Mode (Bulk Operations)

```bash
# Execute many commands efficiently
redis-cli --pipe << 'EOF'
SET key1 value1
SET key2 value2
HSET user:1 name Alice email alice@example.com
EXPIRE user:1 3600
EOF
```

## Pub/Sub

```bash
# Terminal 1: Subscribe
redis-cli SUBSCRIBE channel:updates

# Terminal 2: Publish
redis-cli PUBLISH channel:updates "Hello subscribers!"

# Subscribe to pattern
redis-cli PSUBSCRIBE "events:*"
```

redis-cli combined with RedisInsight (GUI) gives complete visibility into your Redis deployment.
