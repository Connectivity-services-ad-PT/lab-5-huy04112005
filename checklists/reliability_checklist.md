# Reliability & Edge Cases Checklist - Lab 03

This document lists the reliability checks and verification status of Pair 04 (Core Business ↔ Notification Service) REST endpoints and message queues.

## 1. API Reliability Checks

| Check Item | Requirement | Verification Script / Test Case | Status |
|:---|:---|:---|:---:|
| **Idempotency** | Duplicate `eventId` must be rejected with `409 Conflict` (idempotency safety net). | `TC_BND_04` (Duplicate eventId) | Pass |
| **Business Constraint Validation** | Reject events with `occurredAt` in the future with `422 Unprocessable Entity`. | `TC_BND_03` (Future occurredAt) | Pass |
| **Input Format Validation** | Reject invalid fields, schema mismatches, and incorrect UUID formats with `400 Bad Request`. | `TC_NEG_01`, `TC_NEG_02` | Pass |
| **Authentication Enforcement** | Ensure all protected endpoints reject missing or invalid tokens with `401 Unauthorized`. | `TC_AUTH_01`, `TC_AUTH_02`, `TC_AUTH_03` | Pass |
| **Role Authorization Check** | Verify token scope: reject non-permitted users with `403 Forbidden`. | `TC_AUTH_04` (Forbidden Token) | Pass |
| **Cursor-based Pagination** | Ensure limit ranges (1-100) are validated, and pagination uses Base64 encoded cursors to handle high volume history logs. | `TC_BND_01`, `TC_BND_02`, `TC_FUNC_04` | Pass |
| **Error Format Standardization** | Standardize all error responses to match RFC 9457 Problem Details format (`application/problem+json`). | All Negative & Auth cases | Pass |

---

## 2. Queue (AMQP) Reliability Assumptions

To ensure complete reliability, the consumer (`consumer.js`) and publisher (`publisher.js`) adhere to the following queue patterns:

1. **Idempotent Consumers**:
   - The consumer extracts the unique `eventId` from the message and performs an idempotency check against a distributed store (e.g. Redis). If already processed, the consumer acknowledges the message (`channel.ack()`) and skips processing to prevent duplicate alerts.
2. **Chronological Message Processing (Ordering)**:
   - For a given `alertId`, updates (`alert.created` -> `alert.escalated` -> `alert.resolved`) must be processed in the exact order of creation.
   - The publisher routes messages using the `alertId` as the routing key / partition key, directing them to a single partition/worker queue to maintain strict FIFO sequencing.
3. **Dead-Letter Queue (DLQ) Setup**:
   - Standard processing errors (e.g., downstream mail/SMS APIs failing) will trigger retry logic with exponential backoff up to 5 times.
   - On the 5th failure, or on encountering format errors that cannot be solved by retry (e.g. syntax errors), the broker moves the message to `notification.alerts.dlq` for operators to inspect manually.
4. **Data Retention**:
   - Message time-to-live (`message-ttl`) is configured to 3 days (72 hours) on the broker to prevent out-of-disk crashes during severe downstream outages, while giving sufficient buffer to repair consumer workers.
