---
title: "Apache Flink — Stream & Batch Processing for Real-Time Data"
description: "Stateful stream processing framework — true event-time processing, exactly-once semantics, and low-latency real-time analytics at scale."
category: "Data Engineering & Pipeline"
pricing: "Free"
pricingDetail: "Open source; Confluent Cloud for Flink, Amazon Kinesis Data Analytics (Flink), Ververica Platform available"
website: "https://flink.apache.org"
github: "https://github.com/apache/flink"
tags: [data-engineering, streaming, real-time, stateful, kafka, event-time, python, java]
pros:
  - "True streaming: processes events as they arrive, not in micro-batches"
  - "Exactly-once semantics with checkpointing"
  - "Stateful processing: maintain state across millions of events efficiently"
  - "Event-time processing: handle late-arriving data correctly"
  - "Table API and SQL support alongside DataStream API"
cons:
  - "Steeper learning curve than Spark Streaming"
  - "Smaller ecosystem than Spark"
  - "Operational complexity for self-hosted clusters"
  - "Python API (PyFlink) lags behind Java/Scala API"
date: "2026-04-02"
---

## Overview

Apache Flink is purpose-built for stateful real-time stream processing. Where Spark Streaming uses micro-batches (small batches that feel real-time), Flink processes each event as it arrives. This makes it superior for latency-sensitive applications: fraud detection, real-time recommendations, IoT monitoring.

## Flink SQL (Recommended Starting Point)

```sql
-- Flink SQL: real-time revenue aggregation from Kafka
CREATE TABLE orders (
    order_id STRING,
    customer_id STRING,
    amount DOUBLE,
    category STRING,
    event_time TIMESTAMP(3),
    WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'order-events',
    'properties.bootstrap.servers' = 'kafka:9092',
    'format' = 'json'
);

CREATE TABLE revenue_by_category (
    window_start TIMESTAMP(3),
    window_end TIMESTAMP(3),
    category STRING,
    total_revenue DOUBLE,
    order_count BIGINT,
    PRIMARY KEY (window_start, category) NOT ENFORCED
) WITH (
    'connector' = 'upsert-kafka',
    'topic' = 'revenue-aggregates',
    'properties.bootstrap.servers' = 'kafka:9092',
    'key.format' = 'json',
    'value.format' = 'json'
);

-- Tumbling 1-minute windows
INSERT INTO revenue_by_category
SELECT
    TUMBLE_START(event_time, INTERVAL '1' MINUTE) AS window_start,
    TUMBLE_END(event_time, INTERVAL '1' MINUTE) AS window_end,
    category,
    SUM(amount) AS total_revenue,
    COUNT(*) AS order_count
FROM orders
GROUP BY
    TUMBLE(event_time, INTERVAL '1' MINUTE),
    category;
```

## DataStream API (Java/Python)

```python
# PyFlink DataStream API
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.connectors.kafka import KafkaSource
from pyflink.common.watermark_strategy import WatermarkStrategy
from pyflink.common import Duration

env = StreamExecutionEnvironment.get_execution_environment()
env.set_parallelism(4)

# Source from Kafka
source = KafkaSource.builder() \
    .set_bootstrap_servers("kafka:9092") \
    .set_topics("order-events") \
    .set_group_id("flink-processor") \
    .set_value_only_deserializer(SimpleStringSchema()) \
    .build()

stream = env.from_source(
    source,
    WatermarkStrategy.for_bounded_out_of_orderness(Duration.of_seconds(5)),
    "Kafka Source"
)

# Process stream
result = stream \
    .map(lambda x: json.loads(x)) \
    .filter(lambda event: event['status'] == 'completed') \
    .key_by(lambda event: event['customer_id']) \
    .process(FraudDetectionFunction())

env.execute("Fraud Detection Pipeline")
```

## State Management

Flink's killer feature — stateful computation across streaming events:

```java
public class FraudDetectionFunction
    extends KeyedProcessFunction<String, Order, Alert> {

    // State: last transaction time per customer
    private ValueState<Long> lastTxnTime;

    @Override
    public void open(Configuration config) {
        lastTxnTime = getRuntimeContext().getState(
            new ValueStateDescriptor<>("lastTxnTime", Long.class)
        );
    }

    @Override
    public void processElement(Order order, Context ctx, Collector<Alert> out) throws Exception {
        Long lastTime = lastTxnTime.value();

        if (lastTime != null) {
            long timeDiff = order.getTimestamp() - lastTime;
            // Alert if 2 orders within 1 second from same customer
            if (timeDiff < 1000) {
                out.collect(new Alert(order.getCustomerId(), "Rapid transactions"));
            }
        }

        lastTxnTime.update(order.getTimestamp());
    }
}
```

## Flink vs Spark Streaming

| | Apache Flink | Spark Streaming |
|--|------------|----------------|
| Processing model | True streaming | Micro-batch |
| Latency | ~ms | ~100ms–1s |
| Exactly-once | Yes | Yes (with checkpoints) |
| State backend | RocksDB/heap | In-memory/HDFS |
| Maturity | High | Higher |
| Ecosystem | Growing | Larger |
| Best for | Low-latency, stateful | Batch + streaming unified |

Choose Flink when sub-second latency and complex stateful event processing are requirements. Use Spark Streaming when you want a unified batch + streaming platform with a larger ecosystem.

## Best For

- **Low-latency event processing** (fraud detection, real-time recommendations, alerting) where millisecond response matters and Spark Streaming's micro-batch approach is too slow
- **Complex stateful stream processing** — session windows, pattern matching (CEP), and long-running state that must survive failures
- **Kafka + Flink pipelines** — Flink's native Kafka integration makes it the standard for processing high-volume event streams
- **Financial services and telco** with exactly-once processing guarantees and regulatory requirements for correctness

## Apache Flink vs. Alternatives

| | Apache Flink | Spark Streaming | Kafka Streams | Apache Storm |
|--|-------------|-----------------|---------------|-------------|
| Processing model | True streaming | Micro-batch | Embedded library | Micro-batch |
| Latency | ~ms | ~100ms–1s | ~ms | ~ms |
| State management | Advanced (RocksDB) | Structured Streaming | In-memory | Stateless |
| Operational complexity | High | High (Spark cluster) | Low (library) | Medium |
| Best for | Complex stateful streaming | Unified batch+stream | Kafka-native microservices | Legacy low-latency |

For Kafka-native services that don't need a separate cluster, Kafka Streams (embedded library) is simpler. For complex event processing requiring millisecond latency, Flink is the standard.
