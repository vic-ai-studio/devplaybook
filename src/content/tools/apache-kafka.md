---
title: "Apache Kafka — Distributed Event Streaming Platform"
description: "Distributed event streaming platform — high-throughput, fault-tolerant message queue for real-time data pipelines, event-driven architectures, and stream processing."
category: "Data Engineering & Pipeline"
pricing: "Free"
pricingDetail: "Open source; Confluent Cloud from $0.10/GB + compute; Amazon MSK, Redpanda Cloud also available"
website: "https://kafka.apache.org"
github: "https://github.com/apache/kafka"
tags: [data-engineering, streaming, event-driven, messaging, kafka, real-time, microservices]
pros:
  - "Extremely high throughput — millions of messages/second"
  - "Durable: messages stored on disk with configurable retention"
  - "Replay: consumers can re-read historical events (not possible with traditional MQs)"
  - "Kafka Streams for stateful stream processing without Spark/Flink"
  - "Ecosystem: Kafka Connect for 200+ source/sink connectors"
cons:
  - "Operational complexity: ZooKeeper (or KRaft) + brokers + schema registry"
  - "Not designed for low-latency (<10ms) point-to-point messaging (use RabbitMQ/NATS)"
  - "Consumer group semantics can be confusing for newcomers"
  - "Requires careful partition count planning upfront"
date: "2026-04-02"
---

## Overview

Apache Kafka is the backbone of real-time data infrastructure at most large tech companies. It acts as a durable, ordered log where producers write events and multiple consumer groups can independently read them — at any point in the retention window.

## Core Concepts

- **Topic**: Named stream of records (like a database table but append-only)
- **Partition**: Topic split for parallelism — records with same key go to same partition
- **Producer**: Writes records to topics
- **Consumer Group**: Set of consumers sharing work; each partition assigned to one consumer
- **Offset**: Record's position in a partition — consumers track their own offset

## Producer (Python)

```python
from confluent_kafka import Producer
import json

producer = Producer({'bootstrap.servers': 'localhost:9092'})

def delivery_report(err, msg):
    if err:
        print(f'Delivery failed: {err}')
    else:
        print(f'Delivered to {msg.topic()} [{msg.partition()}] at offset {msg.offset()}')

# Produce with key (same key → same partition, preserves order)
producer.produce(
    topic='order-events',
    key='order-123',
    value=json.dumps({
        'event': 'order.created',
        'orderId': 'order-123',
        'customerId': 'cust-456',
        'amount': 99.99,
        'timestamp': '2026-04-02T10:00:00Z',
    }),
    callback=delivery_report
)
producer.flush()
```

## Consumer (Python)

```python
from confluent_kafka import Consumer

consumer = Consumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'order-processor',
    'auto.offset.reset': 'earliest',
})

consumer.subscribe(['order-events'])

while True:
    msg = consumer.poll(timeout=1.0)
    if msg is None:
        continue
    if msg.error():
        print(f'Consumer error: {msg.error()}')
        continue

    event = json.loads(msg.value().decode('utf-8'))
    process_order_event(event)
    consumer.commit(asynchronous=False)
```

## Kafka Connect: No-Code Integration

```json
// Postgres CDC → Kafka (Debezium connector)
{
  "name": "postgres-source",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.dbname": "orders",
    "table.include.list": "public.orders,public.order_items",
    "topic.prefix": "db"
  }
}
```

## Local Development with Docker

```yaml
# docker-compose.yml
services:
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk  # KRaft mode (no ZooKeeper)
```

## When to Use Kafka

Use Kafka when you need: event replay/audit log, multiple independent consumers, high throughput (>10K msg/sec), or event sourcing. For simpler task queues or job scheduling, use Redis Streams, BullMQ, or a managed service like SQS.
