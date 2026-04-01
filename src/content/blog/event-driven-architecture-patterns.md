---
title: "Event-Driven Architecture with Kafka and Redis Streams"
description: "Build scalable event-driven systems with Kafka and Redis Streams. Event sourcing, CQRS, consumer groups, dead letter queues, and production patterns for async microservices."
date: "2026-04-02"
tags: [kafka, redis-streams, event-driven, microservices, architecture]
readingTime: "12 min read"
---

# Event-Driven Architecture with Kafka and Redis Streams

Event-driven architecture (EDA) decouples services through asynchronous events instead of synchronous API calls. Service A publishes an event; Service B processes it when ready. Neither service knows about the other.

This decoupling is powerful — but EDA introduces new complexity around ordering, delivery guarantees, and failure handling. This guide covers patterns that work in production.

## Why Event-Driven Architecture?

The synchronous alternative creates tight coupling:

```
# Synchronous: order service calls 4 services
POST /orders →
  UserService.validateUser() → 200ms
  InventoryService.reserve() → 150ms
  PaymentService.charge() → 500ms     ← fails here?
  NotificationService.send() → 100ms
Total: 950ms + the blast radius if any service is down
```

The event-driven version:

```
POST /orders → create order (50ms) → publish OrderCreated event
                                              ↓
                          InventoryService (async, processes when ready)
                          PaymentService (async)
                          NotificationService (async)
Response to user: 50ms. All downstream processing is non-blocking.
```

## Kafka vs Redis Streams: When to Use Each

| Feature | Kafka | Redis Streams |
|---------|-------|---------------|
| Throughput | Millions of msg/s | Hundreds of thousands/s |
| Message retention | Days to forever | Memory-limited |
| Ordering | Per-partition | Per-stream |
| Consumer groups | Yes | Yes |
| Replay events | Yes (retain logs) | Yes (within retention) |
| Setup complexity | High | Low |
| Managed cloud | Confluent, MSK | Redis Cloud, Upstash |
| Best for | High-throughput pipelines | Microservice messaging, low latency |

**Use Kafka** for: high-throughput data pipelines, event sourcing, long-term event storage, analytics pipelines.

**Use Redis Streams** for: microservice communication, real-time features, lower throughput with simpler ops.

## Kafka: Core Concepts and Node.js Implementation

### Setup with kafkajs

```bash
npm install kafkajs
```

```javascript
// kafka.js
import { Kafka } from 'kafkajs';

export const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  ssl: process.env.NODE_ENV === 'production',
  sasl: process.env.NODE_ENV === 'production' ? {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  } : undefined,
});
```

### Producer: Publishing Events

```javascript
import { kafka } from './kafka.js';

const producer = kafka.producer({
  allowAutoTopicCreation: false,
  transactionTimeout: 30000,
});

await producer.connect();

// Publish an OrderCreated event
async function publishOrderCreated(order) {
  await producer.send({
    topic: 'order-events',
    messages: [{
      key: order.userId,          // Partition key — same user's orders stay ordered
      value: JSON.stringify({
        type: 'OrderCreated',
        version: '1.0',
        orderId: order.id,
        userId: order.userId,
        total: order.total,
        items: order.items,
        timestamp: new Date().toISOString(),
      }),
      headers: {
        'content-type': 'application/json',
        'correlation-id': order.correlationId,
      }
    }],
  });
}
```

### Consumer: Processing Events with Consumer Groups

```javascript
// inventory-service/consumer.js
const consumer = kafka.consumer({
  groupId: 'inventory-service',  // All instances share this group
});

await consumer.connect();
await consumer.subscribe({
  topics: ['order-events'],
  fromBeginning: false,  // Only process new events
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());

    try {
      switch (event.type) {
        case 'OrderCreated':
          await inventory.reserve(event.items);
          await publishEvent('InventoryReserved', { orderId: event.orderId });
          break;
        case 'OrderCancelled':
          await inventory.release(event.orderId);
          break;
      }

      // Kafka commits offset automatically after eachMessage resolves
    } catch (error) {
      // Send to dead letter topic for manual inspection
      await sendToDLQ('order-events-dlq', message, error);
      // Don't rethrow — this would block the partition
    }
  },
});
```

### Dead Letter Queue Pattern

```javascript
async function sendToDLQ(dlqTopic, originalMessage, error) {
  await producer.send({
    topic: dlqTopic,
    messages: [{
      key: originalMessage.key,
      value: originalMessage.value,
      headers: {
        ...originalMessage.headers,
        'original-topic': originalMessage.topic,
        'error-message': error.message,
        'error-stack': error.stack.substring(0, 500),
        'failed-at': new Date().toISOString(),
      }
    }]
  });
}
```

## Redis Streams: Simpler EDA

### Publishing Events

```javascript
import Redis from 'ioredis';
const redis = new Redis();

// XADD: add a message to a stream
async function publishEvent(streamKey, eventData) {
  const messageId = await redis.xadd(
    streamKey,
    '*',               // Auto-generate message ID (timestamp-based)
    'type', eventData.type,
    'data', JSON.stringify(eventData),
    'timestamp', new Date().toISOString()
  );
  return messageId;
}

await publishEvent('order-events', {
  type: 'OrderCreated',
  orderId: 'ord-123',
  userId: 'usr-456',
  total: 99.99
});
```

### Consumer Groups with Redis Streams

```javascript
// Create consumer group (do this once during setup)
try {
  await redis.xgroup('CREATE', 'order-events', 'inventory-service', '0', 'MKSTREAM');
} catch (err) {
  if (!err.message.includes('BUSYGROUP')) throw err;
  // Group already exists — OK
}

// Consumer loop
async function startConsumer(streamKey, groupName, consumerName) {
  while (true) {
    // Read up to 10 messages, block for 2 seconds if no messages
    const messages = await redis.xreadgroup(
      'GROUP', groupName, consumerName,
      'COUNT', 10,
      'BLOCK', 2000,
      'STREAMS', streamKey, '>'  // '>' = only undelivered messages
    );

    if (!messages) continue;

    for (const [stream, entries] of messages) {
      for (const [messageId, fields] of entries) {
        const event = {
          type: fields[fields.indexOf('type') + 1],
          data: JSON.parse(fields[fields.indexOf('data') + 1]),
        };

        try {
          await processEvent(event);
          // Acknowledge: removes from pending list
          await redis.xack(streamKey, groupName, messageId);
        } catch (error) {
          console.error(`Failed to process ${messageId}:`, error);
          // Message stays in pending list for retry or DLQ logic
          await handleFailedMessage(streamKey, groupName, messageId, error);
        }
      }
    }
  }
}

// Handle pending messages that failed (retry / DLQ)
async function handleFailedMessage(stream, group, messageId, error) {
  const pending = await redis.xpending(stream, group, messageId, messageId, 1);
  if (pending.length > 0) {
    const deliveryCount = pending[0][3];
    if (deliveryCount > 3) {
      // Move to dead letter stream
      const [, fields] = await redis.xrange(stream, messageId, messageId);
      if (fields) {
        await redis.xadd('dead-letter:' + stream, '*', ...fields,
          'error', error.message, 'originalId', messageId);
      }
      await redis.xack(stream, group, messageId);
    }
  }
}
```

## Event Sourcing Pattern

Store events as the source of truth, derive state from events:

```javascript
// Event store
class OrderEventStore {
  async append(orderId, event) {
    await redis.xadd(`events:order:${orderId}`, '*',
      'type', event.type,
      'data', JSON.stringify(event.data),
      'userId', event.userId,
      'timestamp', event.timestamp
    );
  }

  async getHistory(orderId) {
    const entries = await redis.xrange(`events:order:${orderId}`, '-', '+');
    return entries.map(([id, fields]) => ({
      id,
      type: fields[fields.indexOf('type') + 1],
      data: JSON.parse(fields[fields.indexOf('data') + 1]),
      timestamp: fields[fields.indexOf('timestamp') + 1],
    }));
  }

  async rebuild(orderId) {
    const events = await this.getHistory(orderId);
    return events.reduce(applyEvent, { status: 'new', items: [], total: 0 });
  }
}

function applyEvent(state, event) {
  switch (event.type) {
    case 'OrderCreated':
      return { ...state, ...event.data, status: 'pending' };
    case 'PaymentSucceeded':
      return { ...state, status: 'paid', paidAt: event.data.timestamp };
    case 'OrderShipped':
      return { ...state, status: 'shipped', trackingNumber: event.data.trackingNumber };
    case 'OrderCancelled':
      return { ...state, status: 'cancelled', cancelReason: event.data.reason };
    default:
      return state;
  }
}
```

## CQRS: Command Query Responsibility Segregation

Separate writes (commands) from reads (queries):

```javascript
// Command side: write events
class OrderCommandHandler {
  async createOrder(command) {
    const events = [];
    events.push({ type: 'OrderCreated', data: command });

    if (command.promoCode) {
      const discount = await promoService.calculate(command.promoCode);
      events.push({ type: 'DiscountApplied', data: { discount } });
    }

    // Store events
    for (const event of events) {
      await eventStore.append(command.orderId, event);
    }

    // Publish for downstream consumers
    for (const event of events) {
      await publishEvent('order-events', event);
    }
  }
}

// Query side: read from optimized read model
class OrderQueryHandler {
  async getOrder(orderId) {
    // Read from a pre-built read model (Redis hash, separate DB, etc.)
    return redis.hgetall(`order-view:${orderId}`);
  }
}

// Projection: build read model from events
async function handleOrderCreated(event) {
  await redis.hset(`order-view:${event.orderId}`, {
    id: event.orderId,
    status: 'pending',
    total: event.total,
    userId: event.userId,
    createdAt: event.timestamp,
  });
}
```

## Idempotency: Handling Duplicate Events

Events can be delivered more than once. Make consumers idempotent:

```javascript
async function processOrderCreated(event) {
  const idempotencyKey = `processed:${event.orderId}:${event.type}`;

  // NX = only set if not exists
  const alreadyProcessed = !await redis.set(idempotencyKey, '1', 'EX', 86400, 'NX');
  if (alreadyProcessed) {
    console.log(`Skipping duplicate event: ${event.orderId}`);
    return;
  }

  await inventory.reserve(event.items);
}
```

Event-driven architecture rewards teams that invest in the fundamentals: idempotency, DLQs, observability, and consumer group management. The asynchronous nature makes debugging harder — OpenTelemetry trace correlation across events is essential in production.

---

**Related tools:**
- [Microservices vs Monolith decision guide](/blog/microservices-vs-monolith-2026)
- [Redis caching patterns](/blog/redis-caching-patterns-nodejs)
- [Microservices observability with OTel](/blog/microservices-observability-opentelemetry-guide-2026)
