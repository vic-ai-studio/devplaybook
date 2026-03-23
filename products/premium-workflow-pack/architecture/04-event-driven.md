# Event-Driven Architecture Design Guide

## Why Event-Driven?

| Synchronous API | Event-Driven |
|----------------|--------------|
| Tight coupling | Loose coupling |
| Cascade failures | Isolated failures |
| Harder to scale independently | Each consumer scales independently |
| Simple debugging | Requires distributed tracing |
| Low latency reads | Higher eventual consistency latency |

**Use events for:** cross-service state changes, audit logs, projections, workflows with multiple steps.

---

## Event Design

### Anatomy of a Good Event

```typescript
interface DomainEvent<T = unknown> {
  // Identity
  id: string;          // UUID — idempotency key
  type: string;        // "order.placed", "user.email_verified"
  version: number;     // Schema version for backwards compat

  // Context
  timestamp: string;   // ISO 8601 UTC
  source: string;      // "order-service"
  correlationId: string; // Links related events across services
  causationId: string;   // The event or request that caused this

  // Payload
  data: T;             // Domain-specific payload
  metadata?: Record<string, string>; // Optional: userId, tenantId, etc.
}
```

### Naming Convention

```
# Format: <domain>.<past-tense-verb>
order.placed
order.payment_confirmed
order.shipped
order.delivered
order.cancelled

user.registered
user.email_verified
user.password_reset_requested

inventory.reserved
inventory.released
inventory.low_stock_alert
```

### Event Versioning

```typescript
// v1 — original
interface OrderPlacedV1 {
  version: 1;
  data: { orderId: string; total: number; }
}

// v2 — added currency field
interface OrderPlacedV2 {
  version: 2;
  data: { orderId: string; total: number; currency: string; }
}

// Consumer: handle both versions
function handleOrderPlaced(event: OrderPlacedV1 | OrderPlacedV2) {
  const currency = event.version >= 2 ? event.data.currency : 'USD';
  // ...
}
```

---

## Message Queue Comparison

### Redis Streams (recommended for small teams)

```typescript
// Producer
await redis.xadd('orders', '*',
  'type', 'order.placed',
  'data', JSON.stringify(orderData)
);

// Consumer (consumer group)
const messages = await redis.xreadgroup(
  'GROUP', 'order-processor', 'worker-1',
  'COUNT', 10, 'BLOCK', 5000,
  'STREAMS', 'orders', '>'
);
```

### RabbitMQ (rich routing)

```typescript
// Exchange types: direct, topic, fanout, headers
channel.publish('orders.exchange', 'order.placed', Buffer.from(JSON.stringify(event)));

// Topic subscriber
channel.bindQueue('email-queue', 'orders.exchange', 'order.*');
channel.bindQueue('analytics-queue', 'orders.exchange', '#');
```

### Kafka (high throughput / event sourcing)

```typescript
// Producer
await producer.send({
  topic: 'order-events',
  messages: [{ key: orderId, value: JSON.stringify(event) }],
});

// Consumer group (parallel processing)
consumer.subscribe({ topic: 'order-events', fromBeginning: false });
await consumer.run({ eachMessage: async ({ message }) => { ... } });
```

---

## Idempotency Pattern

Every consumer must handle duplicate events:

```typescript
async function handleOrderPlaced(event: OrderPlacedEvent) {
  // Check if already processed
  const processed = await redis.get(`processed:${event.id}`);
  if (processed) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }

  // Process the event
  await createOrderRecord(event.data);
  await sendConfirmationEmail(event.data);

  // Mark as processed (TTL: 7 days for dedup window)
  await redis.set(`processed:${event.id}`, '1', 'EX', 604800);
}
```

---

## Saga Pattern (Distributed Transactions)

For multi-service workflows, use compensating transactions:

```
Order Saga:
  1. Reserve inventory   → on failure: skip
  2. Process payment     → on failure: release inventory
  3. Create shipment     → on failure: refund payment + release inventory
  4. Send confirmation   → on failure: log + retry (non-critical)
```

```typescript
class OrderSaga {
  async execute(order: Order) {
    const steps = [
      { execute: () => this.reserveInventory(order), compensate: () => this.releaseInventory(order) },
      { execute: () => this.processPayment(order), compensate: () => this.refundPayment(order) },
      { execute: () => this.createShipment(order), compensate: async () => {} },
    ];

    const completed: number[] = [];
    try {
      for (let i = 0; i < steps.length; i++) {
        await steps[i].execute();
        completed.unshift(i);
      }
    } catch (err) {
      // Compensate in reverse order
      for (const i of completed) {
        await steps[i].compensate().catch(console.error);
      }
      throw err;
    }
  }
}
```

---

## Dead Letter Queue (DLQ) Strategy

```
Queue → Consumer (fails 3x) → DLQ → Alert → Manual review or replay
```

```typescript
// AWS SQS example: configure maxReceiveCount = 3
// After 3 failures, message goes to DLQ automatically

// Replay DLQ messages after fixing the bug:
const dlqMessages = await sqs.receiveMessage({ QueueUrl: DLQ_URL, MaxNumberOfMessages: 10 });
for (const msg of dlqMessages.Messages) {
  await sqs.sendMessage({ QueueUrl: MAIN_QUEUE_URL, MessageBody: msg.Body });
  await sqs.deleteMessage({ QueueUrl: DLQ_URL, ReceiptHandle: msg.ReceiptHandle });
}
```
