# ADR 006: Redis Streams over Apache Kafka for Hackathon Scope

## Context & Problem
We require an event streaming backbone capable of fanout, consumer groups, and decoupling ingestion workers from analytical engines.

## Decision
We select Redis Streams (paired with an in-memory asyncio event broker for zero-dependency local runs) rather than Apache Kafka.

## Alternatives Considered
1. **Apache Kafka / Redpanda**: Industrial-standard for petabyte-scale event log retention and complex stream processing.
2. **RabbitMQ**: Excellent for discrete AMQP task queues, but less suited for append-only replayable event streams.

## Key Trade-offs
- Redis Streams store messages in RAM, meaning stream retention must be trimmed (e.g. `XADD MAXLEN ~ 10000`) rather than retaining months of historical ticks.

## Rationale & Why
- Redis Streams provides identical consumer group, acknowledgment, and replay semantics without the multi-gigabyte operational overhead of ZooKeeper/KRaft and heavy JVM dependencies.
- Kafka can be substituted in the future behind our event engine interface with zero changes to downstream consumers.
