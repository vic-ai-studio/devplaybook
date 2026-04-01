---
title: "Apache Kafka for Real-Time Data Pipelines: Tutorial 2026"
description: "Apache Kafka tutorial 2026: topics, partitions, consumer groups, producers/consumers in Python, Schema Registry, Kafka Connect, exactly-once semantics, and production best practices."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["apache-kafka", "real-time", "data-pipelines", "stream-processing", "python", "data-engineering"]
readingTime: "13 min read"
category: "data-engineering"
---

Apache Kafka has become the central nervous system of real-time data infrastructure. Originally built at LinkedIn, Kafka now handles trillions of events per day across the industry — from payment processing at Visa to click-stream analytics at Netflix. Understanding Kafka is no longer optional for data engineers in 2026.

This tutorial walks you from the core concepts to a working Python producer/consumer, Schema Registry integration, and production best practices.

## Core Concepts You Must Understand

### Topics and Partitions

A **topic** is a named, ordered, immutable log of events. Think of it like a database table, except you can only append to the end and reads don't consume the data — multiple consumers can read the same topic independently.

A topic is divided into **partitions** for parallelism and scalability. Each partition is an independent ordered log. Events with the same key always go to the same partition (via key hashing), preserving ordering per key. Events with no key are distributed round-robin.

```
Topic: "orders"
├── Partition 0: [offset 0] [offset 1] [offset 2] ...
├── Partition 1: [offset 0] [offset 1] [offset 2] ...
└── Partition 2: [offset 0] [offset 1] [offset 2] ...
```

### Offsets and Consumer Groups

An **offset** is the position of a record within a partition. Consumers track their position by committing offsets. When a consumer restarts, it resumes from the last committed offset.

A **consumer group** allows multiple consumers to share the work of reading a topic. Each partition is assigned to exactly one consumer in the group. If you have 4 partitions and 2 consumers in a group, each consumer reads 2 partitions. Adding a 5th consumer would leave one idle (you can't have more active consumers than partitions).

```
Consumer Group "analytics-service"
├── Consumer A → reads Partition 0, Partition 1
└── Consumer B → reads Partition 2, Partition 3

Consumer Group "billing-service"
├── Consumer C → reads ALL partitions (reads same events independently)
```

This is Kafka's core power: a single event stream can be consumed by multiple independent services simultaneously, each at their own pace.

## Docker Compose Quickstart

Get a local Kafka cluster running in 2 minutes:

```yaml
# docker-compose.yml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'

  schema-registry:
    image: confluentinc/cp-schema-registry:7.6.0
    depends_on:
      - kafka
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka:9092

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    depends_on:
      - kafka
      - schema-registry
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
      KAFKA_CLUSTERS_0_SCHEMAREGISTRY: http://schema-registry:8081
```

```bash
docker-compose up -d
# Kafka UI available at http://localhost:8080
```

## Python Producer with confluent-kafka

```bash
pip install confluent-kafka avro-python3 requests
```

### Simple JSON Producer

```python
from confluent_kafka import Producer
from confluent_kafka.admin import AdminClient, NewTopic
import json
import time
import uuid
from datetime import datetime

# Admin: create topic if it doesn't exist
admin = AdminClient({'bootstrap.servers': 'localhost:9092'})
admin.create_topics([
    NewTopic('orders', num_partitions=4, replication_factor=1)
])

# Producer configuration
producer_config = {
    'bootstrap.servers': 'localhost:9092',
    # Batching settings for throughput optimization
    'linger.ms': 5,            # Wait up to 5ms to batch messages
    'batch.size': 65536,        # 64KB batches
    'compression.type': 'lz4', # Compress batches
    # Reliability settings
    'acks': 'all',              # Wait for all replicas to acknowledge
    'retries': 3,
    'retry.backoff.ms': 100,
    # Idempotent producer (exactly-once within a single producer session)
    'enable.idempotence': True,
}

producer = Producer(producer_config)

def delivery_report(err, msg):
    """Called once for every message produced."""
    if err is not None:
        print(f'Delivery failed for {msg.key()}: {err}')
    else:
        print(f'Delivered to {msg.topic()} [{msg.partition()}] @ offset {msg.offset()}')

def produce_order(order_data: dict):
    producer.produce(
        topic='orders',
        key=str(order_data['customer_id']),  # Same customer → same partition
        value=json.dumps(order_data),
        on_delivery=delivery_report
    )

# Produce 100 sample orders
for i in range(100):
    order = {
        'order_id': str(uuid.uuid4()),
        'customer_id': f'cust_{i % 20}',   # 20 unique customers
        'amount': round(10 + i * 1.5, 2),
        'status': 'placed',
        'event_time': datetime.utcnow().isoformat()
    }
    produce_order(order)

    # Poll for delivery callbacks without blocking too long
    producer.poll(0)

# Wait for all messages to be delivered
producer.flush(timeout=30)
print("All messages delivered.")
```

### Python Consumer with Manual Offset Commit

```python
from confluent_kafka import Consumer, KafkaError, KafkaException
import json
import signal
import sys

consumer_config = {
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'order-processor-v1',
    'auto.offset.reset': 'earliest',    # Start from beginning if no offset committed
    'enable.auto.commit': False,         # Manual commit for reliability
    'max.poll.interval.ms': 300000,      # 5 minutes before rebalance
    'session.timeout.ms': 10000,
}

consumer = Consumer(consumer_config)
consumer.subscribe(['orders'])

# Graceful shutdown handler
running = True
def shutdown(signum, frame):
    global running
    running = False

signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

try:
    while running:
        # Poll for messages with 1-second timeout
        msg = consumer.poll(timeout=1.0)

        if msg is None:
            continue

        if msg.error():
            if msg.error().code() == KafkaError.PARTITION_EOF:
                # End of partition — normal, just means we're caught up
                print(f'Reached end of {msg.topic()} [{msg.partition()}]')
            else:
                raise KafkaException(msg.error())
        else:
            order = json.loads(msg.value().decode('utf-8'))
            print(f"Processing order {order['order_id']} for customer {order['customer_id']}")

            # Your business logic here
            process_order(order)

            # Commit offset AFTER successful processing
            # This is at-least-once: if we crash before committing, we reprocess
            consumer.commit(asynchronous=False)

finally:
    consumer.close()
    print("Consumer closed cleanly.")

def process_order(order: dict):
    print(f"  Amount: ${order['amount']:.2f}, Status: {order['status']}")
```

## Schema Registry with Avro

JSON is flexible but has no schema enforcement. In production, you want Schema Registry + Avro: producers register a schema, consumers validate against it, and schema evolution is managed centrally.

### Define your Avro schema

```python
# schemas/order.avsc
order_schema_str = """
{
    "type": "record",
    "name": "Order",
    "namespace": "com.devplaybook.ecommerce",
    "fields": [
        {"name": "order_id", "type": "string"},
        {"name": "customer_id", "type": "string"},
        {"name": "amount", "type": "double"},
        {"name": "status", "type": {
            "type": "enum",
            "name": "OrderStatus",
            "symbols": ["placed", "shipped", "delivered", "cancelled"]
        }},
        {"name": "event_time", "type": "string"},
        {"name": "metadata", "type": ["null", {"type": "map", "values": "string"}], "default": null}
    ]
}
"""
```

### Avro Producer with Schema Registry

```python
from confluent_kafka import SerializingProducer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from confluent_kafka.serialization import StringSerializer

schema_registry_client = SchemaRegistryClient({'url': 'http://localhost:8081'})

avro_serializer = AvroSerializer(
    schema_registry_client,
    order_schema_str,
    lambda obj, ctx: obj  # Convert dict directly (already matches schema)
)

producer = SerializingProducer({
    'bootstrap.servers': 'localhost:9092',
    'key.serializer': StringSerializer('utf_8'),
    'value.serializer': avro_serializer,
})

order = {
    'order_id': 'ord-001',
    'customer_id': 'cust-42',
    'amount': 99.99,
    'status': 'placed',
    'event_time': '2026-04-02T10:00:00Z',
    'metadata': None
}

producer.produce(topic='orders-avro', key=order['customer_id'], value=order)
producer.flush()
```

### Avro Consumer

```python
from confluent_kafka import DeserializingConsumer
from confluent_kafka.schema_registry.avro import AvroDeserializer
from confluent_kafka.serialization import StringDeserializer

avro_deserializer = AvroDeserializer(schema_registry_client)

consumer = DeserializingConsumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'avro-consumer-v1',
    'key.deserializer': StringDeserializer('utf_8'),
    'value.deserializer': avro_deserializer,
    'auto.offset.reset': 'earliest',
})

consumer.subscribe(['orders-avro'])

while True:
    msg = consumer.poll(1.0)
    if msg is not None and not msg.error():
        order = msg.value()  # Already a dict, deserialized from Avro
        print(f"Order: {order['order_id']}, Amount: ${order['amount']:.2f}")
```

## Delivery Guarantees

| Guarantee | Behavior | Use Case |
|---|---|---|
| At-most-once | Messages may be lost, never duplicated | Metrics, non-critical logging |
| At-least-once | Messages may be duplicated, never lost | Default for most pipelines |
| Exactly-once | No loss, no duplication | Payments, financial ledgers |

### Achieving Exactly-Once (Kafka Transactions)

```python
# Exactly-once producer using transactions
producer = Producer({
    'bootstrap.servers': 'localhost:9092',
    'transactional.id': 'order-processor-txn-1',  # Unique per producer instance
    'enable.idempotence': True,
})

producer.init_transactions()

try:
    producer.begin_transaction()

    # Produce to output topic
    producer.produce('processed-orders', key='ord-001', value=json.dumps(result))

    # Commit offsets as part of the transaction (read-process-write atomic)
    producer.send_offsets_to_transaction(
        consumer.position(consumer.assignment()),
        consumer.consumer_group_metadata()
    )

    producer.commit_transaction()
except Exception as e:
    producer.abort_transaction()
    raise
```

## Kafka Connect for Source/Sink Connectors

Kafka Connect lets you move data into and out of Kafka without writing producer/consumer code. It has 200+ connectors for databases, cloud storage, and SaaS tools.

### JDBC Source Connector (Postgres → Kafka)

```json
{
    "name": "postgres-orders-source",
    "config": {
        "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
        "connection.url": "jdbc:postgresql://localhost:5432/ecommerce",
        "connection.user": "kafka_user",
        "connection.password": "${file:/opt/kafka/secrets:db.password}",
        "table.whitelist": "orders,customers",
        "mode": "timestamp+incrementing",
        "timestamp.column.name": "updated_at",
        "incrementing.column.name": "id",
        "topic.prefix": "postgres.",
        "transforms": "route",
        "transforms.route.type": "org.apache.kafka.connect.transforms.ReplaceField$Value",
        "poll.interval.ms": "5000"
    }
}
```

### S3 Sink Connector (Kafka → S3)

```json
{
    "name": "s3-orders-sink",
    "config": {
        "connector.class": "io.confluent.connect.s3.S3SinkConnector",
        "tasks.max": "4",
        "topics": "orders",
        "s3.region": "us-east-1",
        "s3.bucket.name": "my-data-lake",
        "s3.part.size": "67108864",
        "flush.size": "1000",
        "rotate.interval.ms": "60000",
        "storage.class": "io.confluent.connect.s3.storage.S3Storage",
        "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
        "schema.compatibility": "FULL",
        "locale": "en_US",
        "timezone": "UTC",
        "timestamp.extractor": "RecordField",
        "timestamp.field": "event_time"
    }
}
```

## Partition Strategy

Choosing the right partition key is critical for performance and ordering guarantees.

| Key Choice | Ordering Guarantee | Load Distribution | Use Case |
|---|---|---|---|
| `customer_id` | Per customer | Good (if customers spread evenly) | User event streams |
| `order_id` | Per order | Excellent | Order lifecycle events |
| `null` (random) | None | Perfect | Metrics, logs |
| `region` | Per region | Skewed if regions unequal | Geo-based processing |
| Timestamp | None | Good | Time-series |

A common mistake is using a high-cardinality key that causes skewed partitions. If 1% of your customers generate 50% of traffic, using `customer_id` will make one partition a hotspot. In that case, consider composite keys or null keys with idempotent consumers.

## Monitoring Essentials

The most important Kafka metrics to watch:

```bash
# Consumer lag — most critical metric
# If lag is growing, your consumers can't keep up
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group order-processor-v1

# Output shows: TOPIC | PARTITION | CURRENT-OFFSET | LOG-END-OFFSET | LAG
```

Key metrics to alert on:
- **Consumer lag > threshold**: consumers falling behind, data processing delays
- **Under-replicated partitions > 0**: broker failure or network issue
- **Active controller count != 1**: cluster leadership problem
- **Request latency (p99) > 100ms**: broker performance degradation

Kafka UI (the Docker Compose service above) provides all of these visually at no cost. For production, Prometheus + Grafana with the JMX exporter is the standard approach.

## Production Best Practices

1. **Set `replication.factor=3`** for all production topics. Never run with factor 1 in production.
2. **Set `min.insync.replicas=2`** so writes require acknowledgment from 2 replicas.
3. **Use `acks=all`** on producers for data durability.
4. **Monitor consumer lag** as the primary operational metric — it tells you if processing is keeping up.
5. **Use Schema Registry** from day one. Retrofitting schema management onto an existing pipeline is painful.
6. **Set retention policies** explicitly — default is 7 days by log size, which may not match your needs.
7. **Avoid too many partitions** — 10-50 per topic is usually right; thousands creates overhead.
8. **Use meaningful consumer group IDs** — `order-processor-v1` beats `consumer-group-1`.

Kafka's learning curve is real, but the investment pays off. Once your team understands offsets, consumer groups, and partition keys, you have a foundation for building data pipelines that scale to arbitrary throughput without architectural rework.
